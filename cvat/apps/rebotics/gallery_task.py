import os
import sys
import random
import requests
from urllib import parse as urlparse, request as urlrequest
from .serializers import DetectionImageSerializer, DetectionImageListSerializer
from .models import GalleryImportProgress, GIStatusSuccess, GIStatusFailed, \
    GIInstanceLocal, GIInstanceR3cn, SHAPE_RECTANGLE, SHAPE_POLYGON, SHAPE_LINE, \
    ALL_UPC, PRICE_TAG_OCR

import django_rq
from rq.job import JobStatus, Job as RqJob
from django.db import transaction
from django.contrib.auth import get_user_model

from cvat.apps.engine import task as task_api
from cvat.apps.engine.models import Project, Task, Data, Job, RemoteFile, \
    Label, LabeledImage, LabeledShape, AttributeSpec, LabeledShapeAttributeVal, \
    ModeChoice, ShapeType, SourceType, AttributeType, StorageMethodChoice, \
    SortingMethod
from cvat.apps.organizations.models import Organization
from cvat.apps.engine.media_extractors import sort
from cvat.apps.engine.log import slogger

from utils.dataset_manifest import S3ManifestManager

User = get_user_model()


def _fix_points(points, width, height):
    for i in range(0, len(points), 2):
        x, y = points[i], points[i + 1]
        if x < 0:
            x = 0
        if x > width:
            x = width
        if y < 0:
            y = 0
        if y > height:
            y = height
        points[i] = x
        points[i + 1] = y


