
# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import io
import json
import os
import os.path as osp
import random
import shutil
import struct
import tempfile
import xml.etree.ElementTree as ET
import zipfile
from collections import defaultdict
from enum import Enum
from glob import glob
from io import BytesIO
from unittest import mock, skip

import av
import numpy as np
import open3d as o3d
import requests
from django.conf import settings
from django.contrib.auth.models import Group, User
from django.http import (Http404, HttpRequest, HttpResponse,
                         HttpResponseNotFound)
from pdf2image import convert_from_bytes
from PIL import Image
from pycocotools import coco as coco_loader
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from cvat.apps.engine.media_extractors import ValidateDimension
from cvat.apps.engine.models import (AttributeType, Data, DimensionType, Job,
                                     Label, Project, Segment, StatusChoice,
                                     StorageChoice, StorageMethodChoice, Task)
from cvat.apps.engine.prepare import prepare_meta, prepare_meta_for_upload
from cvat.apps.lambda_manager.views import LambdaGateway, LambdaQueue

LAMBDA_ROOT_PATH = '/api/v1/lambda'
LAMBDA_FUNCTIONS_PATH = f'{LAMBDA_ROOT_PATH}/functions'
LAMBDA_REQUESTS_PATH = f'{LAMBDA_ROOT_PATH}/requests'

id_function = "test-openvino-omz-public-yolo-v3-tf"
expected_keys_in_response_functions = ["id", "kind", "labels", "state", "description", "framework", "name", "min_pos_points"]
expected_keys_in_response_requests = ["id", "function", "status", "progress", "enqueued", "started", "ended", "exc_info"]

tasks = {
    "main": {
        "name": "main task",
        "overlap": 0,
        "segment_size": 100,
        "owner_id": 1, # admin
        "labels": [
            {
                "name": "car",
                "attributes": [
                    {
                        "name": "model",
                        "mutable": False,
                        "input_type": "select",
                        "default_value": "mazda",
                        "values": ["bmw", "mazda", "renault"],
                    },
                    {
                        "name": "parked",
                        "mutable": True,
                        "input_type": "checkbox",
                        "default_value": False,
                    },
                ],
            },
            {"name": "person"},
        ],
    },
    "assignee_to_user": {
        "name": "assignee to user task",
        "overlap": 0,
        "segment_size": 100,
        "owner_id": 1, # admin
        "assignee_id": 2, # user
        "labels": [
            {
                "name": "car",
                "attributes": [
                    {
                        "name": "model",
                        "mutable": False,
                        "input_type": "select",
                        "default_value": "mazda",
                        "values": ["bmw", "mazda", "renault"],
                    },
                    {
                        "name": "parked",
                        "mutable": True,
                        "input_type": "checkbox",
                        "default_value": False,
                    },
                ],
            },
            {"name": "person"},
        ],
    },
}

# removed unnecessary data
functions = {
	'test-openvino-dextr': {
		'metadata': {
			'name': 'test-openvino-dextr',
			'annotations': {
				'framework': 'openvino',
				'min_pos_points': '4',
				'name': 'DEXTR',
				'spec': '',
				'type': 'interactor',
			},
		},
		'spec': {
			'description': 'Deep Extreme Cut',
		},
		'status': {
			'state': 'error',
		},
	},
	'test-openvino-omz-public-yolo-v3-tf': {
		'metadata': {
			'name': 'test-openvino-omz-public-yolo-v3-tf',
			'annotations': {
				'framework': 'openvino',
				'name': 'YOLO v3',
				'spec': '[\n  { "id": 0, "name": "person" },\
                          \n  { "id": 1, "name": "bicycle" },\
                          \n  { "id": 2, "name": "car" }\
                          \n]\n',
				'type': 'detector',
			},
		},
		'spec': {
			'description': 'YOLO v3 via Intel OpenVINO',
		},
		'status': {
			'state': 'ready',
			'httpPort': 49155,
		},
	},
	'test-openvino-omz-semantic-segmentation-adas-0001': {
		'metadata': {
			'name': 'test-openvino-omz-semantic-segmentation-adas-0001',
			'annotations': {
				'framework': 'openvino',
				'name': 'Semantic segmentation for ADAS',
				'spec': '[\n  { "id": 0, "name": "road" },\
                          \n  { "id": 1, "name": "person" },\
                          \n  { "id": 2, "name": "car" }\
                          \n]\n',
				'type': 'detector',
			},
		},
		'spec': {
			'description': 'Segmentation network to classify each pixel into typical 20 classes for ADAS',
		},
		'status': {
			'state': 'ready',
			'httpPort': 49156,
		},
	},
}


