# Copyright (C) 2021-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

import copy
import json
import os.path as osp
import os
import av
import numpy as np
import random
import xml.etree.ElementTree as ET
import zipfile
from io import BytesIO
import itertools

from datumaro.components.dataset import Dataset
from datumaro.util.test_utils import compare_datasets, TestDir
from django.contrib.auth.models import Group, User
from PIL import Image
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

import cvat.apps.dataset_manager as dm
from cvat.apps.dataset_manager.bindings import CvatTaskDataExtractor, TaskData
from cvat.apps.dataset_manager.task import TaskAnnotation
from cvat.apps.engine.models import Task

projects_path = osp.join(osp.dirname(__file__), 'assets', 'projects.json')
with open(projects_path) as file:
    projects = json.load(file)

tasks_path = osp.join(osp.dirname(__file__), 'assets', 'tasks.json')
with open(tasks_path) as file:
    tasks = json.load(file)

annotation_path = osp.join(osp.dirname(__file__), 'assets', 'annotations.json')
with open(annotation_path) as file:
    annotations = json.load(file)


def generate_image_file(filename, size=(100, 50)):
    f = BytesIO()
    image = Image.new('RGB', size=size)
    image.save(f, 'jpeg')
    f.name = filename
    f.seek(0)
    return f


def generate_video_file(filename, width=1280, height=720, duration=1, fps=25, codec_name='mpeg4'):
    f = BytesIO()
    total_frames = duration * fps
    file_ext = os.path.splitext(filename)[1][1:]
    container = av.open(f, mode='w', format=file_ext)

    stream = container.add_stream(codec_name=codec_name, rate=fps)
    stream.width = width
    stream.height = height
    stream.pix_fmt = 'yuv420p'

    for frame_i in range(total_frames):
        img = np.empty((stream.width, stream.height, 3))
        img[:, :, 0] = 0.5 + 0.5 * np.sin(2 * np.pi * (0 / 3 + frame_i / total_frames))
        img[:, :, 1] = 0.5 + 0.5 * np.sin(2 * np.pi * (1 / 3 + frame_i / total_frames))
        img[:, :, 2] = 0.5 + 0.5 * np.sin(2 * np.pi * (2 / 3 + frame_i / total_frames))

        img = np.round(255 * img).astype(np.uint8)
        img = np.clip(img, 0, 255)

        frame = av.VideoFrame.from_ndarray(img, format='rgb24')
        for packet in stream.encode(frame):
            container.mux(packet)

    # Flush stream
    for packet in stream.encode():
        container.mux(packet)

    # Close the file
    container.close()
    f.name = filename
    f.seek(0)

    return [(width, height)] * total_frames, f


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
        (group_user, _) = Group.objects.get_or_create(name="business")

        user_admin = User.objects.create_superuser(username="admin", email="",
            password="admin")
        user_admin.groups.add(group_admin)
        user_dummy = User.objects.create_user(username="user", password="user")
        user_dummy.groups.add(group_user)

        cls.admin = user_admin
        cls.user = user_dummy

    def _put_api_v2_task_id_annotations(self, tid, data):
        with ForceLogin(self.admin, self.client):
            response = self.client.put("/api/tasks/%s/annotations" % tid,
                data=data, format="json")

        return response

    def _put_api_v2_job_id_annotations(self, jid, data):
        with ForceLogin(self.admin, self.client):
            response = self.client.put("/api/jobs/%s/annotations" % jid,
                data=data, format="json")

        return response

    @staticmethod
    def _generate_task_images(count, name_offsets = 0): # pylint: disable=no-self-use
        images = {"client_files[%d]" % i: generate_image_file("image_%d.jpg" % (i + name_offsets)) for i in range(count)}
        images["image_quality"] = 75
        return images

    @staticmethod
    def _generate_task_videos(count):  # pylint: disable=no-self-use
        videos = {"client_files[%d]" % i: generate_video_file("video_%d.mp4" % i) for i in range(count)}
        videos["image_quality"] = 75
        return videos

    def _create_task(self, data, image_data):
        with ForceLogin(self.user, self.client):
            response = self.client.post('/api/tasks', data=data, format="json")
            assert response.status_code == status.HTTP_201_CREATED, response.status_code
            tid = response.data["id"]

            response = self.client.post("/api/tasks/%s/data" % tid,
                data=image_data)
            assert response.status_code == status.HTTP_202_ACCEPTED, response.status_code

            response = self.client.get("/api/tasks/%s" % tid)
            task = response.data

        return task

    def _create_project(self, data):
        with ForceLogin(self.user, self.client):
            response = self.client.post('/api/projects', data=data, format="json")
            assert response.status_code == status.HTTP_201_CREATED, response.status_code
            project = response.data

        return project

    def _get_jobs(self, task_id):
        with ForceLogin(self.admin, self.client):
            response = self.client.get("/api/tasks/{}/jobs".format(task_id))
        return response.data

    def _get_request(self, path, user):
        with ForceLogin(user, self.client):
            response = self.client.get(path)
        return response

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
        response = self._put_api_v2_task_id_annotations(task["id"], tmp_annotations)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def _create_annotations_in_job(self, task, job_id,  name_ann, key_get_values):
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
        response = self._put_api_v2_job_id_annotations(job_id, tmp_annotations)
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
        return f"/api/tasks/{task_id}/annotations"

    def _generate_url_upload_tasks_annotations(self, task_id, upload_format_name):
        return f"/api/tasks/{task_id}/annotations?format={upload_format_name}"

    def _generate_url_dump_job_annotations(self, job_id):
        return f"/api/jobs/{job_id}/annotations"

    def _generate_url_upload_job_annotations(self, job_id, upload_format_name):
        return f"/api/jobs/{job_id}/annotations?format={upload_format_name}"

    def _generate_url_dump_task_dataset(self, task_id):
        return f"/api/tasks/{task_id}/dataset"

    def _generate_url_dump_project_annotations(self, project_id, format_name):
        return f"/api/projects/{project_id}/annotations?format={format_name}"

    def _generate_url_dump_project_dataset(self, project_id, format_name):
        return f"/api/projects/{project_id}/dataset?format={format_name}"

    def _remove_annotations(self, url, user):
        response = self._delete_request(url, user)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        return response

    def _delete_project(self, project_id, user):
        response = self._delete_request(f'/api/projects/{project_id}', user)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        return response


