import os
import sys
import random
from urllib import parse as urlparse, request as urlrequest

import django_rq
from django.utils.timezone import now
from django.contrib.auth import get_user_model

from cvat.apps.engine import task as task_api
from cvat.apps.engine.models import Project, Task, Data, RemoteFile, S3File, \
    Label, LabeledShape, AttributeSpec, LabeledShapeAttributeVal, \
    ModeChoice, ShapeType, SourceType, AttributeType
from cvat.apps.engine.views import TaskViewSet
from utils.dataset_manifest import S3ManifestManager

User = get_user_model()

## Reference image data structure
# {
#     'image': 'url',  # save only these after annotation import
#     'planogram_title': 'title',  # save only these after annotation import
#     'processing_action_id': 1,  # save only these after annotation import
#     'items': [
#         {  # create LabeledShape of type=rectangle for each of these
#             'lowerx': 0.0,
#             'lowery': 0.0,
#             'upperx': 0.0,
#             'uppery': 0.0,
#             'label': 'text',   # create project Labels for each value of these.
#                                # translate this to project tag. Is not a field on a model, defaults to "All UPC"
#             'upc': 'text',     # create AttributeSpec named "UPC" for these
#                                # create LabeledShapeAttributeVal for each UPC.
#                                # arbitrary text, extra text for tag.
#             'points': 'json',  # polygon points, never comes from mgmt.
#             'type': 'text'     # shape - rectangle, polygon, line, never comes from mgmt, rectangle by default.
#         },
#         ...
#     ],
#     'price_tags': [
#         {  # create LabeledShape of type=rectangle for each of these
#             'lowerx': 0.0,
#             'lowery': 0.0,
#             'upperx': 0.0,
#             'uppery': 0.0,
#             'label': 'text',  # create project Labels for each value of these.
#                               # defaults to "All PRICE TAGS",
#             'upc': 'text',    # never comes from mgmt for these.
#             'points': 'json',
#             'type': 'text'
#         },
#         ...
#     ],
# }


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
    choices = ('FF', '00')
    color = '#'
    for i in range(3):
        color += random.choice(choices)
    return color


def _create_thread(task_id, cvat_data):
    # get task
    task_api._create_thread(task_id, cvat_data)

    # get task
    task: Task = Task.objects.get(pk=task_id)

    # get file sizes from manifest
    manifest_manager = S3ManifestManager(task.data.get_s3_manifest_path())
    image_data = {f'{props["name"]}.{props["extension"]}': (props['width'], props['height'])
                  for _, props in manifest_manager}

    for file in task.data.s3_files.all():
        file_name = os.path.basename(urlrequest.url2pathname(urlparse.urlparse(file.meta['url']).path))
        size = image_data.get(file_name, (sys.maxsize, sys.maxsize))

        labels = {}
        annotations = []
        attribute_vals = []
        for i, item in enumerate(file.meta['items'] + file.meta['price_tags']):
            _fix_coordinates(item, *size)

            # create label
            if item['label'] in labels:
                label = labels[item['label']]
            else:
                label, _ = Label.objects.get_or_create(
                    project_id=task.project_id,
                    name=item['label'],
                    defaults={'color': _rand_color()}
                )
                labels[item['label']] = label

            # create annotation
            annotations.append(LabeledShape(
                job_id=...,  # TODO: calculate these
                label=label,
                frame=...,  # TODO: calculate these
                group=...,  # TODO: calculate these
                type=ShapeType.RECTANGLE,
                source=SourceType.AUTO,
                points=[item['lowerx'], item['lowery'], item['upperx'], item['uppery']],
            ))

            # create upc.
            upc = item.get('upc', None)
            if upc:
                attribute_spec = AttributeSpec.objects.get_or_create(
                    label=label,
                    name='UPC',
                    defaults={'mutable': True, 'input_type': AttributeType.TEXT}
                )
                attribute_vals.append(LabeledShapeAttributeVal(
                    shape_id=i,
                    spec=attribute_spec,
                    value=upc,
                ))
            else:
                attribute_vals.append(None)

        # bulk save everything.
        LabeledShape.objects.bulk_create(annotations)
        for i, shape in enumerate(annotations):
            attribute_vals[i].shape_id = shape.pk
        LabeledShapeAttributeVal.objects.bulk_create(attribute_vals)


def create(data: list, retailer: User):
    project = Project.objects.get_or_create(owner=retailer, name='Retailer import')
    db_data = Data.objects.create(image_quality=70)
    task = Task.objects.create(
        project=project,
        data=data,
        name=now().strftime('Import %Y-%m-%d %H:%M:%S %Z'),
        owner=retailer,
        mode=ModeChoice.ANNOTATION,
    )

    remote_files = []
    for image_data in data:
        remote_files.append(RemoteFile(
            data=db_data,
            file=image_data['url'],
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
    #  with deleting of task and data in case of failure.
    state = TaskViewSet._get_rq_response(f"/api/tasks/{task_id}")
    if state['state'] == 'Finished':
        try:
            task = Task.objects.get(pk=task_id)
            preview = task.data.get_s3_preview_path()
            s3_files = task.data.s3_files.all()
            task_data = [
                {
                    'id': f.pk,
                    'image':  f.file,
                    'preview': preview,
                } for f in s3_files
            ]
            return None, task_data
        except Task.DoesNotExist:
            return None, None
    return state, None
