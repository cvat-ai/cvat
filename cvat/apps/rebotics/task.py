import django_rq
from django.utils.timezone import now
from django.contrib.auth import get_user_model

from cvat.apps.engine import task as task_api
from cvat.apps.engine.models import Project, Task, Data, RemoteFile, S3File, ModeChoice
from cvat.apps.engine.views import TaskViewSet

User = get_user_model()

## Reference image data structure
# {
#     'image': 'url',
#     'planogram_title': 'title',
#     'processing_action_id': 1,
#     'items': [
#         {
#             'lowerx': 0.0,
#             'lowery': 0.0,
#             'upperx': 0.0,
#             'uppery': 0.0,
#             'label': 'text',
#             'upc': 'text',
#             'points': 'json',
#             'type': 'text'  # Some of constant types
#         },
#         ...
#     ],
#     'price_tags': [
#         {
#             'lowerx': 0.0,
#             'lowery': 0.0,
#             'upperx': 0.0,
#             'uppery': 0.0,
#             'label': 'text',
#             'upc': 'text',
#             'points': 'json',
#             'type': 'text'  # Some of constant types
#         },
#         ...
#     ],
# }


def _create_thread(task_id, cvat_data):
    task_api._create_thread(task_id, cvat_data)

    task: Task = Task.objects.get(pk=task_id)
    s3_files = task.data.s3_files.all()

    # TODO:
    #  get manifest from task data
    #  compare it to exact files
    #  pop annotations for s3_files' meta
    #  get image sizes from manifest
    #  trim annotations' coordinates between 0 and image sizes.
    #  get or create project labels.
    #  store annotations in the db.


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
