# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import io
import os
from enum import Enum
import re
import shutil
from zipfile import ZipFile

from django.conf import settings
from django.db import transaction
from rest_framework.parsers import JSONParser
from rest_framework.renderers import JSONRenderer

import cvat.apps.dataset_manager as dm
from cvat.apps.engine import models
from cvat.apps.engine.log import slogger
from cvat.apps.engine.serializers import (AttributeSerializer, DataSerializer,
    LabeledDataSerializer, SegmentSerializer, SimpleJobSerializer, TaskSerializer,
    ReviewSerializer, IssueSerializer, CommentSerializer, ProjectSerializer)
from cvat.apps.engine.utils import av_scan_paths
from cvat.apps.engine.models import StorageChoice, StorageMethodChoice, DataChoice
from cvat.apps.engine.task import _create_thread


class Version(Enum):
        V1 = '1.0'


def _get_label_mapping(db_labels):
    label_mapping = {db_label.id: db_label.name for db_label in db_labels}
    for db_label in db_labels:
        label_mapping[db_label.id] = {
            'value': db_label.name,
            'attributes': {},
        }
        for db_attribute in db_label.attributespec_set.all():
            label_mapping[db_label.id]['attributes'][db_attribute.id] = db_attribute.name

    return label_mapping

class _BackupBase():
    def __init__(self, *args, logger=None, **kwargs):
        super().__init__(*args, **kwargs)
        self._logger = logger

    def _prepare_meta(self, allowed_keys, meta):
        keys_to_drop = set(meta.keys()) - allowed_keys
        if keys_to_drop:
            if self._logger:
                self._logger.warning('the following keys are dropped {}'.format(keys_to_drop))
            for key in keys_to_drop:
                del meta[key]

        return meta

    def _prepare_label_meta(self, labels):
        allowed_fields = {
            'name',
            'color',
            'attributes',
        }
        return self._prepare_meta(allowed_fields, labels)

    def _prepare_attribute_meta(self, attribute):
        allowed_fields = {
            'name',
            'mutable',
            'input_type',
            'default_value',
            'values',
        }
        return self._prepare_meta(allowed_fields, attribute)

class _TaskBackupBase(_BackupBase):
    MANIFEST_FILENAME = 'task.json'
    ANNOTATIONS_FILENAME = 'annotations.json'
    DATA_DIRNAME = 'data'
    TASK_DIRNAME = 'task'

    def _prepare_task_meta(self, task):
        allowed_fields = {
            'name',
            'bug_tracker',
            'status',
            'subset',
            'labels',
        }

        return self._prepare_meta(allowed_fields, task)

    def _prepare_data_meta(self, data):
        allowed_fields = {
            'chunk_size',
            'image_quality',
            'start_frame',
            'stop_frame',
            'frame_filter',
            'chunk_type',
            'storage_method',
            'storage',
        }

        self._prepare_meta(allowed_fields, data)
        if 'frame_filter' in data and not data['frame_filter']:
            data.pop('frame_filter')

        return data

    def _prepare_job_meta(self, job):
        allowed_fields = {
            'status',
        }
        return self._prepare_meta(allowed_fields, job)

    def _prepare_annotations(self, annotations, label_mapping):
        allowed_fields = {
            'label',
            'label_id',
            'type',
            'occluded',
            'outside',
            'z_order',
            'points',
            'frame',
            'group',
            'source',
            'attributes',
            'shapes',
        }

        def _update_attribute(attribute, label):
            if 'name' in attribute:
                source, dest = attribute.pop('name'), 'spec_id'
            else:
                source, dest = attribute.pop('spec_id'), 'name'
            attribute[dest] = label_mapping[label]['attributes'][source]

        def _update_label(shape):
            if 'label_id' in shape:
                source, dest = shape.pop('label_id'), 'label'
            elif 'label' in shape:
                source, dest = shape.pop('label'), 'label_id'
            shape[dest] = label_mapping[source]['value']

            return source

        for tag in annotations['tags']:
            label = _update_label(tag)
            for attr in tag['attributes']:
                _update_attribute(attr, label)
            self._prepare_meta(allowed_fields, tag)

        for shape in annotations['shapes']:
            label = _update_label(shape)
            for attr in shape['attributes']:
                _update_attribute(attr, label)
            self._prepare_meta(allowed_fields, shape)

        for track in annotations['tracks']:
            label = _update_label(track)
            for shape in track['shapes']:
                for attr in shape['attributes']:
                    _update_attribute(attr, label)
                self._prepare_meta(allowed_fields, shape)

            for attr in track['attributes']:
                _update_attribute(attr, label)
            self._prepare_meta(allowed_fields, track)

        return annotations

    def _prepare_review_meta(self, review):
        allowed_fields = {
            'estimated_quality',
            'status',
            'issues',
        }
        return self._prepare_meta(allowed_fields, review)

    def _prepare_issue_meta(self, issue):
        allowed_fields = {
            'frame',
            'position',
            'created_date',
            'resolved_date',
            'comments',
        }
        return self._prepare_meta(allowed_fields, issue)

    def _prepare_comment_meta(self, comment):
        allowed_fields = {
            'message',
            'created_date',
            'updated_date',
        }
        return self._prepare_meta(allowed_fields, comment)

    def _get_db_jobs(self):
        if self._db_task:
            db_segments = list(self._db_task.segment_set.all().prefetch_related('job_set'))
            db_segments.sort(key=lambda i: i.job_set.first().id)
            db_jobs = (s.job_set.first() for s in db_segments)
            return db_jobs
        return ()

