# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import os
from enum import Enum
import re
import shutil
import tempfile
from typing import Any, Dict, Iterable
import uuid
import mimetypes
from zipfile import ZipFile
from datetime import datetime
from tempfile import NamedTemporaryFile

import django_rq
from attr.converters import to_bool
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from rest_framework import serializers, status
from rest_framework.parsers import JSONParser
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

import cvat.apps.dataset_manager as dm
from cvat.apps.engine import models
from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.serializers import (AttributeSerializer, DataSerializer,
    JobWriteSerializer, LabelSerializer, AnnotationGuideWriteSerializer, AssetWriteSerializer,
    LabeledDataSerializer, SegmentSerializer, SimpleJobSerializer, TaskReadSerializer,
    ProjectReadSerializer, ProjectFileSerializer, TaskFileSerializer, RqIdSerializer)
from cvat.apps.engine.utils import (
    av_scan_paths, process_failed_job,
    get_rq_job_meta, get_import_rq_id, import_resource_with_clean_up_after,
    sendfile, define_dependent_job, get_rq_lock_by_user, build_backup_file_name,
)
from cvat.apps.engine.models import (
    StorageChoice, StorageMethodChoice, DataChoice, Task, Project, Location)
from cvat.apps.engine.task import JobFileMapping, _create_thread
from cvat.apps.engine.cloud_provider import import_resource_from_cloud_storage, export_resource_to_cloud_storage
from cvat.apps.engine.location import StorageType, get_location_configuration
from cvat.apps.engine.view_utils import get_cloud_storage_for_import_or_export
from cvat.apps.dataset_manager.views import TASK_CACHE_TTL, PROJECT_CACHE_TTL, get_export_cache_dir, clear_export_cache, log_exception
from cvat.apps.dataset_manager.bindings import CvatImportError

slogger = ServerLogManager(__name__)

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

def _write_annotation_guide(zip_object, annotation_guide, guide_filename, assets_dirname, target_dir=None):
    if annotation_guide is not None:
        md = annotation_guide.markdown
        assets = annotation_guide.assets.all()
        assets_dirname = os.path.join(target_dir or '', assets_dirname)
        guide_filename = os.path.join(target_dir or '', guide_filename)

        for db_asset in assets:
            md = md.replace(f'/api/assets/{str(db_asset.pk)}', os.path.join(assets_dirname, db_asset.filename))
            file = os.path.join(settings.ASSETS_ROOT, str(db_asset.pk), db_asset.filename)
            with open(file, 'rb') as asset_file:
                zip_object.writestr(os.path.join(assets_dirname, db_asset.filename), asset_file.read())
        zip_object.writestr(guide_filename, data=md)

def _read_annotation_guide(zip_object, guide_filename, assets_dirname):
    files = zip_object.namelist()
    if guide_filename in files:
        annotation_guide = io.BytesIO(zip_object.read(guide_filename))
        assets = filter(lambda x: x.startswith(f'{assets_dirname}/'), files)
        assets = list(map(lambda x: (x, zip_object.read(x)), assets))

        if len(assets) > settings.ASSET_MAX_COUNT_PER_GUIDE:
            raise ValidationError(f'Maximum number of assets per guide reached')
        for asset in assets:
            if len(asset[1]) / (1024 * 1024) > settings.ASSET_MAX_SIZE_MB:
                raise ValidationError(f'Maximum size of asset is {settings.ASSET_MAX_SIZE_MB} MB')
            if mimetypes.guess_type(asset[0])[0] not in settings.ASSET_SUPPORTED_TYPES:
                raise ValidationError(f'File is not supported as an asset. Supported are {settings.ASSET_SUPPORTED_TYPES}')

        return annotation_guide.getvalue(), assets

    return None, []

def _import_annotation_guide(guide_data, assets):
    guide_serializer = AnnotationGuideWriteSerializer(data=guide_data)
    markdown = guide_data['markdown']
    if guide_serializer.is_valid(raise_exception=True):
        guide_serializer.save()

    for asset in assets:
        name, data = asset
        basename = os.path.basename(name)
        asset_serializer = AssetWriteSerializer(data={
            'filename': basename,
            'guide_id': guide_serializer.instance.id,
        })
        if asset_serializer.is_valid(raise_exception=True):
            asset_serializer.save()
            markdown = markdown.replace(f'{name}', f'/api/assets/{asset_serializer.instance.pk}')
            path = os.path.join(settings.ASSETS_ROOT, str(asset_serializer.instance.uuid))
            os.makedirs(path)
            with open(os.path.join(path, basename), 'wb') as destination:
                destination.write(data)

    guide_serializer.instance.markdown = markdown
    guide_serializer.instance.save()

