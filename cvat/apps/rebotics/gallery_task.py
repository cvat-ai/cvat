import os
import sys
import random
import requests
from urllib import parse as urlparse, request as urlrequest
from .serializers import DetectionImageSerializer, DetectionImageListSerializer
from .models import GalleryImportProgress, GIStatusSuccess, GIStatusFailed, GIInstanceLocal

import django_rq
from rq.job import JobStatus, Job as RqJob
from django.db import transaction
from django.utils.timezone import now
from django.contrib.auth import get_user_model

from cvat.apps.engine import task as task_api
from cvat.apps.engine.models import Project, Task, Data, Job, RemoteFile, \
    S3File, Label, LabeledShape, AttributeSpec, LabeledShapeAttributeVal, \
    ModeChoice, ShapeType, SourceType, AttributeType, StorageMethodChoice, \
    SortingMethod
from cvat.apps.organizations.models import Organization
from cvat.apps.engine.views import TaskViewSet
from cvat.apps.engine.media_extractors import sort
from cvat.apps.engine.log import slogger
from cvat.rebotics.s3_client import s3_client

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
    for _ in range(6):
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
    def __init__(self):
        self.task = None
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

    # TODO: remove this, once fix for
    #  https://retech.atlassian.net/browse/REB3-11338
    #  is deployed.
    def _filter_price_tags(self, items: list) -> list:
        filtered = {}
        for item in items:
            box = (item['lowerx'], item['lowery'], item['upperx'], item['uppery'])
            if any(value is None for value in box):
                slogger.glob.warning(f'Phantom price tag skipped.')
                continue
            if box in filtered:
                slogger.glob.warning(f'Duplicate price tag skipped.')
                continue
            filtered[box] = item
        return list(filtered.values())

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

    def _import_price_tag(self, item: dict, frame: int, group: int, image_size: tuple) -> None:
        if any(item[key] is None for key in ('lowerx', 'upperx', 'lowery', 'uppery')):
            slogger.glob.warning(f'Phantom price tag skipped.')
        else:
            self._import_item(item, frame, group, image_size)

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
        return self.image_data.get(file.meta['name'], (sys.maxsize, sys.maxsize))

    def _next_job(self, frame: int) -> None:
        if frame > self.jobs[self.job_n].segment.stop_frame:
            self.job_n += 1

    @property
    def _sorted_files(self):
        return sort(
            self.files,
            sorting_method=SortingMethod.LEXICOGRAPHICAL,
            func=lambda f: f.meta['name'],
        )

    def _reset(self) -> None:
        self.files = self.task.data.s3_files.all()
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

    def perform_import(self, gi_item: GalleryImportProgress, data) -> None:
        self._reset()

        for frame, file in enumerate(self._sorted_files):
            image_size = self._get_image_size(file)
            self._next_job(frame)
            for item in file.meta['items']:
                self._import_item(item, frame, 0, image_size)
            for item in self._filter_price_tags(file.meta['price_tags']):
                self._import_price_tag(item, frame, 1, image_size)

        self._save()
        self._clean_meta()


def _preload_images(gi_instance, token):
    gi_data = GalleryImportProgress.objects.filter(instance=gi_instance)
    if gi_data.exists():
        slogger.glob.info('Images already exist.')
        gi_data = gi_data.filter(task_id__isnull=True)
    else:
        slogger.glob.info('Preloading list of images.')

        if gi_instance == GIInstanceLocal:
            url = 'http://localhost:8003/api/v1/detection-images'
        else:
            url = f'https://{gi_instance}-imggal.rebotics.net/api/v1/detection-images'
        headers = {'Authorization': f'Token {token}'}

        request = requests.get(url, headers=headers)
        data = request.json()

        serializer = DetectionImageListSerializer(data=data, many=True)
        serializer.is_valid(raise_exception=True)

        gi_data = GalleryImportProgress.objects.bulk_create([
            GalleryImportProgress(
                instance=gi_instance,
                gi_id=item['id'],
                url=item['image'],
                name=_get_file_name(item['image']),
            )
            for item in serializer.validated_data
        ])
    return sort(gi_data, sorting_method=SortingMethod.LEXICOGRAPHICAL, func=lambda i: i.name)


def _get_user():
    try:
        user = User.objects.get(username='imggal')
    except User.DoesNotExist:
        user = User(username='imggal',
                    first_name='Imggal',
                    last_name='Import')
        random_pass = ''.join([chr(random.randint(33, 126)) for _ in range(12)])
        user.set_password(random_pass)
        user.save()
    return user


def _get_organization():
    default_organization_name = 'RetechLabs'
    return Organization.objects.get(slug=default_organization_name)


def _get_project(gi_instance, user, organization):
    projects = Project.objects.filter(
        owner=user,
        organization=organization,
        name=f'Import from: {gi_instance}-imggal',
    )
    if len(projects) > 0:
        project = projects[0]
    else:
        project = Project.objects.create(
            owner=user,
            organization=organization,
            name=f'Import from: {gi_instance}-imggal',
        )
    return project


