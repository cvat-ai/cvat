from django.utils.timezone import now
from django.contrib.auth import get_user_model

from cvat.apps.engine import task as task_api
from cvat.apps.engine.models import Project, Task
from cvat.apps.engine.views import TaskViewSet

User = get_user_model()


def _get_retailer(data):
    users = User.objects.filter(username=data['retailer_codename'])
    if users:
        return users[0]
    return None


def _get_project(retailer):
    name = "Imported images"
    projects = Project.objects.filter(owner=retailer, name=name)
    if projects:
        return projects[0]
    return Project.objects.create(owner=retailer, name=name)


def _create_task(project):
    return Task.objects.create(
        project=project,
        data=None,
        name=now().strftime('Import %Y-%m-%d %H:%M:%S %Z'),
        owner=project.owner,
        mode='annotation',
    )


def _get_task(task_id):
    try:
        return Task.objects.get(pk=task_id)
    except Task.DoesNotExist:
        return None


def _convert_data(data):
    new_data = {
        'chunk_size': 20,  # temporarily
        'size': 0,
        'image_quality': 80,
        'start_frame': 0,
        'stop_frame': None,
        'frame_filter': '',
        'compressed_chunk_type': 'imageset',
        'original_chunk_type': 'imageset',
        'client_files': [],
        'server_files': [],
        'remote_files': [],
        'use_zip_chunks': True,
        'use_cache': True,
        'copy_data': False,
        'storage_method': 'file_system',
        'storage': 'local',
        'sorting_method': 'lexicographical'
    }
    for image in data['images']:
        new_data['remote_files'].append(image['url'])

    return data


    ## Reference data structure
    ## need to convert this:
    #
    # data = {
    #     'images': [
    #         {
    #             'image': 'url',
    #             'planogram_title': 'title',
    #             'processing_action_id': 1,
    #             'items': [
    #                 {
    #                     'lowerx': 0.0,
    #                     'lowery': 0.0,
    #                     'upperx': 0.0,
    #                     'uppery': 0.0,
    #                     'label': 'text',
    #                     'upc': 'text',
    #                     'points': 'json',
    #                     'type': 'text'  # Some of constant types
    #                 },
    #                 ...
    #             ],
    #             'price_tags': [
    #                 {
    #                     'lowerx': 0.0,
    #                     'lowery': 0.0,
    #                     'upperx': 0.0,
    #                     'uppery': 0.0,
    #                     'label': 'text',
    #                     'upc': 'text',
    #                     'points': 'json',
    #                     'type': 'text'  # Some of constant types
    #                 },
    #                 ...
    #             ],
    #         },
    #         ...
    #     ],
    # }
    #
    # fix coordinates somewhere so they are not out of bounds.
    # fix_between(), etc.
    #
    ## to this:
    #
    # expected_data = {
    #     'chunk_size': None,
    #     'size': 0,
    #     'image_quality': 80,
    #     'start_frame': 0,
    #     'stop_frame': None,
    #     'frame_filter': '',
    #     'compressed_chunk_type': 'imageset',
    #     'original_chunk_type': 'imageset',
    #     'client_files': [
    #         'fceca68bb51abb27445bdcfa733835004a7d4949a3e620057b51f6fd8c957184a1e27fe7e05edd2990bc560f0bf4c54ed155eab31671b91a49a73abe3b1e6c08.jpg',
    #         'fd2d3fb328e61e2c90417d859222059b65ec7805c86ad3ffc1bc9cad043fe756462c9810313171a7320c289b5b5936b45e8f68b4a7424371e6fcc0a93ef8eff3.jpg',
    #         'fcbe5a414593c9a3d36d83004f496b4451adda72ce3e22a33c4d8dafbca4e063155edd0bb33c70b42e91ac0bd810f3cdefc02af65787ffa18fe0bfb11f44a80d.jpg',
    #         'fd1f45ef97eae0dbce8b98acdebcd7a4986974084b905f5026f8380ec091d8390c77c30d408a6afdfbbfd47f5af8433ea8acd144aef3fd4662b66e6b059ffc8e.jpg',
    #         'fd2b9d39a955ececc5a9cb9bbcd980b33a01aa8703f343622b1e8188cd86cc94a392fe07a0c48d38e874ec88a182c9149e9d264c65c91ff19a30e01f93ab9e76.jpg',
    #         'fcdc84172278173a42cd61186eebff10b544d0a1183def530aeddc4c1751b6686b68575a030262cda3e18c53d0959c73b08a7654fdb06165e1851cfb4c36a5f0.jpg',
    #         'fcd9709b60a405b1b6ef1e8bce780864c8d410bfe28fcf266c1920965325757e1cfa9ff98ce112d315949f0a41c20df226848b59e6d9abfb413151448d1eb6e2.jpg'
    #     ],
    #     'server_files': [],
    #     'remote_files': [],
    #     'use_zip_chunks': True,
    #     'use_cache': True,
    #     'copy_data': False,
    #     'storage_method': 'file_system',
    #     'storage': 'local',
    #     'sorting_method': 'lexicographical'
    # }

    # tid = id.