class _BackupBase():
    ANNOTATION_GUIDE_FILENAME = 'annotation_guide.md'
    ASSETS_DIRNAME = 'assets'

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

    def _prepare_label_meta(self, label):
        allowed_fields = {
            'name',
            'color',
            'attributes',
            'type',
            'svg',
            'sublabels',
        }
        self._prepare_meta(allowed_fields, label)
        for sublabel in label['sublabels']:
            sublabel_id = sublabel['id']
            sublabel_name = sublabel['name']
            label['svg'] = label['svg'].replace(f'data-label-id="{sublabel_id}"', f'data-label-name="{sublabel_name}"')

            self._prepare_meta(allowed_fields, sublabel)
            sublabel['attributes'] = [self._prepare_attribute_meta(a) for a in sublabel['attributes']]
        return label

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
            'sorting_method',
            'deleted_frames',
            'custom_segments',
            'job_file_mapping',
        }

        self._prepare_meta(allowed_fields, data)
        if 'frame_filter' in data and not data['frame_filter']:
            data.pop('frame_filter')

        return data

    def _prepare_job_meta(self, job):
        allowed_fields = {
            'status',
            'type',
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
            'rotation',
            'frame',
            'group',
            'source',
            'attributes',
            'shapes',
            'elements',
        }

        def _update_attribute(attribute, label):
            if 'name' in attribute:
                source, dest = attribute.pop('name'), 'spec_id'
            else:
                source, dest = attribute.pop('spec_id'), 'name'
            attribute[dest] = label_mapping[label]['attributes'][source]

        def _update_label(shape, parent_label=''):
            if 'label_id' in shape:
                source = shape.pop('label_id')
                shape['label'] = label_mapping[source]['value']
            elif 'label' in shape:
                source = parent_label + shape.pop('label')
                shape['label_id'] = label_mapping[source]['value']

            return source

        def _prepare_shapes(shapes, parent_label=''):
            for shape in shapes:
                label = _update_label(shape, parent_label)
                for attr in shape['attributes']:
                    _update_attribute(attr, label)

                _prepare_shapes(shape.get('elements', []), label)

                self._prepare_meta(allowed_fields, shape)

        def _prepare_tracks(tracks, parent_label=''):
            for track in tracks:
                label = _update_label(track, parent_label)
                for shape in track['shapes']:
                    for attr in shape['attributes']:
                        _update_attribute(attr, label)
                    self._prepare_meta(allowed_fields, shape)

                _prepare_tracks(track.get('elements', []), label)

                for attr in track['attributes']:
                    _update_attribute(attr, label)
                self._prepare_meta(allowed_fields, track)

        for tag in annotations['tags']:
            label = _update_label(tag)
            for attr in tag['attributes']:
                _update_attribute(attr, label)
            self._prepare_meta(allowed_fields, tag)

        _prepare_shapes(annotations['shapes'])
        _prepare_tracks(annotations['tracks'])

        return annotations

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
        self._db_task = models.Task.objects.prefetch_related('data__images', 'annotation_guide__assets').select_related('data__video', 'annotation_guide').get(pk=pk)
        self._db_data = self._db_task.data
        self._version = version

        db_labels = (self._db_task.project if self._db_task.project_id else self._db_task).label_set.all().prefetch_related(
            'attributespec_set')
        self._label_mapping = _get_label_mapping(db_labels)

    def _write_annotation_guide(self, zip_object, target_dir=None):
        annotation_guide = self._db_task.annotation_guide if hasattr(self._db_task, 'annotation_guide') else None
        _write_annotation_guide(zip_object, annotation_guide, self.ANNOTATION_GUIDE_FILENAME, self.ASSETS_DIRNAME, target_dir = target_dir)

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
            raise NotImplementedError("We don't currently support backing up tasks with data from cloud storage")

    def _write_task(self, zip_object, target_dir=None):
        task_dir = self._db_task.get_dirname()
        target_task_dir = os.path.join(target_dir, self.TASK_DIRNAME) if target_dir else self.TASK_DIRNAME
        self._write_directory(
            source_dir=task_dir,
            zip_object=zip_object,
            target_dir=target_task_dir,
            recursive=False,
        )

    def _write_manifest(self, zip_object, target_dir=None):
        def serialize_task():
            task_serializer = TaskReadSerializer(self._db_task)
            for field in ('url', 'owner', 'assignee'):
                task_serializer.fields.pop(field)

            task_labels = LabelSerializer(self._db_task.get_labels(), many=True)

            task = self._prepare_task_meta(task_serializer.data)
            task['labels'] = [self._prepare_label_meta(l) for l in task_labels.data if not l['has_parent']]
            for label in task['labels']:
                label['attributes'] = [self._prepare_attribute_meta(a) for a in label['attributes']]

            return task

        def serialize_segment(db_segment):
            db_job = db_segment.job_set.first()
            job_serializer = SimpleJobSerializer(db_job)
            for field in ('url', 'assignee'):
                job_serializer.fields.pop(field)
            job_data = self._prepare_job_meta(job_serializer.data)

            segment_serializer = SegmentSerializer(db_segment)
            segment_serializer.fields.pop('jobs')
            segment = segment_serializer.data
            segment_type = segment.pop("type")
            segment.update(job_data)

            if self._db_task.segment_size == 0 and segment_type == models.SegmentType.RANGE:
                segment.update(serialize_custom_file_mapping(db_segment))

            return segment

        def serialize_jobs():
            db_segments = list(self._db_task.segment_set.all())
            db_segments.sort(key=lambda i: i.job_set.first().id)
            return (serialize_segment(s) for s in db_segments)

        def serialize_custom_file_mapping(db_segment: models.Segment):
            if self._db_task.mode == 'annotation':
                files: Iterable[models.Image] = self._db_data.images.all().order_by('frame')
                segment_files = files[db_segment.start_frame : db_segment.stop_frame + 1]
                return {'files': list(frame.path for frame in segment_files)}
            else:
                assert False, (
                    "Backups with custom file mapping are not supported"
                    " in the 'interpolation' task mode"
                )

        def serialize_data():
            data_serializer = DataSerializer(self._db_data)
            data = data_serializer.data
            data['chunk_type'] = self._db_data.compressed_chunk_type

            # There are no deleted frames in DataSerializer so we need to pick it
            data['deleted_frames'] = self._db_data.deleted_frames

            if self._db_task.segment_size == 0:
                data['custom_segments'] = True

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
        self._write_annotation_guide(zip_obj, target_dir)

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
            raise ValueError('Unsupported type of file argument')

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

    def _create_labels(self, labels, db_task=None, db_project=None, parent_label=None):
        label_mapping = {}
        if db_task:
            label_relation = {
                'task': db_task
            }
        else:
            label_relation = {
                'project': db_project
            }


        for label in labels:
            label_name = label['name']
            attributes = label.pop('attributes', [])
            svg = label.pop('svg', '')
            sublabels  = label.pop('sublabels', [])

            db_label = models.Label.objects.create(**label_relation, parent=parent_label, **label)
            label_mapping[(parent_label.name if parent_label else '') + label_name] = {
                'value': db_label.id,
                'attributes': {},
            }

            label_mapping.update(self._create_labels(sublabels, db_task, db_project, db_label))

            if db_label.type == str(models.LabelType.SKELETON):
                for db_sublabel in list(db_label.sublabels.all()):
                    svg = svg.replace(f'data-label-name="{db_sublabel.name}"', f'data-label-id="{db_sublabel.id}"')
                models.Skeleton.objects.create(root=db_label, svg=svg)

            for attribute in attributes:
                attribute_name = attribute['name']
                attribute_serializer = AttributeSerializer(data=attribute)
                attribute_serializer.is_valid(raise_exception=True)
                db_attribute = attribute_serializer.save(label=db_label)
                label_mapping[(parent_label.name if parent_label else '') + label_name]['attributes'][attribute_name] = db_attribute.id

        return label_mapping