def _fix_rect(points, width, height):
    _fix_points(points, width, height)
    x1, y1, x2, y2 = points
    if x1 > x2:
        x1, x2 = x2, x1
        points[0] = x1
        points[2] = x2
    if y1 > y2:
        y1, y2 = y2, y1
        points[1] = y1
        points[3] = y2


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
        self.gi_item = None
        self.task = None
        self.labels = {}    # Labels
        self.specs = {}     # AttributeSpecs
        self.shapes = None  # LabeledShapes
        self.vals = None    # AttributeVals
        self.tags = None    # LabeledImages
        self.jobs = None
        self.job = None
        self.files = None
        self.image_data = None
        self.image_size = None

    def _get_label(self, name: str) -> Label:
        if name in self.labels:
            label = self.labels[name]
        else:
            label, _ = Label.objects.get_or_create(
                project_id=self.task.project_id,
                name=name,
                defaults={'color': _rand_color()}
            )
            self.labels[name] = label
        return label

    def _get_spec(self, label: Label, name: str) -> AttributeSpec:
        if label.name in self.specs:
            specs = self.specs[label.name]
        else:
            specs = {}
            self.specs[label.name] = specs

        if name in specs:
            spec = specs[name]
        else:
            spec, _ = AttributeSpec.objects.get_or_create(
                label=label,
                name=name,
                defaults={'mutable': True, 'input_type': AttributeType.TEXT}
            )
            specs[name] = spec

        return spec

    def _import_annotation(self, item: dict) -> None:
        label = self._get_label(item['detection_class']['title'])
        if item['type'] == SHAPE_RECTANGLE:
            shape = ShapeType.RECTANGLE
            points = [item['lowerx'], item['lowery'], item['upperx'], item['uppery']]
            _fix_rect(points, *self.image_size)
        elif item['type'] == SHAPE_POLYGON:
            shape = ShapeType.POLYGON
            points = [float(i) for i in item['points'].replace(',', '').split()]
            _fix_points(points, *self.image_size)
        elif item['type'] == SHAPE_LINE:
            shape = ShapeType.POLYLINE
            points = [item['lowerx'], item['lowery'], item['upperx'], item['uppery']]
            _fix_points(points, *self.image_size)
        else:
            slogger.glob(f'Unknown annotation type: {item["type"]}')
            return

        self.shapes.append(LabeledShape(
            job=self.job,
            label=label,
            frame=self.gi_item.frame,
            group=0,
            type=shape,
            source=SourceType.AUTO,
            points=points,
        ))

        val = None
        title = item['detection_class']['title']
        if title in [ALL_UPC, PRICE_TAG_OCR]:
            code = item['detection_class']['code']
            if code:
                spec_name = 'UPC' if title == ALL_UPC else 'OCR'
                spec = self._get_spec(label, spec_name)
                val = LabeledShapeAttributeVal(
                    shape_id=0,
                    spec=spec,
                    value=code,
                )
        self.vals.append(val)

    def _import_tag(self, item: dict) -> None:
        label = self._get_label(item['name'])
        self.tags.append(LabeledImage(
            job=self.job,
            label=label,
            frame=self.gi_item.frame,
            group=0,
            source=SourceType.AUTO,
        ))

    def _save(self) -> None:
        LabeledImage.objects.bulk_create(self.tags)
        LabeledShape.objects.bulk_create(self.shapes)
        save_vals = []
        for i, shape in enumerate(self.shapes):
            val = self.vals[i]
            if val is not None:
                val.shape_id = shape.pk
                save_vals.append(val)
        LabeledShapeAttributeVal.objects.bulk_create(save_vals)

    def _set_image_data(self) -> None:
        manifest_manager = S3ManifestManager(self.task.data.get_s3_manifest_path())
        manifest_manager.init_index()
        self.image_data = {f'{props["name"]}{props["extension"]}': (props['width'], props['height'])
                           for _, props in manifest_manager}

    def _set_image_size(self) -> None:
        self.image_size = self.image_data.get(self.gi_item.name, (sys.maxsize, sys.maxsize))

    def _reset(self) -> None:
        if self.task is None or self.task.pk != self.gi_item.task_id:
            self.task = self.gi_item.task
            self.jobs = Job.objects.filter(segment__task=self.task).select_related('segment')
            self._set_image_data()
        self.shapes = []
        self.vals = []
        self.tags = []
        self.job = self.jobs[self.gi_item.frame // self.task.segment_size]
        self._set_image_size()

    def perform_import(self, gi_item: GalleryImportProgress, data: dict) -> None:
        self.gi_item = gi_item
        self._reset()

        for item in data['annotations']:
            self._import_annotation(item)

        for item in data['tags']:
            self._import_tag(item)

        self._save()


def _get_data(gi_instance, token, gi_id=None):
    if gi_instance == GIInstanceLocal:
        url = 'http://localhost:8003/api/v1/detection-images'
    else:
        domain = 'cn' if gi_instance == GIInstanceR3cn else 'net'
        url = f'https://{gi_instance}-imggal.rebotics.{domain}/api/v1/detection-images'

    if gi_id is not None:
        url += f'/{gi_id}'

    headers = {'Authorization': f'Token {token}'}
    request = requests.get(url, headers=headers)
    return request.json()


def _preload_images(gi_instance, token):
    gi_data = GalleryImportProgress.objects.filter(instance=gi_instance)
    if gi_data.exists():
        slogger.glob.info('Images already exist.')
        gi_data = gi_data.filter(task_id__isnull=True)
    else:
        slogger.glob.info('Preloading list of images.')

        data = _get_data(gi_instance, token)

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
    default_organization_name = 'GalleryImport'
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
    }, rename_files=True)

    for i, item in enumerate(data):
        item.task = task
        item.frame = i
    GalleryImportProgress.objects.bulk_update(data, ('task', 'frame',))


def _start(gi_instance, token, task_size, job_size):
    gi_data = _preload_images(gi_instance, token)

    if len(gi_data) < 1:
        slogger.glob.info('All is imported')
        return

    user = _get_user()
    organization = _get_organization()
    project = _get_project(gi_instance, user, organization)
    total = len(gi_data)

    frame = 0
    while frame < total:
        if frame + task_size > total:
            _create_task(project, gi_data, gi_instance, frame, total - frame, job_size)
            frame = total
        else:
            _create_task(project, gi_data, gi_instance, frame, task_size, job_size)
            frame += task_size


@transaction.atomic
def _import_annotations(gi_item, gi_data, importer):
    importer.perform_import(gi_item, gi_data)

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
        data = _get_data(gi_instance, token, gi_id=item.gi_id)

        serializer = DetectionImageSerializer(data=data)
        serializer.is_valid(raise_exception=True)

        slogger.glob.info(f'Task {item.task_id} frame {item.frame}')
        _import_annotations(item, serializer.validated_data, importer)


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


def start(instance, token, task_size, job_size):
    slogger.glob.info(f'Starting import from {instance}-imggal.')

    job_id = f'gi_{instance}_start'

    q = django_rq.get_queue('default')
    job: RqJob = q.fetch_job(job_id)

    if job is None or job.is_finished or job.is_failed:
        q.enqueue_call(
            _start,
            args=(instance, token, task_size, job_size),
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