class _ExporterBase():
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    @staticmethod
    def _write_files(source_dir, zip_object, files, target_dir):
        for filename in files:
            arcname = os.path.normpath(
                os.path.join(
                    target_dir,
                    os.path.relpath(filename, source_dir),
                )
            )
            zip_object.write(filename=filename, arcname=arcname)

    def _write_directory(self, source_dir, zip_object, target_dir, recursive=True, exclude_files=None):
        for root, dirs, files in os.walk(source_dir, topdown=True):
            if not recursive:
                dirs.clear()

            if files:
                self._write_files(
                    source_dir=source_dir,
                    zip_object=zip_object,
                    files=(os.path.join(root, f) for f in files if not exclude_files or f not in exclude_files),
                    target_dir=target_dir,
                )

class TaskExporter(_ExporterBase, _TaskBackupBase):
    def __init__(self, pk, version=Version.V1):
        super().__init__(logger=slogger.task[pk])
        self._db_task = models.Task.objects.prefetch_related('data__images').select_related('data__video').get(pk=pk)
        self._db_data = self._db_task.data
        self._version = version

        db_labels = (self._db_task.project if self._db_task.project_id else self._db_task).label_set.all().prefetch_related(
            'attributespec_set')
        self._label_mapping = _get_label_mapping(db_labels)

    def _write_data(self, zip_object, target_dir=None):
        target_data_dir = os.path.join(target_dir, self.DATA_DIRNAME) if target_dir else self.DATA_DIRNAME
        if self._db_data.storage == StorageChoice.LOCAL:
            self._write_directory(
                source_dir=self._db_data.get_upload_dirname(),
                zip_object=zip_object,
                target_dir=target_data_dir,
            )
        elif self._db_data.storage == StorageChoice.SHARE:
            data_dir = settings.SHARE_ROOT
            if hasattr(self._db_data, 'video'):
                media_files = (os.path.join(data_dir, self._db_data.video.path), )
            else:
                media_files = (os.path.join(data_dir, im.path) for im in self._db_data.images.all().order_by('frame'))

            self._write_files(
                source_dir=data_dir,
                zip_object=zip_object,
                files=media_files,
                target_dir=target_data_dir,
            )

            upload_dir = self._db_data.get_upload_dirname()
            self._write_files(
                source_dir=upload_dir,
                zip_object=zip_object,
                files=(os.path.join(upload_dir, f) for f in ('manifest.jsonl',)),
                target_dir=target_data_dir,
            )
        else:
            raise NotImplementedError()

    def _write_task(self, zip_object, target_dir=None):
        task_dir = self._db_task.get_task_dirname()
        target_task_dir = os.path.join(target_dir, self.TASK_DIRNAME) if target_dir else self.TASK_DIRNAME
        self._write_directory(
            source_dir=task_dir,
            zip_object=zip_object,
            target_dir=target_task_dir,
            recursive=False,
        )

    def _write_manifest(self, zip_object, target_dir=None):
        def serialize_task():
            task_serializer = TaskSerializer(self._db_task)
            task_serializer.fields.pop('url')
            task_serializer.fields.pop('owner')
            task_serializer.fields.pop('assignee')
            task_serializer.fields.pop('segments')

            task = self._prepare_task_meta(task_serializer.data)
            task['labels'] = [self._prepare_label_meta(l) for l in task['labels']]
            for label in task['labels']:
                label['attributes'] = [self._prepare_attribute_meta(a) for a in label['attributes']]

            return task

        def serialize_comment(db_comment):
            comment_serializer = CommentSerializer(db_comment)
            comment_serializer.fields.pop('author')

            return self._prepare_comment_meta(comment_serializer.data)

        def serialize_issue(db_issue):
            issue_serializer = IssueSerializer(db_issue)
            issue_serializer.fields.pop('owner')
            issue_serializer.fields.pop('resolver')

            issue = issue_serializer.data
            issue['comments'] = (serialize_comment(c) for c in db_issue.comment_set.order_by('id'))

            return self._prepare_issue_meta(issue)

        def serialize_review(db_review):
            review_serializer = ReviewSerializer(db_review)
            review_serializer.fields.pop('reviewer')
            review_serializer.fields.pop('assignee')

            review = review_serializer.data
            review['issues'] = (serialize_issue(i) for i in db_review.issue_set.order_by('id'))

            return self._prepare_review_meta(review)

        def serialize_segment(db_segment):
            db_job = db_segment.job_set.first()
            job_serializer = SimpleJobSerializer(db_job)
            job_serializer.fields.pop('url')
            job_serializer.fields.pop('assignee')
            job_serializer.fields.pop('reviewer')
            job_data = self._prepare_job_meta(job_serializer.data)

            segment_serailizer = SegmentSerializer(db_segment)
            segment_serailizer.fields.pop('jobs')
            segment = segment_serailizer.data
            segment.update(job_data)

            db_reviews = db_job.review_set.order_by('id')
            segment['reviews'] = (serialize_review(r) for r in db_reviews)

            return segment

        def serialize_jobs():
            db_segments = list(self._db_task.segment_set.all())
            db_segments.sort(key=lambda i: i.job_set.first().id)
            return (serialize_segment(s) for s in db_segments)

        def serialize_data():
            data_serializer = DataSerializer(self._db_data)
            data = data_serializer.data
            data['chunk_type'] = data.pop('compressed_chunk_type')
            return self._prepare_data_meta(data)

        task = serialize_task()
        task['version'] = self._version.value
        task['data'] = serialize_data()
        task['jobs'] = serialize_jobs()

        target_manifest_file = os.path.join(target_dir, self.MANIFEST_FILENAME) if target_dir else self.MANIFEST_FILENAME
        zip_object.writestr(target_manifest_file, data=JSONRenderer().render(task))

    def _write_annotations(self, zip_object, target_dir=None):
        def serialize_annotations():
            job_annotations = []
            db_jobs = self._get_db_jobs()
            db_job_ids = (j.id for j in db_jobs)
            for db_job_id in db_job_ids:
                annotations = dm.task.get_job_data(db_job_id)
                annotations_serializer = LabeledDataSerializer(data=annotations)
                annotations_serializer.is_valid(raise_exception=True)
                job_annotations.append(self._prepare_annotations(annotations_serializer.data, self._label_mapping))

            return job_annotations

        annotations = serialize_annotations()
        target_annotations_file = os.path.join(target_dir, self.ANNOTATIONS_FILENAME) if target_dir else self.ANNOTATIONS_FILENAME
        zip_object.writestr(target_annotations_file, data=JSONRenderer().render(annotations))

    def _export_task(self, zip_obj, target_dir=None):
        self._write_data(zip_obj, target_dir)
        self._write_task(zip_obj, target_dir)
        self._write_manifest(zip_obj, target_dir)
        self._write_annotations(zip_obj, target_dir)

    def export_to(self, file, target_dir=None):
        if self._db_task.data.storage_method == StorageMethodChoice.FILE_SYSTEM and \
           self._db_task.data.storage == StorageChoice.SHARE:
           raise Exception('The task cannot be exported because it does not contain any raw data')

        if isinstance(file, str):
            with ZipFile(file, 'w') as zf:
                self._export_task(zip_obj=zf, target_dir=target_dir)
        elif isinstance(file, ZipFile):
            self._export_task(zip_obj=file, target_dir=target_dir)
        else:
            raise ValueError('Unsuported type of file argument')

