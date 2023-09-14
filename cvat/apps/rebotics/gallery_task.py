import os
import sys
import random
import requests
import shutil
from urllib import parse as urlparse, request as urlrequest
from .serializers import DetectionImageListSerializer, DetectionImageSerializer
from .models import GalleryImportProgress, GIStatusSuccess, GIStatusFailed, \
    GIInstanceLocal, GIInstanceR3cn, SHAPE_RECTANGLE, SHAPE_POLYGON, SHAPE_LINE, \
    SPECS, GIStatusSkip

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
    def __init__(self, task=None):
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
        self.file = None
        self.image_data = None
        self.image_size = None
        if task is not None:
            self._reset_task(task)

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
            try:
                points = [float(i) for i in item['points'].replace(',', ' ').split()]
            except ValueError:
                slogger.glob.error(f'Invalid polygon points: {item["points"]}')
                return
            _fix_points(points, *self.image_size)
        elif item['type'] == SHAPE_LINE:
            shape = ShapeType.POLYLINE
            points = [item['lowerx'], item['lowery'], item['upperx'], item['uppery']]
            _fix_points(points, *self.image_size)
        else:
            slogger.glob.error(f'Unknown annotation type: {item["type"]}')
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
        if title in SPECS:
            code = item['detection_class']['code']
            if code:
                spec_name = SPECS[title]
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
        self.file.save()

    def _reset_task(self, task) -> None:
        self.task = task
        self.jobs = Job.objects.filter(segment__task=self.task).select_related('segment')
        self.files = sort(
            self.task.data.s3_files.all(),
            sorting_method=SortingMethod.LEXICOGRAPHICAL,
            func=lambda i: i.meta['name'],
        )
        manifest_manager = S3ManifestManager(self.task.data.get_s3_manifest_path())
        manifest_manager.init_index()
        self.image_data = {f'{props["name"]}{props["extension"]}': (props['width'], props['height'])
                           for _, props in manifest_manager}

    def _reset_frame(self, gi_item) -> None:
        self.gi_item = gi_item
        if self.task is None or self.task.pk != self.gi_item.task_id:
            self._reset_task(self.gi_item.task)
        self.job = self.jobs[self.gi_item.frame // self.task.segment_size]
        self.file = self.files[self.gi_item.frame]
        self.shapes = []
        self.vals = []
        self.tags = []
        self.image_size = self.image_data.get(self.file.meta['name'], (sys.maxsize, sys.maxsize))

    def perform_import(self, gi_item: GalleryImportProgress) -> None:
        self._reset_frame(gi_item)

        meta = self.file.meta

        annotations = meta.pop('annotations', None)
        if annotations is not None:
            for item in annotations:
                self._import_annotation(item)

        tags = meta.pop('tags', None)
        if tags is not None:
            for item in tags:
                self._import_tag(item)

        self._save()

    def reload_labels(self, gi_item: GalleryImportProgress, labels, gi_instance, token) -> None:
        annotations = LabeledShape.objects.filter(
            job__segment__task=gi_item.task,
            frame=gi_item.frame,
            label__name__in=labels,
        )
        if annotations.exists():
            annotations.delete()

            self._reset_frame(gi_item)

            url = _get_url(gi_instance, gi_id=gi_item.gi_id)
            headers = {'Authorization': f'Token {token}'}
            request = requests.get(url, headers=headers)
            data = request.json()

            serializer = DetectionImageSerializer(data=data)
            serializer.is_valid(raise_exception=True)

            meta = serializer.validated_data

            annotations = meta.get('annotations', None)
            if annotations is not None:
                for item in annotations:
                    if item['detection_class']['title'] in labels:
                        self._import_annotation(item)

            self._save()


def _get_url(gi_instance, gi_id=None):
    if gi_instance == GIInstanceLocal:
        url = 'http://localhost:8003/api/v1/detection-images'
    else:
        domain = 'cn' if gi_instance == GIInstanceR3cn else 'net'
        url = f'https://{gi_instance}-imggal.rebotics.{domain}/api/v1/detection-images'

    if gi_id is not None:
        url += f'/{gi_id}'

    return url


def _preload_images(gi_instance, token):
    gi_data = GalleryImportProgress.objects.filter(instance=gi_instance)
    if not gi_data.exists():
        url = _get_url(gi_instance)
        headers = {'Authorization': f'Token {token}'}
        request = requests.get(url, headers=headers)
        data = request.json()

        serializer = DetectionImageListSerializer(data=data, many=True)
        serializer.is_valid(raise_exception=True)

        GalleryImportProgress.objects.bulk_create([
            GalleryImportProgress(
                instance=gi_instance,
                gi_id=item['id'],
                name=_get_file_name(item['image']),
            )
            for item in serializer.validated_data
        ], batch_size=1000)


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


def _create_task_annotations(gi_data, task):
    slogger.glob.info('Creating task annotations')

    importer = ShapesImporter(task)
    for item in gi_data:
        slogger.glob.info(f'Task {item.task_id} frame {item.frame}')
        _import_frame(item, importer)


@transaction.atomic
def _create_task(project, gi_data, gi_instance, frame, size, segment_size, token):
    stop_frame = frame + size
    data = gi_data[frame:stop_frame]

    task_name = f'{gi_instance}-imggal import | {data[0].name[:25]} | {data[-1].name[:25]}'
    slogger.glob.info(f'Creating task {task_name}')

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
        name=task_name,
        owner=project.owner,
        organization=project.organization,
        mode=ModeChoice.ANNOTATION,
        segment_size=segment_size,
    )

    files = RemoteFile.objects.bulk_create([
        RemoteFile(
            data=db_data,
            file=_get_url(gi_instance, gi_id=item.gi_id),
            meta={
                'gi_id': item.gi_id,
                'token': token,
            }
        )
        for item in data
    ])

    try:
        task_api._create_noatomic(task.id, {
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
    except Exception as e:
        shutil.rmtree(db_data.get_data_dirname())
        raise e

    for i, item in enumerate(data):
        item.task = task
        item.frame = i
    GalleryImportProgress.objects.bulk_update(data, ('task', 'frame',))

    return data, task


def _create_tasks(gi_instance, token, task_size, job_size):
    gi_data = sort(
        GalleryImportProgress.objects
            .filter(instance=gi_instance, task_id__isnull=True)
            .exclude(status=GIStatusSkip),
        sorting_method=SortingMethod.LEXICOGRAPHICAL,
        func=lambda i: i.name
    )

    if len(gi_data) > 0:
        user = _get_user()
        organization = _get_organization()
        project = _get_project(gi_instance, user, organization)
        total = len(gi_data)

        frame = 0
        while frame < total:
            if frame + task_size > total:
                data, task = _create_task(project, gi_data, gi_instance, frame, total - frame, job_size, token)
                frame = total
            else:
                data, task = _create_task(project, gi_data, gi_instance, frame, task_size, job_size, token)
                frame += task_size
            _create_task_annotations(data, task)


@transaction.atomic
def _import_frame(gi_item, importer):
    try:
        importer.perform_import(gi_item)
        gi_item.status = GIStatusSuccess
        gi_item.save()
    except IndexError as e:
        slogger.glob.error(f'Missing frame: {e}')


def _import_annotations(gi_instance):
    gi_data = GalleryImportProgress.objects \
        .filter(instance=gi_instance, status=GIStatusFailed, task_id__isnull=False) \
        .order_by('task_id', 'frame')

    if len(gi_data) > 0:
        importer = ShapesImporter()
        for item in gi_data:
            slogger.glob.info(f'Task {item.task_id} frame {item.frame}')
            _import_frame(item, importer)


def _start(gi_instance, token, task_size, job_size):
    slogger.glob.info('Preloading images')
    _preload_images(gi_instance, token)
    slogger.glob.info('Creating tasks')
    try:
        _create_tasks(gi_instance, token, task_size, job_size)
    except FileNotFoundError as e:
        filename = os.path.basename(e.filename)

        slogger.glob.warning(f'File {filename} not found after downloading, skipping it')
        gi_data = GalleryImportProgress.objects.filter(name=filename)
        gi_data.update(status=GIStatusSkip)

        raise e
    slogger.glob.info('Importing annotations')
    _import_annotations(gi_instance)


def start(instance, token, task_size, job_size):
    q = django_rq.get_queue('default')
    job_id = f'gi_{instance}_import'
    job: RqJob = q.fetch_job(job_id)

    if job is None or job.is_finished or job.is_failed:
        q.enqueue_call(
            _start,
            args=(instance, token, task_size, job_size),
            job_id=job_id,
            timeout=172800,
        )
        return "ok"
    else:
        return "import is in progress"


def get_job_status(instance):
    q = django_rq.get_queue('default')

    job_id = f'gi_{instance}_import'
    job: RqJob = q.fetch_job(job_id)
    exc_info = None
    job_status = None
    if job is not None:
        job_status = job.get_status()
        if job_status == JobStatus.FAILED:
            exc_info = job.exc_info

    success_count = GalleryImportProgress.objects.filter(instance=instance, status=GIStatusSuccess).count()
    started_count = GalleryImportProgress.objects\
        .filter(instance=instance, status=GIStatusFailed, task__isnull=False)\
        .count()
    failed_count = GalleryImportProgress.objects\
        .filter(instance=instance, status=GIStatusFailed, task__isnull=True)\
        .count()
    skip_count = GalleryImportProgress.objects.filter(instance=instance, status=GIStatusSkip).count()

    return {
        'success': success_count,
        'started': started_count,
        'failed': failed_count,
        'skip': skip_count,
        'total': success_count + started_count + failed_count + skip_count,
        'job_id': job_id,
        'job_status': job_status,
        'exc_info': exc_info,
    }


@transaction.atomic
def _reload_frame(importer, item, instance, token, tags):
    importer.reload_labels(item, tags, instance, token)

    item.status = GIStatusFailed
    item.save()


def _reload_labels(instance, token, tags):
    gi_data = GalleryImportProgress.objects.filter(instance=instance, status=GIStatusSuccess)
    importer = ShapesImporter()

    slogger.glob.info('Reloading annotations')
    for item in gi_data:
        slogger.glob.info(f'Task {item.task_id} frame {item.frame}')
        _reload_frame(importer, item, instance, token, tags)


def reload_labels(instance, token, tags):
    q = django_rq.get_queue('default')
    job_id = f'gi_{instance}_import'
    job: RqJob = q.fetch_job(job_id)

    if job is None or job.is_finished or job.is_failed:
        q.enqueue_call(
            _reload_labels,
            args=(instance, token, tags),
            job_id=job_id,
            timeout=172800,
        )
        return "ok"
    else:
        return "import is in progress"


def clean(gi_instance):
    q = django_rq.get_queue('default')

    job_id = f'gi_{gi_instance}_import'
    job: RqJob = q.fetch_job(job_id)

    job.delete()

    return 'ok'
