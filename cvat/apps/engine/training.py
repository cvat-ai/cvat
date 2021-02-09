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
    Data, TrainingProjectLabel


@job
def save_prediction_server_status_to_cache_job(cache_key,
                                               cvat_project_id,
                                               timeout=60):
    cvat_project = Project.objects.get(pk=cvat_project_id)
    api = TrainingServerAPI(host=cvat_project.training_project.host, username=cvat_project.training_project.username,
                            password=cvat_project.training_project.password)
    status = api.get_project_status(project_id=cvat_project.training_project.training_id)

    resp = {
        **status,
        'status': 'done'
    }
    cache.set(cache_key=cache_key, data=resp, timeout=timeout)


@job
def save_frame_prediction_to_cache_job(cache_key: str,
                                       task_id: int,
                                       frame: int,
                                       timeout: int = 60):
    task = Task.objects.get(pk=task_id)
    training_project_image = TrainingProjectImage.objects.get(idx=frame, task__project_id=task.project_id)
    cvat_labels = Label.objects.filter(project__id=task.project_id).all()
    training_project = Project.objects.get(pk=task.project_id).training_project
    api = TrainingServerAPI(host=training_project.host,
                            username=training_project.username,
                            password=training_project.password)
    image = Image.objects.get(frame=frame, data=task.data)
    labels_mapping = {
        TrainingProjectLabel.objects.get(cvat_label=cvat_label).training_label_id: cvat_label.id
        for cvat_label in cvat_labels
    }
    print(labels_mapping)
    annotation = api.get_annotation(project_id=training_project.training_id,
                                    image_id=training_project_image.training_image_id,
                                    width=image.width,
                                    height=image.height,
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
    cvat_labels = Label.objects.filter(project=cvat_project).all()
    labels_mapping = {
        cvat_label.id: TrainingProjectLabel.objects.get(cvat_label=cvat_label).training_label_id
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
    if not cvat_project.project_class:
        cvat_project.project_class = cvat_project.ProjectClass.DETECTION
    training_project = cvat_project.training_project
    api = TrainingServerAPI(
        host=cvat_project.training_project.host,
        username=cvat_project.training_project.username,
        password=cvat_project.training_project.password,
    )
    training_id = await create_training_project(cvat_project=cvat_project, training_project=training_project,
                                                api=api)


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
    def __convert_annotation_from_cvat(shapes):
        data = []
        for shape in shapes:
            x0, y0, x1, y1 = shape['points']
            x = x0 / shape['width']
            y = y0 / shape['height']
            width = (x1 - x0) / shape['width']
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
            label_id = annotation['labels'][0]['id']
            if not labels_mapping.get(label_id):
                continue
            shape = annotation['shapes'][0]
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
                ('frame', int(frame)),
                ('label', labels_mapping.get(label_id)),
                ('group', 0),
                ('source', 'auto'),
                ('attributes', {})
            ]))
        return shapes


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