class _ImporterBase():
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    @staticmethod
    def _read_version(manifest):
        version = manifest.pop('version')
        try:
            return Version(version)
        except ValueError:
            raise ValueError('{} version is not supported'.format(version))

    @staticmethod
    def _prepare_dirs(filepath):
        target_dir = os.path.dirname(filepath)
        if not os.path.exists(target_dir):
            os.makedirs(target_dir)

class TaskImporter(_ImporterBase, _TaskBackupBase):
    def __init__(self, file, user_id, subdir=None):
        super().__init__(logger=slogger.glob)
        self._file = file
        self._subdir = subdir
        self._user_id = user_id
        self._manifest, self._annotations = self._read_meta()
        self._version = self._read_version(self._manifest)
        self._labels_mapping = {}
        self._db_task = None

    def _read_meta(self):
        def read(zip_object):
            manifest_filename = os.path.join(self._subdir, self.MANIFEST_FILENAME) if self._subdir else self.MANIFEST_FILENAME
            annotations_filename = os.path.join(self._subdir, self.ANNOTATIONS_FILENAME) if self._subdir else self.ANNOTATIONS_FILENAME
            manifest = JSONParser().parse(io.BytesIO(zip_object.read(manifest_filename)))
            annotations = JSONParser().parse(io.BytesIO(zip_object.read(annotations_filename)))
            return manifest, annotations

        if isinstance(self._file, str):
            with ZipFile(self._file, 'r') as input_file:
                return read(input_file)
        elif isinstance(self._file, ZipFile):
            return read(self._file)

        raise ValueError('Unsuported type of file argument')

    def _create_labels(self, db_task, labels):
        label_mapping = {}

        for label in labels:
            label_name = label['name']
            attributes = label.pop('attributes', [])
            db_label = models.Label.objects.create(task=db_task, **label)
            label_mapping[label_name] = {
                'value': db_label.id,
                'attributes': {},
            }

            for attribute in attributes:
                attribute_name = attribute['name']
                attribute_serializer = AttributeSerializer(data=attribute)
                attribute_serializer.is_valid(raise_exception=True)
                db_attribute = attribute_serializer.save(label=db_label)
                label_mapping[label_name]['attributes'][attribute_name] = db_attribute.id

        return label_mapping

    def _create_annotations(self, db_job, annotations):
        self._prepare_annotations(annotations, self._labels_mapping)

        serializer = LabeledDataSerializer(data=annotations)
        serializer.is_valid(raise_exception=True)
        dm.task.put_job_data(db_job.id, serializer.data)

    @staticmethod
    def _calculate_segment_size(jobs):
        segment_size = jobs[0]['stop_frame'] - jobs[0]['start_frame'] + 1
        overlap = 0 if len(jobs) == 1 else jobs[0]['stop_frame'] - jobs[1]['start_frame'] + 1

        return segment_size, overlap

    def _import_task(self):
        def _create_comment(comment, db_issue):
            comment['issue'] = db_issue.id
            comment_serializer = CommentSerializer(data=comment)
            comment_serializer.is_valid(raise_exception=True)
            db_comment = comment_serializer.save()
            return db_comment

        def _create_issue(issue, db_review, db_job):
            issue['review'] = db_review.id
            issue['job'] = db_job.id
            comments = issue.pop('comments')

            issue_serializer = IssueSerializer(data=issue)
            issue_serializer.is_valid( raise_exception=True)
            db_issue = issue_serializer.save()

            for comment in comments:
                _create_comment(comment, db_issue)

            return db_issue

        def _create_review(review, db_job):
            review['job'] = db_job.id
            issues = review.pop('issues')

            review_serializer = ReviewSerializer(data=review)
            review_serializer.is_valid(raise_exception=True)
            db_review = review_serializer.save()

            for issue in issues:
                _create_issue(issue, db_review, db_job)

            return db_review

        def _write_data(zip_object):
            data_path = self._db_task.data.get_upload_dirname()
            task_dirname = os.path.join(self._subdir, self.TASK_DIRNAME) if self._subdir else self.TASK_DIRNAME
            data_dirname = os.path.join(self._subdir, self.DATA_DIRNAME) if self._subdir else self.DATA_DIRNAME
            uploaded_files = []
            for f in zip_object.namelist():
                if f.startswith(data_dirname + os.path.sep):
                    target_file = os.path.join(data_path, os.path.relpath(f, data_dirname))
                    self._prepare_dirs(target_file)
                    with open(target_file, "wb") as out:
                        out.write(zip_object.read(f))
                    uploaded_files.append(os.path.relpath(f, data_dirname))
                elif f.startswith(task_dirname + os.path.sep):
                    target_file = os.path.join(task_path, os.path.relpath(f, task_dirname))
                    self._prepare_dirs(target_file)
                    with open(target_file, "wb") as out:
                        out.write(zip_object.read(f))

            return uploaded_files

        data = self._manifest.pop('data')
        labels = self._manifest.pop('labels')
        jobs = self._manifest.pop('jobs')

        self._prepare_task_meta(self._manifest)
        self._manifest['segment_size'], self._manifest['overlap'] = self._calculate_segment_size(jobs)
        self._manifest["owner_id"] = self._user_id

        self._db_task = models.Task.objects.create(**self._manifest)
        task_path = self._db_task.get_task_dirname()
        if os.path.isdir(task_path):
            shutil.rmtree(task_path)

        os.makedirs(self._db_task.get_task_logs_dirname())
        os.makedirs(self._db_task.get_task_artifacts_dirname())

        self._labels_mapping = self._create_labels(self._db_task, labels)

        self._prepare_data_meta(data)
        data_serializer = DataSerializer(data=data)
        data_serializer.is_valid(raise_exception=True)
        db_data = data_serializer.save()
        self._db_task.data = db_data
        self._db_task.save()

        if isinstance(self._file, str):
            with ZipFile(self._file, 'r') as zf:
                uploaded_files = _write_data(zf)
        else:
            uploaded_files = _write_data(self._file)

        data['use_zip_chunks'] = data.pop('chunk_type') == DataChoice.IMAGESET
        data = data_serializer.data
        data['client_files'] = uploaded_files
        _create_thread(self._db_task.pk, data.copy(), True)
        db_data.start_frame = data['start_frame']
        db_data.stop_frame = data['stop_frame']
        db_data.frame_filter = data['frame_filter']
        db_data.storage = StorageChoice.LOCAL
        db_data.save(update_fields=['start_frame', 'stop_frame', 'frame_filter', 'storage'])

        for db_job, job in zip(self._get_db_jobs(), jobs):
            db_job.status = job['status']
            db_job.save()

            for review in job['reviews']:
                _create_review(review, db_job)

    def _import_annotations(self):
        db_jobs = self._get_db_jobs()
        for db_job, annotations in zip(db_jobs, self._annotations):
            self._create_annotations(db_job, annotations)

    def import_task(self):
        self._import_task()
        self._import_annotations()
        return self._db_task

