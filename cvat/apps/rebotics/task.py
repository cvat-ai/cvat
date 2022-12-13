import os
import sys
import random
from urllib import parse as urlparse, request as urlrequest

import django_rq
from django.db import transaction
from django.utils.timezone import now
from django.contrib.auth import get_user_model

from cvat.apps.engine import task as task_api
from cvat.apps.engine.models import Project, Task, Data, Job, RemoteFile, \
    S3File, Label, LabeledShape, AttributeSpec, LabeledShapeAttributeVal, \
    ModeChoice, ShapeType, SourceType, AttributeType, StorageMethodChoice, \
    SortingMethod
from cvat.apps.engine.views import TaskViewSet
from rebotics.s3_client import s3_client
from utils.dataset_manifest import S3ManifestManager

User = get_user_model()

# for incoming data reference see rebotics/example_import.json


def _fix_coordinates(item, width, height):
    if item['lowerx'] > item['upperx']:
        item['lowerx'], item['upperx'] = item['upperx'], item['lowerx']
    if item['lowery'] > item['uppery']:
        item['lowery'], item['uppery'] = item['uppery'], item['lowery']
    if item['lowerx'] < 0:
        item['lowerx'] = 0
    if item['upperx'] > width:
        item['upperx'] = width
    if item['lowery'] < 0:
        item['lowery'] = 0
    if item['uppery'] > height:
        item['uppery'] = height


def _rand_color():
    choices = '0123456789ABCDEF'
    color = '#'
    for i in range(6):
        color += random.choice(choices)
    return color


def _get_file_name(url):
    return os.path.basename(
        urlrequest.url2pathname(
            urlparse.urlparse(
                url
            ).path
        )
    )


class ShapesImporter:
    def __init__(self, task_id):
        self.task = Task.objects.get(pk=task_id)
        self.labels = {}    # Labels
        self.specs = {}     # AttributeSpecs
        self.shapes = None  # LabeledShapes
        self.vals = None    # AttributeVals
        self.jobs = None
        self.job_n = None
        self.files = None
        self.image_data = None

    def _get_label(self, item: dict) -> Label:
        if item['label'] in self.labels:
            label = self.labels[item['label']]
        else:
            label, _ = Label.objects.get_or_create(
                project_id=self.task.project_id,
                name=item['label'],
                defaults={'color': _rand_color()}
            )
            self.labels[item['label']] = label

        return label

    def _get_spec(self, label: Label, text: str) -> AttributeSpec:
        if label.name in self.specs:
            specs = self.specs[label.name]
        else:
            specs = {}
            self.specs[label.name] = specs

        if text in specs:
            spec = specs[text]
        else:
            spec, _ = AttributeSpec.objects.get_or_create(
                label=label,
                name=text,
                defaults={'mutable': True, 'input_type': AttributeType.TEXT}
            )
            specs[text] = spec

        return spec

    def _import_item(self, item: dict, frame: int, group: int, image_size: tuple) -> None:
        _fix_coordinates(item, *image_size)
        label = self._get_label(item)

        # annotation shape
        self.shapes.append(LabeledShape(
            job=self.jobs[self.job_n],
            label=label,
            frame=frame,
            group=group,
            type=ShapeType.RECTANGLE,
            source=SourceType.AUTO,
            points=[item['lowerx'], item['lowery'], item['upperx'], item['uppery']],
        ))

        # related upc text
        upc = item.get('upc', None)
        if upc:
            spec = self._get_spec(label, 'UPC')
            self.vals.append(LabeledShapeAttributeVal(
                shape_id=0,
                spec=spec,
                value=upc,
            ))
        else:
            self.vals.append(None)

    def _save(self) -> None:
        LabeledShape.objects.bulk_create(self.shapes)
        save_vals = []
        for i, shape in enumerate(self.shapes):
            if self.vals[i] is not None:
                self.vals[i].shape_id = shape.pk
                save_vals.append(self.vals[i])
        LabeledShapeAttributeVal.objects.bulk_create(save_vals)

    def _get_image_data(self) -> dict:
        manifest_manager = S3ManifestManager(self.task.data.get_s3_manifest_path())
        manifest_manager.init_index()
        return {f'{props["name"]}{props["extension"]}': (props['width'], props['height'])
                      for _, props in manifest_manager}

    def _get_image_size(self, file: S3File) -> tuple:
        file_name = _get_file_name(file.meta['image'])
        return self.image_data.get(file_name, (sys.maxsize, sys.maxsize))

    def _next_job(self, frame: int) -> None:
        if frame > self.jobs[self.job_n].segment.stop_frame:
            self.job_n += 1

    def _reset(self) -> None:
        self.files = self.task.data.s3_files.order_by('pk')
        self.image_data = self._get_image_data()
        self.jobs = Job.objects.filter(segment__task=self.task).select_related('segment')
        self.job_n = 0
        self.shapes = []
        self.vals = []

    def _clean_meta(self) -> None:
        for file in self.files:
            file.meta.pop('items')
            file.meta.pop('price_tags')
        S3File.objects.bulk_update(self.files, fields=('meta',))

    def perform_import(self) -> None:
        self._reset()

        for frame, file in enumerate(self.files):
            image_size = self._get_image_size(file)
            self._next_job(frame)
            for item in file.meta['items']:
                self._import_item(item, frame, 0, image_size)
            for item in file.meta['price_tags']:
                self._import_item(item, frame, 1, image_size)

        self._save()
        self._clean_meta()