class TaskDumpUploadTest(_DbTestBase):
    def test_api_v2_dump_and_upload_annotations_with_objects_type_is_shape(self):
        test_name = self._testMethodName
        dump_formats = dm.views.get_export_formats()
        upload_formats = dm.views.get_import_formats()
        expected = {
            self.admin: {'name': 'admin', 'code': status.HTTP_200_OK, 'create code': status.HTTP_201_CREATED,
                         'accept code': status.HTTP_202_ACCEPTED,'file_exists': True, 'annotation_loaded': True},
            self.user: {'name': 'user', 'code': status.HTTP_200_OK, 'create code': status.HTTP_201_CREATED,
                        'accept code': status.HTTP_202_ACCEPTED, 'file_exists': True, 'annotation_loaded': True},
            None: {'name': 'none', 'code': status.HTTP_401_UNAUTHORIZED, 'create code': status.HTTP_401_UNAUTHORIZED,
                   'accept code': status.HTTP_401_UNAUTHORIZED, 'file_exists': False, 'annotation_loaded': False},
        }

        with TestDir() as test_dir:
            # Dump annotations with objects type is shape
            for dump_format in dump_formats:
                if not dump_format.ENABLED or dump_format.DISPLAY_NAME in [
                    'Kitti Raw Format 1.0', 'Sly Point Cloud Format 1.0',
                    'Datumaro 3D 1.0'
                ]:
                    continue
                dump_format_name = dump_format.DISPLAY_NAME
                with self.subTest(format=dump_format_name):
                    images = self._generate_task_images(3)
                    # create task with annotations
                    if dump_format_name in [
                        "Market-1501 1.0", "Cityscapes 1.0", \
                        "ICDAR Localization 1.0", "ICDAR Recognition 1.0", \
                        "ICDAR Segmentation 1.0"
                    ]:
                        task = self._create_task(tasks[dump_format_name], images)
                    else:
                        task = self._create_task(tasks["main"], images)
                    task_id = task["id"]
                    if dump_format_name in [
                        "MOT 1.1", "MOTS PNG 1.0", \
                        "PASCAL VOC 1.1", "Segmentation mask 1.1", \
                        "TFRecord 1.0", "YOLO 1.1", "ImageNet 1.0", \
                        "WiderFace 1.0", "VGGFace2 1.0", "Cityscapes 1.0", \
                        "Datumaro 1.0"\
                    ]:
                        self._create_annotations(task, dump_format_name, "default")
                    else:
                        self._create_annotations(task, dump_format_name, "random")
                    # dump annotations
                    url = self._generate_url_dump_tasks_annotations(task_id)

                    for user, edata in list(expected.items()):
                        user_name = edata['name']
                        file_zip_name = osp.join(test_dir, f'{test_name}_{user_name}_{dump_format_name}.zip')
                        data = {
                            "format": dump_format_name,
                        }
                        response = self._get_request_with_data(url, data, user)
                        self.assertEqual(response.status_code, edata['accept code'])
                        response = self._get_request_with_data(url, data, user)
                        self.assertEqual(response.status_code, edata['create code'])
                        data = {
                            "format": dump_format_name,
                            "action": "download",
                        }
                        response = self._get_request_with_data(url, data, user)
                        self.assertEqual(response.status_code, edata['code'])
                        if response.status_code == status.HTTP_200_OK:
                            content = BytesIO(b"".join(response.streaming_content))
                            with open(file_zip_name, "wb") as f:
                                f.write(content.getvalue())
                        self.assertEqual(osp.exists(file_zip_name), edata['file_exists'])

            # Upload annotations with objects type is shape
            for upload_format in upload_formats:
                upload_format_name = upload_format.DISPLAY_NAME
                if upload_format_name == "CVAT 1.1":
                    file_zip_name = osp.join(test_dir, f'{test_name}_admin_CVAT for images 1.1.zip')
                else:

                    file_zip_name = osp.join(test_dir, f'{test_name}_admin_{upload_format_name}.zip')
                if not upload_format.ENABLED or not osp.exists(file_zip_name):
                    continue
                with self.subTest(format=upload_format_name):
                    if upload_format_name in [
                        "MOTS PNG 1.0",  # issue #2925 and changed points values
                    ]:
                        self.skipTest("Format is fail")
                    if osp.exists(file_zip_name):
                        for user, edata in list(expected.items()):
                            # remove all annotations from task (create new task without annotation)
                            images = self._generate_task_images(3)
                            if upload_format_name in [
                                "Market-1501 1.0", "Cityscapes 1.0", \
                                "ICDAR Localization 1.0", "ICDAR Recognition 1.0", \
                                "ICDAR Segmentation 1.0"
                            ]:
                                task = self._create_task(tasks[upload_format_name], images)
                            else:
                                task = self._create_task(tasks["main"], images)
                            task_id = task["id"]
                            url = self._generate_url_upload_tasks_annotations(task_id, upload_format_name)

                            with open(file_zip_name, 'rb') as binary_file:
                                response = self._put_request_with_data(url, {"annotation_file": binary_file}, user)
                                self.assertEqual(response.status_code, edata['accept code'])
                                response = self._put_request_with_data(url, {}, user)
                                self.assertEqual(response.status_code, edata['create code'])

    def test_api_v2_dump_annotations_with_objects_type_is_track(self):
        test_name = self._testMethodName

        dump_formats = dm.views.get_export_formats()
        upload_formats = dm.views.get_import_formats()
        expected = {
            self.admin: {'name': 'admin', 'code': status.HTTP_200_OK, 'create code': status.HTTP_201_CREATED,
                         'accept code': status.HTTP_202_ACCEPTED, 'file_exists': True, 'annotation_loaded': True},
            self.user: {'name': 'user', 'code': status.HTTP_200_OK, 'create code': status.HTTP_201_CREATED,
                        'accept code': status.HTTP_202_ACCEPTED, 'file_exists': True, 'annotation_loaded': True},
            None: {'name': 'none', 'code': status.HTTP_401_UNAUTHORIZED, 'create code': status.HTTP_401_UNAUTHORIZED,
                   'accept code': status.HTTP_401_UNAUTHORIZED, 'file_exists': False, 'annotation_loaded': False},
        }

        with TestDir() as test_dir:
            # Dump annotations with objects type is track
            for dump_format in dump_formats:
                if not dump_format.ENABLED or dump_format.DISPLAY_NAME in [
                    'Kitti Raw Format 1.0','Sly Point Cloud Format 1.0',
                    'Datumaro 3D 1.0'
                ]:
                    continue
                dump_format_name = dump_format.DISPLAY_NAME
                with self.subTest(format=dump_format_name):
                    # create task with annotations
                    video = self._generate_task_videos(1)
                    if dump_format_name in [
                        "Market-1501 1.0", "Cityscapes 1.0", \
                        "ICDAR Localization 1.0", "ICDAR Recognition 1.0", \
                        "ICDAR Segmentation 1.0"
                    ]:
                        task = self._create_task(tasks[dump_format_name], video)
                    else:
                        task = self._create_task(tasks["main"], video)
                    task_id = task["id"]

                    if dump_format_name in [
                            "MOT 1.1", "MOTS PNG 1.0", \
                            "PASCAL VOC 1.1", "Segmentation mask 1.1", \
                            "TFRecord 1.0", "YOLO 1.1", "ImageNet 1.0", \
                            "WiderFace 1.0", "VGGFace2 1.0", "Cityscapes 1.0" \
                    ]:
                        self._create_annotations(task, dump_format_name, "default")
                    else:
                        self._create_annotations(task, dump_format_name, "random")
                    # dump annotations
                    url = self._generate_url_dump_tasks_annotations(task_id)

                    for user, edata in list(expected.items()):
                        user_name = edata['name']
                        file_zip_name = osp.join(test_dir, f'{test_name}_{user_name}_{dump_format_name}.zip')
                        data = {
                            "format": dump_format_name,
                        }
                        response = self._get_request_with_data(url, data, user)
                        self.assertEqual(response.status_code, edata['accept code'])
                        response = self._get_request_with_data(url, data, user)
                        self.assertEqual(response.status_code, edata['create code'])
                        data = {
                            "format": dump_format_name,
                            "action": "download",
                        }
                        response = self._get_request_with_data(url, data, user)
                        self.assertEqual(response.status_code, edata['code'])
                        if response.status_code == status.HTTP_200_OK:
                            content = BytesIO(b"".join(response.streaming_content))
                            with open(file_zip_name, "wb") as f:
                                f.write(content.getvalue())
                        self.assertEqual(osp.exists(file_zip_name), edata['file_exists'])
            # Upload annotations with objects type is track
            for upload_format in upload_formats:
                upload_format_name = upload_format.DISPLAY_NAME
                if upload_format_name == "CVAT 1.1":
                    file_zip_name = osp.join(test_dir, f'{test_name}_admin_CVAT for video 1.1.zip')
                else:
                    file_zip_name = osp.join(test_dir, f'{test_name}_admin_{upload_format_name}.zip')
                if not upload_format.ENABLED or not osp.exists(file_zip_name):
                    continue
                with self.subTest(format=upload_format_name):
                    if upload_format_name in [
                        "MOTS PNG 1.0",  # issue #2925 and changed points values
                    ]:
                        self.skipTest("Format is fail")
                    if osp.exists(file_zip_name):
                        for user, edata in list(expected.items()):
                            # remove all annotations from task (create new task without annotation)
                            video = self._generate_task_videos(1)
                            if upload_format_name in [
                                "Market-1501 1.0", "Cityscapes 1.0", \
                                "ICDAR Localization 1.0", "ICDAR Recognition 1.0", \
                                "ICDAR Segmentation 1.0"
                            ]:
                                task = self._create_task(tasks[upload_format_name], video)
                            else:
                                task = self._create_task(tasks["main"], video)
                            task_id = task["id"]
                            url = self._generate_url_upload_tasks_annotations(task_id, upload_format_name)

                            with open(file_zip_name, 'rb') as binary_file:
                                response = self._put_request_with_data(url, {"annotation_file": binary_file}, user)
                                self.assertEqual(response.status_code, edata['accept code'])
                                response = self._put_request_with_data(url, {}, user)
                                self.assertEqual(response.status_code, edata['create code'])

    def test_api_v2_dump_tag_annotations(self):
        dump_format_name = "CVAT for images 1.1"
        data = {
            "format": dump_format_name,
            "action": "download",
        }
        test_cases = ['all', 'first']
        expected = {
            self.admin: {'name': 'admin', 'code': status.HTTP_200_OK, 'create code': status.HTTP_201_CREATED,
                         'accept code': status.HTTP_202_ACCEPTED, 'file_exists': True},
            self.user: {'name': 'user', 'code': status.HTTP_200_OK, 'create code': status.HTTP_201_CREATED,
                        'accept code': status.HTTP_202_ACCEPTED, 'file_exists': True},
            None: {'name': 'none', 'code': status.HTTP_401_UNAUTHORIZED, 'create code': status.HTTP_401_UNAUTHORIZED,
                   'accept code': status.HTTP_401_UNAUTHORIZED, 'file_exists': False},
        }
        for test_case in test_cases:
            images = self._generate_task_images(10)
            task = self._create_task(tasks["change overlap and segment size"], images)
            task_id = task["id"]
            jobs = self._get_jobs(task_id)

            if test_case == "all":
                for job in jobs:
                    self._create_annotations_in_job(task, job["id"], "CVAT for images 1.1 tag", "default")
            else:
                self._create_annotations_in_job(task, jobs[0]["id"], "CVAT for images 1.1 tag", "default")

            for user, edata in list(expected.items()):
                with self.subTest(format=f"{edata['name']}"):
                    with TestDir() as test_dir:
                        user_name = edata['name']
                        url = self._generate_url_dump_tasks_annotations(task_id)

                        file_zip_name = osp.join(test_dir, f'{user_name}.zip')
                        data = {
                            "format": dump_format_name,
                        }
                        response = self._get_request_with_data(url, data, user)
                        self.assertEqual(response.status_code, edata['accept code'])
                        response = self._get_request_with_data(url, data, user)
                        self.assertEqual(response.status_code, edata['create code'])
                        data = {
                            "format": dump_format_name,
                            "action": "download",
                        }
                        response = self._get_request_with_data(url, data, user)
                        self.assertEqual(response.status_code, edata['code'])
                        if response.status_code == status.HTTP_200_OK:
                            content = BytesIO(b"".join(response.streaming_content))
                            with open(file_zip_name, "wb") as f:
                                f.write(content.getvalue())
                        self.assertEqual(osp.exists(file_zip_name), edata['file_exists'])

    def test_api_v2_dump_and_upload_annotations_with_objects_are_different_images(self):
        test_name = self._testMethodName
        dump_format_name = "CVAT for images 1.1"
        upload_types = ["task", "job"]

        images = self._generate_task_images(2)
        task = self._create_task(tasks["main"], images)
        task_id = task["id"]

        for upload_type in upload_types:
            with self.subTest(format=type):
                with TestDir() as test_dir:
                    if upload_type == "task":
                        self._create_annotations(task, "CVAT for images 1.1 different types", "random")
                    else:
                        jobs = self._get_jobs(task_id)
                        job_id = jobs[0]["id"]
                        self._create_annotations_in_job(task, job_id, "CVAT for images 1.1 different types", "random")
                    url = self._generate_url_dump_tasks_annotations(task_id)
                    file_zip_name = osp.join(test_dir, f'{test_name}_{upload_type}.zip')
                    data = {
                        "format": dump_format_name,
                        "action": "download",
                    }
                    self._download_file(url, data, self.admin, file_zip_name)
                    self.assertEqual(osp.exists(file_zip_name), True)
                    self._remove_annotations(url, self.admin)
                    if upload_type == "task":
                        url_upload = self._generate_url_upload_tasks_annotations(task_id, "CVAT 1.1")
                    else:
                        jobs = self._get_jobs(task_id)
                        url_upload = self._generate_url_upload_job_annotations(jobs[0]["id"], "CVAT 1.1")

                    with open(file_zip_name, 'rb') as binary_file:
                        self._upload_file(url_upload, binary_file, self.admin)

                        response = self._get_request(f"/api/tasks/{task_id}/annotations", self.admin)
                        self.assertEqual(len(response.data["shapes"]), 2)
                        self.assertEqual(len(response.data["tracks"]), 0)

    def test_api_v2_dump_and_upload_annotations_with_objects_are_different_video(self):
        test_name = self._testMethodName
        dump_format_name = "CVAT for video 1.1"
        upload_types = ["task", "job"]

        video = self._generate_task_videos(1)
        task = self._create_task(tasks["main"], video)
        task_id = task["id"]

        for upload_type in upload_types:
            with self.subTest(format=type):
                with TestDir() as test_dir:
                    if upload_type == "task":
                        self._create_annotations(task, "CVAT for images 1.1 different types", "random")
                    else:
                        jobs = self._get_jobs(task_id)
                        job_id = jobs[0]["id"]
                        self._create_annotations_in_job(task, job_id, "CVAT for images 1.1 different types", "random")
                    url = self._generate_url_dump_tasks_annotations(task_id)
                    file_zip_name = osp.join(test_dir, f'{test_name}_{upload_type}.zip')

                    data = {
                        "format": dump_format_name,
                        "action": "download",
                    }
                    self._download_file(url, data, self.admin, file_zip_name)
                    self.assertEqual(osp.exists(file_zip_name), True)
                    self._remove_annotations(url, self.admin)
                    if upload_type == "task":
                        url_upload = self._generate_url_upload_tasks_annotations(task_id, "CVAT 1.1")
                    else:
                        jobs = self._get_jobs(task_id)
                        url_upload = self._generate_url_upload_job_annotations(jobs[0]["id"], "CVAT 1.1")

                    with open(file_zip_name, 'rb') as binary_file:
                        self._upload_file(url_upload, binary_file, self.admin)
                        self.assertEqual(osp.exists(file_zip_name), True)

                        response = self._get_request(f"/api/tasks/{task_id}/annotations", self.admin)
                        self.assertEqual(len(response.data["shapes"]), 0)
                        self.assertEqual(len(response.data["tracks"]), 2)

    def test_api_v2_dump_and_upload_with_objects_type_is_track_and_outside_property(self):
        test_name = self._testMethodName
        dump_format_name = "CVAT for video 1.1"
        video = self._generate_task_videos(1)
        task = self._create_task(tasks["main"], video)
        self._create_annotations(task, "CVAT for video 1.1 slice track", "random")
        task_id = task["id"]

        with TestDir() as test_dir:
            url = self._generate_url_dump_tasks_annotations(task_id)
            file_zip_name = osp.join(test_dir, f'{test_name}.zip')
            data = {
                "format": dump_format_name,
                "action": "download",
            }
            self._download_file(url, data, self.admin, file_zip_name)
            self.assertEqual(osp.exists(file_zip_name), True)

            with open(file_zip_name, 'rb') as binary_file:
                url = self._generate_url_upload_tasks_annotations(task_id, "CVAT 1.1")
                self._upload_file(url, binary_file, self.admin)

    def test_api_v2_dump_and_upload_with_objects_type_is_track_and_keyframe_property(self):
        test_name = self._testMethodName
        dump_format_name = "CVAT for video 1.1"

        video = self._generate_task_videos(1)
        task = self._create_task(tasks["main"], video)
        self._create_annotations(task, "CVAT for video 1.1 slice track keyframe", "random")
        task_id = task["id"]

        with TestDir() as test_dir:
            url = self._generate_url_dump_tasks_annotations(task_id)
            file_zip_name = osp.join(test_dir, f'{test_name}.zip')

            data = {
                "format": dump_format_name,
                "action": "download",
            }
            self._download_file(url, data, self.admin, file_zip_name)
            self.assertEqual(osp.exists(file_zip_name), True)

            with open(file_zip_name, 'rb') as binary_file:
                url = self._generate_url_upload_tasks_annotations(task_id, "CVAT 1.1")
                self._upload_file(url, binary_file, self.admin)

    def test_api_v2_dump_upload_annotations_from_several_jobs(self):
        test_name = self._testMethodName
        dump_format_name = "CVAT for images 1.1"

        images = self._generate_task_images(10)
        task = self._create_task(tasks["change overlap and segment size"], images)
        task_id = task["id"]
        jobs = self._get_jobs(task_id)
        for job in jobs:
            self._create_annotations_in_job(task, job["id"], "CVAT for images 1.1 merge", "random")

        with TestDir() as test_dir:
            url = self._generate_url_dump_tasks_annotations(task_id)
            file_zip_name = osp.join(test_dir, f'{test_name}.zip')
            data = {
                "format": dump_format_name,
                "action": "download",
            }
            self._download_file(url, data, self.admin, file_zip_name)
            self.assertEqual(osp.exists(file_zip_name), True)

            # remove annotations
            self._remove_annotations(url, self.admin)
            url = self._generate_url_upload_tasks_annotations(task_id, "CVAT 1.1")
            with open(file_zip_name, 'rb') as binary_file:
                self._upload_file(url, binary_file, self.admin)

    def test_api_v2_dump_annotations_with_objects_type_is_shape_from_several_jobs(self):
        test_name = self._testMethodName
        dump_format_name = "CVAT for images 1.1"
        test_cases = ['all', 'first']

        images = self._generate_task_images(10)
        task = self._create_task(tasks["change overlap and segment size"], images)
        task_id = task["id"]

        for test_case in test_cases:
            with TestDir() as test_dir:
                jobs = self._get_jobs(task_id)
                if test_case == "all":
                    for job in jobs:
                        self._create_annotations_in_job(task, job["id"], dump_format_name, "default")
                else:
                    self._create_annotations_in_job(task, jobs[0]["id"], dump_format_name, "default")

                url = self._generate_url_dump_tasks_annotations(task_id)

                file_zip_name = osp.join(test_dir, f'{test_name}.zip')
                data = {
                    "format": dump_format_name,
                    "action": "download",
                }
                self._download_file(url, data, self.admin, file_zip_name)
                self.assertEqual(osp.exists(file_zip_name), True)

                # remove annotations
                self._remove_annotations(url, self.admin)
                url = self._generate_url_upload_tasks_annotations(task_id, "CVAT 1.1")
                with open(file_zip_name, 'rb') as binary_file:
                    self._upload_file(url, binary_file, self.admin)

    def test_api_v2_export_dataset(self):
        test_name = self._testMethodName
        dump_formats = dm.views.get_export_formats()

        expected = {
            self.admin: {'name': 'admin', 'code': status.HTTP_200_OK, 'create code': status.HTTP_201_CREATED,
                         'accept code': status.HTTP_202_ACCEPTED, 'file_exists': True},
            self.user: {'name': 'user', 'code': status.HTTP_200_OK, 'create code': status.HTTP_201_CREATED,
                        'accept code': status.HTTP_202_ACCEPTED, 'file_exists': True},
            None: {'name': 'none', 'code': status.HTTP_401_UNAUTHORIZED, 'create code': status.HTTP_401_UNAUTHORIZED,
                   'accept code': status.HTTP_401_UNAUTHORIZED, 'file_exists': False},
        }

        with TestDir() as test_dir:
            # Dump annotations with objects type is shape
            for dump_format in dump_formats:
                if not dump_format.ENABLED or dump_format.DISPLAY_NAME != "CVAT for images 1.1":
                    continue
                dump_format_name = dump_format.DISPLAY_NAME
                with self.subTest(format=dump_format_name):
                    images = self._generate_task_images(3)
                    # create task with annotations
                    if dump_format_name in [
                        "Market-1501 1.0", "Cityscapes 1.0", \
                        "ICDAR Localization 1.0", "ICDAR Recognition 1.0", \
                        "ICDAR Segmentation 1.0"
                    ]:
                        task = self._create_task(tasks[dump_format_name], images)
                    else:
                        task = self._create_task(tasks["main"], images)
                    task_id = task["id"]
                    # dump annotations
                    url = self._generate_url_dump_task_dataset(task_id)
                    for user, edata in list(expected.items()):
                        user_name = edata['name']
                        file_zip_name = osp.join(test_dir, f'{test_name}_{user_name}_{dump_format_name}.zip')
                        data = {
                            "format": dump_format_name,
                        }
                        response = self._get_request_with_data(url, data, user)
                        self.assertEqual(response.status_code, edata["accept code"])
                        response = self._get_request_with_data(url, data, user)
                        self.assertEqual(response.status_code, edata["create code"])
                        data = {
                            "format": dump_format_name,
                            "action": "download",
                        }
                        response = self._get_request_with_data(url, data, user)
                        self.assertEqual(response.status_code, edata["code"])
                        if response.status_code == status.HTTP_200_OK:
                            content = BytesIO(b"".join(response.streaming_content))
                            with open(file_zip_name, "wb") as f:
                                f.write(content.getvalue())
                        self.assertEqual(response.status_code, edata['code'])
                        self.assertEqual(osp.exists(file_zip_name), edata['file_exists'])

    def test_api_v2_dump_empty_frames(self):
        dump_formats = dm.views.get_export_formats()
        upload_formats = dm.views.get_import_formats()

        with TestDir() as test_dir:
            for dump_format in dump_formats:
                if not dump_format.ENABLED:
                    continue
                dump_format_name = dump_format.DISPLAY_NAME
                with self.subTest(format=dump_format_name):
                    images = self._generate_task_images(3)
                    task = self._create_task(tasks["no attributes"], images)
                    task_id = task["id"]
                    self._create_annotations(task, "empty annotation", "default")
                    url = self._generate_url_dump_tasks_annotations(task_id)

                    file_zip_name = osp.join(test_dir, f'empty_{dump_format_name}.zip')
                    data = {
                        "format": dump_format_name,
                        "action": "download",
                    }
                    self._download_file(url, data, self.admin, file_zip_name)
                    self.assertEqual(osp.exists(file_zip_name), True)

            for upload_format in upload_formats:
                upload_format_name = upload_format.DISPLAY_NAME
                if upload_format_name == "CVAT 1.1":
                    file_zip_name = osp.join(test_dir, 'empty_CVAT for images 1.1.zip')
                else:
                    file_zip_name = osp.join(test_dir, f'empty_{upload_format_name}.zip')
                if not osp.exists(file_zip_name) or not upload_format.ENABLED:
                    continue
                with self.subTest(format=upload_format_name):
                    if upload_format_name in [
                        "MOTS PNG 1.0",  # issue #2925 and changed points values
                        "KITTI 1.0", # format does not support empty annotation
                        "Cityscapes 1.0" # formats doesn't support empty annotations
                    ]:
                        self.skipTest("Format is fail")
                    images = self._generate_task_images(3)
                    task = self._create_task(tasks["no attributes"], images)
                    task_id = task["id"]

                    url = self._generate_url_upload_tasks_annotations(task_id, upload_format_name)

                    with open(file_zip_name, 'rb') as binary_file:
                        response = self._put_request_with_data(url, {"annotation_file": binary_file}, self.admin)
                        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
                        response = self._put_request_with_data(url, {}, self.admin)
                        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
                        self.assertIsNone(response.data)

    def test_api_v2_rewriting_annotations(self):
        test_name = self._testMethodName
        dump_formats = dm.views.get_export_formats()
        with TestDir() as test_dir:
            for dump_format in dump_formats:
                if not dump_format.ENABLED:
                    continue
                dump_format_name = dump_format.DISPLAY_NAME
                with self.subTest(format=dump_format_name):
                    if dump_format_name in [
                        "MOTS PNG 1.0",  # issue #2925 and changed points values
                        'Kitti Raw Format 1.0',
                        'Sly Point Cloud Format 1.0',
                        'Datumaro 3D 1.0',
                        "Cityscapes 1.0" # expanding annotations due to background mask
                    ]:
                        self.skipTest("Format is fail")
                    images = self._generate_task_images(3)
                    if dump_format_name in [
                        "Market-1501 1.0", "Cityscapes 1.0", \
                        "ICDAR Localization 1.0", "ICDAR Recognition 1.0", \
                        "ICDAR Segmentation 1.0"
                    ]:
                        task = self._create_task(tasks[dump_format_name], images)
                    else:
                        task = self._create_task(tasks["main"], images)
                    task_id = task["id"]
                    if dump_format_name in [
                        "MOT 1.1", "MOTS PNG 1.0",
                        "PASCAL VOC 1.1", "Segmentation mask 1.1",
                        "TFRecord 1.0", "YOLO 1.1", "ImageNet 1.0",
                        "WiderFace 1.0", "VGGFace2 1.0", "Cityscapes 1.0",
                        "Datumaro 1.0", "Open Images V6 1.0", "KITTI 1.0"
                    ]:
                        self._create_annotations(task, dump_format_name, "default")
                    else:
                        self._create_annotations(task, dump_format_name, "random")

                    task_ann = TaskAnnotation(task_id)
                    task_ann.init_from_db()
                    task_ann_prev_data = task_ann.data
                    url = self._generate_url_dump_tasks_annotations(task_id)

                    file_zip_name = osp.join(test_dir, f'{test_name}_{dump_format_name}.zip')
                    data = {
                        "format": dump_format_name,
                        "action": "download",
                    }
                    self._download_file(url, data, self.admin, file_zip_name)
                    self.assertEqual(osp.exists(file_zip_name), True)

                    self._remove_annotations(url, self.admin)

                    self._create_annotations(task, "CVAT for images 1.1 many jobs", "default")

                    if dump_format_name == "CVAT for images 1.1" or dump_format_name == "CVAT for video 1.1":
                        dump_format_name = "CVAT 1.1"
                    url = self._generate_url_upload_tasks_annotations(task_id, dump_format_name)

                    with open(file_zip_name, 'rb') as binary_file:
                        self._upload_file(url, binary_file, self.admin)
                    task_ann = TaskAnnotation(task_id)
                    task_ann.init_from_db()
                    task_ann_data = task_ann.data
                    self.assertEqual(len(task_ann_data["shapes"]), len(task_ann_prev_data["shapes"]))

    def test_api_v2_tasks_annotations_dump_and_upload_many_jobs_with_datumaro(self):
        test_name = self._testMethodName
        upload_format_name = "CVAT 1.1"
        include_images_params = (False, True)
        dump_format_names = ("CVAT for images 1.1", "CVAT for video 1.1")

        for dump_format_name, include_images in itertools.product(dump_format_names, include_images_params):
            with self.subTest(f"{dump_format_name}_include_images_{include_images}"):
                # create task with annotations
                images = self._generate_task_images(13)
                task = self._create_task(tasks["many jobs"], images)
                self._create_annotations(task, f'{dump_format_name} many jobs', "default")

                task_id = task["id"]
                data_from_task_before_upload = self._get_data_from_task(task_id, include_images)

                # dump annotations
                url = self._generate_url_dump_tasks_annotations(task_id)
                with TestDir() as test_dir:
                    file_zip_name = osp.join(test_dir, f'{test_name}_{dump_format_name}.zip')

                    data = {
                        "format": dump_format_name,
                        "action": "download",
                    }
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

    def test_api_v2_tasks_annotations_dump_and_upload_with_datumaro(self):
        test_name = self._testMethodName
        # get formats
        dump_formats = dm.views.get_export_formats()
        include_images_params = (False, True)
        for dump_format, include_images in itertools.product(dump_formats, include_images_params):
            if dump_format.ENABLED:
                dump_format_name = dump_format.DISPLAY_NAME
                with self.subTest(dump_format_name):
                    if dump_format_name in [
                        "MOT 1.1",
                        "CamVid 1.0", # issue #2840 and changed points values
                        "MOTS PNG 1.0", # changed points values
                        "Segmentation mask 1.1", # changed points values
                        "ICDAR Segmentation 1.0", # changed points values
                        "Open Images V6 1.0", # changed points values
                        'Kitti Raw Format 1.0',
                        'Sly Point Cloud Format 1.0',
                        'KITTI 1.0', # changed points values
                        'Cityscapes 1.0', # changed points value
                        'Datumaro 3D 1.0'
                    ]:
                        self.skipTest("Format is fail")

                    # create task
                    images = self._generate_task_images(3)
                    if dump_format_name in [
                        "Market-1501 1.0", "Cityscapes 1.0", \
                        "ICDAR Localization 1.0", "ICDAR Recognition 1.0", \
                        "ICDAR Segmentation 1.0"
                    ]:
                        task = self._create_task(tasks[dump_format_name], images)
                    else:
                        task = self._create_task(tasks["main"], images)

                    # create annotations
                    if dump_format_name in [
                        "MOT 1.1", "MOTS PNG 1.0",
                        "PASCAL VOC 1.1", "Segmentation mask 1.1",
                        "TFRecord 1.0", "YOLO 1.1", "ImageNet 1.0",
                        "WiderFace 1.0", "VGGFace2 1.0", "LFW 1.0",
                        "Open Images V6 1.0", "Datumaro 1.0", "KITTI 1.0"
                    ]:
                        self._create_annotations(task, dump_format_name, "default")
                    else:
                        self._create_annotations(task, dump_format_name, "random")

                    task_id = task["id"]
                    data_from_task_before_upload = self._get_data_from_task(task_id, include_images)

                    # dump annotations
                    url = self._generate_url_dump_tasks_annotations(task_id)
                    with TestDir() as test_dir:
                        file_zip_name = osp.join(test_dir, f'{test_name}_{dump_format_name}.zip')
                        data = {
                            "format": dump_format_name,
                            "action": "download",
                        }
                        self._download_file(url, data, self.admin, file_zip_name)
                        self._check_downloaded_file(file_zip_name)

                        # remove annotations
                        self._remove_annotations(url, self.admin)

                        # upload annotations
                        if dump_format_name in ["CVAT for images 1.1", "CVAT for video 1.1"]:
                            upload_format_name = "CVAT 1.1"
                        else:
                            upload_format_name = dump_format_name
                        url = self._generate_url_upload_tasks_annotations(task_id, upload_format_name)
                        with open(file_zip_name, 'rb') as binary_file:
                            self._upload_file(url, binary_file, self.admin)

                            # equals annotations
                        data_from_task_after_upload = self._get_data_from_task(task_id, include_images)
                        compare_datasets(self, data_from_task_before_upload, data_from_task_after_upload)

    def test_api_v2_check_duplicated_polygon_points(self):
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

    def test_api_v2_check_widerface_with_all_attributes(self):
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

    def test_api_v2_check_attribute_import_in_tracks(self):
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