def generate_image_file(filename, size=(100, 100)):
    f = BytesIO()
    image = Image.new('RGB', size=size)
    image.save(f, 'jpeg')
    f.name = filename
    f.seek(0)
    return f


class ForceLogin:
    def __init__(self, user, client):
        self.user = user
        self.client = client

    def __enter__(self):
        if self.user:
            self.client.force_login(self.user, backend='django.contrib.auth.backends.ModelBackend')

        return self

    def __exit__(self, exception_type, exception_value, traceback):
        if self.user:
            self.client.logout()


class LambdaTestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()

        patcher = mock.patch('cvat.apps.lambda_manager.views.LambdaGateway._http', side_effect = self.__get_response_data_from_lambda_gateway_http)
        self.addCleanup(patcher.stop)
        self.mock_foo = patcher.start()

        images_main_task = self._generate_task_images(3)
        images_assigneed_to_user_task = self._generate_task_images(3)
        self.main_task = self._create_task(tasks["main"], images_main_task)
        self.assigneed_to_user_task = self._create_task(tasks["assignee_to_user"], images_assigneed_to_user_task)


    def __get_response_data_from_lambda_gateway_http(self, *args, **kwargs):
        url = kwargs["url"]
        # POST query for get annotations
        if url == "/api/function_invocations":
            data = []
            id_function = kwargs["headers"]["x-nuclio-function-name"]
            type_function = functions[id_function]["metadata"]["annotations"]["type"]
            if type_function == "interactor":
                data = [] # TODO
            elif type_function == "detector":
                data = [
                    {'confidence': '0.9959098', 'label': 'car', 'points': [3, 3, 15, 15], 'type': 'rectangle'},
                    {'confidence': '0.89535173', 'label': 'car', 'points': [20, 25, 30, 35], 'type': 'rectangle'},
                    {'confidence': '0.59464583', 'label': 'car', 'points': [40, 40, 80, 80], 'type': 'rectangle'},
                ]
            return data
        # GET query for get all functions
        elif url == "/api/functions":
            return functions
        # GET query for get function
        else:
            id_function = url.split("/")[-1]
            if id_function in functions:
                return functions[id_function]
            # raise 404 Not Found error
            else:
                r = requests.HTTPError()
                r.response = HttpResponseNotFound()
                raise r


    @classmethod
    def _create_db_users(cls):
        (group_admin, _) = Group.objects.get_or_create(name="admin")
        (group_user, _) = Group.objects.get_or_create(name="user")

        user_admin = User.objects.create_superuser(username="admin", email="",
            password="admin")
        user_admin.groups.add(group_admin)
        user_dummy = User.objects.create_user(username="user", password="user")
        user_dummy.groups.add(group_user)

        cls.admin = user_admin
        cls.user = user_dummy


    def _create_task(self, data, image_data):
        with ForceLogin(self.admin, self.client):
            response = self.client.post('/api/v1/tasks', data=data, format="json")
            assert response.status_code == status.HTTP_201_CREATED, response.status_code
            tid = response.data["id"]

            response = self.client.post("/api/v1/tasks/%s/data" % tid,
                data=image_data)
            assert response.status_code == status.HTTP_202_ACCEPTED, response.status_code

            response = self.client.get("/api/v1/tasks/%s" % tid)
            task = response.data

        return task


    def _generate_task_images(self, count): # pylint: disable=no-self-use
        images = {
            "client_files[%d]" % i: generate_image_file("image_%d.jpg" % i)
            for i in range(count)
        }
        images["image_quality"] = 75
        return images


    @classmethod
    def setUpTestData(cls):
        cls._create_db_users()


    def _get_request(self, path, user):
        with ForceLogin(user, self.client):
            response = self.client.get(path)
        return response


    def _delete_request(self, path, user):
        with ForceLogin(user, self.client):
            response = self.client.delete(path)
        return response


    def _post_request(self, path, user, data):
        data = json.dumps(data)
        with ForceLogin(user, self.client):
            response = self.client.post(path, data=data, content_type='application/json')
        return response


    def test_api_v1_lambda_functions_list(self):
        response = self._get_request(LAMBDA_FUNCTIONS_PATH, self.admin)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in expected_keys_in_response_functions:
            self.assertIn(key, response.data[0])

        response = self._get_request(LAMBDA_FUNCTIONS_PATH, self.user)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in expected_keys_in_response_functions:
            self.assertIn(key, response.data[0])

        response = self._get_request(LAMBDA_FUNCTIONS_PATH, None)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


    @mock.patch('cvat.apps.lambda_manager.views.LambdaGateway._http', return_value={})
    def test_api_v1_lambda_functions_list_empty(self, mock_http):
        response = self._get_request(LAMBDA_FUNCTIONS_PATH, self.admin)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

        response = self._get_request(LAMBDA_FUNCTIONS_PATH, self.user)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

        response = self._get_request(LAMBDA_FUNCTIONS_PATH, None)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


    def test_api_v1_lambda_functions_read(self):
        response = self._get_request(f'{LAMBDA_FUNCTIONS_PATH}/{id_function}', self.admin)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in expected_keys_in_response_functions:
            self.assertIn(key, response.data)

        response = self._get_request(f'{LAMBDA_FUNCTIONS_PATH}/{id_function}', self.user)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in expected_keys_in_response_functions:
            self.assertIn(key, response.data)

        response = self._get_request(f'{LAMBDA_FUNCTIONS_PATH}/{id_function}', None)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


    def test_api_v1_lambda_functions_read_wrong_id(self):
        id_wrong_function = f"{id_function}-wrong-id"
        response = self._get_request(f'{LAMBDA_FUNCTIONS_PATH}/{id_wrong_function}', self.admin)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        response = self._get_request(f'{LAMBDA_FUNCTIONS_PATH}/{id_wrong_function}', self.user)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        response = self._get_request(f'{LAMBDA_FUNCTIONS_PATH}/{id_wrong_function}', None)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


    @skip("Fail: add mock")
    def test_api_v1_lambda_requests_list(self):
        response = self._get_request(LAMBDA_REQUESTS_PATH, self.admin)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in expected_keys_in_response_requests:
            self.assertIn(key, response.data[0])

        response = self._get_request(LAMBDA_REQUESTS_PATH, self.user)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in expected_keys_in_response_requests:
            self.assertIn(key, response.data[0])

        response = self._get_request(LAMBDA_REQUESTS_PATH, None)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


    def test_api_v1_lambda_requests_list_empty(self):
        response = self._get_request(LAMBDA_REQUESTS_PATH, self.admin)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

        response = self._get_request(LAMBDA_REQUESTS_PATH, self.user)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

        response = self._get_request(LAMBDA_REQUESTS_PATH, None)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


    @skip("Fail: add mock")
    def test_api_v1_lambda_requests_read(self):
        id = "cf343b95-afeb-475e-ab53-8d7e64991d30"

        response = self._get_request(f'{LAMBDA_REQUESTS_PATH}/{id}', self.admin)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in expected_keys_in_response_requests:
            self.assertIn(key, response.data[0])

        response = self._get_request(f'{LAMBDA_REQUESTS_PATH}/{id}', self.user)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in expected_keys_in_response_requests:
            self.assertIn(key, response.data[0])

        response = self._get_request(f'{LAMBDA_REQUESTS_PATH}/{id}', None)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


    def test_api_v1_lambda_requests_read_wrong_id(self):
        id = "cf343b95-afeb-475e-ab53-8d7e64991d30-wrong-id"

        response = self._get_request(f'{LAMBDA_REQUESTS_PATH}/{id}', self.admin)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        response = self._get_request(f'{LAMBDA_REQUESTS_PATH}/{id}', self.user)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        response = self._get_request(f'{LAMBDA_REQUESTS_PATH}/{id}', None)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


    def test_api_v1_lambda_requests_delete_finished_request(self):
        data = {
            "function": id_function,
            "task": self.main_task["id"],
            "cleanup": True,
            "mapping": {
                "car": "car",
            },
        }
        response = self._post_request(f'{LAMBDA_REQUESTS_PATH}', self.admin, data)
        id_request = response.data["id"]

        response = self._delete_request(f'{LAMBDA_REQUESTS_PATH}/{id_request}', None)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        response = self._delete_request(f'{LAMBDA_REQUESTS_PATH}/{id_request}', self.admin)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        response = self._get_request(f'{LAMBDA_REQUESTS_PATH}/{id_request}', self.admin)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        response = self._post_request(f'{LAMBDA_REQUESTS_PATH}', self.admin, data)
        id_request = response.data["id"]
        response = self._delete_request(f'{LAMBDA_REQUESTS_PATH}/{id_request}', self.user)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        response = self._get_request(f'{LAMBDA_REQUESTS_PATH}/{id_request}', self.user)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


    @skip("Fail: add mock")
    def test_api_v1_lambda_requests_delete_not_finished_request(self):
        pass


    def test_api_v1_lambda_requests_create(self):
        data_main_task = {
            "function": id_function,
            "task": self.main_task["id"],
            "cleanup": True,
            "mapping": {
                "car": "car",
            },
        }
        data_assigneed_to_user_task = {
            "function": id_function,
            "task": self.assigneed_to_user_task["id"],
            "cleanup": True,
            "mapping": {
                "car": "car",
            },
        }

        response = self._post_request(LAMBDA_REQUESTS_PATH, self.admin, data_main_task)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in expected_keys_in_response_requests:
            self.assertIn(key, response.data)

        response = self._post_request(LAMBDA_REQUESTS_PATH, self.user, data_assigneed_to_user_task)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in expected_keys_in_response_requests:
            self.assertIn(key, response.data)

        response = self._post_request(LAMBDA_REQUESTS_PATH, self.user, data_main_task)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self._post_request(LAMBDA_REQUESTS_PATH, None, data_main_task)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


    def test_api_v1_lambda_requests_create_empty_mapping(self):
        data = {
            "function": id_function,
            "task": self.main_task["id"],
            "cleanup": True,
            "mapping": {},
        }
        response = self._post_request(LAMBDA_REQUESTS_PATH, self.admin, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in expected_keys_in_response_requests:
            self.assertIn(key, response.data)


    @skip("Fail: expected result != actual result")
    def test_api_v1_lambda_requests_create_empty_data(self):
        data = {}
        response = self._post_request(LAMBDA_REQUESTS_PATH, self.admin, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


    def test_api_v1_lambda_requests_create_without_cleanup(self):
        data = {
            "function": id_function,
            "task": self.main_task["id"],
            "mapping": {
                "car": "car",
            },
        }
        response = self._post_request(LAMBDA_REQUESTS_PATH, self.admin, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in expected_keys_in_response_requests:
            self.assertIn(key, response.data)


    def test_api_v1_lambda_requests_create_without_mapping(self):
        data = {
            "function": id_function,
            "task": self.main_task["id"],
            "cleanup": True,
        }
        response = self._post_request(LAMBDA_REQUESTS_PATH, self.admin, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in expected_keys_in_response_requests:
            self.assertIn(key, response.data)


    @skip("Fail: expected result != actual result")
    def test_api_v1_lambda_requests_create_without_function(self):
        data = {
            "task": self.main_task["id"],
            "cleanup": True,
            "mapping": {
                "car": "car",
            },
        }
        response = self._post_request(LAMBDA_REQUESTS_PATH, self.admin, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


    def test_api_v1_lambda_requests_create_without_task(self):
        data = {
            "function": id_function,
            "cleanup": True,
            "mapping": {
                "car": "car",
            },
        }
        response = self._post_request(LAMBDA_REQUESTS_PATH, self.admin, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


    def test_api_v1_lambda_requests_create_wrong_id_function(self):
        data = {
            "function": f"{id_function}-wrong-id",
            "task": self.main_task["id"],
            "cleanup": True,
            "mapping": {
                "car": "car",
            },
        }
        response = self._post_request(LAMBDA_REQUESTS_PATH, self.admin, data)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


    def test_api_v1_lambda_requests_create_wrong_id_task(self):
        data = {
            "function": id_function,
            "task": 12345,
            "cleanup": True,
            "mapping": {
                "car": "car",
            },
        }
        response = self._post_request(LAMBDA_REQUESTS_PATH, self.admin, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


    @skip("Fail: add mock")
    def test_api_v1_lambda_requests_create_two_requests(self):
        data = {
            "function": id_function,
            "task": self.main_task["id"],
            "cleanup": True,
            "mapping": {
                "car": "car",
            },
        }
        self._post_request(LAMBDA_REQUESTS_PATH, self.admin, data)
        response = self._post_request(LAMBDA_REQUESTS_PATH, self.admin, data)
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)


    def test_api_v1_lambda_functions_create(self):
        data_main_task = {
            "task": self.main_task["id"],
            "frame": 0,
            "cleanup": True,
            "mapping": {
                "car": "car",
            },
        }
        data_assigneed_to_user_task = {
            "task": self.assigneed_to_user_task["id"],
            "frame": 0,
            "cleanup": True,
            "mapping": {
                "car": "car",
            },
        }

        response = self._post_request(f"{LAMBDA_FUNCTIONS_PATH}/{id_function}", self.admin, data_main_task)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = self._post_request(f"{LAMBDA_FUNCTIONS_PATH}/{id_function}", self.user, data_assigneed_to_user_task)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = self._post_request(f"{LAMBDA_FUNCTIONS_PATH}/{id_function}", None, data_main_task)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


    @skip("Fail: expected result != actual result") # TODO move test to test_api_v1_lambda_functions_create
    def test_api_v1_lambda_functions_create_user_assigned_to_no_user(self):
        data = {
            "task": self.main_task["id"],
            "frame": 0,
            "cleanup": True,
            "mapping": {
                "car": "car",
            },
        }
        response = self._post_request(f"{LAMBDA_FUNCTIONS_PATH}/{id_function}", self.user, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


    def test_api_v1_lambda_functions_create_empty_data(self):
        data = {}
        response = self._post_request(f"{LAMBDA_FUNCTIONS_PATH}/{id_function}", self.admin, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


    def test_api_v1_lambda_functions_create_empty_mapping(self):
        data = {
            "task": self.main_task["id"],
            "frame": 0,
            "cleanup": True,
            "mapping": {},
        }
        response = self._post_request(f"{LAMBDA_FUNCTIONS_PATH}/{id_function}", self.admin, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)


    def test_api_v1_lambda_functions_create_without_cleanup(self):
        data = {
            "task": self.main_task["id"],
            "frame": 0,
            "mapping": {
                "car": "car",
            },
        }
        response = self._post_request(f"{LAMBDA_FUNCTIONS_PATH}/{id_function}", self.admin, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)


    def test_api_v1_lambda_functions_create_without_mapping(self):
        data = {
            "task": self.main_task["id"],
            "frame": 0,
            "cleanup": True,
        }
        response = self._post_request(f"{LAMBDA_FUNCTIONS_PATH}/{id_function}", self.admin, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)


    def test_api_v1_lambda_functions_create_without_task(self):
        data = {
            "frame": 0,
            "cleanup": True,
            "mapping": {
                "car": "car",
            },
        }
        response = self._post_request(f"{LAMBDA_FUNCTIONS_PATH}/{id_function}", self.admin, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


    def test_api_v1_lambda_functions_create_wrong_id_function(self):
        data = {
            "task": self.main_task["id"],
            "frame": 0,
            "cleanup": True,
            "mapping": {
                "car": "car",
            },
        }
        response = self._post_request(f"{LAMBDA_FUNCTIONS_PATH}/{id_function}-wrong-id", self.admin, data)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


    def test_api_v1_lambda_functions_create_wrong_id_task(self):
        data = {
            "task": 12345,
            "frame": 0,
            "cleanup": True,
            "mapping": {
                "car": "car",
            },
        }
        response = self._post_request(f"{LAMBDA_FUNCTIONS_PATH}/{id_function}", self.admin, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


    @skip("Fail: expected result != actual result")
    def test_api_v1_lambda_functions_create_wrong_id_frame(self):
        data = {
            "task": self.main_task["id"],
            "frame": 12345,
            "cleanup": True,
            "mapping": {
                "car": "car",
            },
        }
        response = self._post_request(f"{LAMBDA_FUNCTIONS_PATH}/{id_function}", self.admin, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


    @skip("Fail: add mock and expected result != actual result")
    def test_api_v1_lambda_functions_create_two_functions(self):
        data = {
            "task": self.main_task["id"],
            "frame": 0,
            "cleanup": True,
            "mapping": {
                "car": "car",
            },
        }
        self._post_request(f"{LAMBDA_FUNCTIONS_PATH}/{id_function}", self.admin, data)
        response = self._post_request(f"{LAMBDA_FUNCTIONS_PATH}/{id_function}", self.admin, data)
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