@transaction.atomic
def _create_task(project, gi_data, gi_instance, frame, size, segment_size):
    stop_frame = frame + size
    data = gi_data[frame:stop_frame]

    db_data = Data.objects.create(
        image_quality=70,
        storage_method=StorageMethodChoice.CACHE,
        size=size,
        stop_frame=size - 1,
        sorting_method=SortingMethod.LEXICOGRAPHICAL,
    )
    os.makedirs(db_data.get_upload_dirname(), exist_ok=True)

    task = Task.objects.create(
        project=project,
        data=db_data,
        name=f'{gi_instance}-imggal import | {data[0].name[:25]} | {data[-1].name[:25]}',
        owner=project.owner,
        organization=project.organization,
        mode=ModeChoice.ANNOTATION,
        segment_size=segment_size,
    )

    files = RemoteFile.objects.bulk_create([
        RemoteFile(
            data=db_data,
            file=item.url,
            meta={'gi_id': item.gi_id}
        )
        for item in data
    ])

    task_api._create_thread(task.id, {
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
        'remote_files': [file.file for file in files],
        'use_zip_chunks': True,
        'use_cache': True,
        'copy_data': False,
        'storage_method': db_data.storage_method,
        'storage': db_data.storage,
        'sorting_method': db_data.sorting_method,
    })

    for i, item in enumerate(data):
        item.task = task
        item.frame = i
    GalleryImportProgress.objects.bulk_update(data, ('task', 'frame',))


def _start(gi_instance, token, task_size, job_size, stop_at):
    gi_data = _preload_images(gi_instance, token)

    if len(gi_data) < 1:
        slogger.glob.info('All is imported')
        return

    user = _get_user()
    organization = _get_organization()
    project = _get_project(gi_instance, user, organization)
    total = len(gi_data) if stop_at < 0 else stop_at

    frame = 0
    while frame < total:
        if frame + task_size > total:
            _create_task(project, gi_data, gi_instance, frame, total - frame, job_size)
            frame = total
        else:
            _create_task(project, gi_data, gi_instance, frame, task_size, job_size)
            frame += task_size


@transaction.atomic
def _import_annotations(gi_instance, token, gi_item, importer):
    if gi_instance == GIInstanceLocal:
        url = f'http://localhost:8003/api/v1/detection-images/{gi_item.gi_id}'
    else:
        url = f'https://{gi_instance}-imggal.rebotics.net/api/v1/detection-images/{gi_item.gi_id}'
    headers = {'Authorization': f'Token {token}'}

    request = requests.get(url, headers=headers)
    data = request.json()

    serializer = DetectionImageSerializer(data=data, many=True)
    serializer.is_valid(raise_exception=True)

    importer.perform_import(gi_item, data)

    gi_item.status = GIStatusSuccess
    gi_item.save()


def _update(gi_instance, token):
    gi_data = GalleryImportProgress.objects\
        .filter(status=GIStatusFailed, task_id__isnull=False)\
        .select_related('task')

    if len(gi_data) < 1:
        slogger.glob.info('All annotations are imported')
        return

    importer = ShapesImporter()
    for item in gi_data:
        _import_annotations(gi_instance, token, item, importer)


def update(instance, token):
    slogger.glob.info(f'Starting annotations import from {instance}-imggal.')

    job_id = f'gi_{instance}_start'

    q = django_rq.get_queue('default')
    job: RqJob = q.fetch_job(job_id)

    if job is None or job.is_finished or job.is_failed:
        job_id = f'gi_{instance}_update'

        q = django_rq.get_queue('default')
        job: RqJob = q.fetch_job(job_id)

        if job is None or job.is_finished or job.is_failed:
            q.enqueue_call(
                _update,
                args=(instance, token),
                job_id=job_id,
            )
            return "ok"
        else:
            slogger.glob.info('Update is already in progress.')
            return "update is in progress"
    else:
        slogger.glob.info('Import is already in progress.')
        return "import is in progress"


def start(instance, token, task_size, job_size, stop_at):
    slogger.glob.info(f'Starting import from {instance}-imggal.')

    job_id = f'gi_{instance}_start'

    q = django_rq.get_queue('default')
    job: RqJob = q.fetch_job(job_id)

    if job is None or job.is_finished or job.is_failed:
        q.enqueue_call(
            _start,
            args=(instance, token, task_size, job_size, stop_at),
            job_id=job_id,
        )
        return "ok"
    else:
        slogger.glob.info('Import is already in progress.')
        return "import is in progress"


def get_job_status(instance):
    q = django_rq.get_queue('default')

    start_id = f'gi_{instance}_start'
    start_job: RqJob = q.fetch_job(start_id)
    start_exc = None
    start_status = None
    if start_job is not None:
        start_status = start_job.get_status()
        if start_status == JobStatus.FAILED:
            start_exc = start_job.exc_info

    update_id = f'gi_{instance}_update'
    update_job: RqJob = q.fetch_job(update_id)
    update_exc = None
    update_status = None
    if update_job is not None:
        update_status = update_job.get_status()
        if update_status == JobStatus.FAILED:
            update_exc = update_job.exc_info

    success_count = GalleryImportProgress.objects.filter(instance=instance, status=GIStatusSuccess).count()
    started_count = GalleryImportProgress.objects.filter(
        instance=instance, status=GIStatusFailed, task__isnull=False
    ).count()
    failed_count = GalleryImportProgress.objects.filter(
        instance=instance, status=GIStatusFailed, task__isnull=True
    ).count()
    total = success_count + started_count + failed_count

    return {
        'success': success_count,
        'started': started_count,
        'failed': failed_count,
        'total': total,
        'start_job': {
            'id': start_id,
            'status': start_status,
            'exc_info': start_exc,
        },
        'update_job': {
            'id': update_id,
            'status': update_status,
            'exc_info': update_exc,
        },
    }


def _delete_task(task_id):
    try:
        task = Task.objects.get(pk=task_id)
        task.data.delete()
    except Task.DoesNotExist:
        pass

