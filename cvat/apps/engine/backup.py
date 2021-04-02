import io
import os
from enum import Enum
from zipfile import ZipFile

from rest_framework.parsers import JSONParser
from rest_framework.renderers import JSONRenderer

import cvat.apps.dataset_manager as dm
from cvat.apps.engine import models
from cvat.apps.engine.serializers import (AttributeSerializer, DataSerializer,
                                          FrameMetaSerializer,
                                          LabeledDataSerializer,
                                          SegmentSerializer,
                                          SimpleJobSerializer, TaskSerializer)
from cvat.apps.engine.utils import av_scan_paths


class TaskExporter():
    class Version(Enum):
        V1 = 'v1'

    MANIFEST_FILENAME = 'manifest.json'
    DATA_DIRNAME = 'data'
    TASK_DIRNAME = 'task'

    def __init__(self, pk, version=Version.V1):
        self._db_task = models.Task.objects.prefetch_related('data__images').select_related('data__video').get(pk=pk)
        self._db_task.segment_set.all().prefetch_related('job_set')
        self._db_data = self._db_task.data
        self._version = version

    def _write_directory(self, source_dir, zip_object, target_dir, exclude=None):
        exclude = [] if exclude is None else exclude
        for root, dirs, files in os.walk(source_dir, topdown=True):
            dirs[:] = [d for d in dirs if d not in exclude]
            for filename in files:
                file_path = os.path.join(root, filename)
                arcname = os.path.normpath(os.path.join(target_dir, os.path.relpath(root, source_dir), filename))
                zip_object.write(filename=file_path, arcname=arcname)

    def _write_data(self, zip_object):
        data_dir = self._db_data.get_data_dirname()
        self._write_directory(source_dir=data_dir, zip_object=zip_object, target_dir=self.DATA_DIRNAME)

    def _write_task(self, zip_object):
        task_dir = self._db_task.get_task_dirname()
        self._write_directory(source_dir=task_dir, zip_object=zip_object, target_dir=self.TASK_DIRNAME, exclude=('artifacts', 'export_cache', 'logs'))

    def _write_manifest(self, zip_object):
        task_serializer = TaskSerializer(self._db_task)
        task_serializer.fields.pop('url')
        task_serializer.fields['owner'].fields.pop('url')
        task_serializer.fields.pop('segments')
        segments = []
        for db_segment in self._db_task.segment_set.all():
            jobs = []
            for db_job in db_segment.job_set.all():
                job_serializer = SimpleJobSerializer(db_job)
                job_serializer.fields.pop('url')
                jobs.append(job_serializer.data)
            segment_serailizer = SegmentSerializer(db_segment)
            segment_serailizer.fields.pop('jobs')
            segment = segment_serailizer.data
            segment['jobs'] = jobs
            segments.append(segment)

        data_serializer = DataSerializer(self._db_data)
        if hasattr(self._db_task.data, 'video'):
            media = [self._db_task.data.video]
        else:
            media = list(self._db_task.data.images.order_by('frame'))

        frame_meta = [{
            'width': item.width,
            'height': item.height,
            'name': item.path,
        } for item in media]
        frame_meta_serializer = FrameMetaSerializer(data=frame_meta, many=True)

        job_annotations = {}
        for db_segment in self._db_task.segment_set.all():
            for db_job in db_segment.job_set.all():
                annotations = dm.task.get_job_data(db_job.id)
                annotations_serializer = LabeledDataSerializer(data=annotations)
                annotations_serializer.is_valid(raise_exception=True)
                job_annotations[db_job.id] = annotations_serializer.data

        manifest = task_serializer.data
        manifest['version'] = self._version.value
        manifest['data'] = data_serializer.data
        frame_meta_serializer.is_valid(raise_exception=True)
        manifest['data']['frames'] = frame_meta_serializer.data
        for segment in segments:
            for job in segment['jobs']:
                job['annotations'] = job_annotations[job['id']]
        manifest['segments'] = segments

        zip_object.writestr(self.MANIFEST_FILENAME, data=JSONRenderer().render(manifest))

    def export_to(self, filename):
        with ZipFile(filename, 'x') as output_file:
            self._write_data(output_file)
            self._write_task(output_file)
            self._write_manifest(output_file)

