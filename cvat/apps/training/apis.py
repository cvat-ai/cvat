import uuid
from abc import ABC, abstractmethod
from collections import OrderedDict
from functools import wraps
from typing import Callable, List, Union
from contextlib import suppress

import requests

from cvat.apps.engine.models import TrainingProject, ShapeType


class TrainingServerAPIAbs(ABC):

    def __init__(self, host, username, password):
        self.host = host
        self.username = username
        self.password = password

    @abstractmethod
    def get_server_status(self):
        pass

    @abstractmethod
    def create_project(self, name: str, description: str = '', project_class: TrainingProject.ProjectClass = None,
                       labels: List[dict] = None):
        pass

    @abstractmethod
    def upload_annotations(self, project_id: str, frames_data: List[dict]):
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
                with suppress(Exception):
                    result = func(*args, **kwargs)
                    return result

        return wrapper

    return dec


class TrainingServerAPI(TrainingServerAPIAbs):
    TRAINING_CLASS = {
        TrainingProject.ProjectClass.DETECTION: "DETECTION"
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
                                     labels_mapping: dict) -> List[OrderedDict]:
        shapes = []
        for i, annotation in enumerate(annotation.get('data', [])):
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
                         labels: List[dict] = None, tasks: List[dict] = None) -> dict:
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
    def __upload_image(self, project_id: str, buffer) -> dict:
        url = f'{self.host}/v2/projects/{project_id}/media/images'
        files = {'file': buffer}
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
            r = requests.post(url=url, files=data, verify=False)  # nosec
            return r.json()

        response = get_token(self.host, self.username, self.password)
        token = response.get('secure_token', '')

        return token

    @property
    def token_key(self):
        return f'{self.host}_{self.username}_token'

    def request(self, method: str, url: str, **kwargs) -> Union[list, dict, str]:
        response = requests.request(method=method, url=url, verify=False, **kwargs)
        if response.status_code == 401:
            raise Exception("401")
        result = response.json()
        return result

    def create_project(self, name: str, description: str = '', project_class: TrainingProject.ProjectClass = None,
                       labels: List[dict] = None) -> dict:
        all_tasks = self.__get_tasks()
        task_type = self.TRAINING_CLASS.get(project_class)
        task_algo = 'Retinanet - TF2'
        tasks = [
            next(({'temp_id': '_1_', **task}
                  for task in all_tasks
                  if task['task_type'] == 'DATASET'), {}),
            next(({'temp_id': '_2_', **task}
                  for task in all_tasks
                  if task['task_type'] == task_type and
                     task['algorithm_name'] == task_algo), {}),
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

    def upload_image(self, training_id: str, buffer):
        response = self.__upload_image(project_id=training_id, buffer=buffer)
        return response.get('id')

    def get_project_status(self, project_id) -> dict:
        summary = self.__get_project_summary(project_id=project_id)
        if not summary or not isinstance(summary, list):
            return {'message': 'Not available'}
        jobs = self.__get_job_status(project_id=project_id)
        media_amount = next(item.get('value', 0) for item in summary if item.get('key') == 'Media')
        annotation_amount = next(item.get('value', 0) for item in summary if item.get('key') == 'Annotation')
        score = next(item.get('value', 0) for item in summary if item.get('key') == 'Score')
        job_items = jobs.get('items', 0)
        if len(job_items) == 0 and score == 0:
            message = 'Not started'
        elif len(job_items) == 0 and score > 0:
            message = ''
        else:
            message = 'In progress'
        progress = 0 if len(job_items) == 0 else job_items[0]["status"]["progress"]
        time_remaining = 0 if len(job_items) == 0 else job_items[0]["status"]['time_remaining']
        result = {
            'media_amount': media_amount if media_amount else 0,
            'annotation_amount': annotation_amount,
            'score': score,
            'message': message,
            'progress': progress,
            'time_remaining': time_remaining,
        }
        return result

    def get_annotation(self, project_id: str, image_id: str, width: int, height: int, frame: int,
                       labels_mapping: dict) -> List[OrderedDict]:
        annotation = self.__get_annotation(project_id=project_id, image_id=image_id)
        cvat_annotation = self.__convert_annotation_to_cvat(annotation=annotation, image_width=width,
                                                            image_height=height, frame=frame,
                                                            labels_mapping=labels_mapping)
        return cvat_annotation

    def get_labels(self, project_id: str) -> List[dict]:
        project = self.__get_project(project_id=project_id)
        labels = [{
            'id': label['id'],
            'name': label['name']
        } for label in project.get('labels')]
        return labels