class TaskImporter(_ImporterBase, _TaskBackupBase):
    def __init__(self, file, user_id, org_id=None, project_id=None, subdir=None, label_mapping=None):
        super().__init__(logger=slogger.glob)
        self._file = file
        self._subdir = subdir
        self._user_id = user_id
        self._org_id = org_id
        self._manifest, self._annotations, self._annotation_guide, self._assets = self._read_meta()
        self._version = self._read_version(self._manifest)
        self._labels_mapping = label_mapping
        self._db_task = None
        self._project_id=project_id

    def _read_annotation_guide(self, zip_object):
        annotation_guide_filename = os.path.join(self._subdir or '', self.ANNOTATION_GUIDE_FILENAME)
        assets_dirname = os.path.join(self._subdir or '', self.ASSETS_DIRNAME)
        return _read_annotation_guide(zip_object, annotation_guide_filename, assets_dirname)

    def _read_meta(self):
        def read(zip_object):
            manifest_filename = os.path.join(self._subdir or '', self.MANIFEST_FILENAME)
            annotations_filename = os.path.join(self._subdir or '', self.ANNOTATIONS_FILENAME)
            manifest = JSONParser().parse(io.BytesIO(zip_object.read(manifest_filename)))
            annotations = JSONParser().parse(io.BytesIO(zip_object.read(annotations_filename)))
            annotation_guide, assets = self._read_annotation_guide(zip_object)
            return manifest, annotations, annotation_guide, assets

        if isinstance(self._file, str):
            with ZipFile(self._file, 'r') as input_file:
                return read(input_file)
        elif isinstance(self._file, ZipFile):
            return read(self._file)

        raise ValueError('Unsupported type of file argument')

    def _create_annotations(self, db_job, annotations):
        self._prepare_annotations(annotations, self._labels_mapping)

        serializer = LabeledDataSerializer(data=annotations)
        serializer.is_valid(raise_exception=True)
        dm.task.put_job_data(db_job.id, serializer.data)

    @staticmethod
    def _calculate_segment_size(jobs):
        # The type field will be missing in backups create before the GT jobs were introduced
        jobs = [
            j for j in jobs
            if j.get("type", models.JobType.ANNOTATION) == models.JobType.ANNOTATION
        ]

        segment_size = jobs[0]['stop_frame'] - jobs[0]['start_frame'] + 1
        overlap = 0 if len(jobs) == 1 else jobs[0]['stop_frame'] - jobs[1]['start_frame'] + 1

        return segment_size, overlap

    @staticmethod
    def _parse_custom_segments(*, jobs: Dict[str, Any]) -> JobFileMapping:
        segments = []

        for i, segment in enumerate(jobs):
            segment_size = segment['stop_frame'] - segment['start_frame'] + 1
            segment_files = segment['files']
            if len(segment_files) != segment_size:
                raise ValidationError(f"segment {i}: segment files do not match segment size")

            segments.append(segment_files)

        return segments

    def _import_task(self):
        def _write_data(zip_object):
            data_path = self._db_task.data.get_upload_dirname()
            task_dirname = os.path.join(self._subdir, self.TASK_DIRNAME) if self._subdir else self.TASK_DIRNAME
            data_dirname = os.path.join(self._subdir, self.DATA_DIRNAME) if self._subdir else self.DATA_DIRNAME
            uploaded_files = []
            for f in zip_object.namelist():
                if f.endswith(os.path.sep):
                    continue
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
        self._manifest['owner_id'] = self._user_id
        self._manifest['project_id'] = self._project_id

        if custom_segments := data.pop('custom_segments', False):
            job_file_mapping = self._parse_custom_segments(jobs=jobs)
            data['job_file_mapping'] = job_file_mapping

            for d in [self._manifest, data]:
                for k in [
                    'segment_size', 'overlap', 'start_frame', 'stop_frame',
                    'sorting_method', 'frame_filter', 'filename_pattern'
                ]:
                    d.pop(k, None)
        else:
            self._manifest['segment_size'], self._manifest['overlap'] = \
                self._calculate_segment_size(jobs)

        self._db_task = models.Task.objects.create(**self._manifest, organization_id=self._org_id)
        task_path = self._db_task.get_dirname()
        if os.path.isdir(task_path):
            shutil.rmtree(task_path)

        os.makedirs(task_path)

        if not self._labels_mapping:
            self._labels_mapping = self._create_labels(db_task=self._db_task, labels=labels)

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
        if custom_segments:
            data['job_file_mapping'] = job_file_mapping

        _create_thread(self._db_task.pk, data.copy(), isBackupRestore=True)
        self._db_task.refresh_from_db()
        db_data.refresh_from_db()

        db_data.start_frame = data['start_frame']
        db_data.stop_frame = data['stop_frame']
        db_data.frame_filter = data['frame_filter']
        db_data.deleted_frames = data_serializer.initial_data.get('deleted_frames', [])
        db_data.storage = StorageChoice.LOCAL
        db_data.save(update_fields=['start_frame', 'stop_frame', 'frame_filter', 'storage', 'deleted_frames'])

        # Recreate Ground Truth jobs (they won't be created automatically)
        self._import_gt_jobs(jobs)

        for db_job, job in zip(self._get_db_jobs(), jobs):
            db_job.status = job['status']
            db_job.save()

    def _import_gt_jobs(self, jobs):
        for job in jobs:
            # The type field will be missing in backups create before the GT jobs were introduced
            try:
                raw_job_type = job.get("type", models.JobType.ANNOTATION.value)
                job_type = models.JobType(raw_job_type)
            except ValueError:
                raise ValidationError(f"Unexpected job type {raw_job_type}")

            if job_type == models.JobType.GROUND_TRUTH:
                job_serializer = JobWriteSerializer(data={
                    'task_id': self._db_task.id,
                    'type': job_type.value,
                    'frame_selection_method': models.JobFrameSelectionMethod.MANUAL.value,
                    'frames': job['frames']
                })
                job_serializer.is_valid(raise_exception=True)
                job_serializer.save()
            elif job_type == models.JobType.ANNOTATION:
                continue
            else:
                assert False

    def _import_annotations(self):
        db_jobs = self._get_db_jobs()
        for db_job, annotations in zip(db_jobs, self._annotations):
            self._create_annotations(db_job, annotations)

    def _import_annotation_guide(self):
        if self._annotation_guide:
            markdown = self._annotation_guide.decode()
            _import_annotation_guide({ 'markdown': markdown, 'task_id': self._db_task.id }, self._assets)

    def import_task(self):
        self._import_task()
        self._import_annotations()
        self._import_annotation_guide()
        return self._db_task