@transaction.atomic
def _create_thread(task_id, cvat_data):
    # finish task creating
    task_api._create_thread(task_id, cvat_data)

    # import annotations
    ShapesImporter(task_id).perform_import()


def create(data: list, retailer: User):
    project, _ = Project.objects.get_or_create(owner=retailer, name='Retailer import')
    size = len(data)
    db_data = Data.objects.create(
        image_quality=80,
        storage_method=StorageMethodChoice.CACHE,
        size=size,
        stop_frame=size - 1,
        sorting_method=SortingMethod.PREDEFINED,
    )
    os.makedirs(db_data.get_upload_dirname(), exist_ok=True)
    task = Task.objects.create(
        project=project,
        data=db_data,
        name=now().strftime('Import %Y-%m-%d %H:%M:%S %Z'),
        owner=retailer,
        mode=ModeChoice.ANNOTATION,
        segment_size=20,
    )

    remote_files = []
    for image_data in data:
        remote_files.append(RemoteFile(
            data=db_data,
            file=image_data['image'],
            meta=image_data,
        ))
    RemoteFile.objects.bulk_create(remote_files)

    # as for API call from UI.
    cvat_data = {
        'chunk_size': db_data.chunk_size,
        'size': db_data.size,
        'image_quality': db_data.image_quality,
        'start_frame': db_data.start_frame,
        'stop_frame': db_data.stop_frame,
        'frame_filter': db_data.frame_filter,
        'compressed_chunk_type': db_data.compressed_chunk_type,
        'original_chunk_type': db_data.original_chunk_type,
        'client_files': [],
        'server_files': [],
        'remote_files': [db_file.file for db_file in remote_files],
        'use_zip_chunks': True,
        'use_cache': True,
        'copy_data': False,
        'storage_method': db_data.storage_method,
        'storage': db_data.storage,
        'sorting_method': db_data.sorting_method,
    }

    q = django_rq.get_queue('default')
    q.enqueue_call(_create_thread, args=(task.pk, cvat_data),
                   job_id="/api/tasks/{}".format(task.pk))

    return task.pk


def check(task_id):
    # TODO: get the code of _get_rq_response and implement it here.
    state = TaskViewSet._get_rq_response(queue='default', job_id=f"/api/tasks/{task_id}")
    if state['state'] == 'Finished':
        try:
            task = Task.objects.get(pk=task_id)
            preview_path = task.data.get_s3_preview_path()
            preview_url = s3_client.get_presigned_url(preview_path)
            s3_files = task.data.s3_files.all()
            task_data = [
                {
                    'id': f.pk,
                    'image':  f.file.url,
                    'preview': preview_url,
                } for f in s3_files
            ]
            print(task_data)
            return None, task_data
        except Task.DoesNotExist:
            return None, None
    if state['state'] == 'Failed':
        try:
            task = Task.objects.get(pk=task_id)
            task.data.delete()
        except Task.DoesNotExist:
            pass
    return state, None
