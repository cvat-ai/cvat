import os
import os
import uuid
from abc import ABC, abstractmethod
from collections import OrderedDict
from functools import wraps
from typing import Callable, List, Union

import requests
from asgiref.sync import async_to_sync
from cacheops import cache, CacheMiss
from django_rq import job

from cvat.apps import dataset_manager  as dm
from cvat.apps.engine.frame_provider import FrameProvider
from cvat.apps.engine.models import Project, Task, TrainingProjectImage, Job, ShapeType, Label, Image, \
    Data, TrainingProjectLabel, TrainingProject


@job
def save_prediction_server_status_to_cache_job(cache_key: str,
                                               cvat_project_id: int,
                                               timeout: int = 60):
    training_project = Project.objects.get(pk=cvat_project_id).training_project
    api = TrainingServerAPI(host=training_project.host,
                            username=training_project.username,
                            password=training_project.password)
    training_project = Project.objects.get(pk=cvat_project_id).training_project
    status = api.get_project_status(project_id=training_project.training_id)
    resp = {
        **status,
        'status': 'done'
    }
    cache.set(cache_key=cache_key, data=resp, timeout=timeout)


@job
def save_frame_prediction_to_cache_job(cache_key: str,
                                       cvat_project_id: int,
                                       frame: int,
                                       timeout: int = 60):
    training_project_image = TrainingProjectImage.objects.get(idx=frame, task__project_id=cvat_project_id)
    cvat_labels = Label.objects.filter(project__id=cvat_project_id).all()
    training_project = Project.objects.get(pk=cvat_project_id).training_project
    api = TrainingServerAPI(host=training_project.host,
                            username=training_project.username,
                            password=training_project.password)
    labels_mapping = {
        cvat_labels.training_project_label: cvat_label.id
        for cvat_label in cvat_labels
    }
    annotation = api.get_annotation(project_id=training_project.training_id,
                                    image_id=training_project_image.training_image_id,
                                    labels_mapping=labels_mapping,
                                    frame=frame)
    resp = {
        'annotation': annotation,
        'status': 'done'
    }
    cache.set(cache_key=cache_key, data=resp, timeout=timeout)


@job
def create_training_project_job(project_id: int):
    print(0)
    os.environ["DJANGO_ALLOW_ASYNC_UNSAFE"] = "true"
    create_training_project_job_async(cvat_project_id=project_id)


@job
def upload_images_job(task_id: int):
    task = Task.objects.get(pk=task_id)
    frame_provider = FrameProvider(task.data)
    frames = frame_provider.get_frames()
    api = TrainingServerAPI(
        host=task.project.training_project.host,
        username=task.project.training_project.username,
        password=task.project.training_project.password,
    )
    for i, (buffer, _) in enumerate(frames):
        training_image_id = api.upload_image(training_id=task.project.training_project.training_id, buffer=buffer)
        if training_image_id:
            TrainingProjectImage.objects.create(task=task, idx=i,
                                                training_image_id=training_image_id)


def __add_fields_to_shape(shape: dict, frame: int, data: Data, labels_mapping: dict) -> dict:
    image = Image.objects.get(frame=frame, data=data)
    return {
        **shape,
        'height': image.height,
        'width': image.width,
        'third_party_label_id': labels_mapping[shape['label_id']],
    }


@job
def upload_annotation_to_training_project(job_id: int):
    cvat_job = Job.objects.get(pk=job_id)
    cvat_project = cvat_job.segment.task.project
    training_project = cvat_project.training_project
    start = cvat_job.segment.start_frame
    stop = cvat_job.segment.stop_frame
    data = dm.task.get_job_data(job_id)
    shapes: List[OrderedDict] = data.get('shapes', [])
    frames_data = []
    api = TrainingServerAPI(
        host=cvat_project.training_project.host,
        username=cvat_project.training_project.username,
        password=cvat_project.training_project.password,
    )
    # training_project_labels = api.get_labels(project_id=training_project.training_id)
    cvat_labels = Label.objects.filter(project=cvat_project).all()
    labels_mapping = {
        cvat_label.id: cvat_labels.training_project_label
        for cvat_label in cvat_labels
    }

    for frame in range(start, stop + 1):
        frame_shapes = list(
            map(
                lambda x: __add_fields_to_shape(x, frame, cvat_job.segment.task.data, labels_mapping),
                filter(
                    lambda x: x['frame'] == frame and x['type'] == ShapeType.RECTANGLE,
                    shapes,
                )
            )
        )

        if frame_shapes:
            training_project_image = TrainingProjectImage.objects.get(task=cvat_job.segment.task, idx=frame)
            frames_data.append({
                'third_party_id': training_project_image.training_image_id,
                'shapes': frame_shapes
            })

    api.upload_annotations(project_id=training_project.training_id, frames_data=frames_data)


@async_to_sync
async def create_training_project_job_async(cvat_project_id):
    cvat_project = Project.objects.get(pk=cvat_project_id)
    # training_project_filter = TrainingProject.objects.filter(cvat_project=cvat_project).all()
    # if len(training_project_filter) == 0:
    training_project, _ = TrainingProject.objects.get_or_create(host='https://nnlicv205.inn.intel.com',
                                                                username='intel',
                                                                password='Int3l!',
                                                                cvat_project=cvat_project)
    api = TrainingServerAPI(
        host=training_project.host,
        username=training_project.username,
        password=training_project.password,
    )
    training_id = await create_training_project(cvat_project=cvat_project, training_project=training_project, api=api)


# async def create_training_project_async(cvat_project_id):
#     cvat_project = Project.objects.get(pk=cvat_project_id)
#     api = TrainingServer(
#         host=cvat_project.training_server.host,
#         username=cvat_project.training_server.username,
#         password=cvat_project.training_server.password,
#     )
#     training_id = await create_training_project(cvat_project=cvat_project, api=api)
#     await upload_images(cvat_project_id=cvat_project_id, training_id=training_id, api=api)


async def create_training_project(cvat_project, training_project, api):
    labels = cvat_project.label_set.all()
    training_project_resp = api.create_project(
        name=f'{cvat_project.name}_cvat',
        project_class=cvat_project.project_class,
        labels=[{'name': label.name} for label in labels]
    )
    if training_project_resp.get('id'):
        training_project.training_id = training_project_resp['id']
        training_project.save()

    for cvat_label in labels:
        training_label = list(filter(lambda x: x['name'] == cvat_label.name, training_project_resp.get('labels', [])))
        if training_label:
            TrainingProjectLabel.objects.create(cvat_label=cvat_label, training_label_id=training_label[0]['id'])


async def upload_images(cvat_project_id, training_id, api):
    project = Project.objects.get(pk=cvat_project_id)
    tasks: List[Task] = project.tasks.all()
    for task in tasks:
        frame_provider = FrameProvider(task)
        frames = frame_provider.get_frames()
        for i, (buffer, _) in enumerate(frames):
            training_image_id = api.upload_image(training_id=training_id, buffer=buffer)
            if training_image_id:
                TrainingProjectImage.objects.create(project=project, task=task, idx=i,
                                                    training_image_id=training_image_id)


class TrainingServerAPIAbs(ABC):

    def __init__(self, host, username, password):
        self.host = host
        self.username = username
        self.password = password

    @abstractmethod
    def get_server_status(self):
        pass

    @abstractmethod
    def create_project(self, name: str, description: str = ''):
        pass

    @abstractmethod
    def upload_images(self, project_id: str, images: List[dict] = None) -> list:
        pass

    @abstractmethod
    def upload_annotations(self, project_id: str, annotations: dict):
        pass

    @abstractmethod
    def get_project_status(self, project_id: str) -> dict:
        pass

    @abstractmethod
    def get_annotation(self, project_id: str, image_id: str, width: int, height: int, frame: int,
                       labels_mapping: dict) -> dict:
        pass