@transaction.atomic
def _import_task(filename, user, org_id):
    av_scan_paths(filename)
    task_importer = TaskImporter(filename, user, org_id)
    db_task = task_importer.import_task()
    return db_task.id

class _ProjectBackupBase(_BackupBase):
    MANIFEST_FILENAME = 'project.json'
    TASKNAME_TEMPLATE = 'task_{}'

    def _prepare_project_meta(self, project):
        allowed_fields = {
            'bug_tracker',
            'deimension',
            'labels',
            'name',
            'status',
        }

        return self._prepare_meta(allowed_fields, project)

class ProjectExporter(_ExporterBase, _ProjectBackupBase):
    def __init__(self, pk, version=Version.V1):
        super().__init__(logger=slogger.project[pk])
        self._db_project = models.Project.objects.prefetch_related('tasks', 'annotation_guide__assets').select_related('annotation_guide').get(pk=pk)
        self._version = version

        db_labels = self._db_project.label_set.all().prefetch_related('attributespec_set')
        self._label_mapping = _get_label_mapping(db_labels)

    def _write_annotation_guide(self, zip_object, target_dir=None):
        annotation_guide = self._db_project.annotation_guide if hasattr(self._db_project, 'annotation_guide') else None
        _write_annotation_guide(zip_object, annotation_guide, self.ANNOTATION_GUIDE_FILENAME, self.ASSETS_DIRNAME, target_dir = target_dir)

    def _write_tasks(self, zip_object):
        for idx, db_task in enumerate(self._db_project.tasks.all().order_by('id')):
            if db_task.data is not None:
                TaskExporter(db_task.id, self._version).export_to(zip_object, self.TASKNAME_TEMPLATE.format(idx))

    def _write_manifest(self, zip_object):
        def serialize_project():
            project_serializer = ProjectReadSerializer(self._db_project)
            for field in ('assignee', 'owner', 'url'):
                project_serializer.fields.pop(field)

            project_labels = LabelSerializer(self._db_project.get_labels(), many=True).data

            project = self._prepare_project_meta(project_serializer.data)
            project['labels'] = [self._prepare_label_meta(l) for l in project_labels if not l['has_parent']]
            for label in project['labels']:
                label['attributes'] = [self._prepare_attribute_meta(a) for a in label['attributes']]

            return project

        project = serialize_project()
        project['version'] = self._version.value

        zip_object.writestr(self.MANIFEST_FILENAME, data=JSONRenderer().render(project))

    def export_to(self, filename):
        with ZipFile(filename, 'w') as output_file:
            self._write_annotation_guide(output_file)
            self._write_manifest(output_file)
            self._write_tasks(output_file)