@transaction.atomic
def import_task(filename, user):
    av_scan_paths(filename)
    task_importer = TaskImporter(filename, user)
    db_task = task_importer.import_task()
    return db_task.id


class _ProjectBackupBase(_BackupBase):
    MANIFEST_FILENAME = 'project.json'
    TASKNAME_TEMPLATE = 'task_{}'

    def _prepare_project_meta(self, project):
        allowed_fields = {
            'bug_tracker',
            # TODO
            'deimension',
            'labels',
            'name',
            'status',
        }

        return self._prepare_meta(allowed_fields, project)

class ProjectExporter(_ExporterBase, _ProjectBackupBase):
    def __init__(self, pk, version=Version.V1):
        super().__init__(logger=slogger.project[pk])
        self._db_project = models.Project.objects.prefetch_related('tasks').get(pk=pk)
        self._version = version

        db_labels = self._db_project.label_set.all().prefetch_related('attributespec_set')
        self._label_mapping = _get_label_mapping(db_labels)

    def _write_tasks(self, zip_object):
        for idx, db_task in enumerate(self._db_project.tasks.all().order_by('id')):
            TaskExporter(db_task.id, self._version).export_to(zip_object, self.TASKNAME_TEMPLATE.format(idx))

    def _write_manifest(self, zip_object):
        def serialize_project():
            project_serializer = ProjectSerializer(self._db_project)
            project_serializer.fields.pop('assignee')
            project_serializer.fields.pop('owner')
            project_serializer.fields.pop('tasks')
            project_serializer.fields.pop('training_project')
            project_serializer.fields.pop('url')

            project = self._prepare_project_meta(project_serializer.data)
            project['labels'] = [self._prepare_label_meta(l) for l in project['labels']]
            for label in project['labels']:
                label['attributes'] = [self._prepare_attribute_meta(a) for a in label['attributes']]

            return project

        project = serialize_project()
        project['version'] = self._version.value

        zip_object.writestr(self.MANIFEST_FILENAME, data=JSONRenderer().render(project))

    def export_to(self, filename):
        with ZipFile(filename, 'w') as output_file:
            self._write_tasks(output_file)
            self._write_manifest(output_file)

