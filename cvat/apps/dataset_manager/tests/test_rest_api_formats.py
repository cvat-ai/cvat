# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import copy
import itertools
import json
import multiprocessing
import os
import os.path as osp
import random
import xml.etree.ElementTree as ET
import zipfile
from contextlib import ExitStack, contextmanager
from datetime import timedelta
from functools import partial
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from time import sleep
from typing import Any, Callable, ClassVar, Optional, overload
from unittest.mock import DEFAULT as MOCK_DEFAULT
from unittest.mock import MagicMock, patch

import av
import numpy as np
from attr import define, field
from datumaro.components.comparator import EqualityComparator
from datumaro.components.dataset import Dataset
from django.contrib.auth.models import Group, User
from PIL import Image
from rest_framework import status

import cvat.apps.dataset_manager as dm
from cvat.apps.dataset_manager.bindings import CvatTaskOrJobDataExtractor, TaskData
from cvat.apps.dataset_manager.cron import clear_export_cache
from cvat.apps.dataset_manager.task import TaskAnnotation
from cvat.apps.dataset_manager.tests.utils import TestDir
from cvat.apps.dataset_manager.util import get_export_cache_lock
from cvat.apps.dataset_manager.views import export
from cvat.apps.engine.models import Task
from cvat.apps.engine.tests.utils import ApiTestBase, ForceLogin, get_paginated_collection

projects_path = osp.join(osp.dirname(__file__), 'assets', 'projects.json')
with open(projects_path) as file:
    projects = json.load(file)

tasks_path = osp.join(osp.dirname(__file__), 'assets', 'tasks.json')
with open(tasks_path) as file:
    tasks = json.load(file)

annotation_path = osp.join(osp.dirname(__file__), 'assets', 'annotations.json')
with open(annotation_path) as file:
    annotations = json.load(file)

DEFAULT_ATTRIBUTES_FORMATS = [
    "VGGFace2 1.0",
    "WiderFace 1.0",
    "Ultralytics YOLO Classification 1.0",
    "YOLO 1.1",
    "Ultralytics YOLO Detection 1.0",
    "Ultralytics YOLO Detection Track 1.0",
    "Ultralytics YOLO Segmentation 1.0",
    "Ultralytics YOLO Oriented Bounding Boxes 1.0",
    "Ultralytics YOLO Pose 1.0",
    "PASCAL VOC 1.1",
    "Segmentation mask 1.1",
    "ImageNet 1.0",
    "Cityscapes 1.0",
    "MOTS PNG 1.0",
]


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


def compare_datasets(expected: Dataset, actual: Dataset):
    # we need this function to allow for a bit of variation in the rotation attribute
    comparator = EqualityComparator(ignored_attrs=["rotation"])

    output = comparator.compare_datasets(expected, actual)
    unmatched = output["mismatches"]
    expected_extra = output["a_extra_items"]
    actual_extra = output["b_extra_items"]
    errors = output["errors"]
    assert not unmatched, f"Datasets have unmatched items: {unmatched}"
    assert not actual_extra, f"Actual has following extra items: {actual_extra}"
    assert not expected_extra, f"Expected has following extra items: {expected_extra}"
    assert not errors, f"There were following errors while comparing datasets: {errors}"

    for item_a, item_b in zip(expected, actual):
        for ann_a, ann_b in zip(item_a.annotations, item_b.annotations):
            assert (
                abs(ann_a.attributes.get("rotation", 0) - ann_b.attributes.get("rotation", 0))
                < 0.01
            )