class ProjectImporter(_ImporterBase, _ProjectBackupBase):
    TASKNAME_RE = r'task_(\d+)/'

    def __init__(self, filename, user_id, org_id=None):
        super().__init__(logger=slogger.glob)
        self._filename = filename
        self._user_id = user_id
        self._org_id = org_id
        self._manifest, self._annotation_guide, self._assets = self._read_meta()
        self._version = self._read_version(self._manifest)
        self._db_project = None
        self._labels_mapping = {}

    def _read_annotation_guide(self, zip_object):
        return _read_annotation_guide(zip_object, self.ANNOTATION_GUIDE_FILENAME, self.ASSETS_DIRNAME)

    def _read_meta(self):
        with ZipFile(self._filename, 'r') as input_file:
            manifest = JSONParser().parse(io.BytesIO(input_file.read(self.MANIFEST_FILENAME)))
            annotation_guide, assets = self._read_annotation_guide(input_file)

        return manifest, annotation_guide, assets

    def _import_project(self):
        labels = self._manifest.pop('labels')

        self._prepare_project_meta(self._manifest)
        self._manifest["owner_id"] = self._user_id

        self._db_project = models.Project.objects.create(**self._manifest, organization_id=self._org_id)
        project_path = self._db_project.get_dirname()
        if os.path.isdir(project_path):
            shutil.rmtree(project_path)
        os.makedirs(project_path)

        self._labels_mapping = self._create_labels(db_project=self._db_project, labels=labels)

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
                TaskImporter(
                    file=zf,
                    user_id=self._user_id,
                    org_id=self._org_id,
                    project_id=self._db_project.id,
                    subdir=task_dir,
                    label_mapping=self._labels_mapping).import_task()

    def _import_annotation_guide(self):
        if self._annotation_guide:
            markdown = self._annotation_guide.decode()
            _import_annotation_guide({ 'markdown': markdown, 'project_id': self._db_project.id }, self._assets)

    def import_project(self):
        self._import_project()
        self._import_annotation_guide()
        self._import_tasks()

        return self._db_project