def retry(amount: int = 2) -> Callable:
    def dec(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            __amount = amount
            while __amount > 0:
                __amount -= 1
                try:
                    result = func(*args, **kwargs)
                    return result
                except Exception as e:
                    # TODO: use logging
                    print(e)

        return wrapper

    return dec


class TrainingServerAPI(TrainingServerAPIAbs):
    TRAINING_CLASS = {
        Project.ProjectClass.DETECTION: "DETECTION"
    }

    @staticmethod
    def __convert_labels_from_cvat(from_labels):
        '''
            {
      "color": "#e100ffff",
      "exclude_labels": [
        "5ee8a96b2afa2331c4fc4f2a"
      ],
      "group": "default",
      "id": "5ee8a96b2afa2331c4fc4f29",
      "is_empty": false,
      "level": "local",
      "name": "animal",
      "parent": null,
      "show_to_user": true,
      "task_id": "5ee8a96b2afa2331c4fc4f28"
    },
        '''
        return []

    @staticmethod
    def __convert_annotation_from_cvat(shapes):
        '''
        {
   "image_id":"{{IMAGE_ID}}",
   "data":[
      {
         "id":"1a6c0ba6-74a9-4e46-b69c-9bc3de815966",
         "shapes":[
            {
               "type":"polygon",
               "geometry":{
                  "x":0.0,
                  "y":0.0,
                  "width":0.0,
                  "height":0.0,
                  "points":[
                     {
                        "x":0.214763656,
                        "y":0.363911748,
                        "r":0.0
                     },
                     {
                        "x":0.439329,
                        "y":0.2809801,
                        "r":0.0
                     },
                     {
                        "x":0.5235204,
                        "y":0.6612841,
                        "r":0.0
                     },
                     {
                        "x":0.153001368,
                        "y":0.7309409,
                        "r":0.0
                     },
                     {
                        "x":0.3219314,
                        "y":0.5822182,
                        "r":0.0
                     },
                     {
                        "x":0.122968152,
                        "y":0.5304315,
                        "r":0.0
                     },
                     {
                        "x":0.214763656,
                        "y":0.363911748,
                        "r":0.0
                     }
                  ]
               }
            }
         ],
         "editor":null,
         "labels":[
            {
               "id":"5efb3a36b86b6dccbfd76b14",
               "probability":1.0
            }
         ]
      },
      {
         "id":"ef24885b-bb75-4b24-af09-756bf995a134",
         "shapes":[
            {
               "type":"point",
               "geometry":{
                  "x":0.543898344,
                  "y":0.189405054,
                  "width":0.025,
                  "height":0.0333333351,
                  "points":[
                     {
                        "x":0.556398332,
                        "y":0.201905057,
                        "r":0.0125
                     }
                  ]
               }
            }
         ],
         "editor":null,
         "labels":[
            {
               "id":"5efb3a36b86b6dccbfd76b15",
               "probability":1.0
            }
         ]
      },
      {
         "id":"92e3bfaf-1b13-4037-b07e-32fac711d9fd",
         "shapes":[
            {
               "type":"rect",
               "geometry":{
                  "x":0.635174036,
                  "y":0.393743843,
                  "width":0.175549313,
                  "height":0.204229221,
                  "points":null
               }
            }
         ],
         "editor":null,
         "labels":[
            {
               "id":"5efb3a36b86b6dccbfd76b14",
               "probability":1.0
            }
         ]
      }
   ]
}

        :param from_annotation:
        :return:
        '''
        data = []
        for shape in shapes:
            x0, y0, x1, y1 = shape['points']
            x = x0 / shape['width']
            y = y0 / shape['height']
            width = (x1 - x0) / shape['width']  # width * shape['width'] + x0
            height = (y1 - y0) / shape['height']
            data.append({
                "id": str(uuid.uuid4()),
                "shapes": [
                    {
                        "type": "rect",
                        "geometry": {
                            "x": x,
                            "y": y,
                            "width": width,
                            "height": height,
                            "points": None,
                        }
                    }
                ],
                "editor": None,
                "labels": [
                    {
                        "id": shape['third_party_label_id'],
                        "probability": 1.0,
                    },
                ],
            })
        return data

    @staticmethod
    def __convert_annotation_to_cvat(annotation: dict, image_width: int, image_height: int, frame: int,
                                     labels_mapping: dict) -> dict:
        shapes = []
        for i, annotation in enumerate(annotation['data']):
            shape = annotation['shapes'][0]
            label_id = annotation['labels'][0]['id']
            if shape['type'] != 'rect':
                continue
            x = shape['geometry']['x']
            y = shape['geometry']['y']
            w = shape['geometry']['width']
            h = shape['geometry']['height']
            x0 = x * image_width
            y0 = y * image_height
            x1 = image_width * w + x0
            y1 = image_height * h + y0
            shapes.append(OrderedDict([
                ('type', ShapeType.RECTANGLE),
                ('occluded', False),
                ('z_order', 0),
                ('points', [x0, y0, x1, y1]),
                ('id', i),
                ('frame', frame),
                ('label_id', labels_mapping[label_id]),
                ('group', 0),
                ('source', 'auto'),
                ('attributes', [])
            ]))

        return annotation

    @retry()
    def __create_project(self, name: str, description: str = None,
                         labels: dict = None, tasks: List[dict] = None) -> dict:
        url = f'{self.host}/v2/projects'
        headers = {
            'Context-Type': 'application/json',
            'Authorization': f'bearer_token {self.token}',
        }
        tasks[1]['properties'] = [
            {
                "id": "labels",
                "user_value": labels
            }
        ]
        data = {
            'name': name,
            'description': description,
            "dimensions": [],
            "group_type": "normal",
            'pipeline': {
                'connections': [{
                    'from': {
                        **tasks[0]['output_ports'][0],
                        'task_id': tasks[0]['temp_id'],
                    },
                    'to': {
                        **tasks[1]['input_ports'][0],
                        'task_id': tasks[1]['temp_id'],
                    }
                }],
                'tasks': tasks,
            },
            "pipeline_representation": 'Detection',
            "type": "project",
        }
        print(data)
        response = self.request(method='POST', url=url, json=data, headers=headers)
        return response

    @retry()
    def __get_annotation(self, project_id: str, image_id: str) -> dict:
        '''
        {'data': [{'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546dda', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.5949299335479736}], 'modified': '2021-01-25T13:38:55.031000+00:00', 'shapes': [{'geometry': {'height': 0.23254196166992186, 'width': 0.16186065100907376, 'x': 0.6639615895601925, 'y': 0.37116973876953124}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546ddb', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.4465341866016388}], 'modified': '2021-01-25T13:38:55.031000+00:00', 'shapes': [{'geometry': {'height': 0.2205338287353516, 'width': 0.15582038583385482, 'x': 0.6094646048038563, 'y': 0.3778854115804036}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546ddc', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.3783963918685913}], 'modified': '2021-01-25T13:38:55.032000+00:00', 'shapes': [{'geometry': {'height': 0.20676183064778647, 'width': 0.15339418108084324, 'x': 0.6494346112572356, 'y': 0.33074376424153645}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546ddd', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.36928653717041016}], 'modified': '2021-01-25T13:38:55.032000+00:00', 'shapes': [{'geometry': {'height': 0.21628929138183595, 'width': 0.15760835688164898, 'x': 0.7025931767737015, 'y': 0.33435295104980467}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546dde', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.3307739496231079}], 'modified': '2021-01-25T13:38:55.032000+00:00', 'shapes': [{'geometry': {'height': 0.12125213623046877, 'width': 0.10699699697864518, 'x': 0.6962761526859746, 'y': 0.39386240641276044}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546ddf', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.3221939206123352}], 'modified': '2021-01-25T13:38:55.032000+00:00', 'shapes': [{'geometry': {'height': 0.12233866373697916, 'width': 0.10684307227295842, 'x': 0.6777566807141739, 'y': 0.4170698038736979}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546de0', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.3121785521507263}], 'modified': '2021-01-25T13:38:55.032000+00:00', 'shapes': [{'geometry': {'height': 0.20756629943847654, 'width': 0.15233989233367884, 'x': 0.5697756732658987, 'y': 0.3612097930908203}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546de1', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.30761095881462097}], 'modified': '2021-01-25T13:38:55.032000+00:00', 'shapes': [{'geometry': {'height': 0.12290746053059898, 'width': 0.10803497658205574, 'x': 0.6565173630123592, 'y': 0.3940216573079427}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546de2', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.3030250370502472}], 'modified': '2021-01-25T13:38:55.032000+00:00', 'shapes': [{'geometry': {'height': 0.09195897420247395, 'width': 0.06774329423009229, 'x': 0.7110153408313126, 'y': 0.4151226298014323}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546de3', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.29057735204696655}], 'modified': '2021-01-25T13:38:55.032000+00:00', 'shapes': [{'geometry': {'height': 0.22984837849934897, 'width': 0.1567941983142992, 'x': 0.7011507151273075, 'y': 0.41317179361979167}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546de4', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.2846594750881195}], 'modified': '2021-01-25T13:38:55.032000+00:00', 'shapes': [{'geometry': {'height': 0.09386962890624995, 'width': 0.0681265400109512, 'x': 0.691488903365535, 'y': 0.4379327901204427}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546de5', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.2818220257759094}], 'modified': '2021-01-25T13:38:55.032000+00:00', 'shapes': [{'geometry': {'height': 0.22078913370768233, 'width': 0.15377070459167708, 'x': 0.6488423639901439, 'y': 0.4468833923339844}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546de6', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.28046610951423645}], 'modified': '2021-01-25T13:38:55.032000+00:00', 'shapes': [{'geometry': {'height': 0.12194900512695311, 'width': 0.10681190538466057, 'x': 0.6764434699868976, 'y': 0.37076812744140625}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546de7', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.27363842725753784}], 'modified': '2021-01-25T13:38:55.032000+00:00', 'shapes': [{'geometry': {'height': 0.12176386515299481, 'width': 0.10350233323881419, 'x': 0.6986266555117725, 'y': 0.4403814697265625}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546de8', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.26438847184181213}], 'modified': '2021-01-25T13:38:55.032000+00:00', 'shapes': [{'geometry': {'height': 0.09134770711263024, 'width': 0.06715456087687732, 'x': 0.730375707671699, 'y': 0.43869908650716144}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546de9', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.25459131598472595}], 'modified': '2021-01-25T13:38:55.032000+00:00', 'shapes': [{'geometry': {'height': 0.12554580688476558, 'width': 0.10710646303484828, 'x': 0.6367248611545682, 'y': 0.4173071797688802}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546dea', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.25189316272735596}], 'modified': '2021-01-25T13:38:55.032000+00:00', 'shapes': [{'geometry': {'height': 0.21461883544921878, 'width': 0.15236349666819848, 'x': 0.5685458034090465, 'y': 0.42983963012695314}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546deb', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.24978479743003845}], 'modified': '2021-01-25T13:38:55.032000+00:00', 'shapes': [{'geometry': {'height': 0.12099477132161457, 'width': 0.10526463743742176, 'x': 0.7156479015517444, 'y': 0.37041905721028645}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546dec', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.24914249777793884}], 'modified': '2021-01-25T13:38:55.032000+00:00', 'shapes': [{'geometry': {'height': 0.19781552632649746, 'width': 0.14947505946153394, 'x': 0.591584779741767, 'y': 0.31644345601399737}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546ded', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.24536225199699402}], 'modified': '2021-01-25T13:38:55.032000+00:00', 'shapes': [{'geometry': {'height': 0.12362055460611981, 'width': 0.10541290932513292, 'x': 0.658253771193484, 'y': 0.44222218831380206}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546dee', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.24396058917045593}], 'modified': '2021-01-25T13:38:55.032000+00:00', 'shapes': [{'geometry': {'height': 0.20964159647623698, 'width': 0.15050520914815396, 'x': 0.3694993115784379, 'y': 0.38341890970865883}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546def', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.23912754654884338}], 'modified': '2021-01-25T13:38:55.032000+00:00', 'shapes': [{'geometry': {'height': 0.12372077941894533, 'width': 0.10616183131746715, 'x': 0.6356571660620698, 'y': 0.36933621724446614}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546df0', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.2338849902153015}], 'modified': '2021-01-25T13:38:55.032000+00:00', 'shapes': [{'geometry': {'height': 0.2917192586263021, 'width': 0.23494081652358412, 'x': 0.5031315847690473, 'y': 0.37264480590820315}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546df1', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.22877195477485657}], 'modified': '2021-01-25T13:38:55.032000+00:00', 'shapes': [{'geometry': {'height': 0.12582890828450521, 'width': 0.10625449169860768, 'x': 0.6155319882274718, 'y': 0.39280975341796875}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546df2', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.22668373584747314}], 'modified': '2021-01-25T13:38:55.033000+00:00', 'shapes': [{'geometry': {'height': 0.20773984273274743, 'width': 0.15060123066430697, 'x': 0.5317648647723717, 'y': 0.3850839996337891}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546df3', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.22058749198913574}], 'modified': '2021-01-25T13:38:55.033000+00:00', 'shapes': [{'geometry': {'height': 0.10827784220377601, 'width': 0.0623477558618194, 'x': 0.7202014755993821, 'y': 0.4608388264973958}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546df4', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.21693763136863708}], 'modified': '2021-01-25T13:38:55.033000+00:00', 'shapes': [{'geometry': {'height': 0.12062011718749999, 'width': 0.10326491488383915, 'x': 0.7342336795506101, 'y': 0.4171104431152344}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546df5', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.21674981713294983}], 'modified': '2021-01-25T13:38:55.033000+00:00', 'shapes': [{'geometry': {'height': 0.1224719492594401, 'width': 0.10500659393577905, 'x': 0.6966354121851533, 'y': 0.3452764129638672}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546df6', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.21092477440834045}], 'modified': '2021-01-25T13:38:55.033000+00:00', 'shapes': [{'geometry': {'height': 0.29433258056640627, 'width': 0.24055826619211518, 'x': 0.5474233233436326, 'y': 0.31677042643229164}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546df7', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.209214448928833}], 'modified': '2021-01-25T13:38:55.033000+00:00', 'shapes': [{'geometry': {'height': 0.25475021362304684, 'width': 0.23566827308549743, 'x': 0.6423655332104584, 'y': 0.2632212320963542}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546df8', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.20867660641670227}], 'modified': '2021-01-25T13:38:55.033000+00:00', 'shapes': [{'geometry': {'height': 0.090285390218099, 'width': 0.0686368214173968, 'x': 0.7487969428338157, 'y': 0.41593485514322914}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546df9', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.20610153675079346}], 'modified': '2021-01-25T13:38:55.033000+00:00', 'shapes': [{'geometry': {'height': 0.18351414998372395, 'width': 0.15789833116591057, 'x': 0.666507649332173, 'y': 0.28934911092122395}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546dfa', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.20540973544120789}], 'modified': '2021-01-25T13:38:55.033000+00:00', 'shapes': [{'geometry': {'height': 0.2097138977050781, 'width': 0.14982202026214408, 'x': 0.34995897123601766, 'y': 0.43447601318359375}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546dfb', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.20195463299751282}], 'modified': '2021-01-25T13:38:55.033000+00:00', 'shapes': [{'geometry': {'height': 0.12509490966796877, 'width': 0.10546340273975274, 'x': 0.6560768251574234, 'y': 0.3439368184407552}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546dfc', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.20144599676132202}], 'modified': '2021-01-25T13:38:55.033000+00:00', 'shapes': [{'geometry': {'height': 0.12238286336263021, 'width': 0.10266441755808042, 'x': 0.6798017022009935, 'y': 0.466985829671224}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546dfd', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.19950953125953674}], 'modified': '2021-01-25T13:38:55.033000+00:00', 'shapes': [{'geometry': {'height': 0.2666290283203125, 'width': 0.2695523716779763, 'x': 0.5595183294914542, 'y': 0.4191476440429687}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546dfe', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.19660434126853943}], 'modified': '2021-01-25T13:38:55.033000+00:00', 'shapes': [{'geometry': {'height': 0.21016746520996088, 'width': 0.20620112604134078, 'x': 0.7298552664707838, 'y': 0.36596280415852867}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546dff', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.1940755546092987}], 'modified': '2021-01-25T13:38:55.033000+00:00', 'shapes': [{'geometry': {'height': 0.20754643758138025, 'width': 0.15082787810935538, 'x': 0.5119349320928505, 'y': 0.43720245361328125}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e00', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.1910093128681183}], 'modified': '2021-01-25T13:38:55.033000+00:00', 'shapes': [{'geometry': {'height': 0.21052505493164064, 'width': 0.15027149568063602, 'x': 0.6101321338562852, 'y': 0.48379623413085937}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e01', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.1824716031551361}], 'modified': '2021-01-25T13:38:55.033000+00:00', 'shapes': [{'geometry': {'height': 0.0981173197428385, 'width': 0.07138439651126405, 'x': 0.6502242488168805, 'y': 0.4603911844889323}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e02', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.18067878484725952}], 'modified': '2021-01-25T13:38:55.033000+00:00', 'shapes': [{'geometry': {'height': 0.09920557657877604, 'width': 0.07298139397880166, 'x': 0.6289857713988188, 'y': 0.43555338541666666}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e03', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.1788066327571869}], 'modified': '2021-01-25T13:38:55.033000+00:00', 'shapes': [{'geometry': {'height': 0.20712270100911462, 'width': 0.14993973637701424, 'x': 0.40741089019966364, 'y': 0.4331105550130208}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e04', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.17854899168014526}], 'modified': '2021-01-25T13:38:55.033000+00:00', 'shapes': [{'geometry': {'height': 0.20382408142089842, 'width': 0.14988863184693763, 'x': 0.4076646558931086, 'y': 0.36078264872233073}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e05', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.1716364324092865}], 'modified': '2021-01-25T13:38:55.033000+00:00', 'shapes': [{'geometry': {'height': 0.20850463867187496, 'width': 0.15022562382665838, 'x': 0.5493099131482713, 'y': 0.4849717712402344}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e06', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.17079514265060425}], 'modified': '2021-01-25T13:38:55.033000+00:00', 'shapes': [{'geometry': {'height': 0.09163497924804692, 'width': 0.06733025657071334, 'x': 0.7498298807347075, 'y': 0.4623785909016927}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e07', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.1645161211490631}], 'modified': '2021-01-25T13:38:55.033000+00:00', 'shapes': [{'geometry': {'height': 0.12747505187988278, 'width': 0.10521166136625859, 'x': 0.5953121256917827, 'y': 0.3668595631917318}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e08', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.16144344210624695}], 'modified': '2021-01-25T13:38:55.034000+00:00', 'shapes': [{'geometry': {'height': 0.2052422078450521, 'width': 0.1490204659510912, 'x': 0.4711173466955765, 'y': 0.41132731119791666}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e09', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.16112199425697327}], 'modified': '2021-01-25T13:38:55.034000+00:00', 'shapes': [{'geometry': {'height': 0.1260994466145834, 'width': 0.10384234260110292, 'x': 0.6380046897000157, 'y': 0.46781417846679685}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e0a', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.16052347421646118}], 'modified': '2021-01-25T13:38:55.034000+00:00', 'shapes': [{'geometry': {'height': 0.1263659159342448, 'width': 0.10503703512447204, 'x': 0.6149010497130202, 'y': 0.3420916239420573}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e0b', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.16041365265846252}], 'modified': '2021-01-25T13:38:55.034000+00:00', 'shapes': [{'geometry': {'height': 0.09522755940755212, 'width': 0.06776705134347616, 'x': 0.7304537012818758, 'y': 0.48469045003255207}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e0c', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.16007429361343384}], 'modified': '2021-01-25T13:38:55.034000+00:00', 'shapes': [{'geometry': {'height': 0.07446126302083333, 'width': 0.08185402651752194, 'x': 0.7247891957231696, 'y': 0.40102859497070314}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e0d', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.15706098079681396}], 'modified': '2021-01-25T13:38:55.034000+00:00', 'shapes': [{'geometry': {'height': 0.2030254109700521, 'width': 0.147440847079357, 'x': 0.36880348024141507, 'y': 0.4894872538248698}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e0e', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.15634039044380188}], 'modified': '2021-01-25T13:38:55.034000+00:00', 'shapes': [{'geometry': {'height': 0.10054753621419266, 'width': 0.07432527506306708, 'x': 0.6084368995790637, 'y': 0.4100243631998698}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e0f', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.15542805194854736}], 'modified': '2021-01-25T13:38:55.034000+00:00', 'shapes': [{'geometry': {'height': 0.1264552307128906, 'width': 0.10363731336533955, 'x': 0.5968194037713157, 'y': 0.4429046630859375}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e10', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.15430670976638794}], 'modified': '2021-01-25T13:38:55.034000+00:00', 'shapes': [{'geometry': {'height': 0.20325002034505207, 'width': 0.14772646716598875, 'x': 0.4935700723316255, 'y': 0.49100021362304686}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e11', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.15409493446350098}], 'modified': '2021-01-25T13:38:55.034000+00:00', 'shapes': [{'geometry': {'height': 0.1222543080647786, 'width': 0.10407861511459637, 'x': 0.7348240170818993, 'y': 0.3440721893310547}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e12', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.15255892276763916}], 'modified': '2021-01-25T13:38:55.034000+00:00', 'shapes': [{'geometry': {'height': 0.12783701578776036, 'width': 0.10471448074741863, 'x': 0.5766690174241239, 'y': 0.41675984700520835}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e13', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.14986848831176758}], 'modified': '2021-01-25T13:38:55.034000+00:00', 'shapes': [{'geometry': {'height': 0.30575859069824224, 'width': 0.2444640960502386, 'x': 0.40754407517453456, 'y': 0.3652931467692057}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e14', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.1486014425754547}], 'modified': '2021-01-25T13:38:55.034000+00:00', 'shapes': [{'geometry': {'height': 0.12393758138020833, 'width': 0.10359331305244834, 'x': 0.6769730779196652, 'y': 0.3185869852701823}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e15', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.14657846093177795}], 'modified': '2021-01-25T13:38:55.034000+00:00', 'shapes': [{'geometry': {'height': 0.26517893473307297, 'width': 0.2731687619778629, 'x': 0.6541999368106618, 'y': 0.4297980244954427}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e16', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.14485111832618713}], 'modified': '2021-01-25T13:38:55.034000+00:00', 'shapes': [{'geometry': {'height': 0.12371302286783847, 'width': 0.09925255996264859, 'x': 0.6999037340376643, 'y': 0.4924169921875}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e17', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.1437663733959198}], 'modified': '2021-01-25T13:38:55.034000+00:00', 'shapes': [{'geometry': {'height': 0.08855120340983075, 'width': 0.0777191429472387, 'x': 0.6871531919782541, 'y': 0.3673914845784505}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e18', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.143233984708786}], 'modified': '2021-01-25T13:38:55.034000+00:00', 'shapes': [{'geometry': {'height': 0.1987500254313151, 'width': 0.1478218011772528, 'x': 0.4941000622115535, 'y': 0.36546429951985676}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e19', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.14187848567962646}], 'modified': '2021-01-25T13:38:55.034000+00:00', 'shapes': [{'geometry': {'height': 0.20233795166015622, 'width': 0.14784616940609357, 'x': 0.45155435688653783, 'y': 0.46407206217447916}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e1a', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.14143916964530945}], 'modified': '2021-01-25T13:38:55.034000+00:00', 'shapes': [{'geometry': {'height': 0.19962860107421876, 'width': 0.1480945114498592, 'x': 0.3722068968045995, 'y': 0.31266337076822914}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e1b', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.140631765127182}], 'modified': '2021-01-25T13:38:55.034000+00:00', 'shapes': [{'geometry': {'height': 0.12082102457682287, 'width': 0.09951281875782225, 'x': 0.7367308500860451, 'y': 0.4664683024088542}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e1c', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.13991674780845642}], 'modified': '2021-01-25T13:38:55.034000+00:00', 'shapes': [{'geometry': {'height': 0.1201608276367187, 'width': 0.10266441755808042, 'x': 0.75309644563028, 'y': 0.3937456766764323}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e1d', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.1384354531764984}], 'modified': '2021-01-25T13:38:55.034000+00:00', 'shapes': [{'geometry': {'height': 0.1253525797526041, 'width': 0.10222731722758915, 'x': 0.6585029535210029, 'y': 0.49399983723958335}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e1e', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.1381291151046753}], 'modified': '2021-01-25T13:38:55.035000+00:00', 'shapes': [{'geometry': {'height': 0.12146779378255207, 'width': 0.1034891942564925, 'x': 0.7167475274268617, 'y': 0.31909942626953125}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e1f', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.1337217390537262}], 'modified': '2021-01-25T13:38:55.035000+00:00', 'shapes': [{'geometry': {'height': 0.20710042317708333, 'width': 0.14783173180342613, 'x': 0.6697739850594493, 'y': 0.5086384582519531}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e20', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.13329121470451355}], 'modified': '2021-01-25T13:38:55.035000+00:00', 'shapes': [{'geometry': {'height': 0.1892679087320963, 'width': 0.1444076137041419, 'x': 0.6148320700558315, 'y': 0.26603406270345054}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e21', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.1325777769088745}], 'modified': '2021-01-25T13:38:55.035000+00:00', 'shapes': [{'geometry': {'height': 0.09030853271484368, 'width': 0.06878387107419426, 'x': 0.7684560687431555, 'y': 0.43958155314127606}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e22', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.13177600502967834}], 'modified': '2021-01-25T13:38:55.035000+00:00', 'shapes': [{'geometry': {'height': 0.1959190877278646, 'width': 0.14534903706537472, 'x': 0.39157264909994915, 'y': 0.7612934366861979}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e23', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.13136672973632812}], 'modified': '2021-01-25T13:38:55.035000+00:00', 'shapes': [{'geometry': {'height': 0.19957135518391927, 'width': 0.1483345652402417, 'x': 0.3337817520313478, 'y': 0.33959078470865883}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e24', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.13023480772972107}], 'modified': '2021-01-25T13:38:55.035000+00:00', 'shapes': [{'geometry': {'height': 0.20174433390299473, 'width': 0.14705622628872028, 'x': 0.5319619495071964, 'y': 0.5426397705078125}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e25', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.12962961196899414}], 'modified': '2021-01-25T13:38:55.035000+00:00', 'shapes': [{'geometry': {'height': 0.125658442179362, 'width': 0.10339806166399412, 'x': 0.6357058261303191, 'y': 0.3168312327067057}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e26', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.12945440411567688}], 'modified': '2021-01-25T13:38:55.035000+00:00', 'shapes': [{'geometry': {'height': 0.20543599446614585, 'width': 0.1478057975912273, 'x': 0.31339276329298343, 'y': 0.4136436971028646}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e27', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.12867721915245056}], 'modified': '2021-01-25T13:38:55.035000+00:00', 'shapes': [{'geometry': {'height': 0.12390416463216153, 'width': 0.10096841938653783, 'x': 0.3971342198988971, 'y': 0.44504130045572915}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e28', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.12860149145126343}], 'modified': '2021-01-25T13:38:55.035000+00:00', 'shapes': [{'geometry': {'height': 0.1913430531819662, 'width': 0.14491991943053817, 'x': 0.5363958977041614, 'y': 0.3187655385335286}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e29', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.1282450556755066}], 'modified': '2021-01-25T13:38:55.035000+00:00', 'shapes': [{'geometry': {'height': 0.30912277221679685, 'width': 0.24736720002786688, 'x': 0.44831418453975674, 'y': 0.45831624348958333}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e2a', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.12811803817749023}], 'modified': '2021-01-25T13:38:55.035000+00:00', 'shapes': [{'geometry': {'height': 0.0937754567464193, 'width': 0.07089481664091835, 'x': 0.7680197323069853, 'y': 0.3881304168701172}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e2b', 'labels': [{'color': '#ffff00ff', 'id': '600a9a440337dc6e03183107', 'name': 'bike', 'probability': 0.12809786200523376}], 'modified': '2021-01-25T13:38:55.035000+00:00', 'shapes': [{'geometry': {'height': 0.09195897420247395, 'width': 0.06774329423009229, 'x': 0.7110153408313126, 'y': 0.4151226298014323}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e2c', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.12770786881446838}], 'modified': '2021-01-25T13:38:55.035000+00:00', 'shapes': [{'geometry': {'height': 0.31090067545572914, 'width': 0.24670054945390724, 'x': 0.44535623294987875, 'y': 0.2960709635416667}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e2d', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.12757906317710876}], 'modified': '2021-01-25T13:38:55.035000+00:00', 'shapes': [{'geometry': {'height': 0.10078643798828119, 'width': 0.07266155142658792, 'x': 0.6289377988354584, 'y': 0.48568923950195314}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e2e', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.12583968043327332}], 'modified': '2021-01-25T13:38:55.035000+00:00', 'shapes': [{'geometry': {'height': 0.19644475301106779, 'width': 0.14515103565736465, 'x': 0.4316905454938791, 'y': 0.7071619160970052}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e2f', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.124635249376297}], 'modified': '2021-01-25T13:38:55.035000+00:00', 'shapes': [{'geometry': {'height': 0.12843584696451815, 'width': 0.10599461485059447, 'x': 0.5569497730317193, 'y': 0.39187934875488284}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e30', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.12408238649368286}], 'modified': '2021-01-25T13:38:55.035000+00:00', 'shapes': [{'geometry': {'height': 0.19871495564778652, 'width': 0.1459322321847622, 'x': 0.47151873496655977, 'y': 0.5482470194498698}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e31', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.12398830056190491}], 'modified': '2021-01-25T13:38:55.035000+00:00', 'shapes': [{'geometry': {'height': 0.12662246704101565, 'width': 0.10251259356177644, 'x': 0.5773143935412429, 'y': 0.47048070271809894}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e32', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.12389007210731506}], 'modified': '2021-01-25T13:38:55.035000+00:00', 'shapes': [{'geometry': {'height': 0.19835136413574217, 'width': 0.1479315727911843, 'x': 0.7115938380006258, 'y': 0.26061002095540364}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e33', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.12357887625694275}], 'modified': '2021-01-25T13:38:55.035000+00:00', 'shapes': [{'geometry': {'height': 0.2025552368164063, 'width': 0.14589090550199468, 'x': 0.5906772350936718, 'y': 0.5417975870768229}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e34', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.12328153848648071}], 'modified': '2021-01-25T13:38:55.035000+00:00', 'shapes': [{'geometry': {'height': 0.19793319702148438, 'width': 0.14539189153678422, 'x': 0.47158416251515567, 'y': 0.6794290669759114}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e35', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.12276655435562134}], 'modified': '2021-01-25T13:38:55.036000+00:00', 'shapes': [{'geometry': {'height': 0.12600616455078123, 'width': 0.10159278840982866, 'x': 0.4162735921122106, 'y': 0.4179216512044271}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e36', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.12262442708015442}], 'modified': '2021-01-25T13:38:55.036000+00:00', 'shapes': [{'geometry': {'height': 0.19818532307942716, 'width': 0.14672576560544437, 'x': 0.4096550207412586, 'y': 0.5222640482584635}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e37', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.12213528156280518}], 'modified': '2021-01-25T13:38:55.036000+00:00', 'shapes': [{'geometry': {'height': 0.12094090779622402, 'width': 0.10070472306691958, 'x': 0.754141453061444, 'y': 0.44163558959960936}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e38', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.12111082673072815}], 'modified': '2021-01-25T13:38:55.036000+00:00', 'shapes': [{'geometry': {'height': 0.12797103881835942, 'width': 0.10432111336680616, 'x': 0.5570941108636772, 'y': 0.4431531270345052}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e39', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.1210256814956665}], 'modified': '2021-01-25T13:38:55.036000+00:00', 'shapes': [{'geometry': {'height': 0.12294184366861977, 'width': 0.10291260682298187, 'x': 0.39689714529636655, 'y': 0.39451395670572914}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e3a', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.12062352895736694}], 'modified': '2021-01-25T13:38:55.036000+00:00', 'shapes': [{'geometry': {'height': 0.12316345214843755, 'width': 0.10267041412850048, 'x': 0.3778478744182181, 'y': 0.42056182861328123}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e3b', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.11967867612838745}], 'modified': '2021-01-25T13:38:55.036000+00:00', 'shapes': [{'geometry': {'height': 0.10270380655924477, 'width': 0.07566858322659187, 'x': 0.5879730873919548, 'y': 0.3837515767415365}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e3c', 'labels': [{'color': '#ffff00ff', 'id': '600a9a440337dc6e03183107', 'name': 'bike', 'probability': 0.11915081739425659}], 'modified': '2021-01-25T13:38:55.036000+00:00', 'shapes': [{'geometry': {'height': 0.09134770711263024, 'width': 0.06715456087687732, 'x': 0.730375707671699, 'y': 0.43869908650716144}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e3d', 'labels': [{'color': '#ffff00ff', 'id': '600a9a440337dc6e03183107', 'name': 'bike', 'probability': 0.11844593286514282}], 'modified': '2021-01-25T13:38:55.036000+00:00', 'shapes': [{'geometry': {'height': 0.09386962890624995, 'width': 0.0681265400109512, 'x': 0.691488903365535, 'y': 0.4379327901204427}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e3e', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.1175391674041748}], 'modified': '2021-01-25T13:38:55.036000+00:00', 'shapes': [{'geometry': {'height': 0.1974660237630208, 'width': 0.1450935526097074, 'x': 0.49186842134210734, 'y': 0.6283880615234375}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e3f', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.11686533689498901}], 'modified': '2021-01-25T13:38:55.036000+00:00', 'shapes': [{'geometry': {'height': 0.12654210408528643, 'width': 0.10263195204943687, 'x': 0.6165390301108807, 'y': 0.49533126831054686}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e40', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.11630162596702576}], 'modified': '2021-01-25T13:38:55.036000+00:00', 'shapes': [{'geometry': {'height': 0.3166759745279949, 'width': 0.24851930544283873, 'x': 0.5196435042704748, 'y': 0.5038983662923177}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e41', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.11599642038345337}], 'modified': '2021-01-25T13:38:55.036000+00:00', 'shapes': [{'geometry': {'height': 0.20336158752441402, 'width': 0.14987919775207292, 'x': 0.746225521770377, 'y': 0.31087247212727864}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e42', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.11571526527404785}], 'modified': '2021-01-25T13:38:55.036000+00:00', 'shapes': [{'geometry': {'height': 0.3113161977132161, 'width': 0.24643177323705417, 'x': 0.32259123495433745, 'y': 0.32245267232259117}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e43', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.11478093266487122}], 'modified': '2021-01-25T13:38:55.036000+00:00', 'shapes': [{'geometry': {'height': 0.12343378702799479, 'width': 0.10137863063692898, 'x': 0.37753551803035046, 'y': 0.4719788614908854}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e44', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.11372622847557068}], 'modified': '2021-01-25T13:38:55.036000+00:00', 'shapes': [{'geometry': {'height': 0.12537134806315103, 'width': 0.09975676840924197, 'x': 0.41600611451570324, 'y': 0.47067179361979167}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e45', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.11276483535766602}], 'modified': '2021-01-25T13:38:55.036000+00:00', 'shapes': [{'geometry': {'height': 0.10337905883789067, 'width': 0.0676055640840113, 'x': 0.7362872566538251, 'y': 0.5147915649414062}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e46', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.11271253228187561}], 'modified': '2021-01-25T13:38:55.036000+00:00', 'shapes': [{'geometry': {'height': 0.1968697611490885, 'width': 0.1457755574595197, 'x': 0.45084531017776125, 'y': 0.6031899007161459}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e47', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.1117684543132782}], 'modified': '2021-01-25T13:38:55.037000+00:00', 'shapes': [{'geometry': {'height': 0.19742034912109374, 'width': 0.14442774231950095, 'x': 0.5129978146511264, 'y': 0.706615702311198}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e48', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.11158859729766846}], 'modified': '2021-01-25T13:38:55.037000+00:00', 'shapes': [{'geometry': {'height': 0.12687672932942712, 'width': 0.10088626255231148, 'x': 0.4353097622027534, 'y': 0.4430780029296875}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e49', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.11052903532981873}], 'modified': '2021-01-25T13:38:55.037000+00:00', 'shapes': [{'geometry': {'height': 0.1891936238606771, 'width': 0.14352497201091208, 'x': 0.6562853683070635, 'y': 0.23666941324869792}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e4a', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.11040723323822021}], 'modified': '2021-01-25T13:38:55.037000+00:00', 'shapes': [{'geometry': {'height': 0.10045115152994794, 'width': 0.07395535923811014, 'x': 0.5685545499990222, 'y': 0.43571726481119794}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e4b', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.11027500033378601}], 'modified': '2021-01-25T13:38:55.037000+00:00', 'shapes': [{'geometry': {'height': 0.12636118570963545, 'width': 0.10286768983690542, 'x': 0.5579901207075251, 'y': 0.49685577392578123}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e4c', 'labels': [{'color': '#ffff00ff', 'id': '600a9a440337dc6e03183107', 'name': 'bike', 'probability': 0.10985511541366577}], 'modified': '2021-01-25T13:38:55.037000+00:00', 'shapes': [{'geometry': {'height': 0.0963072713216146, 'width': 0.07025811072434296, 'x': 0.6706464287634935, 'y': 0.4130573527018229}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e4d', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.10949167609214783}], 'modified': '2021-01-25T13:38:55.037000+00:00', 'shapes': [{'geometry': {'height': 0.1256348164876303, 'width': 0.09967850743605289, 'x': 0.6791624754331587, 'y': 0.5209380594889322}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e4e', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.10939344763755798}], 'modified': '2021-01-25T13:38:55.037000+00:00', 'shapes': [{'geometry': {'height': 0.1267083740234375, 'width': 0.10388011717527768, 'x': 0.5379784193743156, 'y': 0.4712006632486979}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e4f', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.10891762375831604}], 'modified': '2021-01-25T13:38:55.037000+00:00', 'shapes': [{'geometry': {'height': 0.21093022664388023, 'width': 0.1494064235567898, 'x': 0.7272014212101063, 'y': 0.47620035807291666}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e50', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.10885950922966003}], 'modified': '2021-01-25T13:38:55.037000+00:00', 'shapes': [{'geometry': {'height': 0.19922139485677093, 'width': 0.14481610619231067, 'x': 0.552119516461006, 'y': 0.5993121337890625}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e51', 'labels': [{'color': '#ffff00ff', 'id': '600a9a440337dc6e03183107', 'name': 'bike', 'probability': 0.10880729556083679}], 'modified': '2021-01-25T13:38:55.037000+00:00', 'shapes': [{'geometry': {'height': 0.09384526570638024, 'width': 0.06761083495482634, 'x': 0.7113671141661452, 'y': 0.4611072285970052}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e52', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.10872209072113037}], 'modified': '2021-01-25T13:38:55.037000+00:00', 'shapes': [{'geometry': {'height': 0.12558120727539057, 'width': 0.10012569117158165, 'x': 0.39616346299573685, 'y': 0.49801417032877604}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e53', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.10771110653877258}], 'modified': '2021-01-25T13:38:55.037000+00:00', 'shapes': [{'geometry': {'height': 0.19460098266601566, 'width': 0.14417890374442666, 'x': 0.3942628557303074, 'y': 0.6821442159016927}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e54', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.1075214147567749}], 'modified': '2021-01-25T13:38:55.037000+00:00', 'shapes': [{'geometry': {'height': 0.31878540039062503, 'width': 0.24338937312998676, 'x': 0.6022439319290714, 'y': 0.4918128458658854}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e55', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.10635361075401306}], 'modified': '2021-01-25T13:38:55.037000+00:00', 'shapes': [{'geometry': {'height': 0.19794174194335945, 'width': 0.14428489408146894, 'x': 0.5335680373171543, 'y': 0.6548035176595052}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e56', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.10634565353393555}], 'modified': '2021-01-25T13:38:55.037000+00:00', 'shapes': [{'geometry': {'height': 0.09643925984700524, 'width': 0.07156792212189061, 'x': 0.3894389776771746, 'y': 0.464429931640625}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e57', 'labels': [{'color': '#ffff00ff', 'id': '600a9a440337dc6e03183107', 'name': 'bike', 'probability': 0.105878084897995}], 'modified': '2021-01-25T13:38:55.037000+00:00', 'shapes': [{'geometry': {'height': 0.09549992879231772, 'width': 0.06947366764608098, 'x': 0.6908915380064925, 'y': 0.38937856038411456}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e58', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.10540398955345154}], 'modified': '2021-01-25T13:38:55.037000+00:00', 'shapes': [{'geometry': {'height': 0.1279048156738281, 'width': 0.10429235274561954, 'x': 0.5765925516025892, 'y': 0.34155471801757814}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e59', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.10518947243690491}], 'modified': '2021-01-25T13:38:55.037000+00:00', 'shapes': [{'geometry': {'height': 0.09522349039713546, 'width': 0.07097991446828067, 'x': 0.38963755200592537, 'y': 0.413936767578125}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e5a', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.10511326789855957}], 'modified': '2021-01-25T13:38:55.037000+00:00', 'shapes': [{'geometry': {'height': 0.19494977315266926, 'width': 0.14654709072375632, 'x': 0.4512452088548185, 'y': 0.34168601989746095}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e5b', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.10473129153251648}], 'modified': '2021-01-25T13:38:55.037000+00:00', 'shapes': [{'geometry': {'height': 0.1242632548014323, 'width': 0.10217544880319152, 'x': 0.6974597305469727, 'y': 0.29126490275065103}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e5c', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.10472479462623596}], 'modified': '2021-01-25T13:38:55.037000+00:00', 'shapes': [{'geometry': {'height': 0.19814442952473954, 'width': 0.1443069706273467, 'x': 0.41210188883565396, 'y': 0.6269297281901042}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e5d', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.10443106293678284}], 'modified': '2021-01-25T13:38:55.038000+00:00', 'shapes': [{'geometry': {'height': 0.19600163777669266, 'width': 0.14364433049857245, 'x': 0.45154645058031523, 'y': 0.7592828877766927}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e5e', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.10384714603424072}], 'modified': '2021-01-25T13:38:55.038000+00:00', 'shapes': [{'geometry': {'height': 0.12576039632161462, 'width': 0.10286379397586826, 'x': 0.4344228045066098, 'y': 0.3928959147135417}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e5f', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.10346192121505737}], 'modified': '2021-01-25T13:38:55.038000+00:00', 'shapes': [{'geometry': {'height': 0.1275144958496094, 'width': 0.10205055208170366, 'x': 0.6368256188155116, 'y': 0.5224923706054687}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e60', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.10283112525939941}], 'modified': '2021-01-25T13:38:55.038000+00:00', 'shapes': [{'geometry': {'height': 0.19866124471028646, 'width': 0.1458020263977433, 'x': 0.3909317417646081, 'y': 0.5738763427734375}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e61', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.10173791646957397}], 'modified': '2021-01-25T13:38:55.038000+00:00', 'shapes': [{'geometry': {'height': 0.32222173055013015, 'width': 0.25349523666057183, 'x': 0.43674668561531993, 'y': 0.5704396057128907}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e62', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.10139456391334534}], 'modified': '2021-01-25T13:38:55.038000+00:00', 'shapes': [{'geometry': {'height': 0.19761703491210936, 'width': 0.14485097796806556, 'x': 0.35318340735978565, 'y': 0.5451211547851562}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e63', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.10076084733009338}], 'modified': '2021-01-25T13:38:55.038000+00:00', 'shapes': [{'geometry': {'height': 0.12391133626302081, 'width': 0.10277537320820945, 'x': 0.4156915428343046, 'y': 0.3686103820800781}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e64', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.10045230388641357}], 'modified': '2021-01-25T13:38:55.038000+00:00', 'shapes': [{'geometry': {'height': 0.10255193074544267, 'width': 0.07433509110509229, 'x': 0.6078978575514314, 'y': 0.5118170166015625}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e65', 'labels': [{'color': '#ffaf00ff', 'id': '600a9a440337dc6e03183108', 'name': 'animal', 'probability': 0.10038968920707703}], 'modified': '2021-01-25T13:38:55.038000+00:00', 'shapes': [{'geometry': {'height': 0.12724070231119794, 'width': 0.10469190767023229, 'x': 0.5166676011640527, 'y': 0.44506749471028645}, 'type': 'rect'}]}, {'editor': '', 'editor_name': '', 'id': '600ec9ef3846b37ab8546e66', 'labels': [{'color': '#ffff00ff', 'id': '600a9a440337dc6e03183107', 'name': 'bike', 'probability': 0.10013189911842346}], 'modified': '2021-01-25T13:38:55.038000+00:00', 'shapes': [{'geometry': {'height': 0.09259656270345051, 'width': 0.0692717703770338, 'x': 0.7295816395249922, 'y': 0.3901414744059245}, 'type': 'rect'}]}], 'id': '600ec9ee26b1517497e328db', 'image_id': '600a9a4f0337dc6e0318310a', 'kind': 'prediction', 'modified': '2021-01-25T13:38:54.787000+00:00', 'result_media': []}
        :param project_id:
        :param image_id:
        :return:
        '''
        url = f'{self.host}/v2/projects/{project_id}/media/images/{image_id}/results/online'
        headers = {
            'Authorization': f'bearer_token {self.token}',
        }
        response = self.request(method='GET', url=url, headers=headers)
        return response

    @retry()
    def __get_job_status(self, project_id: str) -> dict:
        url = f'{self.host}/v2/projects/{project_id}/jobs'
        headers = {
            'Authorization': f'bearer_token {self.token}',
        }
        response = self.request(method='GET', url=url, headers=headers)
        return response

    @retry()
    def __get_project_summary(self, project_id: str) -> dict:
        url = f'{self.host}/v2/projects/{project_id}/statistics/summary'
        headers = {
            'Authorization': f'bearer_token {self.token}',
        }
        response = self.request(method='GET', url=url, headers=headers)
        return response

    @retry()
    def __get_project(self, project_id: str) -> dict:
        url = f'{self.host}/v2/projects/{project_id}'
        headers = {
            'Authorization': f'bearer_token {self.token}',
        }
        response = self.request(method='GET', url=url, headers=headers)
        return response

    @retry()
    def __get_server_status(self) -> dict:
        url = f'{self.host}/v2/status'
        headers = {
            'Authorization': f'bearer_token {self.token}',
        }
        response = self.request(method='GET', url=url, headers=headers)
        return response

    @retry()
    def __get_tasks(self) -> List[dict]:
        url = f'{self.host}/v2/tasks'
        headers = {
            'Authorization': f'bearer_token {self.token}',
        }
        response = self.request(method='GET', url=url, headers=headers)
        return response

    def __delete_token(self):
        cache.delete(self.token_key)

    @retry()
    def __upload_annotation(self, project_id: str, image_id: str, annotation: List[dict]):
        url = f'{self.host}/v2/projects/{project_id}/media/images/{image_id}/annotations'
        headers = {
            'Authorization': f'bearer_token {self.token}',
            'Content-Type': 'application/json'
        }
        data = {
            'image_id': image_id,
            'data': annotation
        }
        response = self.request(method='POST', url=url, headers=headers, json=data)
        return response

    @retry()
    def __upload_image(self, project_id: str, buffer, image_path: str = '') -> dict:
        url = f'{self.host}/v2/projects/{project_id}/media/images'
        # print('file_path', image_path, os.path.isfile(image_path))
        files = {'file': buffer}
        # files = {'file': open(image_path, 'rb')}
        headers = {
            'Authorization': f'bearer_token {self.token}',
        }
        response = self.request(method='POST', url=url, headers=headers, files=files)
        return response

    @property
    def project_id_key(self):
        return f'{self.host}_{self.username}_project_id'

    @property
    def token(self) -> str:
        def get_token(host: str, username: str, password: str) -> dict:
            url = f'{host}/v2/authentication'
            data = {
                'username': (None, username),
                'password': (None, password),
            }
            response = requests.post(url=url, files=data, verify=False)
            return response.json()

        try:
            token = cache.get(self.token_key)
        except CacheMiss:
            response = get_token(self.host, self.username, self.password)
            cache.set(cache_key=self.token_key, data=response['secure_token'], timeout=response['expires_in'])
            token = response['secure_token']
        return token

    @property
    def token_key(self):
        return f'{self.host}_{self.username}_token'

    def request(self, method: str, url: str, **kwargs) -> Union[list, dict, str]:
        print('Request')
        print(f'Url {url}\ndata {kwargs.get("data")}, files {kwargs.get("files")}')
        response = requests.request(method=method, url=url, verify=False, **kwargs)
        if response.status_code == 401:
            self.__delete_token()
            raise Exception("401")
        result = response.json()
        print('Resp', result, '\n')
        return result

    def create_project(self, name: str, description: str = '', project_class: str = None,
                       labels: List[dict] = None) -> dict:
        all_tasks = self.__get_tasks()
        task_type = self.TRAINING_CLASS.get(project_class)
        tasks = [
            next(({'temp_id': '_1_', **task}
                  for task in all_tasks
                  if task['task_type'] == 'DATASET'), {}),
            next(({'temp_id': '_2_', **task}
                  for task in all_tasks
                  if task['task_type'] == task_type), {}),
        ]
        labels = [{
            'name': label['name'],
            'temp_id': label['name']
        } for label in labels]
        r = self.__create_project(name=name, description=description, tasks=tasks, labels=labels)
        return r

    def get_server_status(self) -> dict:
        return self.__get_server_status()

    def upload_annotations(self, project_id: str, frames_data: List[dict]):
        for frame in frames_data:
            annotation = self.__convert_annotation_from_cvat(frame['shapes'])
            self.__upload_annotation(project_id=project_id, image_id=frame['third_party_id'], annotation=annotation)

    def upload_images(self, project_id: str, images: List[dict] = None) -> list:
        images_list = []
        for image in images:
            response = self.__upload_image(project_id=project_id, image_path=image['path'])
            images_list.append({
                'id': image['id'],
                'path': image['path'],
                'third_party_id': response['id']
            })
        return images_list

    def upload_image(self, training_id: str, buffer):
        response = self.__upload_image(project_id=training_id, buffer=buffer)
        return response.get('id')

    def get_project_status(self, project_id) -> dict:
        summary = self.__get_project_summary(project_id=project_id)
        jobs = self.__get_job_status(project_id=project_id)
        media_amount = next(item['value'] for item in summary if item['key'] == 'Media')
        annotation_amount = next(item['value'] for item in summary if item['key'] == 'Annotation')
        score = next(item['value'] for item in summary if item['key'] == 'Score')
        if len(jobs['items']) == 0 and score == 0:
            status = 'Not started'
        elif len(jobs['items']) == 0 and score > 0:
            status = 'Finished'
        else:
            status = 'In progress'
        progress = 0 if len(jobs["items"]) == 0 else jobs["items"][0]["status"]["progress"]
        time_remaining = 0 if len(jobs["items"]) == 0 else jobs["items"][0]["status"]['time_remaining']
        result = {
            'media_amount': media_amount,
            'annotation_amount': annotation_amount,
            'score': score,
            'status': status,
            'progress': progress,
            'time_remaining': time_remaining,
        }
        return result

    def get_annotation(self, project_id: str, image_id: str, width: int, height: int, frame: int,
                       labels_mapping: dict) -> dict:
        annotation = self.__get_annotation(project_id=project_id, image_id=image_id)
        cvat_annotation = self.__convert_annotation_to_cvat(annotation=annotation, image_width=width,
                                                            image_height=height, frame=frame,
                                                            labels_mapping=labels_mapping)
        return cvat_annotation

    def get_labels(self, project_id: str) -> dict:
        project = self.__get_project(project_id=project_id)
        labels = [{
            'id': label['id'],
            'name': label['name']
        } for label in project.get('labels')]
        return labels


'''
 https://nnlicv205.inn.intel.com/v2/authentication"
payload = {
    'username': (None, 'intel'),
    'password': (None, 'Int3l!')
'''


def get_images(path: str) -> List[dict]:
    result = []
    i = 1000
    for root, dirs, files in os.walk(path):
        for file in files:
            i += 1
            p = os.path.join(root, file)
            result.append({
                'id': i,
                'path': p,
            })
    return result


if __name__ == '__main__':
    client = NousServer('https://nnlicv205.inn.intel.com', 'intel', 'Int3l!')
    # p_id = client.create_project('asd2', 'description', 'DETECTION', [{
    #     'name': 'bike',
    #     "color": "#ffff00ff",
    #     "temp_id": "_1_",
    #     "group": "default",
    # }, {
    #     'name': 'animal',
    #     "color": "#ffaf00ff",
    #     "temp_id": "_2_",
    #     "group": "default",
    # }])
    p_id = '600a9a440337dc6e03183104'
    # pr = client._NousServer__get_project(p_id)
    # print(pr)
    # client.get_server_status()
    # images = get_images('images')
    # print(images)
    # images = client.upload_images(project_id=p_id, images=images)
    # print(images)
    images = [
        {
            'id': 1001, 'path': 'images\\33--Running\\33_Running_Running_33_107.jpg',
            'third_party_id': '600a9a4f0337dc6e0318310a'
        }, {
            'id': 1002, 'path': 'images\\33--Running\\33_Running_Running_33_119.jpg',
            'third_party_id': '600a9a560337dc6e0318310b'
        }, {
            'id': 1003, 'path': 'images\\33--Running\\33_Running_Running_33_17.jpg',
            'third_party_id': '600a9a5c0337dc6e0318310c'
        }, {
            'id': 1004, 'path': 'images\\33--Running\\33_Running_Running_33_203.jpg',
            'third_party_id': '600a9a620337dc6e0318310d'
        }, {
            'id': 1005, 'path': 'images\\33--Running\\33_Running_Running_33_209.jpg',
            'third_party_id': '600a9a680337dc6e0318310e'
        }, {
            'id': 1006, 'path': 'images\\33--Running\\33_Running_Running_33_266.jpg',
            'third_party_id': '600a9a6f0337dc6e0318310f'
        }, {
            'id': 1007, 'path': 'images\\33--Running\\33_Running_Running_33_286.jpg',
            'third_party_id': '600a9a760337dc6e03183110'
        }, {
            'id': 1008, 'path': 'images\\33--Running\\33_Running_Running_33_316.jpg',
            'third_party_id': '600a9a810337dc6e03183111'
        }, {
            'id': 1009, 'path': 'images\\33--Running\\33_Running_Running_33_332.jpg',
            'third_party_id': '600a9a890337dc6e03183112'
        }, {
            'id': 1010, 'path': 'images\\33--Running\\33_Running_Running_33_341.jpg',
            'third_party_id': '600a9a900337dc6e03183113'
        }, {
            'id': 1011, 'path': 'images\\33--Running\\33_Running_Running_33_35.jpg',
            'third_party_id': '600a9a970337dc6e03183114'
        }, {
            'id': 1012, 'path': 'images\\33--Running\\33_Running_Running_33_411.jpg',
            'third_party_id': '600a9a9c0337dc6e03183115'
        }, {
            'id': 1013, 'path': 'images\\33--Running\\33_Running_Running_33_44.jpg',
            'third_party_id': '600a9aa30337dc6e03183116'
        }, {
            'id': 1014, 'path': 'images\\33--Running\\33_Running_Running_33_475.jpg',
            'third_party_id': '600a9aa90337dc6e03183117'
        }, {
            'id': 1015, 'path': 'images\\33--Running\\33_Running_Running_33_490.jpg',
            'third_party_id': '600a9aaf0337dc6e03183118'
        }, {
            'id': 1016, 'path': 'images\\33--Running\\33_Running_Running_33_517.jpg',
            'third_party_id': '600a9ab50337dc6e03183119'
        }, {
            'id': 1017, 'path': 'images\\33--Running\\33_Running_Running_33_538.jpg',
            'third_party_id': '600a9abb0337dc6e0318311a'
        }, {
            'id': 1018, 'path': 'images\\33--Running\\33_Running_Running_33_547.jpg',
            'third_party_id': '600a9ac10337dc6e0318311b'
        }, {
            'id': 1019, 'path': 'images\\33--Running\\33_Running_Running_33_569.jpg',
            'third_party_id': '600a9ac80337dc6e0318311c'
        }, {
            'id': 1020, 'path': 'images\\33--Running\\33_Running_Running_33_577.jpg',
            'third_party_id': '600a9acf0337dc6e0318311d'
        }, {
            'id': 1021, 'path': 'images\\33--Running\\33_Running_Running_33_586.jpg',
            'third_party_id': '600a9ad50337dc6e0318311e'
        }, {
            'id': 1022, 'path': 'images\\33--Running\\33_Running_Running_33_747.jpg',
            'third_party_id': '600a9adc0337dc6e0318311f'
        }, {
            'id': 1023, 'path': 'images\\33--Running\\33_Running_Running_33_760.jpg',
            'third_party_id': '600a9ae40337dc6e03183120'
        }, {
            'id': 1024, 'path': 'images\\33--Running\\33_Running_Running_33_771.jpg',
            'third_party_id': '600a9aea0337dc6e03183121'
        }, {
            'id': 1025, 'path': 'images\\33--Running\\33_Running_Running_33_786.jpg',
            'third_party_id': '600a9af10337dc6e03183122'
        }, {
            'id': 1026, 'path': 'images\\33--Running\\33_Running_Running_33_891.jpg',
            'third_party_id': '600a9af70337dc6e03183123'
        }]
    labels_map = {
        'bike': '600a9a440337dc6e03183107',
        'animal': '600a9a440337dc6e03183108'
    }
    ann = [
        # {
        #     "id": str(uuid.uuid4()),
        #     # 'temp_id': '_1_',
        #     "shapes": [
        #         {
        #             "type": "polygon",
        #             "geometry": {
        #                 "x": 0.0,
        #                 "y": 0.0,
        #                 "width": 0.0,
        #                 "height": 0.0,
        #                 "points": [
        #                     {
        #                         "x": 0.214763656,
        #                         "y": 0.363911748,
        #                         "r": 0.0
        #                     },
        #                     {
        #                         "x": 0.439329,
        #                         "y": 0.2809801,
        #                         "r": 0.0
        #                     },
        #                     {
        #                         "x": 0.5235204,
        #                         "y": 0.6612841,
        #                         "r": 0.0
        #                     },
        #                     {
        #                         "x": 0.153001368,
        #                         "y": 0.7309409,
        #                         "r": 0.0
        #                     },
        #                     {
        #                         "x": 0.3219314,
        #                         "y": 0.5822182,
        #                         "r": 0.0
        #                     },
        #                     {
        #                         "x": 0.122968152,
        #                         "y": 0.5304315,
        #                         "r": 0.0
        #                     },
        #                     {
        #                         "x": 0.214763656,
        #                         "y": 0.363911748,
        #                         "r": 0.0
        #                     }
        #                 ]
        #             }
        #         }
        #     ],
        #     "editor": None,
        #     "labels": [
        #         {
        #             "id": labels_map['bike'],
        #             "probability": 1.0
        #         }
        #     ]
        # },
        # {
        #     "id": str(uuid.uuid4()),
        #     # 'temp_id': '_2_',
        #     "shapes": [
        #         {
        #             "type": "point",
        #             "geometry": {
        #                 "x": 0.543898344,
        #                 "y": 0.189405054,
        #                 "width": 0.025,
        #                 "height": 0.0333333351,
        #                 "points": [
        #                     {
        #                         "x": 0.556398332,
        #                         "y": 0.201905057,
        #                         "r": 0.0125
        #                     }
        #                 ]
        #             }
        #         }
        #     ],
        #     "editor": None,
        #     "labels": [
        #         {
        #             "id": labels_map['bike'],
        #             "probability": 1.0
        #         }
        #     ]
        # },
        {
            "id": str(uuid.uuid4()),
            "shapes": [
                {
                    "type": "rect",
                    "geometry": {
                        "x": 0.635174036,
                        "y": 0.393743843,
                        "width": 0.175549313,
                        "height": 0.204229221,
                        "points": None
                    }
                }
            ],
            "editor": None,
            "labels": [
                {
                    "id": labels_map['animal'],
                    "probability": 1.0
                }
            ]
        }
    ]

    image_data = [{**image, 'annotation': ann} for image in images]
    client.upload_annotations(project_id=p_id, image_data=image_data)

a = {
    'name': 'tfet1dffff12deef3fs',
    'description': 'description',
    'dimensions': [],
    'labels': [{
        'name': 'bike'
    }, {
        'name': 'animal'
    }],
    'group_type': 'normal',
    'pipeline': {
        'connections': [{
            'from': {'port_name': 'Output dataset', 'type': 'dataset_2d', 'task_id': '_1_'},
            'to': {'port_name': 'Input dataset', 'type': 'dataset_2d', 'task_id': '_2_'}
        }], 'tasks': [{
            'temp_id': '_1_',
            'capabilities': [],
            'class_name': 'Dataset2DTask',
            'class_path': 'nous.director_microservice.chaining.task_dataset_2d',
            'input_ports': [],
            'instantiation': 'CLASS',
            'is_trainable': False,
            'output_ports': [{'port_name': 'Output dataset', 'type': 'dataset_2d'}],
            'pipeline_friendly': True,
            'properties': [],
            'task_family': 'DATASET',
            'task_name': 'Image Dataset',
            'task_type': 'DATASET',
            'task_type_sort_priority': -1
        }, {
            'temp_id': '_2_',
            'capabilities': [],
            'grpc_address': 'nous_detection:50058',
            'input_ports': [{'port_name': 'Input dataset', 'type': 'dataset_2d'}],
            'instantiation': 'GRPC',
            'is_trainable': True,
            'output_ports': [{'port_name': 'Output dataset', 'type': 'dataset_2d'}],
            'pipeline_friendly': True,
            'properties': [{
                'id': 'labels',
                'user_value': [{'name': 'bike'}, {'name': 'animal'}]
            }],
            'task_family': 'VISION',
            'task_name': 'Detection',
            'task_type': 'DETECTION',
            'task_type_sort_priority': -1
        }]
    },
    'pipeline_representation': 'Detection',
    'type': 'project'
}

b = {
    'image_id': '600a9a5c0337dc6e0318310c',
    'data': [{
        # 'id': '1a6c0ba6-74a9-4e46-b69c-9bc3de815966',
        'temp_id': '_1_',
        'shapes': [{
            'type': 'polygon',
            'geometry': {
                'x': 0.0,
                'y': 0.0,
                'width': 0.0,
                'height': 0.0,
                'points': [
                    {
                        'x': 0.214763656,
                        'y': 0.363911748,
                        'r': 0.0
                    },
                    {
                        'x': 0.439329,
                        'y': 0.2809801,
                        'r': 0.0
                    },
                    {
                        'x': 0.5235204,
                        'y': 0.6612841,
                        'r': 0.0
                    },
                    {
                        'x': 0.153001368,
                        'y': 0.7309409,
                        'r': 0.0
                    },
                    {
                        'x': 0.3219314,
                        'y': 0.5822182,
                        'r': 0.0
                    },
                    {
                        'x': 0.122968152,
                        'y': 0.5304315,
                        'r': 0.0
                    },
                    {
                        'x': 0.214763656,
                        'y': 0.363911748,
                        'r': 0.0
                    }]
            }
        }],
        'editor': None,
        'labels': [{
            # 'id':,
            'probability': 1.0
        }]
    }, {
        # 'id': 'ef24885b-bb75-4b24-af09-756bf995a134',
        'temp_id': '_2_',
        'shapes': [{
            'type': 'point',
            'geometry': {
                'x': 0.543898344,
                'y': 0.189405054,
                'width': 0.025,
                'height': 0.0333333351,
                'points': [
                    {
                        'x': 0.556398332,
                        'y': 0.201905057,
                        'r': 0.0125
                    }]
            }
        }],
        'editor': None,
        'labels': [{
            'id': '600a9a440337dc6e03183107',
            'probability': 1.0
        }]
    }, {
        # 'id': '92e3bfaf-1b13-4037-b07e-32fac711d9fd',
        'temp_id': '_1_',
        'shapes': [{
            'type': 'rect',
            'geometry': {
                'x': 0.635174036,
                'y': 0.393743843,
                'width': 0.175549313,
                'height': 0.204229221,
                'points': None
            }
        }],
        'editor': None, 'labels': [
            {'id': '600a9a440337dc6e03183106', 'probability': 1.0}]
    }]
}

var = {'name': 'vcv_cvat', 'description': '', 'dimensions': [], 'group_type': 'normal', 'pipeline': {'connections': [
    {'from': {'port_name': 'Output dataset', 'type': 'dataset_2d', 'task_id': '_1_'},
     'to': {'port_name': 'Input dataset', 'type': 'dataset_2d', 'task_id': '_2_'}}], 'tasks': [
    {'temp_id': '_1_', 'capabilities': [], 'class_name': 'Dataset2DTask',
     'class_path': 'nous.director_microservice.chaining.task_dataset_2d', 'input_ports': [], 'instantiation': 'CLASS',
     'is_trainable': False, 'output_ports': [{'port_name': 'Output dataset', 'type': 'dataset_2d'}],
     'pipeline_friendly': True, 'properties': [], 'task_family': 'DATASET', 'task_name': 'Image Dataset',
     'task_type': 'DATASET', 'task_type_sort_priority': -1},
    {'temp_id': '_2_', 'capabilities': [], 'grpc_address': 'nous_detection:50058',
     'input_ports': [{'port_name': 'Input dataset', 'type': 'dataset_2d'}], 'instantiation': 'GRPC',
     'is_trainable': True, 'output_ports': [{'port_name': 'Output dataset', 'type': 'dataset_2d'}],
     'pipeline_friendly': True, 'properties': [{'id': 'labels', 'user_value': [{'name': 'ff'}, {'name': 'fds'}]}],
     'task_family': 'VISION', 'task_name': 'Detection', 'task_type': 'DETECTION', 'task_type_sort_priority': -1}]},
       'pipeline_representation': 'Detection', 'type': 'project'}

# cvat_annotation_format = {
#     'version': 38,
#     'tags': [],
#     'shapes': [OrderedDict(
#         [('type',
#           'rectangle'), ('occluded', False), ('z_order', 0),
#          ('points', [346.38671875, 216.03125, 641.9536743164062, 646.1259460449219]), ('id', 7), ('frame', 0),
#          ('label_id', 65), ('group', 0), ('source',
#                                           'manual'), ('attributes', [])]), OrderedDict(
#         [('type',
#           'rectangle'), ('occluded', False), ('z_order', 0),
#          ('points', [212.8046875, 872.1142578125, 736.3857421875, 1264.343994140625]), ('id', 8), ('frame', 0),
#          ('label_id', 65), ('group', 0), ('source',
#                                           'manual'), ('attributes', [])])],
#     'tracks': []}
