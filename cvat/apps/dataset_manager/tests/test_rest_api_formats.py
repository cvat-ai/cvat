# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import copy
import json
import os.path as osp
import random
import xml.etree.ElementTree as ET
import zipfile
from io import BytesIO

from datumaro.components.dataset import Dataset
from datumaro.util.test_utils import TestDir, compare_datasets
from django.contrib.auth.models import Group, User
from PIL import Image
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from cvat.apps.dataset_manager.bindings import CvatTaskDataExtractor, TaskData
from cvat.apps.dataset_manager.task import TaskAnnotation
from cvat.apps.engine.models import Task

tasks_path = osp.join(osp.dirname(__file__), 'assets', 'tasks.json')
with open(tasks_path) as f:
    tasks = json.load(f)

annotations_path = osp.join(osp.dirname(__file__), 'assets', 'annotations.json')
with open(annotations_path) as f:
    annotations = json.load(f)

def generate_image_file(filename, size=(100, 50)):
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
            self.client.force_login(self.user,
                backend='django.contrib.auth.backends.ModelBackend')

        return self

    def __exit__(self, exception_type, exception_value, traceback):
        if self.user:
            self.client.logout()

class _DbTestBase(APITestCase):
    def setUp(self):
        self.client = APIClient()

    @classmethod
    def setUpTestData(cls):
        cls.create_db_users()

    @classmethod
    def create_db_users(cls):
        (group_admin, _) = Group.objects.get_or_create(name="admin")
        (group_user, _) = Group.objects.get_or_create(name="user")

        user_admin = User.objects.create_superuser(username="admin", email="",
            password="admin")
        user_admin.groups.add(group_admin)
        user_dummy = User.objects.create_user(username="user", password="user")
        user_dummy.groups.add(group_user)

        cls.admin = user_admin
        cls.user = user_dummy

    def _put_api_v1_task_id_annotations(self, tid, data):
        with ForceLogin(self.admin, self.client):
            response = self.client.put("/api/v1/tasks/%s/annotations" % tid,
                data=data, format="json")

        return response

    @staticmethod
    def _generate_task_images(count): # pylint: disable=no-self-use
        images = {"client_files[%d]" % i: generate_image_file("image_%d.jpg" % i) for i in range(count)}
        images["image_quality"] = 75
        return images

    def _create_task(self, data, image_data):
        with ForceLogin(self.user, self.client):
            response = self.client.post('/api/v1/tasks', data=data, format="json")
            assert response.status_code == status.HTTP_201_CREATED, response.status_code
            tid = response.data["id"]

            response = self.client.post("/api/v1/tasks/%s/data" % tid,
                data=image_data)
            assert response.status_code == status.HTTP_202_ACCEPTED, response.status_code

            response = self.client.get("/api/v1/tasks/%s" % tid)
            task = response.data

        return task

    def _get_data_from_task(self, task_id, include_images):
        task_ann = TaskAnnotation(task_id)
        task_ann.init_from_db()
        task_data = TaskData(task_ann.ir_data, Task.objects.get(pk=task_id))
        extractor = CvatTaskDataExtractor(task_data, include_images=include_images)
        return Dataset.from_extractors(extractor)

    def _get_request_with_data(self, path, data, user):
        with ForceLogin(user, self.client):
            response = self.client.get(path, data)
        return response

    def _put_request_with_data(self, path, data, user):
        with ForceLogin(user, self.client):
            response = self.client.put(path, data)
        return response

    def _delete_request(self, path, user):
        with ForceLogin(user, self.client):
            response = self.client.delete(path)
        return response

    def _create_annotations(self, task, name_ann, key_get_values):
        tmp_annotations = copy.deepcopy(annotations[name_ann])

        # change attributes in all annotations
        for item in tmp_annotations:
            if item in ["tags", "shapes", "tracks"]:
                for index_elem, _ in enumerate(tmp_annotations[item]):
                    tmp_annotations[item][index_elem]["label_id"] = task["labels"][0]["id"]

                    for index_attribute, attribute in enumerate(task["labels"][0]["attributes"]):
                        spec_id = task["labels"][0]["attributes"][index_attribute]["id"]

                        if key_get_values == "random":
                            if attribute["input_type"] == "number":
                                start = int(attribute["values"][0])
                                stop = int(attribute["values"][1]) + 1
                                step = int(attribute["values"][2])
                                value = str(random.randrange(start, stop, step))
                            else:
                                value = random.choice(task["labels"][0]["attributes"][index_attribute]["values"])
                        elif key_get_values == "default":
                            value = attribute["default_value"]

                        if item == "tracks" and attribute["mutable"]:
                            for index_shape, _ in enumerate(tmp_annotations[item][index_elem]["shapes"]):
                                tmp_annotations[item][index_elem]["shapes"][index_shape]["attributes"].append({
                                    "spec_id": spec_id,
                                    "value": value,
                                })
                        else:
                            tmp_annotations[item][index_elem]["attributes"].append({
                                "spec_id": spec_id,
                                "value": value,
                            })

        response = self._put_api_v1_task_id_annotations(task["id"], tmp_annotations)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def _download_file(self, url, data, user, file_name):
        response = self._get_request_with_data(url, data, user)
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        response = self._get_request_with_data(url, data, user)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        content = BytesIO(b"".join(response.streaming_content))
        with open(file_name, "wb") as f:
            f.write(content.getvalue())

    def _upload_file(self, url, data, user):
        response = self._put_request_with_data(url, {"annotation_file": data}, user)
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        response = self._put_request_with_data(url, {}, user)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def _check_downloaded_file(self, file_name):
        if not osp.exists(file_name):
            raise FileNotFoundError(f"File '{file_name}' was not downloaded")

    def _generate_url_dump_tasks_annotations(self, task_id):
        return f"/api/v1/tasks/{task_id}/annotations"

    def _generate_url_upload_tasks_annotations(self, task_id, upload_format_name):
        return f"/api/v1/tasks/{task_id}/annotations?format={upload_format_name}"

    def _remove_annotations(self, url, user):
        response = self._delete_request(url, user)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        return response