class ProjectDump(_DbTestBase):
    def test_api_v2_export_dataset(self):
        test_name = self._testMethodName
        dump_formats = dm.views.get_export_formats()

        expected = {
            self.admin: {'name': 'admin', 'code': status.HTTP_200_OK, 'create code': status.HTTP_201_CREATED,
                         'accept code': status.HTTP_202_ACCEPTED, 'file_exists': True},
            self.user: {'name': 'user', 'code': status.HTTP_200_OK, 'create code': status.HTTP_201_CREATED,
                        'accept code': status.HTTP_202_ACCEPTED, 'file_exists': True},
            None: {'name': 'none', 'code': status.HTTP_401_UNAUTHORIZED, 'create code': status.HTTP_401_UNAUTHORIZED,
                   'accept code': status.HTTP_401_UNAUTHORIZED, 'file_exists': False},
        }

        with TestDir() as test_dir:
            for dump_format in dump_formats:
                if not dump_format.ENABLED or dump_format.DIMENSION == dm.bindings.DimensionType.DIM_3D:
                    continue
                dump_format_name = dump_format.DISPLAY_NAME
                with self.subTest(format=dump_format_name):
                    project = self._create_project(projects['main'])
                    pid = project['id']
                    images = self._generate_task_images(3)
                    tasks['task in project #1']['project_id'] = pid
                    self._create_task(tasks['task in project #1'], images)
                    images = self._generate_task_images(3, 3)
                    tasks['task in project #2']['project_id'] = pid
                    self._create_task(tasks['task in project #2'], images)
                    url = self._generate_url_dump_project_dataset(project['id'], dump_format_name)

                    for user, edata in list(expected.items()):
                        user_name = edata['name']
                        file_zip_name = osp.join(test_dir, f'{test_name}_{user_name}_{dump_format_name}.zip')
                        data = {
                            "format": dump_format_name,
                        }
                        response = self._get_request_with_data(url, data, user)
                        self.assertEqual(response.status_code, edata["accept code"])
                        response = self._get_request_with_data(url, data, user)
                        self.assertEqual(response.status_code, edata["create code"])
                        data = {
                            "format": dump_format_name,
                            "action": "download",
                        }
                        response = self._get_request_with_data(url, data, user)
                        self.assertEqual(response.status_code, edata["code"])
                        if response.status_code == status.HTTP_200_OK:
                            content = BytesIO(b"".join(response.streaming_content))
                            with open(file_zip_name, "wb") as f:
                                f.write(content.getvalue())
                        self.assertEqual(response.status_code, edata['code'])
                        self.assertEqual(osp.exists(file_zip_name), edata['file_exists'])

    def test_api_v2_export_annotatios(self):
        test_name = self._testMethodName
        dump_formats = dm.views.get_export_formats()

        expected = {
            self.admin: {'name': 'admin', 'code': status.HTTP_200_OK, 'create code': status.HTTP_201_CREATED,
                         'accept code': status.HTTP_202_ACCEPTED, 'file_exists': True},
            self.user: {'name': 'user', 'code': status.HTTP_200_OK, 'create code': status.HTTP_201_CREATED,
                        'accept code': status.HTTP_202_ACCEPTED, 'file_exists': True},
            None: {'name': 'none', 'code': status.HTTP_401_UNAUTHORIZED, 'create code': status.HTTP_401_UNAUTHORIZED,
                   'accept code': status.HTTP_401_UNAUTHORIZED, 'file_exists': False},
        }

        with TestDir() as test_dir:
            for dump_format in dump_formats:
                if not dump_format.ENABLED or dump_format.DIMENSION == dm.bindings.DimensionType.DIM_3D:
                    continue
                dump_format_name = dump_format.DISPLAY_NAME
                with self.subTest(format=dump_format_name):
                    project = self._create_project(projects['main'])
                    pid = project['id']
                    images = self._generate_task_images(3)
                    tasks['task in project #1']['project_id'] = pid
                    self._create_task(tasks['task in project #1'], images)
                    images = self._generate_task_images(3, 3)
                    tasks['task in project #2']['project_id'] = pid
                    self._create_task(tasks['task in project #2'], images)
                    url = self._generate_url_dump_project_annotations(project['id'], dump_format_name)

                    for user, edata in list(expected.items()):
                        user_name = edata['name']
                        file_zip_name = osp.join(test_dir, f'{test_name}_{user_name}_{dump_format_name}.zip')
                        data = {
                            "format": dump_format_name,
                        }
                        response = self._get_request_with_data(url, data, user)
                        self.assertEqual(response.status_code, edata["accept code"])
                        response = self._get_request_with_data(url, data, user)
                        self.assertEqual(response.status_code, edata["create code"])
                        data = {
                            "format": dump_format_name,
                            "action": "download",
                        }
                        response = self._get_request_with_data(url, data, user)
                        self.assertEqual(response.status_code, edata["code"])
                        if response.status_code == status.HTTP_200_OK:
                            content = BytesIO(b"".join(response.streaming_content))
                            with open(file_zip_name, "wb") as f:
                                f.write(content.getvalue())
                        self.assertEqual(response.status_code, edata['code'])
                        self.assertEqual(osp.exists(file_zip_name), edata['file_exists'])