class TaskImporter():
    class Version(Enum):
        V1 = 'v1'

    MANIFEST_FILENAME = 'manifest.json'
    DATA_DIRNAME = 'data'
    TASK_DIRNAME = 'task'

    def __init__(self, filename):
        self._filename = filename
        self._manifest = self._read_manifest()
        self._version = self._read_version()

    def _read_manifest(self):
        with ZipFile(self._filename, 'r') as input_file:
            return JSONParser().parse(io.BytesIO(input_file.read(self.MANIFEST_FILENAME)))

    def _read_version(self):
        version = self._manifest.pop('version')
        try:
            return self.Version(version)
        except ValueError:
            raise ValueError('{} version is not supported'.format(version))

    def _prepare_meta(self, allowed_keys, meta):
        for key in list(meta.keys()):
            if key not in allowed_keys:
                del meta[key]

    def _prepare_task_meta(self, task):
        allowed_fields = (
            'name',
            'mode',
            'bug_tracker',
            'overlap',
            'segment_size',
            'status',
            'dimension',
            'subset',
        )

        self._prepare_meta(allowed_fields, task)

    def _prepare_data_meta(self, data):
        allowed_fields = (
            'chunk_size',
            'size',
            'image_quality',
            'start_frame',
            'stop_frame',
            'frame_filter',
            'compressed_chunk_type',
            'original_chunk_type',
            'storage_method',
            'storage',
        )
        self._prepare_meta(allowed_fields, data)
        if not data['frame_filter']:
            data.pop('frame_filter')

    def _prepare_segment_meta(self, segments):
        allowed_fields = (
            'start_frame',
            'stop_frame',
        )
        self._prepare_meta(allowed_fields, segments)

    def _prepare_job_meta(self, jobs):
        allowed_fields = (
            'status',
        )
        self._prepare_meta(allowed_fields, jobs)

    def _prepare_annotations(self, annotations):
        allowed_fields = (
            'label_id',
            'type',
            'occluded',
            'z_order',
            'points',
            'frame',
            'group',
            'source',
            'attributes',
            'shapes',
        )

        for tag in annotations['tags']:
            self._prepare_meta(allowed_fields, tag)
        for shape in annotations['shapes']:
            self._prepare_meta(allowed_fields, shape)
        for track in annotations['tracks']:
            self._prepare_meta(allowed_fields, track)

    def _create_labels(self, db_task, labels):
        label_mapping = {}
        attribute_mapping = {}

        for label in labels:
            label_id = label.pop('id')
            attributes = label.pop('attributes', [])
            db_label = models.Label.objects.create(task=db_task, **label)
            label_mapping[label_id] = db_label.id

            for attribute in attributes:
                attribute_id = attribute.pop('id')
                # attribute['label_id'] = db_label.id
                attribute_serializer = AttributeSerializer(data=attribute)
                attribute_serializer.is_valid(raise_exception=True)
                db_attribute = attribute_serializer.save(label=db_label)
                attribute_mapping[attribute_id] = db_attribute.id

        return label_mapping, attribute_mapping

    def _create_job(self, db_segment, job):
        self._prepare_job_meta(job)
        db_job = models.Job.objects.create(segment=db_segment, **job)
        return db_job

    def _update_annotations(self, labels_mapping, attributes_mapping, annotations):
        def update_ids(objects):
            for obj in objects:
                obj['label_id'] = labels_mapping[obj['label_id']]
                for attribute in obj['attributes']:
                    attribute['spec_id'] = attributes_mapping[attribute['spec_id']]

        update_ids(annotations['tags'])
        update_ids(annotations['shapes'])
        update_ids(annotations['tracks'])
        for track in annotations['tracks']:
            for track_shape in track['shapes']:
                track_shape.pop('id')
                for attribute in track_shape['attributes']:
                    attribute['spec_id'] = attributes_mapping[attribute['spec_id']]
                    attribute.pop('id')

    def _create_annotations(self, db_job, labels_mapping, attributes_mapping, annotations):
        self._update_annotations(labels_mapping, attributes_mapping, annotations)
        self._prepare_annotations(annotations)

        serializer = LabeledDataSerializer(data=annotations)
        serializer.is_valid(raise_exception=True)
        dm.task.put_job_data(db_job.id, serializer.data)

    def _create_segments(self, db_task, labels_mapping, attributes_mapping, segments):
        for segment in segments:
            jobs = segment.pop('jobs')
            self._prepare_segment_meta(segment)
            db_segment = models.Segment.objects.create(task=db_task, **segment)
            for job in jobs:
                annotations = job.pop('annotations')
                db_job = self._create_job(db_segment, job)
                self._create_annotations(db_job, labels_mapping, attributes_mapping, annotations)

    def _create_data(self, data):
        self._prepare_data_meta(data)
        data_serializer = DataSerializer(data=data)
        data_serializer.is_valid(raise_exception=True)
        db_data = data_serializer.save()
        return db_data

    def _create_frames(self, db_data, frames):
        for frame in frames:
            frame['data'] = db_data
            frame['path'] = frame.pop('name')

        if self._db_task.mode == 'annotation':
            if self._db_task.dimension == models.DimensionType.DIM_2D:
                models.Image.objects.bulk_create(frames)
            # else: TODO
        else:
            models.Video.objects.create(**frames[0])

    def _create_task(self):
        data = self._manifest.pop('data')
        frames = data.pop('frames')
        labels = self._manifest.pop('labels')
        segments = self._manifest.pop('segments')

        db_data = self._create_data(data)

        self._prepare_task_meta(self._manifest)
        self._manifest['data_id'] = db_data.id

        self._db_task = models.Task.objects.create(data=db_data, **self._manifest)

        self._create_frames(db_data, frames)

        labels_mapping, attributes_mapping = self._create_labels(self._db_task, labels)

        self._create_segments(self._db_task, labels_mapping, attributes_mapping, segments)

    def _import_task(self):
        data = self._manifest.pop('data')
        frames = data.pop('frames')
        labels = self._manifest.pop('labels')
        self._segments = self._manifest.pop('segments')

        db_data = self._create_data(data)

        self._prepare_task_meta(self._manifest)
        self._manifest['data_id'] = db_data.id

        self._db_task = models.Task.objects.create(data=db_data, **self._manifest)

        self._create_frames(db_data, frames)

        self._labels_mapping, self._attributes_mapping = self._create_labels(self._db_task, labels)

        return self._db_task.id

    def _import_annotations(self):
        if not hasattr(self, '_labels_mapping') or not hasattr(self, '_attributes_mapping') or not hasattr(self, '_segments'):
            raise Exception('Call import_task() first')

        self._create_segments(self._db_task, self._labels_mapping, self._attributes_mapping, self._segments)

    def _import_media(self):
        task_path = self._db_task.get_task_dirname()
        if os.path.isdir(task_path):
            shutil.rmtree(task_path)

        os.makedirs(self._db_task.get_task_logs_dirname())
        os.makedirs(self._db_task.get_task_artifacts_dirname())

        data_path = self._db_task.data.get_data_dirname()

        with ZipFile(self._filename, 'r') as input_file:
            for f in input_file.namelist():
                if f.startswith(self.DATA_DIRNAME + os.path.sep):
                    with open(os.path.join(data_path, os.path.relpath(f, self.DATA_DIRNAME)), "wb") as target_file:
                        target_file.write(input_file.read(f))
                elif f.startswith(self.TASK_DIRNAME + os.path.sep):
                    with open(os.path.join(task_path, os.path.relpath(f, self.TASK_DIRNAME)), "wb") as target_file:
                        target_file.write(input_file.read(f))

    def import_task(self):
        self._import_task()
        self._import_annotations()
        self._import_media()
        return self._db_task


def import_task(filename):
    av_scan_paths(filename)
    task_importer = TaskImporter(filename)
    db_task = task_importer.import_task()
    return db_task.id
