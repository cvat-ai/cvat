# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import io
import os
from enum import Enum
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
    ReviewSerializer, IssueSerializer, CommentSerializer)
from cvat.apps.engine.utils import av_scan_paths
from cvat.apps.engine.models import StorageChoice, StorageMethodChoice, DataChoice
from cvat.apps.engine.task import _create_thread


class Version(Enum):
        V1 = '1.0'

class _TaskBackupBase():
    MANIFEST_FILENAME = 'task.json'
    ANNOTATIONS_FILENAME = 'annotations.json'
    DATA_DIRNAME = 'data'
    TASK_DIRNAME = 'task'

    def _prepare_meta(self, allowed_keys, meta):
        keys_to_drop = set(meta.keys()) - allowed_keys
        if keys_to_drop:
            logger = slogger.task[self._db_task.id] if hasattr(self, '_db_task') else slogger.glob

            logger.warning('the following keys are dropped {}'.format(keys_to_drop))
            for key in keys_to_drop:
                del meta[key]

        return meta

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

    def _prepare_attribute_meta(self, attribute):
        allowed_fields = {
            'name',
            'mutable',
            'input_type',
            'default_value',
            'values',
        }
        return self._prepare_meta(allowed_fields, attribute)

    def _prepare_label_meta(self, labels):
        allowed_fields = {
            'name',
            'color',
            'attributes',
        }
        return self._prepare_meta(allowed_fields, labels)

    def _prepare_annotations(self, annotations, label_mapping):
        allowed_fields = {
            'label',
            'label_id',
            'type',
            'occluded',
            'outside',
            'z_order',
            'points',
            'rotation',
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

class TaskExporter(_TaskBackupBase):
    def __init__(self, pk, version=Version.V1):
        self._db_task = models.Task.objects.prefetch_related('data__images').select_related('data__video').get(pk=pk)
        self._db_data = self._db_task.data
        self._version = version

        db_labels = (self._db_task.project if self._db_task.project_id else self._db_task).label_set.all().prefetch_related(
            'attributespec_set')

        self._label_mapping = {}
        self._label_mapping = {db_label.id: db_label.name for db_label in db_labels}
        self._attribute_mapping = {}
        for db_label in db_labels:
            self._label_mapping[db_label.id] = {
                'value': db_label.name,
                'attributes': {},
            }
            for db_attribute in db_label.attributespec_set.all():
                self._label_mapping[db_label.id]['attributes'][db_attribute.id] = db_attribute.name

    def _write_files(self, source_dir, zip_object, files, target_dir):
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

    def _write_data(self, zip_object):
        if self._db_data.storage == StorageChoice.LOCAL:
            self._write_directory(
                source_dir=self._db_data.get_upload_dirname(),
                zip_object=zip_object,
                target_dir=self.DATA_DIRNAME,
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
                target_dir=self.DATA_DIRNAME
            )

            upload_dir = self._db_data.get_upload_dirname()
            self._write_files(
                source_dir=upload_dir,
                zip_object=zip_object,
                files=(os.path.join(upload_dir, f) for f in ('manifest.jsonl',)),
                target_dir=self.DATA_DIRNAME
            )
        else:
            raise NotImplementedError()

    def _write_task(self, zip_object):
        task_dir = self._db_task.get_task_dirname()
        self._write_directory(
            source_dir=task_dir,
            zip_object=zip_object,
            target_dir=self.TASK_DIRNAME,
            recursive=False,
        )

    def _write_manifest(self, zip_object):
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

        zip_object.writestr(self.MANIFEST_FILENAME, data=JSONRenderer().render(task))

    def _write_annotations(self, zip_object):
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
        zip_object.writestr(self.ANNOTATIONS_FILENAME, data=JSONRenderer().render(annotations))

    def export_to(self, filename):
        if self._db_task.data.storage_method == StorageMethodChoice.FILE_SYSTEM and \
           self._db_task.data.storage == StorageChoice.SHARE:
           raise Exception('The task cannot be exported because it does not contain any raw data')
        with ZipFile(filename, 'w') as output_file:
            self._write_data(output_file)
            self._write_task(output_file)
            self._write_manifest(output_file)
            self._write_annotations(output_file)

class TaskImporter(_TaskBackupBase):
    def __init__(self, filename, user_id):
        self._filename = filename
        self._user_id = user_id
        self._manifest, self._annotations = self._read_meta()
        self._version = self._read_version()
        self._labels_mapping = {}
        self._db_task = None

    def _read_meta(self):
        with ZipFile(self._filename, 'r') as input_file:
            manifest = JSONParser().parse(io.BytesIO(input_file.read(self.MANIFEST_FILENAME)))
            annotations = JSONParser().parse(io.BytesIO(input_file.read(self.ANNOTATIONS_FILENAME)))

            return manifest, annotations

    def _read_version(self):
        version = self._manifest.pop('version')
        try:
            return Version(version)
        except ValueError:
            raise ValueError('{} version is not supported'.format(version))

    @staticmethod
    def _prepare_dirs(filepath):
        target_dir = os.path.dirname(filepath)
        if not os.path.exists(target_dir):
            os.makedirs(target_dir)

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

        data_path = self._db_task.data.get_upload_dirname()
        uploaded_files = []
        with ZipFile(self._filename, 'r') as input_file:
            for f in input_file.namelist():
                if f.startswith(self.DATA_DIRNAME + os.path.sep):
                    target_file = os.path.join(data_path, os.path.relpath(f, self.DATA_DIRNAME))
                    self._prepare_dirs(target_file)
                    with open(target_file, "wb") as out:
                        out.write(input_file.read(f))
                    uploaded_files.append(os.path.relpath(f, self.DATA_DIRNAME))
                elif f.startswith(self.TASK_DIRNAME + os.path.sep):
                    target_file = os.path.join(task_path, os.path.relpath(f, self.TASK_DIRNAME))
                    self._prepare_dirs(target_file)
                    with open(target_file, "wb") as out:
                        out.write(input_file.read(f))

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