class _DbTestBase(ApiTestBase):
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
            rq_id = response.json()["rq_id"]

            response = self.client.get(f"/api/requests/{rq_id}")
            assert response.status_code == status.HTTP_200_OK, response.status_code
            assert response.json()["status"] == "finished", response.json().get("status")

            response = self.client.get("/api/tasks/%s" % tid)

            if 200 <= response.status_code < 400:
                labels_response = list(get_paginated_collection(
                    lambda page: self.client.get("/api/labels?task_id=%s&page=%s" % (tid, page))
                ))
                response.data["labels"] = labels_response

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
            values = get_paginated_collection(lambda page:
                self.client.get("/api/jobs?task_id={}&page={}".format(task_id, page))
            )
        return values

    def _get_tasks(self, project_id):
        with ForceLogin(self.admin, self.client):
            values = get_paginated_collection(lambda page:
                self.client.get("/api/tasks", data={"project_id": project_id, "page": page})
            )
        return values

    def _get_request(self, path, user):
        with ForceLogin(user, self.client):
            response = self.client.get(path)
        return response

    def _get_data_from_task(self, task_id, include_images):
        task_ann = TaskAnnotation(task_id)
        task_ann.init_from_db()
        task_data = TaskData(task_ann.ir_data, Task.objects.get(pk=task_id))
        extractor = CvatTaskOrJobDataExtractor(task_data, include_images=include_images)
        return Dataset.from_extractors(extractor)

    def _get_request_with_data(self, path, data, user):
        with ForceLogin(user, self.client):
            response = self.client.get(path, data)
        return response

    def _put_request_with_data(self, path, data, user):
        with ForceLogin(user, self.client):
            response = self.client.put(path, data)
        return response

    def _post_request_with_data(self, path, data, user):
        with ForceLogin(user, self.client):
            response = self.client.post(path, data)
        return response

    def _delete_request(self, path, user):
        with ForceLogin(user, self.client):
            response = self.client.delete(path)
        return response

    @staticmethod
    def _make_attribute_value(key_get_values, attribute):
        assert key_get_values in ["default", "random"]
        if key_get_values == "random":
            if attribute["input_type"] == "number":
                start = int(attribute["values"][0])
                stop = int(attribute["values"][1]) + 1
                step = int(attribute["values"][2])
                return str(random.randrange(start, stop, step))  # nosec B311 NOSONAR
            return random.choice(attribute["values"])  # nosec B311 NOSONAR
        assert key_get_values == "default"
        return attribute["default_value"]

    @staticmethod
    def _make_annotations_for_task(task, name_ann, key_get_values):
        def fill_one_attribute_in_element(is_item_tracks, element, attribute):
            spec_id = attribute["id"]
            value = _DbTestBase._make_attribute_value(key_get_values, attribute)

            if is_item_tracks and attribute["mutable"]:
                for index_shape, _ in enumerate(element["shapes"]):
                    element["shapes"][index_shape]["attributes"].append({
                        "spec_id": spec_id,
                        "value": value,
                    })
            else:
                element["attributes"].append({
                    "spec_id": spec_id,
                    "value": value,
                })

        def fill_all_attributes_in_element(is_item_tracks, element, label):
            element["label_id"] = label["id"]

            for attribute in label["attributes"]:
                fill_one_attribute_in_element(is_item_tracks, element, attribute)

            sub_elements = element.get("elements", [])
            sub_labels = label.get("sublabels", [])
            for sub_element, sub_label in zip(sub_elements, sub_labels):
                fill_all_attributes_in_element(is_item_tracks, sub_element, sub_label)

        tmp_annotations = copy.deepcopy(annotations[name_ann])

        for item in ["tags", "shapes", "tracks"]:
            for _element in tmp_annotations.get(item, []):
                fill_all_attributes_in_element(item == "tracks", _element, task["labels"][0])

        return tmp_annotations

    def _create_annotations(self, task, name_ann, key_get_values):
        tmp_annotations = self._make_annotations_for_task(task, name_ann, key_get_values)
        response = self._put_api_v2_task_id_annotations(task["id"], tmp_annotations)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def _create_annotations_in_job(self, task, job_id,  name_ann, key_get_values):
        tmp_annotations = self._make_annotations_for_task(task, name_ann, key_get_values)
        response = self._put_api_v2_job_id_annotations(job_id, tmp_annotations)
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=response.json())

    def _download_file(self, url, data, user, file_name):
        response = self._get_request_with_data(url, data, user)
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        response = self._get_request_with_data(url, {**data, "action": "download"}, user)
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

    def _generate_url_upload_project_dataset(self, project_id, format_name):
        return f"/api/projects/{project_id}/dataset?format={format_name}"

    def _remove_annotations(self, url, user):
        response = self._delete_request(url, user)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        return response

    def _delete_project(self, project_id, user):
        response = self._delete_request(f'/api/projects/{project_id}', user)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        return response

    @staticmethod
    def _save_file_from_response(response, file_name):
        if response.status_code == status.HTTP_200_OK:
            content = b"".join(response.streaming_content)
            with open(file_name, "wb") as f:
                f.write(content)


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
                        "Cityscapes 1.0", "COCO Keypoints 1.0",
                        "ICDAR Localization 1.0", "ICDAR Recognition 1.0",
                        "ICDAR Segmentation 1.0", "Market-1501 1.0", "MOT 1.1",
                        "Ultralytics YOLO Pose 1.0",
                    ]:
                        task = self._create_task(tasks[dump_format_name], images)
                    else:
                        task = self._create_task(tasks["main"], images)
                    task_id = task["id"]
                    if dump_format_name in DEFAULT_ATTRIBUTES_FORMATS + [
                        "Datumaro 1.0",
                    ]:
                        self._create_annotations(task, dump_format_name, "default")
                    else:
                        self._create_annotations(task, dump_format_name, "random")
                    # dump annotations
                    url = self._generate_url_dump_tasks_annotations(task_id)

                    for user, edata in list(expected.items()):
                        self._clear_temp_data() # clean up from previous tests and iterations

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
                        self._save_file_from_response(response, file_zip_name)
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
                                "Cityscapes 1.0", "COCO Keypoints 1.0",
                                "ICDAR Localization 1.0", "ICDAR Recognition 1.0",
                                "ICDAR Segmentation 1.0", "Market-1501 1.0", "MOT 1.1",
                                "Ultralytics YOLO Pose 1.0",
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
                        "Cityscapes 1.0", "COCO Keypoints 1.0",
                        "ICDAR Localization 1.0", "ICDAR Recognition 1.0",
                        "ICDAR Segmentation 1.0", "Market-1501 1.0", "MOT 1.1",
                        "Ultralytics YOLO Pose 1.0",
                    ]:
                        task = self._create_task(tasks[dump_format_name], video)
                    else:
                        task = self._create_task(tasks["main"], video)
                    task_id = task["id"]

                    if dump_format_name in DEFAULT_ATTRIBUTES_FORMATS:
                        self._create_annotations(task, dump_format_name, "default")
                    else:
                        self._create_annotations(task, dump_format_name, "random")
                    # dump annotations
                    url = self._generate_url_dump_tasks_annotations(task_id)

                    for user, edata in list(expected.items()):
                        self._clear_temp_data() # clean up from previous tests and iterations

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
                        self._save_file_from_response(response, file_zip_name)
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
                                "Cityscapes 1.0", "COCO Keypoints 1.0",
                                "ICDAR Localization 1.0", "ICDAR Recognition 1.0",
                                "ICDAR Segmentation 1.0", "Market-1501 1.0", "MOT 1.1",
                                "Ultralytics YOLO Pose 1.0",
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
                        self._clear_temp_data() # clean up from previous tests and iterations

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
                        self._save_file_from_response(response, file_zip_name)
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
            }
            self._download_file(url, data, self.admin, file_zip_name)
            self.assertEqual(osp.exists(file_zip_name), True)

            # remove annotations
            self._remove_annotations(url, self.admin)
            url = self._generate_url_upload_tasks_annotations(task_id, "CVAT 1.1")
            with open(file_zip_name, 'rb') as binary_file:
                self._upload_file(url, binary_file, self.admin)

    def test_api_v2_dump_annotations_from_several_jobs(self):
        test_name = self._testMethodName
        dump_formats = ["CVAT for images 1.1", "CVAT for video 1.1"]
        test_cases = ['all', 'first']

        for dump_format_name in dump_formats:

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
                        "Cityscapes 1.0", "COCO Keypoints 1.0",
                        "ICDAR Localization 1.0", "ICDAR Recognition 1.0",
                        "ICDAR Segmentation 1.0", "Market-1501 1.0", "MOT 1.1",
                        "Ultralytics YOLO Pose 1.0",
                    ]:
                        task = self._create_task(tasks[dump_format_name], images)
                    else:
                        task = self._create_task(tasks["main"], images)
                    task_id = task["id"]
                    # dump annotations
                    url = self._generate_url_dump_task_dataset(task_id)
                    for user, edata in list(expected.items()):
                        self._clear_temp_data() # clean up from previous tests and iterations

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
                        self._save_file_from_response(response, file_zip_name)
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
                if not dump_format.ENABLED or dump_format.DIMENSION == dm.bindings.DimensionType.DIM_3D:
                    continue
                dump_format_name = dump_format.DISPLAY_NAME

                with self.subTest(format=dump_format_name):
                    if dump_format_name in [
                        "MOTS PNG 1.0",  # issue #2925 and changed points values
                        "Cityscapes 1.0" # expanding annotations due to background mask
                    ]:
                        self.skipTest("Format is fail")

                    images = self._generate_task_images(3)
                    if dump_format_name in [
                        "Market-1501 1.0",
                        "ICDAR Localization 1.0", "ICDAR Recognition 1.0",
                        "ICDAR Segmentation 1.0", "COCO Keypoints 1.0", "Ultralytics YOLO Pose 1.0",
                    ]:
                        task = self._create_task(tasks[dump_format_name], images)
                    else:
                        task = self._create_task(tasks["main"], images)
                    task_id = task["id"]

                    if dump_format_name in DEFAULT_ATTRIBUTES_FORMATS + [
                        "MOT 1.1", "Datumaro 1.0", "Open Images V6 1.0", "KITTI 1.0",
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
                    }
                    self._download_file(url, data, self.admin, file_zip_name)
                    self.assertEqual(osp.exists(file_zip_name), True)

                    self._remove_annotations(url, self.admin)

                    self._create_annotations(task, "CVAT for images 1.1 many jobs", "default")

                    if dump_format_name == "CVAT for images 1.1" or dump_format_name == "CVAT for video 1.1":
                        dump_format_name = "CVAT 1.1"
                    elif dump_format_name == "Ultralytics YOLO Detection Track 1.0":
                        dump_format_name = "Ultralytics YOLO Detection 1.0"
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
                    compare_datasets(data_from_task_before_upload, data_from_task_after_upload)

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
                        "Market-1501 1.0", "Cityscapes 1.0",
                        "ICDAR Localization 1.0", "ICDAR Recognition 1.0",
                        "ICDAR Segmentation 1.0", "COCO Keypoints 1.0",
                        "Ultralytics YOLO Pose 1.0",
                    ]:
                        task = self._create_task(tasks[dump_format_name], images)
                    else:
                        task = self._create_task(tasks["main"], images)

                    # create annotations
                    if dump_format_name in DEFAULT_ATTRIBUTES_FORMATS + [
                        "MOT 1.1", "LFW 1.0",
                        "Open Images V6 1.0", "Datumaro 1.0", "KITTI 1.0",
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
                        }
                        self._download_file(url, data, self.admin, file_zip_name)
                        self._check_downloaded_file(file_zip_name)

                        # remove annotations
                        self._remove_annotations(url, self.admin)

                        # upload annotations
                        if dump_format_name in ["CVAT for images 1.1", "CVAT for video 1.1"]:
                            upload_format_name = "CVAT 1.1"
                        elif dump_format_name in ['Ultralytics YOLO Detection Track 1.0']:
                            upload_format_name = 'Ultralytics YOLO Detection 1.0'
                        else:
                            upload_format_name = dump_format_name
                        url = self._generate_url_upload_tasks_annotations(task_id, upload_format_name)
                        with open(file_zip_name, 'rb') as binary_file:
                            self._upload_file(url, binary_file, self.admin)

                            # equals annotations
                        data_from_task_after_upload = self._get_data_from_task(task_id, include_images)
                        compare_datasets(data_from_task_before_upload, data_from_task_after_upload)

    def test_api_v2_check_duplicated_polygon_points(self):
        test_name = self._testMethodName
        images = self._generate_task_images(10)
        task = self._create_task(tasks["main"], images)
        task_id = task["id"]
        data = {
            "format": "CVAT for video 1.1",
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
                    compare_datasets(data_from_task_before_upload, data_from_task_after_upload)

    def test_api_v2_check_mot_with_shapes_only(self):
        test_name = self._testMethodName
        format_name = "MOT 1.1"

        for include_images in (False, True):
            with self.subTest():
                # create task with annotations
                images = self._generate_task_images(3)
                task = self._create_task(tasks[format_name], images)
                self._create_annotations(task, f'{format_name} shapes only', "default")

                task_id = task["id"]
                data_from_task_before_upload = self._get_data_from_task(task_id, include_images)

                # dump annotations
                url = self._generate_url_dump_tasks_annotations(task_id)
                data = {
                    "format": format_name,
                }
                with TestDir() as test_dir:
                    file_zip_name = osp.join(test_dir, f'{test_name}_{format_name}.zip')
                    self._download_file(url, data, self.admin, file_zip_name)
                    self._check_downloaded_file(file_zip_name)

                    # remove annotations
                    self._remove_annotations(url, self.admin)

                    # upload annotations
                    url = self._generate_url_upload_tasks_annotations(task_id, format_name)
                    with open(file_zip_name, 'rb') as binary_file:
                        self._upload_file(url, binary_file, self.admin)

                    # equals annotations
                    data_from_task_after_upload = self._get_data_from_task(task_id, include_images)
                    compare_datasets(data_from_task_before_upload, data_from_task_after_upload)

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
                    compare_datasets(data_from_task_before_upload, data_from_task_after_upload)

    def test_api_v2_check_skeleton_tracks_with_missing_shapes(self):
        test_name = self._testMethodName
        format_name = "COCO Keypoints 1.0"

        # create task with annotations
        for whole_task in (False, True):
            for name_ann in [
                "many jobs skeleton tracks with missing shapes",
                "many jobs skeleton tracks with missing shapes - skeleton is outside",
                "many jobs skeleton tracks with missing shapes - some points present",
            ]:
                with self.subTest():
                    images = self._generate_task_images(25)
                    task = self._create_task(tasks['many jobs skeleton'], images)
                    task_id = task["id"]

                    if whole_task:
                        self._create_annotations(task, name_ann, "default")
                    else:
                        job_id = next(
                            job["id"]
                            for job in self._get_jobs(task_id)
                            if job["start_frame"] == annotations[name_ann]["tracks"][0]["frame"]
                        )
                        self._create_annotations_in_job(task, job_id, name_ann, "default")

                    # dump annotations
                    url = self._generate_url_dump_tasks_annotations(task_id)
                    data = {"format": format_name}
                    with TestDir() as test_dir:
                        file_zip_name = osp.join(test_dir, f'{test_name}_{format_name}.zip')
                        self._download_file(url, data, self.admin, file_zip_name)
                        self._check_downloaded_file(file_zip_name)

                        # remove annotations
                        self._remove_annotations(url, self.admin)

                        # upload annotations
                        url = self._generate_url_upload_tasks_annotations(task_id, format_name)
                        with open(file_zip_name, 'rb') as binary_file:
                            self._upload_file(url, binary_file, self.admin)


class ExportBehaviorTest(_DbTestBase):
    @define
    class SharedBase:
        condition: multiprocessing.Condition = field(factory=multiprocessing.Condition, init=False)

    @define
    class SharedBool(SharedBase):
        value: multiprocessing.Value = field(
            factory=partial(multiprocessing.Value, 'i', 0), init=False
        )

        def set(self, value: bool = True):
            self.value.value = int(value)

        def get(self) -> bool:
            return bool(self.value.value)

    @define
    class SharedString(SharedBase):
        MAX_LEN: ClassVar[int] = 2048

        value: multiprocessing.Value = field(
            factory=partial(multiprocessing.Array, 'c', MAX_LEN), init=False
        )

        def set(self, value: str):
            self.value.get_obj().value = value.encode()[ : self.MAX_LEN - 1]

        def get(self) -> str:
            return self.value.get_obj().value.decode()

    class _LockTimeoutError(Exception):
        pass

    def setUp(self):
        self.export_cache_lock = multiprocessing.Lock()

    @contextmanager
    def patched_get_export_cache_lock(self, export_path, *, ttl: int | timedelta, block: bool = True, acquire_timeout: int | timedelta):
        # fakeredis lock acquired in a subprocess won't be visible to other processes
        # just implement the lock here
        from cvat.apps.dataset_manager.util import LockNotAvailableError

        assert acquire_timeout
        assert ttl

        if isinstance(acquire_timeout, timedelta):
            acquire_timeout = acquire_timeout.total_seconds()

        acquired = self.export_cache_lock.acquire(
            block=block, timeout=acquire_timeout
        )

        if not acquired:
            raise LockNotAvailableError

        try:
            yield
        finally:
            self.export_cache_lock.release()

    @overload
    @classmethod
    def set_condition(cls, var: SharedBool, value: bool = True): ...

    @overload
    @classmethod
    def set_condition(cls, var: SharedBase, value: Any): ...

    _not_set = object()

    @classmethod
    def set_condition(cls, var: SharedBase, value: Any = _not_set):
        if isinstance(var, cls.SharedBool) and value is cls._not_set:
            value = True

        with var.condition:
            var.set(value)
            var.condition.notify()

    @classmethod
    def wait_condition(cls, var: SharedBase, timeout: Optional[int] = 5):
        with var.condition:
            if not var.get() and not var.condition.wait(timeout):
                raise cls._LockTimeoutError

    @staticmethod
    def side_effect(f: Callable, *args, **kwargs) -> Callable:
        """
        Wraps the passed function to be executed with the given parameters
        and return the regular mock output
        """

        def wrapped(*_, **__):
            f(*args, **kwargs)
            return MOCK_DEFAULT

        return wrapped

    @staticmethod
    def chain_side_effects(*calls: Callable) -> Callable:
        """
        Makes a callable that calls all the passed functions sequentially,
        and returns the last call result
        """

        def wrapped(*args, **kwargs):
            result = MOCK_DEFAULT

            for f in calls:
                new_result = f(*args, **kwargs)
                if new_result is not MOCK_DEFAULT:
                    result = new_result

            return result

        return wrapped

    @staticmethod
    @contextmanager
    def process_closing(process: multiprocessing.Process, *, timeout: Optional[int] = 10):
        try:
            yield process
        finally:
            if process.is_alive():
                process.terminate()

            process.join(timeout=timeout)
            process.close()

    def _setup_task_with_annotations(
        self,
        *,
        number_of_images: int = 3,
        format_name: str | None = None,
        name_ann: str | None = None,
    ):
        assert format_name or name_ann
        images = self._generate_task_images(number_of_images)
        task = self._create_task(tasks["main"], images)
        self._create_annotations(task, name_ann or f"{format_name} many jobs", "default")

        return task

    def test_concurrent_export_and_cleanup(self):
        side_effect = self.side_effect
        chain_side_effects = self.chain_side_effects
        set_condition = self.set_condition
        wait_condition = self.wait_condition
        _LockTimeoutError = self._LockTimeoutError
        process_closing = self.process_closing

        format_name = "CVAT for images 1.1"

        export_file_path = self.SharedString()
        export_checked_the_file = self.SharedBool()
        clear_has_been_finished = self.SharedBool()
        clear_removed_the_file = self.SharedBool()
        export_outdated_after = timedelta(seconds=4)

        EXPORT_CACHE_LOCK_TTL = 4
        EXPORT_CACHE_LOCK_ACQUISITION_TIMEOUT = EXPORT_CACHE_LOCK_TTL * 2

        def _export(*_, task_id: int):
            import sys
            from os import replace as original_replace
            from os.path import exists as original_exists

            from cvat.apps.dataset_manager.task import export_task as original_export_task
            from cvat.apps.dataset_manager.views import log_exception as original_log_exception

            def patched_log_exception(logger=None, exc_info=True):
                cur_exc_info = sys.exc_info() if exc_info is True else exc_info
                if (
                    cur_exc_info
                    and cur_exc_info[1]
                    and isinstance(cur_exc_info[1], _LockTimeoutError)
                ):
                    return  # don't spam in logs with expected errors

                original_log_exception(logger, exc_info)

            with (
                patch("cvat.apps.dataset_manager.views.EXPORT_CACHE_LOCK_TTL", new=EXPORT_CACHE_LOCK_TTL),
                patch("cvat.apps.dataset_manager.views.EXPORT_CACHE_LOCK_ACQUISITION_TIMEOUT",
                      new=EXPORT_CACHE_LOCK_ACQUISITION_TIMEOUT),
                patch(
                    "cvat.apps.dataset_manager.views.get_export_cache_lock",
                    new=self.patched_get_export_cache_lock,
                ),
                # We need to mock the function directly imported into the module
                # to ensure that the `export_checked_the_file` condition is set
                # only after checking whether a file exists inside an acquired lock
                patch("cvat.apps.dataset_manager.views.osp_exists") as mock_osp_exists,
                patch(
                    "cvat.apps.dataset_manager.views.shutil.move", side_effect=original_replace
                ) as mock_os_replace,
                patch("cvat.apps.dataset_manager.views.log_exception", new=patched_log_exception),
                patch("cvat.apps.dataset_manager.views.task.export_task") as mock_export_fn,
            ):
                mock_osp_exists.side_effect = chain_side_effects(
                    original_exists,
                    side_effect(set_condition, export_checked_the_file),
                )
                mock_export_fn.side_effect = chain_side_effects(
                    original_export_task,
                    side_effect(wait_condition, clear_has_been_finished),
                )
                result_file = export(dst_format=format_name, task_id=task_id)
                set_condition(export_file_path, result_file)
                mock_os_replace.assert_not_called()

        def _clear(*_, file_path: str):
            from os import remove as original_remove

            with (
                patch("cvat.apps.dataset_manager.cron.EXPORT_CACHE_LOCK_TTL", new=EXPORT_CACHE_LOCK_TTL),
                patch("cvat.apps.dataset_manager.cron.EXPORT_CACHE_LOCK_ACQUISITION_TIMEOUT", new=EXPORT_CACHE_LOCK_ACQUISITION_TIMEOUT),
                patch(
                    "cvat.apps.dataset_manager.cron.get_export_cache_lock",
                    new=self.patched_get_export_cache_lock,
                ),
                patch(
                    "cvat.apps.dataset_manager.views.os.remove"
                ) as mock_os_remove,
                patch(
                    "cvat.apps.dataset_manager.views.TTL_CONSTS",
                    new={"task": export_outdated_after},
                ),
            ):
                mock_os_remove.side_effect = chain_side_effects(
                    original_remove,
                    side_effect(set_condition, clear_removed_the_file),
                )

                clear_export_cache(file_path=Path(file_path))
                set_condition(clear_has_been_finished)

                mock_os_remove.assert_not_called()

        # The problem checked is TOCTOU / race condition for file existence check and
        # further file update / removal. There are several possible variants of the problem.
        # An example:
        # 1. export checks the file exists -> file is not outdated -> need to touch file's updated_date
        # 2. clear checks the file exists, and matches the creation timestamp
        # 3. export updates the files's modification date and does not run actual export
        # 4. remove removes the actual export file
        # Thus, we have no exported file after the successful export.

        # note: it is not possible to achieve the situation
        # when clear process deletes newly "re-created by export process"
        # file instead of the checked one since file names contain a timestamp.

        # Other variants can be variations on the intermediate calls, such as getmtime:
        # - export: exists()
        # - clear: remove()
        # - export: getmtime() -> an exception

        # - clear_1: exists()
        # - clear_2: remove()
        # - clear_1: getmtime() -> an exception
        # etc.

        task = self._setup_task_with_annotations(format_name=format_name)
        task_id = task["id"]

        # create a file in the export cache
        first_export_path = export(dst_format=format_name, task_id=task_id)

        initial_file_modfication_time = os.path.getmtime(first_export_path)
        # make sure that a file in the export cache is outdated by timeout
        # and a file would have to be deleted if the export was not running in parallel
        sleep(export_outdated_after.seconds + 1)

        processes_finished_correctly = False
        with ExitStack() as es:
            # Run both operations concurrently
            # Threads could be faster, but they can't be terminated
            export_process = es.enter_context(
                process_closing(
                    multiprocessing.Process(
                        target=_export,
                        args=(
                            self.export_cache_lock,
                            export_checked_the_file,
                        ),
                        kwargs=dict(task_id=task_id),
                    )
                )
            )
            clear_process = es.enter_context(
                process_closing(
                    multiprocessing.Process(
                        target=_clear,
                        args=(
                            self.export_cache_lock,
                            export_checked_the_file,
                        ),
                        kwargs=dict(
                            file_path=first_export_path
                        ),
                    )
                )
            )

            export_process.start()

            wait_condition(export_checked_the_file)  # ensure the expected execution order
            clear_process.start()

            # A deadlock (interrupted by a timeout error) is the positive outcome in this test,
            # if the problem is fixed.
            # clear() must wait for the export cache lock release (acquired by export()).
            # It must be finished by a timeout, as export() holds it, waiting
            clear_process.join(timeout=15)
            export_process.join(timeout=15)

            self.assertFalse(export_process.is_alive())
            self.assertFalse(clear_process.is_alive())

            # All the expected exceptions should be handled in the process callbacks.
            # This is to avoid passing the test with unexpected errors
            self.assertEqual(export_process.exitcode, 0)
            self.assertEqual(clear_process.exitcode, 0)

            processes_finished_correctly = True

        self.assertTrue(processes_finished_correctly)
        self.assertFalse(clear_removed_the_file.get())

        new_export_path = export_file_path.get()
        self.assertGreater(len(new_export_path), 0)
        self.assertTrue(osp.isfile(new_export_path))
        self.assertTrue(osp.isfile(first_export_path))
        self.assertGreater(os.path.getmtime(first_export_path), initial_file_modfication_time)

        # terminate() may break the locks, don't try to acquire
        # https://docs.python.org/3/library/multiprocessing.html#multiprocessing.Process.terminate
        self.assertTrue(export_checked_the_file.get())

    def test_concurrent_download_and_cleanup(self):
        side_effect = self.side_effect
        chain_side_effects = self.chain_side_effects
        set_condition = self.set_condition
        wait_condition = self.wait_condition
        process_closing = self.process_closing

        format_name = "CVAT for images 1.1"

        download_checked_the_file = self.SharedBool()
        clear_removed_the_file = self.SharedBool()

        task = self._setup_task_with_annotations(format_name=format_name)
        task_id = task["id"]

        download_url = self._generate_url_dump_tasks_annotations(task_id)
        download_params = {
            "format": format_name,
        }

        def _download(*_, task_id: int, export_path: str):
            from os.path import exists as original_exists

            def patched_osp_exists(path: str):
                result = original_exists(path)

                if path == export_path:
                    set_condition(download_checked_the_file)
                    wait_condition(
                        clear_removed_the_file, timeout=20
                    )  # wait more than the process timeout

                return result

            with (
                patch(
                    "cvat.apps.engine.views.dm.util.get_export_cache_lock",
                    new=self.patched_get_export_cache_lock,
                ),
                patch("cvat.apps.dataset_manager.views.osp.exists") as mock_osp_exists,
                TemporaryDirectory() as temp_dir,
            ):
                mock_osp_exists.side_effect = patched_osp_exists

                response = self._get_request_with_data(download_url, download_params, self.admin)
                self.assertEqual(response.status_code, status.HTTP_200_OK)

                self._save_file_from_response(response, osp.join(temp_dir, "export.zip"))

                mock_osp_exists.assert_called()

        def _clear(*_, file_path: str):
            from os import remove as original_remove

            from cvat.apps.dataset_manager.util import LockNotAvailableError

            with (
                patch("cvat.apps.dataset_manager.cron.EXPORT_CACHE_LOCK_ACQUISITION_TIMEOUT", new=3),
                patch(
                    "cvat.apps.dataset_manager.cron.get_export_cache_lock",
                    new=self.patched_get_export_cache_lock,
                ),
                patch("cvat.apps.dataset_manager.cron.os.remove") as mock_os_remove,
                patch(
                    "cvat.apps.dataset_manager.views.TTL_CONSTS", new={"task": timedelta(seconds=0)}
                ),
            ):
                mock_os_remove.side_effect = chain_side_effects(
                    original_remove,
                    side_effect(set_condition, clear_removed_the_file),
                )

                exited_by_timeout = False
                try:
                    clear_export_cache(file_path=Path(file_path))
                except LockNotAvailableError:
                    # should come from waiting for get_export_cache_lock
                    exited_by_timeout = True

                assert exited_by_timeout

        # The problem checked is TOCTOU / race condition for file existence check and
        # further file reading / removal. There are several possible variants of the problem.
        # An example:
        # 1. download exports the file
        # 2. download checks the export is still relevant
        # 3. clear checks the file exists
        # 4. clear removes the export file
        # 5. download checks if the file exists -> an exception
        #
        # There can be variations on the intermediate calls, such as:
        # - download: exists()
        # - clear: remove()
        # - download: open() -> an exception
        # etc.

        export_path = None

        def patched_export(*args, **kwargs):
            nonlocal export_path

            result = export(*args, **kwargs)
            export_path = result

            return result

        with patch("cvat.apps.dataset_manager.views.export", new=patched_export):
            response = self._get_request_with_data(download_url, download_params, self.admin)
            self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

            response = self._get_request_with_data(download_url, download_params, self.admin)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        download_params["action"] = "download"

        processes_finished_correctly = False
        with ExitStack() as es:
            # Run both operations concurrently
            # Threads could be faster, but they can't be terminated
            download_process = es.enter_context(
                process_closing(
                    multiprocessing.Process(
                        target=_download,
                        args=(download_checked_the_file, clear_removed_the_file),
                        kwargs=dict(task_id=task_id, export_path=export_path),
                    )
                )
            )
            clear_process = es.enter_context(
                process_closing(
                    multiprocessing.Process(
                        target=_clear,
                        args=(download_checked_the_file, clear_removed_the_file),
                        kwargs=dict(file_path=export_path),
                    )
                )
            )

            download_process.start()

            wait_condition(download_checked_the_file)  # ensure the expected execution order
            clear_process.start()

            # A deadlock (interrupted by a timeout error) is the positive outcome in this test,
            # if the problem is fixed.
            # clear() must wait for the export cache lock release (acquired by download()).
            # It must be finished by a timeout, as download() holds it, waiting
            clear_process.join(timeout=10)

            # download() must wait for the clear() file existence check and fail because of timeout
            download_process.join(timeout=5)

            self.assertTrue(download_process.is_alive())
            self.assertFalse(clear_process.is_alive())

            download_process.terminate()
            download_process.join(timeout=5)

            # All the expected exceptions should be handled in the process callbacks.
            # This is to avoid passing the test with unexpected errors
            self.assertEqual(download_process.exitcode, -15)  # sigterm
            self.assertEqual(clear_process.exitcode, 0)

            processes_finished_correctly = True

        self.assertTrue(processes_finished_correctly)

        # terminate() may break the locks, don't try to acquire
        # https://docs.python.org/3/library/multiprocessing.html#multiprocessing.Process.terminate
        self.assertTrue(download_checked_the_file.get())

        self.assertFalse(clear_removed_the_file.get())

    def test_export_can_create_file(self):
        format_name = "CVAT for images 1.1"
        task = self._setup_task_with_annotations(format_name=format_name)
        task_id = task["id"]

        with (
            patch("cvat.apps.dataset_manager.views.TTL_CONSTS", new={"task": timedelta(seconds=0)}),
        ):
            export_path = export(dst_format=format_name, task_id=task_id)

        self.assertTrue(osp.isfile(export_path))

    def test_export_cache_lock_can_raise_on_releasing_expired_lock(self):
        from pottery import ReleaseUnlockedLock

        with self.assertRaises(ReleaseUnlockedLock):
            lock_time = 2
            with get_export_cache_lock("test_export_path", ttl=lock_time, acquire_timeout=5):
                sleep(lock_time + 1)

    def test_export_can_request_retry_on_locking_failure(self):
        format_name = "CVAT for images 1.1"
        task = self._setup_task_with_annotations(format_name=format_name)
        task_id = task["id"]

        from cvat.apps.dataset_manager.util import LockNotAvailableError

        with (
            patch(
                "cvat.apps.dataset_manager.views.get_export_cache_lock",
                side_effect=LockNotAvailableError,
            ) as mock_get_export_cache_lock,
            patch("cvat.apps.dataset_manager.views.rq.get_current_job") as mock_rq_get_current_job,
            patch("cvat.apps.dataset_manager.views.django_rq.get_scheduler"),
            self.assertRaises(LockNotAvailableError),
        ):
            mock_rq_job = MagicMock(timeout=5)
            mock_rq_get_current_job.return_value = mock_rq_job

            export(dst_format=format_name, task_id=task_id)

        mock_get_export_cache_lock.assert_called()
        self.assertEqual(mock_rq_job.retries_left, 1)

    def test_export_can_reuse_older_file_if_still_relevant(self):
        format_name = "CVAT for images 1.1"
        task = self._setup_task_with_annotations(format_name=format_name)
        task_id = task["id"]

        first_export_path = export(dst_format=format_name, task_id=task_id)

        from os.path import exists as original_exists

        with (
            patch(
                "cvat.apps.dataset_manager.views.osp_exists", side_effect=original_exists
            ) as mock_osp_exists,
            patch("cvat.apps.dataset_manager.views.shutil.move") as mock_os_replace,
        ):
            second_export_path = export(dst_format=format_name, task_id=task_id)

        self.assertEqual(first_export_path, second_export_path)
        mock_osp_exists.assert_called_with(first_export_path)
        mock_os_replace.assert_not_called()

    def test_initiate_concurrent_export_by_different_users(self):
        side_effect = self.side_effect
        chain_side_effects = self.chain_side_effects
        process_closing = self.process_closing
        wait_condition = self.wait_condition
        set_condition = self.set_condition

        export_1_checked_file = self.SharedBool()
        export_1_made_export = self.SharedBool()
        export_1_replaced_file = self.SharedBool()

        export_2_checked_file = self.SharedBool()
        export_2_made_export = self.SharedBool()
        export_2_replaced_file = self.SharedBool()

        format_name = "CVAT for images 1.1"

        LOCK_TTL = 4
        LOCK_ACQUISITION_TIMEOUT = LOCK_TTL * 2

        def _export_1(
            *_,
            task_id: int,
            result_queue: multiprocessing.Queue,
        ):
            from os import replace as original_replace

            from cvat.apps.dataset_manager.task import export_task as original_export_task

            with (
                patch("cvat.apps.dataset_manager.views.EXPORT_CACHE_LOCK_TTL", new=LOCK_TTL),
                patch(
                    "cvat.apps.dataset_manager.views.EXPORT_CACHE_LOCK_ACQUISITION_TIMEOUT",
                    new=LOCK_ACQUISITION_TIMEOUT,
                ),
                patch(
                    "cvat.apps.dataset_manager.views.get_export_cache_lock",
                    new=self.patched_get_export_cache_lock,
                ),
                patch("cvat.apps.dataset_manager.views.shutil.move") as mock_os_replace,
                patch("cvat.apps.dataset_manager.views.task.export_task") as mock_export_fn,
                patch("cvat.apps.dataset_manager.views.django_rq.get_scheduler"),
            ):
                mock_export_fn.side_effect = chain_side_effects(
                    side_effect(set_condition, export_1_checked_file),
                    original_export_task,
                    side_effect(wait_condition, export_2_checked_file),
                    side_effect(set_condition, export_1_made_export),
                )

                mock_os_replace.side_effect = chain_side_effects(
                    original_replace,
                    side_effect(set_condition, export_1_replaced_file),
                )
                result_file_path = export(dst_format=format_name, task_id=task_id)
                result_queue.put(result_file_path)

                mock_export_fn.assert_called_once()
                mock_os_replace.assert_called_once()

        def _export_2(
            *_,
            task_id: int,
            result_queue: multiprocessing.Queue,
        ):
            from os import replace as original_replace

            from cvat.apps.dataset_manager.task import export_task as original_export_task

            with (
                patch("cvat.apps.dataset_manager.views.EXPORT_CACHE_LOCK_TTL", new=LOCK_TTL),
                patch(
                    "cvat.apps.dataset_manager.views.EXPORT_CACHE_LOCK_ACQUISITION_TIMEOUT",
                    new=LOCK_ACQUISITION_TIMEOUT,
                ),
                patch(
                    "cvat.apps.dataset_manager.views.get_export_cache_lock",
                    new=self.patched_get_export_cache_lock,
                ),
                patch("cvat.apps.dataset_manager.views.shutil.move") as mock_os_replace,
                patch("cvat.apps.dataset_manager.views.task.export_task") as mock_export_fn,
                patch("cvat.apps.dataset_manager.views.django_rq.get_scheduler"),
            ):
                mock_export_fn.side_effect = chain_side_effects(
                    side_effect(set_condition, export_2_checked_file),
                    original_export_task,
                    side_effect(wait_condition, export_1_replaced_file),
                    side_effect(set_condition, export_2_made_export),
                )

                mock_os_replace.side_effect = chain_side_effects(
                    original_replace,
                    side_effect(set_condition, export_2_replaced_file),
                )
                result_file_path = export(dst_format=format_name, task_id=task_id)
                result_queue.put(result_file_path)

                mock_export_fn.assert_called_once()
                mock_os_replace.assert_called_once()

        task = self._setup_task_with_annotations(format_name=format_name)

        with ExitStack() as es:
            result_queue = multiprocessing.Queue()
            number_of_processes = 2
            export_process_1 = es.enter_context(
                process_closing(
                    multiprocessing.Process(
                        target=_export_1,
                        kwargs=dict(
                            task_id=task["id"],
                            result_queue=result_queue,
                        ),
                    )
                )
            )
            export_process_2 = es.enter_context(
                process_closing(
                    multiprocessing.Process(
                        target=_export_2,
                        kwargs=dict(
                            task_id=task["id"],
                            result_queue=result_queue,
                        ),
                    )
                )
            )

            export_process_1.start()
            wait_condition(export_1_checked_file)

            export_process_2.start()
            export_process_2.join(timeout=20)
            export_process_1.join(timeout=20)

            self.assertFalse(export_process_1.is_alive())
            self.assertFalse(export_process_2.is_alive())

            self.assertEqual(export_process_1.exitcode, 0)
            self.assertEqual(export_process_2.exitcode, 0)
            paths = {result_queue.get() for _ in range(number_of_processes)}
            result_queue.close()

            self.assertTrue(len(paths) == 1)
            self.assertNotEqual(paths, {None})
            self.assertTrue(osp.isfile(list(paths)[0]))

            for cond in (
                export_1_checked_file, export_1_made_export, export_1_replaced_file,
                export_2_checked_file, export_2_made_export, export_2_replaced_file
            ):
                self.assertTrue(cond.get())

    def test_cleanup_can_remove_file(self):
        format_name = "CVAT for images 1.1"
        task = self._setup_task_with_annotations(format_name=format_name)
        task_id = task["id"]

        export_path = export(dst_format=format_name, task_id=task_id)

        with (
            patch("cvat.apps.dataset_manager.views.TTL_CONSTS", new={"task": timedelta(seconds=0)}),
        ):
            export_path = export(dst_format=format_name, task_id=task_id)
            clear_export_cache(file_path=Path(export_path))

        self.assertFalse(osp.isfile(export_path))


    def test_cleanup_can_fail_if_no_file(self):
        from cvat.apps.dataset_manager.util import CacheFileOrDirPathParseError
        with self.assertRaises(CacheFileOrDirPathParseError):
            clear_export_cache(file_path=Path("non existent file path"))

    def test_cleanup_can_defer_removal_if_file_is_used_recently(self):
        from os import remove as original_remove
        format_name = "CVAT for images 1.1"
        task = self._setup_task_with_annotations(format_name=format_name)
        task_id = task["id"]

        export_path = export(dst_format=format_name, task_id=task_id)

        with (
            patch("cvat.apps.dataset_manager.views.TTL_CONSTS", new={"task": timedelta(hours=1)}),
            patch("cvat.apps.dataset_manager.cron.os.remove", side_effect=original_remove) as mock_os_remove,
        ):
            export_path = export(dst_format=format_name, task_id=task_id)
            clear_export_cache(file_path=Path(export_path))
            mock_os_remove.assert_not_called()

        self.assertTrue(osp.isfile(export_path))

    def test_cleanup_cron_job_can_delete_cached_files(self):
        from cvat.apps.dataset_manager.cron import cleanup_export_cache_directory

        def _get_project_task_job_ids():
            project = self._create_project(projects["main"])
            project_id = project["id"]

            images = self._generate_task_images(3)
            task = self._create_task(
                data=tasks["task in project #1"],
                image_data=images,
            )
            task_id = task["id"]
            job_id = self._get_jobs(task_id)[0]["id"]
            return project_id, task_id, job_id

        # remove chunks from the cache
        self._clear_temp_data()
        project_id, task_id, job_id = _get_project_task_job_ids()

        for resource, rid in zip(("project", "task", "job"), (project_id, task_id, job_id)):
            for save_images in (True, False):
                export_path = export(
                    dst_format="CVAT for images 1.1",
                    save_images=save_images,
                    **{resource + "_id": rid},
                )
                self.assertTrue(osp.isfile(export_path))
                self.assertTrue(resource in export_path)

                with (
                    patch(
                        "cvat.apps.dataset_manager.views.TTL_CONSTS",
                        new={resource: timedelta(seconds=0)},
                    ),
                    patch(
                        "cvat.apps.dataset_manager.cron.clear_export_cache",
                        side_effect=clear_export_cache,
                    ) as mock_clear_export_cache,
                ):
                    cleanup_export_cache_directory()
                    mock_clear_export_cache.assert_called_once()

                self.assertFalse(osp.exists(export_path))


class ProjectDumpUpload(_DbTestBase):
    def _get_download_project_dataset_response(self, url, user, dump_format_name, edata):
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
        return self._get_request_with_data(url, data, user)

    def test_api_v2_export_import_dataset(self):
        test_name = self._testMethodName
        dump_formats = dm.views.get_export_formats()
        upload_formats = dm.views.get_import_formats()

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
                if dump_format_name in [
                    'Cityscapes 1.0', 'LFW 1.0', 'Market-1501 1.0',
                    'MOT 1.1',
                ]:
                    # TO-DO: fix bug for this formats
                    continue
                project = copy.deepcopy(projects['main'])
                if dump_format_name in tasks:
                    project['labels'] = tasks[dump_format_name]['labels']
                project = self._create_project(project)
                tasks['task in project #1']['project_id'] = project['id']
                task = self._create_task(tasks['task in project #1'], self._generate_task_images(3))

                url = self._generate_url_dump_project_dataset(project['id'], dump_format_name)

                if dump_format_name in DEFAULT_ATTRIBUTES_FORMATS + [
                    "Datumaro 1.0", "MOT 1.1",
                ]:
                    self._create_annotations(task, dump_format_name, "default")
                else:
                    self._create_annotations(task, dump_format_name, "random")

                for user, edata in list(expected.items()):
                    self._clear_temp_data() # clean up from previous tests and iterations

                    user_name = edata['name']
                    file_zip_name = osp.join(test_dir, f'{test_name}_{user_name}_{dump_format_name}.zip')
                    response = self._get_download_project_dataset_response(url, user, dump_format_name, edata)
                    self.assertEqual(response.status_code, edata["code"])
                    self._save_file_from_response(response, file_zip_name)
                    self.assertEqual(response.status_code, edata['code'])
                    self.assertEqual(osp.exists(file_zip_name), edata['file_exists'])

            for upload_format in upload_formats:
                if not upload_format.ENABLED or upload_format.DIMENSION == dm.bindings.DimensionType.DIM_3D:
                    continue
                upload_format_name = upload_format.DISPLAY_NAME
                if upload_format_name in [
                    'Cityscapes 1.0', 'LFW 1.0', 'Market-1501 1.0',
                    'MOT 1.1',
                ]:
                    # TO-DO: fix bug for this formats
                    continue
                for user, edata in list(expected.items()):
                    project = copy.deepcopy(projects['main'])
                    if upload_format_name in tasks:
                        project['labels'] = tasks[upload_format_name]['labels']
                    project = self._create_project(project)
                    file_zip_name = osp.join(test_dir, f"{test_name}_{edata['name']}_{upload_format_name}.zip")
                    url = self._generate_url_upload_project_dataset(project['id'], upload_format_name)

                    if osp.exists(file_zip_name):
                        with open(file_zip_name, 'rb') as binary_file:
                            response = self._post_request_with_data(url, {"dataset_file": binary_file}, user)
                            self.assertEqual(response.status_code, edata['accept code'])

    def test_api_v2_export_annotations(self):
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
                        self._clear_temp_data() # clean up from previous tests and iterations

                        user_name = edata['name']
                        file_zip_name = osp.join(test_dir, f'{test_name}_{user_name}_{dump_format_name}.zip')
                        response = self._get_download_project_dataset_response(url, user, dump_format_name, edata)
                        self.assertEqual(response.status_code, edata["code"])
                        self._save_file_from_response(response, file_zip_name)
                        self.assertEqual(response.status_code, edata['code'])
                        self.assertEqual(osp.exists(file_zip_name), edata['file_exists'])

    def test_api_v2_dump_upload_annotations_with_objects_type_is_track(self):
        test_name = self._testMethodName
        upload_format_name = dump_format_name = "COCO Keypoints 1.0"
        user = self.admin
        edata = {'name': 'admin', 'code': status.HTTP_200_OK, 'create code': status.HTTP_201_CREATED,
                         'accept code': status.HTTP_202_ACCEPTED, 'file_exists': True, 'annotation_loaded': True}

        with TestDir() as test_dir:
            # Dump annotations with objects type is track
            # create task with annotations
            project_dict = copy.deepcopy(projects['main'])
            task_dict = copy.deepcopy(tasks[dump_format_name])
            project_dict["labels"] = task_dict["labels"]
            del task_dict["labels"]
            for label in project_dict["labels"]:
                label["attributes"] = [{
                    "name": "is_crowd",
                    "mutable": False,
                    "input_type": "checkbox",
                    "default_value": "false",
                    "values": ["false", "true"]
                }]
            project = self._create_project(project_dict)
            pid = project['id']
            video = self._generate_task_videos(1)
            task_dict['project_id'] = pid
            task = self._create_task(task_dict, video)
            task_id = task["id"]
            self._create_annotations(task, "skeleton track", "default")
            # dump annotations
            url = self._generate_url_dump_project_dataset(project['id'], dump_format_name)

            self._clear_rq_jobs()  # clean up from previous tests and iterations

            file_zip_name = osp.join(test_dir, f'{test_name}_{dump_format_name}.zip')
            response = self._get_download_project_dataset_response(url, user, dump_format_name, edata)
            self.assertEqual(response.status_code, edata['code'])
            self._save_file_from_response(response, file_zip_name)
            self.assertEqual(osp.exists(file_zip_name), True)

            data_from_task_before_upload = self._get_data_from_task(task_id, True)

            # Upload annotations with objects type is track
            project = self._create_project(project_dict)
            url = self._generate_url_upload_project_dataset(project["id"], upload_format_name)

            with open(file_zip_name, 'rb') as binary_file:
                response = self._post_request_with_data(url, {"dataset_file": binary_file}, user)
                self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

            # equals annotations
            new_task = self._get_tasks(project["id"])[0]
            data_from_task_after_upload = self._get_data_from_task(new_task["id"], True)
            compare_datasets(data_from_task_before_upload, data_from_task_after_upload)