@transaction.atomic
def _import_project(filename, user, org_id):
    av_scan_paths(filename)
    project_importer = ProjectImporter(filename, user, org_id)
    db_project = project_importer.import_project()
    return db_project.id

def _create_backup(db_instance, Exporter, output_path, logger, cache_ttl):
    try:
        cache_dir = get_export_cache_dir(db_instance)
        output_path = os.path.join(cache_dir, output_path)

        instance_time = timezone.localtime(db_instance.updated_date).timestamp()
        if not (os.path.exists(output_path) and \
                instance_time <= os.path.getmtime(output_path)):
            os.makedirs(cache_dir, exist_ok=True)
            with tempfile.TemporaryDirectory(dir=cache_dir) as temp_dir:
                temp_file = os.path.join(temp_dir, 'dump')
                exporter = Exporter(db_instance.id)
                exporter.export_to(temp_file)
                os.replace(temp_file, output_path)

            archive_ctime = os.path.getctime(output_path)
            scheduler = django_rq.get_scheduler(settings.CVAT_QUEUES.IMPORT_DATA.value)
            cleaning_job = scheduler.enqueue_in(time_delta=cache_ttl,
                func=clear_export_cache,
                file_path=output_path,
                file_ctime=archive_ctime,
                logger=logger)
            logger.info(
                "The {} '{}' is backuped at '{}' "
                "and available for downloading for the next {}. "
                "Export cache cleaning job is enqueued, id '{}'".format(
                    "project" if isinstance(db_instance, Project) else 'task',
                    db_instance.name, output_path, cache_ttl,
                    cleaning_job.id))

        return output_path
    except Exception:
        log_exception(logger)
        raise