class ProjectImporter(_ImporterBase, _ProjectBackupBase):
    TASKNAME_RE = 'task_(\d+)/'

    def __init__(self, filename, user_id):
        super().__init__(logger=slogger.glob)
        self._filename = filename
        self._user_id = user_id
        self._manifest = self._read_meta()
        self._version = self._read_version(self._manifest)
        self._db_project = None

    def _read_meta(self):
        with ZipFile(self._filename, 'r') as input_file:
            manifest = JSONParser().parse(io.BytesIO(input_file.read(self.MANIFEST_FILENAME)))

        return manifest

    def _create_labels(self, db_project, labels):
        for label in labels:
            attributes = label.pop('attributes', [])
            db_label = models.Label.objects.create(project=db_project, **label)

            for attribute in attributes:
                attribute_serializer = AttributeSerializer(data=attribute)
                attribute_serializer.is_valid(raise_exception=True)
                attribute_serializer.save(label=db_label)

    def _import_project(self):
        labels = self._manifest.pop('labels')

        self._prepare_project_meta(self._manifest)
        self._manifest["owner_id"] = self._user_id

        self._db_project = models.Project.objects.create(**self._manifest)
        project_path = self._db_project.get_project_dirname()
        if os.path.isdir(project_path):
            shutil.rmtree(project_path)
        os.makedirs(self._db_project.get_project_logs_dirname())

        self._create_labels(self._db_project, labels)

    def _import_tasks(self):
        def get_tasks(zip_object):
            tasks = {}
            for fname in zip_object.namelist():
                m = re.match(self.TASKNAME_RE, fname)
                if m:
                    tasks[int(m.group(1))] = m.group(0)
            return [v for _, v in sorted(tasks.items())]

        with ZipFile(self._filename, 'r') as zf:
            task_dirs = get_tasks(zf)
            for task_dir in task_dirs:
                db_task = TaskImporter(file=zf, user_id=self._user_id, subdir=task_dir).import_task()
                db_task.refresh_from_db()
                serializer = TaskSerializer(db_task, data={'project_id': self._db_project.id}, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()

    def import_project(self):
        self._import_project()
        self._import_tasks()

        return self._db_project

@transaction.atomic
def import_project(filename, user):
    av_scan_paths(filename)
    project_importer = ProjectImporter(filename, user)
    db_project = project_importer.import_project()
    return db_project.id