class TaskDumpUploadTest(_DbTestBase):
    def test_api_v1_check_duplicated_polygon_points(self):
        test_name = self._testMethodName
        images = self._generate_task_images(10)
        task = self._create_task(tasks["main"], images)
        task_id = task["id"]
        data = {
            "format": "CVAT for video 1.1",
            "action": "download",
        }
        annotation_name = "CVAT for video 1.1 polygon"
        self._create_annotations(task, annotation_name, "default")
        annotation_points = annotations[annotation_name]["tracks"][0]["shapes"][0]['points']

        with TestDir() as test_dir:
            url = self._generate_url_dump_tasks_annotations(task_id)
            file_zip_name = osp.join(test_dir, f'{test_name}.zip')
            self._download_file(url, data, self.admin, file_zip_name)
            self._check_downloaded_file(file_zip_name)

            folder_name = osp.join(test_dir, f'{test_name}')
            with zipfile.ZipFile(file_zip_name, 'r') as zip_ref:
                zip_ref.extractall(folder_name)

            tree = ET.parse(osp.join(folder_name, 'annotations.xml'))
            root = tree.getroot()
            for polygon in root.findall("./track[@id='0']/polygon"):
                polygon_points = polygon.attrib["points"].replace(",", ";")
                polygon_points = [float(p) for p in polygon_points.split(";")]
                self.assertEqual(polygon_points, annotation_points)

    def test_api_v1_check_widerface_with_all_attributes(self):
        test_name = self._testMethodName
        dump_format_name = "WiderFace 1.0"
        upload_format_name = "WiderFace 1.0"

        for include_images in (False, True):
            with self.subTest():
                # create task with annotations
                images = self._generate_task_images(3)
                task = self._create_task(tasks["widerface with all attributes"], images)
                self._create_annotations(task, f'{dump_format_name}', "random")

                task_id = task["id"]
                data_from_task_before_upload = self._get_data_from_task(task_id, include_images)

                # dump annotations
                url = self._generate_url_dump_tasks_annotations(task_id)
                data = {
                    "format": dump_format_name,
                    "action": "download",
                }
                with TestDir() as test_dir:
                    file_zip_name = osp.join(test_dir, f'{test_name}_{dump_format_name}.zip')
                    self._download_file(url, data, self.admin, file_zip_name)
                    self._check_downloaded_file(file_zip_name)

                    # remove annotations
                    self._remove_annotations(url, self.admin)

                    # upload annotations
                    url = self._generate_url_upload_tasks_annotations(task_id, upload_format_name)
                    with open(file_zip_name, 'rb') as binary_file:
                        self._upload_file(url, binary_file, self.admin)

                    # equals annotations
                    data_from_task_after_upload = self._get_data_from_task(task_id, include_images)
                    compare_datasets(self, data_from_task_before_upload, data_from_task_after_upload)\

    def test_api_v1_check_attribute_import_in_tracks(self):
        test_name = self._testMethodName
        dump_format_name = "CVAT for video 1.1"
        upload_format_name = "CVAT 1.1"

        for include_images in (False, True):
            with self.subTest():
                # create task with annotations
                images = self._generate_task_images(13)
                task = self._create_task(tasks["many jobs"], images)
                self._create_annotations(task, f'{dump_format_name} attributes in tracks', "default")

                task_id = task["id"]
                data_from_task_before_upload = self._get_data_from_task(task_id, include_images)

                # dump annotations
                url = self._generate_url_dump_tasks_annotations(task_id)
                data = {
                    "format": dump_format_name,
                    "action": "download",
                }
                with TestDir() as test_dir:
                    file_zip_name = osp.join(test_dir, f'{test_name}_{dump_format_name}.zip')
                    self._download_file(url, data, self.admin, file_zip_name)
                    self._check_downloaded_file(file_zip_name)

                    # remove annotations
                    self._remove_annotations(url, self.admin)

                    # upload annotations
                    url = self._generate_url_upload_tasks_annotations(task_id, upload_format_name)
                    with open(file_zip_name, 'rb') as binary_file:
                        self._upload_file(url, binary_file, self.admin)

                    # equals annotations
                    data_from_task_after_upload = self._get_data_from_task(task_id, include_images)
                    compare_datasets(self, data_from_task_before_upload, data_from_task_after_upload)