def export(db_instance, request, queue_name):
    action = request.query_params.get('action', None)
    filename = request.query_params.get('filename', None)

    if action not in (None, 'download'):
        raise serializers.ValidationError(
            "Unexpected action specified for the request")

    if isinstance(db_instance, Task):
        obj_type = 'task'
        logger = slogger.task[db_instance.pk]
        Exporter = TaskExporter
        cache_ttl = TASK_CACHE_TTL
        use_target_storage_conf = request.query_params.get('use_default_location', True)
    elif isinstance(db_instance, Project):
        obj_type = 'project'
        logger = slogger.project[db_instance.pk]
        Exporter = ProjectExporter
        cache_ttl = PROJECT_CACHE_TTL
        use_target_storage_conf = request.query_params.get('use_default_location', True)
    else:
        raise Exception(
            "Unexpected type of db_instance: {}".format(type(db_instance)))
    use_settings = to_bool(use_target_storage_conf)
    obj = db_instance if use_settings else request.query_params
    location_conf = get_location_configuration(
        obj=obj,
        use_settings=use_settings,
        field_name=StorageType.TARGET
    )

    queue = django_rq.get_queue(queue_name)
    rq_id = f"export:{obj_type}.id{db_instance.pk}-by-{request.user}"
    rq_job = queue.fetch_job(rq_id)

    last_instance_update_time = timezone.localtime(db_instance.updated_date)
    timestamp = datetime.strftime(last_instance_update_time, "%Y_%m_%d_%H_%M_%S")
    location = location_conf.get('location')

    if rq_job:
        rq_request = rq_job.meta.get('request', None)
        request_time = rq_request.get("timestamp", None) if rq_request else None
        if request_time is None or request_time < last_instance_update_time:
            # in case the server is configured with ONE_RUNNING_JOB_IN_QUEUE_PER_USER
            # we have to enqueue dependent jobs after canceling one
            rq_job.cancel(enqueue_dependents=settings.ONE_RUNNING_JOB_IN_QUEUE_PER_USER)
            rq_job.delete()
        else:
            if rq_job.is_finished:
                if location == Location.LOCAL:
                    file_path = rq_job.return_value()

                    if not file_path:
                        return Response('A result for exporting job was not found for finished RQ job', status=status.HTTP_500_INTERNAL_SERVER_ERROR)

                    elif not os.path.exists(file_path):
                        return Response('The result file does not exist in export cache', status=status.HTTP_500_INTERNAL_SERVER_ERROR)

                    filename = filename or build_backup_file_name(
                        class_name=obj_type,
                        identifier=db_instance.name,
                        timestamp=timestamp,
                        extension=os.path.splitext(file_path)[1]
                    )

                    if action == "download":
                        rq_job.delete()
                        return sendfile(request, file_path, attachment=True,
                            attachment_filename=filename)

                    return Response(status=status.HTTP_201_CREATED)

                elif location == Location.CLOUD_STORAGE:
                    rq_job.delete()
                    return Response(status=status.HTTP_200_OK)
                else:
                    raise NotImplementedError()
            elif rq_job.is_failed:
                exc_info = rq_job.meta.get('formatted_exception', str(rq_job.exc_info))
                rq_job.delete()
                return Response(exc_info,
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            else:
                return Response(status=status.HTTP_202_ACCEPTED)

    ttl = dm.views.PROJECT_CACHE_TTL.total_seconds()
    user_id = request.user.id

    func = _create_backup if location == Location.LOCAL else export_resource_to_cloud_storage
    func_args = (db_instance, Exporter, '{}_backup.zip'.format(obj_type), logger, cache_ttl)

    if location == Location.CLOUD_STORAGE:
        try:
            storage_id = location_conf['storage_id']
        except KeyError:
            raise serializers.ValidationError(
                'Cloud storage location was selected as the destination,'
                ' but cloud storage id was not specified')

        db_storage = get_cloud_storage_for_import_or_export(
            storage_id=storage_id, request=request,
            is_default=location_conf['is_default'])
        filename_pattern = build_backup_file_name(
            class_name=obj_type,
            identifier=db_instance.name,
            timestamp=timestamp,
        )
        func_args = (db_storage, filename, filename_pattern, _create_backup) + func_args

    with get_rq_lock_by_user(queue, user_id):
        queue.enqueue_call(
            func=func,
            args=func_args,
            job_id=rq_id,
            meta=get_rq_job_meta(request=request, db_obj=db_instance),
            depends_on=define_dependent_job(queue, user_id, rq_id=rq_id),
            result_ttl=ttl,
            failure_ttl=ttl,
        )
    return Response(status=status.HTTP_202_ACCEPTED)


def _import(importer, request, queue, rq_id, Serializer, file_field_name, location_conf, filename=None):
    rq_job = queue.fetch_job(rq_id)

    if (user_id_from_meta := getattr(rq_job, 'meta', {}).get('user', {}).get('id')) and user_id_from_meta != request.user.id:
        return Response(status=status.HTTP_403_FORBIDDEN)

    if not rq_job:
        org_id = getattr(request.iam_context['organization'], 'id', None)
        location = location_conf.get('location')

        if location == Location.LOCAL:
            if not filename:
                serializer = Serializer(data=request.data)
                serializer.is_valid(raise_exception=True)
                payload_file = serializer.validated_data[file_field_name]
                with NamedTemporaryFile(
                    prefix='cvat_',
                    dir=settings.TMP_FILES_ROOT,
                    delete=False) as tf:
                    filename = tf.name
                    for chunk in payload_file.chunks():
                        tf.write(chunk)
        else:
            file_name = request.query_params.get('filename')
            assert file_name, "The filename wasn't specified"
            try:
                storage_id = location_conf['storage_id']
            except KeyError:
                raise serializers.ValidationError(
                    'Cloud storage location was selected as the source,'
                    ' but cloud storage id was not specified')

            db_storage = get_cloud_storage_for_import_or_export(
                storage_id=storage_id, request=request,
                is_default=location_conf['is_default'])

            key = filename
            with NamedTemporaryFile(prefix='cvat_', dir=settings.TMP_FILES_ROOT, delete=False) as tf:
                filename = tf.name

        func = import_resource_with_clean_up_after
        func_args = (importer, filename, request.user.id, org_id)

        if location == Location.CLOUD_STORAGE:
            func_args = (db_storage, key, func) + func_args
            func = import_resource_from_cloud_storage

        user_id = request.user.id

        with get_rq_lock_by_user(queue, user_id):
            rq_job = queue.enqueue_call(
                func=func,
                args=func_args,
                job_id=rq_id,
                meta={
                    'tmp_file': filename,
                    **get_rq_job_meta(request=request, db_obj=None)
                },
                depends_on=define_dependent_job(queue, user_id),
                result_ttl=settings.IMPORT_CACHE_SUCCESS_TTL.total_seconds(),
                failure_ttl=settings.IMPORT_CACHE_FAILED_TTL.total_seconds()
            )
    else:
        if rq_job.is_finished:
            project_id = rq_job.return_value()
            rq_job.delete()
            return Response({'id': project_id}, status=status.HTTP_201_CREATED)
        elif rq_job.is_failed:
            exc_info = process_failed_job(rq_job)
            # RQ adds a prefix with exception class name
            import_error_prefix = '{}.{}'.format(
                CvatImportError.__module__, CvatImportError.__name__)
            if exc_info.startswith(import_error_prefix):
                exc_info = exc_info.replace(import_error_prefix + ': ', '')
                return Response(data=exc_info,
                    status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response(data=exc_info,
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    serializer = RqIdSerializer(data={'rq_id': rq_id})
    serializer.is_valid(raise_exception=True)

    return Response(serializer.data, status=status.HTTP_202_ACCEPTED)

def get_backup_dirname():
    return settings.TMP_FILES_ROOT

def import_project(request, queue_name, filename=None):
    if 'rq_id' in request.data:
        rq_id = request.data['rq_id']
    else:
        rq_id = get_import_rq_id('project', uuid.uuid4(), 'backup', request.user)
    Serializer = ProjectFileSerializer
    file_field_name = 'project_file'

    location_conf = get_location_configuration(
        obj=request.query_params,
        field_name=StorageType.SOURCE,
    )

    queue = django_rq.get_queue(queue_name)

    return _import(
        importer=_import_project,
        request=request,
        queue=queue,
        rq_id=rq_id,
        Serializer=Serializer,
        file_field_name=file_field_name,
        location_conf=location_conf,
        filename=filename
    )

def import_task(request, queue_name, filename=None):
    rq_id = request.data.get('rq_id',  get_import_rq_id('task', uuid.uuid4(), 'backup', request.user))

    Serializer = TaskFileSerializer
    file_field_name = 'task_file'

    location_conf = get_location_configuration(
        obj=request.query_params,
        field_name=StorageType.SOURCE
    )

    queue = django_rq.get_queue(queue_name)

    return _import(
        importer=_import_task,
        request=request,
        queue=queue,
        rq_id=rq_id,
        Serializer=Serializer,
        file_field_name=file_field_name,
        location_conf=location_conf,
        filename=filename
    )