def _get_task_data(task_id):
    task = _get_task(task_id)
    if task is None:
        return None
    # TODO:
    pass


def create(data: dict):
    retailer = _get_retailer(data)
    project = _get_project(retailer)
    task = _create_task(project)
    data = _convert_data(data)
    task_api._create_thread(task.pk, data)
    return task.pk


def check(task_id):
    state = TaskViewSet._get_rq_response(f"/api/tasks/{task_id}")
    if state['state'] == 'Finished':
        task_data = _get_task_data(task_id)
        return None, task_data
    else:
        return state, None


# TODO: import annotations as well.


## Old create logic
# detection_image = models.DetectionImage.objects.create(
#     image=self.__get_image_from_url(validated_data['image']),
#     exported_by=validated_data.get('export_by'),
#     planogram_title=validated_data.get('planogram_title'),
#     retailer=validated_data.get('retailer_codename'),
#     scan_id=validated_data.get('processing_action_id')
# )
#
# width = detection_image.image.width
# height = detection_image.image.height
#
# items_to_create = []
# for item in validated_data['items']:
#     points = item.get('points')
#     item_type = item.get('type', RECTANGLE)
#     label, created = models.DetectionClass.objects.get_or_create(code=item['upc'])
#
#     if not label.title or label.title != item['label']:
#         label.title = item['label']
#         label.save()
#
#     items_to_create.append(models.DetectionAnnotation(
#         image=detection_image,
#         detection_class=label,
#         lowerx=fix_between(item['lowerx'], 0, width),
#         lowery=fix_between(item['lowery'], 0, height),
#         upperx=fix_between(item['upperx'], 0, width),
#         uppery=fix_between(item['uppery'], 0, height),
#         points=points,
#         type=item_type
#     ))
#
# price_tag_items = validated_data.get('price_tags', [])
# price_tag_label, created = models.DetectionClass.objects.get_or_create(code='All PRICE TAGS')
# if not price_tag_label.title:
#     price_tag_label.title = 'All PRICE TAGS'
#     price_tag_label.save()
#
# for price_tag in price_tag_items:
#     lowerx = fix_between(price_tag['lowerx'], 0, width)
#     lowery = fix_between(price_tag['lowery'], 0, height)
#     upperx = fix_between(price_tag['upperx'], 0, width)
#     uppery = fix_between(price_tag['uppery'], 0, height)
#
#     items_to_create.append(models.DetectionAnnotation(
#         image=detection_image,
#         detection_class=price_tag_label,
#         lowerx=lowerx,
#         lowery=lowery,
#         upperx=upperx,
#         uppery=uppery
#     ))
#
# models.DetectionAnnotation.objects.bulk_create(items_to_create)
#
# return detection_image
