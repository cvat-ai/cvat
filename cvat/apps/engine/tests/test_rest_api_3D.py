# Copyright (C) 2020-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT


import io
import os
import os.path as osp
import tempfile
import xml.etree.ElementTree as ET
import zipfile
from collections import defaultdict
from glob import glob
from io import BytesIO
import copy
from shutil import copyfile
import itertools

from django.contrib.auth.models import Group, User
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from cvat.apps.engine.media_extractors import ValidateDimension
from cvat.apps.dataset_manager.task import TaskAnnotation
from datumaro.util.test_utils import TestDir

CREATE_ACTION = "create"
UPDATE_ACTION = "update"
DELETE_ACTION = "delete"


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

    def _patch_api_v2_task_id_annotations(self, tid, data, action, user):
        with ForceLogin(user, self.client):
            response = self.client.patch(
                "/api/tasks/{}/annotations?action={}".format(tid, action),
                data=data, format="json")

        return response

    def _patch_api_v2_job_id_annotations(self, jid, data, action, user):
        with ForceLogin(user, self.client):
            response = self.client.patch(
                "/api/jobs/{}/annotations?action={}".format(jid, action),
                data=data, format="json")

        return response

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

    @staticmethod
    def _get_tmp_annotation(task, annotation):
        tmp_annotations = copy.deepcopy(annotation)
        for item in tmp_annotations:
            if item in ["tags", "shapes", "tracks"]:
                for index_elem, _ in enumerate(tmp_annotations[item]):
                    tmp_annotations[item][index_elem]["label_id"] = task["labels"][0]["id"]

                    for index_attribute, attribute in enumerate(task["labels"][0]["attributes"]):
                        spec_id = task["labels"][0]["attributes"][index_attribute]["id"]

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
        return tmp_annotations

    def _get_jobs(self, task_id):
        with ForceLogin(self.admin, self.client):
            response = self.client.get("/api/tasks/{}/jobs".format(task_id))
        return response.data

    def _get_request(self, path, user):
        with ForceLogin(user, self.client):
            response = self.client.get(path)
        return response

    def _get_request_with_data(self, path, data, user):
        with ForceLogin(user, self.client):
            response = self.client.get(path, data)
        return response

    def _delete_request(self, path, user):
        with ForceLogin(user, self.client):
            response = self.client.delete(path)
        return response

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

    def _generate_url_dump_tasks_annotations(self, task_id):
        return f"/api/tasks/{task_id}/annotations"

    def _generate_url_upload_tasks_annotations(self, task_id, upload_format_name):
        return f"/api/tasks/{task_id}/annotations?format={upload_format_name}"

    def _generate_url_dump_job_annotations(self, job_id):
        return f"/api/jobs/{job_id}/annotations"

    def _generate_url_upload_job_annotations(self, job_id, upload_format_name):
        return f"/api/jobs/{job_id}/annotations?format={upload_format_name}"

    def _generate_url_dump_dataset(self, task_id):
        return f"/api/tasks/{task_id}/dataset"

    def _remove_annotations(self, tid):
        response = self._delete_request(f"/api/tasks/{tid}/annotations", self.admin)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        return response

    def _put_request_with_data(self, url, data, user):
        with ForceLogin(user, self.client):
            response = self.client.put(url, data)
        return response

    def _delete_task(self, tid):
        response = self._delete_request('/api/tasks/{}'.format(tid), self.admin)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        return response

    def _check_dump_content(self, content, task_data, format_name, related_files=True):
        def etree_to_dict(t):
            d = {t.tag: {} if t.attrib else None}
            children = list(t)
            if children:
                dd = defaultdict(list)
                for dc in map(etree_to_dict, children):
                    for k, v in dc.items():
                        dd[k].append(v)
                d = {t.tag: {k: v[0] if len(v) == 1 else v
                             for k, v in dd.items()}}
            if t.attrib:
                d[t.tag].update(('@' + k, v)
                                for k, v in t.attrib.items())
            if t.text:
                text = t.text.strip()
                if children or t.attrib:
                    if text:
                        d[t.tag]['#text'] = text
                else:
                    d[t.tag] = text
            return d
        if format_name == "Kitti Raw Format 1.0":
            with tempfile.TemporaryDirectory() as tmp_dir:
                zipfile.ZipFile(content).extractall(tmp_dir)
                xmls = glob(osp.join(tmp_dir, '**', '*.xml'), recursive=True)
                self.assertTrue(xmls)
                for xml in xmls:
                    xmlroot = ET.parse(xml).getroot()
                    self.assertEqual(xmlroot.tag, "boost_serialization")
                    items = xmlroot.findall("./tracklets/item")
                    self.assertEqual(len(items), len(task_data["shapes"]))
        elif format_name == "Sly Point Cloud Format 1.0":
            with tempfile.TemporaryDirectory() as tmp_dir:
                checking_files = [osp.join(tmp_dir, "key_id_map.json"),
                                  osp.join(tmp_dir, "meta.json"),
                                  osp.join(tmp_dir, "ds0", "ann", "000001.pcd.json"),
                                  osp.join(tmp_dir, "ds0", "ann", "000002.pcd.json"),
                                  osp.join(tmp_dir, "ds0", "ann","000003.pcd.json")]
                if related_files:
                    checking_files.extend([osp.join(tmp_dir, "ds0", "related_images", "000001.pcd_pcd", "000001.png.json"),
                                  osp.join(tmp_dir, "ds0", "related_images", "000002.pcd_pcd", "000002.png.json"),
                                  osp.join(tmp_dir, "ds0", "related_images", "000003.pcd_pcd", "000003.png.json")])
                zipfile.ZipFile(content).extractall(tmp_dir)
                jsons = glob(osp.join(tmp_dir, '**', '*.json'), recursive=True)
                self.assertTrue(jsons)
                self.assertTrue(set(checking_files).issubset(set(jsons)))


class Task3DTest(_DbTestBase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.format_names = ["Sly Point Cloud Format 1.0", "Kitti Raw Format 1.0"]
        cls._image_sizes = {}
        cls.pointcloud_pcd_filename = "test_canvas3d.zip"
        cls.pointcloud_pcd_path = osp.join(os.path.dirname(__file__), 'assets', cls.pointcloud_pcd_filename)
        image_sizes = []
        zip_file = zipfile.ZipFile(cls.pointcloud_pcd_path )
        for info in zip_file.namelist():
            if info.rsplit(".", maxsplit=1)[-1] == "pcd":
                with zip_file.open(info, "r") as file:
                    data = ValidateDimension.get_pcd_properties(file)
                    image_sizes.append((int(data["WIDTH"]), int(data["HEIGHT"])))
        cls.task = {
            "name": "main task",
            "owner_id": 2,
            "assignee_id": 2,
            "overlap": 0,
            "segment_size": 100,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }
        cls.task_with_attributes = {
            "name": "task with attributes",
            "owner_id": 2,
            "assignee_id": 2,
            "overlap": 0,
            "segment_size": 100,
            "labels": [
                {"name": "car",
                 "color": "#2080c0",
                 "attributes": [
                     {
                         "name": "radio_name",
                         "mutable": False,
                         "input_type": "radio",
                         "default_value": "x1",
                         "values": ["x1", "x2", "x3"]
                     },
                     {
                         "name": "check_name",
                         "mutable": True,
                         "input_type": "checkbox",
                         "default_value": "false",
                         "values": ["false"]
                     },
                     {
                         "name": "text_name",
                         "mutable": False,
                         "input_type": "text",
                         "default_value": "qwerty",
                         "values": ["qwerty"]
                     },
                     {
                         "name": "number_name",
                         "mutable": False,
                         "input_type": "number",
                         "default_value": "-4.0",
                         "values": ["-4", "4", "1"]
                     }
                 ]
                 },
                {"name": "person",
                 "color": "#c06060",
                 "attributes": []
                 },
            ]
        }
        cls.task_many_jobs = {
            "name": "task several jobs",
            "owner_id": 2,
            "assignee_id": 2,
            "overlap": 3,
            "segment_size": 1,
            "labels": [
                {
                    "name": "car",
                    "color": "#c06060",
                    "id": 1,
                    "attributes": []
                }
            ]
        }
        cls.cuboid_example = {
            "version": 0,
            "tags": [],
            "shapes": [
                {
                    "type": "cuboid",
                    "occluded": False,
                    "z_order": 0,
                    "points": [0.16, 0.20, -0.26, 0, -0.14, 0, 4.84, 4.48, 4.12, 0, 0, 0, 0, 0, 0, 0],
                    "rotation": 0,
                    "frame": 0,
                    "label_id": None,
                    "group": 0,
                    "source": "manual",
                    "attributes": []
                },
            ],
            "tracks": []
        }
        cls._image_sizes[cls.pointcloud_pcd_filename] = image_sizes
        cls.expected_action = {
            cls.admin: {'name': 'admin', 'code': status.HTTP_200_OK, 'annotation_changed': True},
            cls.user: {'name': 'user', 'code': status.HTTP_200_OK, 'annotation_changed': True},
            None: {'name': 'none', 'code': status.HTTP_401_UNAUTHORIZED, 'annotation_changed': False},
        }
        cls.expected_dump_upload = {
            cls.admin: {'name': 'admin', 'code': status.HTTP_200_OK, 'create code': status.HTTP_201_CREATED,
                         'accept code': status.HTTP_202_ACCEPTED, 'file_exists': True, 'annotation_loaded': True},
            cls.user: {'name': 'user', 'code': status.HTTP_200_OK, 'create code': status.HTTP_201_CREATED,
                        'accept code': status.HTTP_202_ACCEPTED, 'file_exists': True, 'annotation_loaded': True},
            None: {'name': 'none', 'code': status.HTTP_401_UNAUTHORIZED, 'create code': status.HTTP_401_UNAUTHORIZED,
                   'accept code': status.HTTP_401_UNAUTHORIZED, 'file_exists': False, 'annotation_loaded': False},
        }

    def copy_pcd_file_and_get_task_data(self, test_dir):
        tmp_file = osp.join(test_dir, self.pointcloud_pcd_filename)
        copyfile(self.pointcloud_pcd_path, tmp_file)
        task_data = {
            "client_files[0]": open(tmp_file, 'rb'),
            "image_quality": 100,
        }
        return task_data

    def test_api_v2_create_annotation_in_job(self):
        with TestDir() as test_dir:
            task_data = self.copy_pcd_file_and_get_task_data(test_dir)
            task = self._create_task(self.task, task_data)
            task_id = task["id"]
            annotation = self._get_tmp_annotation(task, self.cuboid_example)
            for user, edata in list(self.expected_action.items()):
                with self.subTest(format=edata["name"]):
                    response = self._patch_api_v2_task_id_annotations(task_id, annotation, CREATE_ACTION, user)
                    self.assertEqual(response.status_code, edata["code"])
                    if edata["annotation_changed"]:
                        task_ann = TaskAnnotation(task_id)
                        task_ann.init_from_db()
                        task_shape = task_ann.data["shapes"][0]
                        task_shape.pop("id")
                        self.assertEqual(task_shape, annotation["shapes"][0])
                        self._remove_annotations(task_id)

    def test_api_v2_update_annotation_in_task(self):
        with TestDir() as test_dir:
            task_data = self.copy_pcd_file_and_get_task_data(test_dir)
            task = self._create_task(self.task, task_data)
            task_id = task["id"]
            annotation = self._get_tmp_annotation(task, self.cuboid_example)
            response = self._put_api_v2_task_id_annotations(task_id, annotation)
            self.assertEqual(response.status_code, status.HTTP_200_OK)

            for user, edata in list(self.expected_action.items()):
                with self.subTest(format=edata["name"]):
                    task_ann_prev = TaskAnnotation(task_id)
                    task_ann_prev.init_from_db()
                    annotation["shapes"][0]["points"] = [x + 0.1 for x in annotation["shapes"][0]["points"]]
                    annotation["shapes"][0]["id"] = task_ann_prev.data["shapes"][0]["id"]
                    response = self._patch_api_v2_task_id_annotations(task_id, annotation, UPDATE_ACTION, user)
                    self.assertEqual(response.status_code, edata["code"], task_id)

                    if edata["annotation_changed"]:
                        task_ann = TaskAnnotation(task_id)
                        task_ann.init_from_db()
                        self.assertEqual(task_ann.data["shapes"], annotation["shapes"])

    def test_api_v2_remove_annotation_in_task(self):
        with TestDir() as test_dir:
            task_data = self.copy_pcd_file_and_get_task_data(test_dir)
            task = self._create_task(self.task, task_data)
            task_id = task["id"]
            annotation = self._get_tmp_annotation(task, self.cuboid_example)

            for user, edata in list(self.expected_action.items()):
                with self.subTest(format=edata["name"]):
                    response = self._patch_api_v2_task_id_annotations(task_id, annotation, CREATE_ACTION, self.admin)
                    self.assertEqual(response.status_code, status.HTTP_200_OK)
                    task_ann_prev = TaskAnnotation(task_id)
                    task_ann_prev.init_from_db()
                    annotation["shapes"][0]["id"] = task_ann_prev.data["shapes"][0]["id"]

                    response = self._patch_api_v2_task_id_annotations(task_id, annotation, DELETE_ACTION, user)
                    self.assertEqual(response.status_code, edata["code"])

                    if edata["annotation_changed"]:
                        task_ann = TaskAnnotation(task_id)
                        task_ann.init_from_db()
                        self.assertTrue(len(task_ann.data["shapes"]) == 0)

    def test_api_v2_create_annotation_in_jobs(self):
        with TestDir() as test_dir:
            task_data = self.copy_pcd_file_and_get_task_data(test_dir)
            task = self._create_task(self.task, task_data)
            task_id = task["id"]
            annotation = self._get_tmp_annotation(task, self.cuboid_example)
            jobs = self._get_jobs(task_id)
            for user, edata in list(self.expected_action.items()):
                with self.subTest(format=edata["name"]):
                    response = self._patch_api_v2_job_id_annotations(jobs[0]["id"], annotation, CREATE_ACTION, user)
                    self.assertEqual(response.status_code, edata["code"])

                    task_ann = TaskAnnotation(task_id)
                    task_ann.init_from_db()
                    if len(task_ann.data["shapes"]):
                        task_shape = task_ann.data["shapes"][0]
                        task_shape.pop("id")
                        self.assertEqual(task_shape, annotation["shapes"][0])
                        self._remove_annotations(task_id)

    def test_api_v2_update_annotation_in_job(self):
        with TestDir() as test_dir:
            task_data = self.copy_pcd_file_and_get_task_data(test_dir)
            task = self._create_task(self.task, task_data)
            task_id = task["id"]
            jobs = self._get_jobs(task_id)
            annotation = self._get_tmp_annotation(task, self.cuboid_example)

            response = self._put_api_v2_task_id_annotations(task_id, annotation)
            self.assertEqual(response.status_code, status.HTTP_200_OK)

            for user, edata in list(self.expected_action.items()):
                with self.subTest(format=edata["name"]):
                    task_ann_prev = TaskAnnotation(task_id)
                    task_ann_prev.init_from_db()

                    annotation["shapes"][0]["points"] = [x + 0.1 for x in annotation["shapes"][0]["points"]]
                    annotation["shapes"][0]["id"] = task_ann_prev.data["shapes"][0]["id"]

                    response = self._patch_api_v2_job_id_annotations(jobs[0]["id"], annotation, UPDATE_ACTION, user)
                    self.assertEqual(response.status_code, edata["code"])

                    if edata["annotation_changed"]:
                        task_ann = TaskAnnotation(task_id)
                        task_ann.init_from_db()
                        self.assertEqual(task_ann.data["shapes"], annotation["shapes"])

    def test_api_v2_remove_annotation_in_job(self):
        with TestDir() as test_dir:
            task_data = self.copy_pcd_file_and_get_task_data(test_dir)
            task = self._create_task(self.task, task_data)
            task_id = task["id"]
            jobs = self._get_jobs(task_id)
            annotation = self._get_tmp_annotation(task, self.cuboid_example)

            for user, edata in list(self.expected_action.items()):
                with self.subTest(format=edata["name"]):
                    response = self._patch_api_v2_job_id_annotations(jobs[0]["id"], annotation, CREATE_ACTION, self.admin)
                    self.assertEqual(response.status_code, status.HTTP_200_OK)

                    task_ann_prev = TaskAnnotation(task_id)
                    task_ann_prev.init_from_db()
                    annotation["shapes"][0]["id"] = task_ann_prev.data["shapes"][0]["id"]
                    response = self._patch_api_v2_job_id_annotations(jobs[0]["id"], annotation, DELETE_ACTION, user)
                    self.assertEqual(response.status_code, edata["code"])

                    if edata["annotation_changed"]:
                        task_ann = TaskAnnotation(task_id)
                        task_ann.init_from_db()
                        self.assertTrue(len(task_ann.data["shapes"]) == 0)

    def test_api_v2_dump_and_upload_annotation(self):
        with TestDir() as test_dir:
            task_data = self.copy_pcd_file_and_get_task_data(test_dir)
            task = self._create_task(self.task, task_data)
            task_id = task["id"]

            for format_name in self.format_names:
                annotation = self._get_tmp_annotation(task, self.cuboid_example)
                response = self._put_api_v2_task_id_annotations(task_id, annotation)
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                task_ann_prev = TaskAnnotation(task_id)
                task_ann_prev.init_from_db()

                for user, edata in list(self.expected_dump_upload.items()):
                    with self.subTest(format=f"{format_name}_{edata['name']}_dump"):
                        url = self._generate_url_dump_tasks_annotations(task_id)
                        file_name = osp.join(test_dir, f"{format_name}_{edata['name']}.zip")

                        data = {
                            "format": format_name,
                        }
                        response = self._get_request_with_data(url, data, user)
                        self.assertEqual(response.status_code, edata['accept code'])
                        response = self._get_request_with_data(url, data, user)
                        self.assertEqual(response.status_code, edata['create code'])
                        data = {
                            "format": format_name,
                            "action": "download",
                        }
                        response = self._get_request_with_data(url, data, user)
                        self.assertEqual(response.status_code, edata['code'])
                        if response.status_code == status.HTTP_200_OK:
                            content = io.BytesIO(b"".join(response.streaming_content))
                            with open(file_name, "wb") as f:
                                f.write(content.getvalue())
                            self._check_dump_content(content, task_ann_prev.data, format_name, related_files=False)
                        self.assertEqual(osp.exists(file_name), edata['file_exists'])

                self._remove_annotations(task_id)
                with self.subTest(format=f"{format_name}_upload"):
                    file_name = osp.join(test_dir, f"{format_name}_admin.zip")
                    url = self._generate_url_upload_tasks_annotations(task_id, format_name)

                    with open(file_name, 'rb') as binary_file:
                        self._upload_file(url, binary_file, self.admin)
                    task_ann = TaskAnnotation(task_id)
                    task_ann.init_from_db()

                    task_ann_prev.data["shapes"][0].pop("id")
                    task_ann.data["shapes"][0].pop("id")
                    self.assertEqual(len(task_ann_prev.data["shapes"]), len(task_ann.data["shapes"]))
                    self.assertEqual(task_ann_prev.data["shapes"], task_ann.data["shapes"])

    def test_api_v2_rewrite_annotation(self):
        with TestDir() as test_dir:
            task_data = self.copy_pcd_file_and_get_task_data(test_dir)
            task = self._create_task(self.task, task_data)
            task_id = task["id"]
            for format_name in self.format_names:
                with self.subTest(format=f"{format_name}"):
                    annotation = self._get_tmp_annotation(task, self.cuboid_example)
                    response = self._put_api_v2_task_id_annotations(task_id, annotation)
                    self.assertEqual(response.status_code, status.HTTP_200_OK)
                    task_ann_prev = TaskAnnotation(task_id)
                    task_ann_prev.init_from_db()
                    url = self._generate_url_dump_tasks_annotations(task_id)
                    file_name = osp.join(test_dir, f"{format_name}.zip")
                    data = {
                        "format": format_name,
                        "action": "download",
                    }
                    self._download_file(url, data, self.admin, file_name)
                    self.assertTrue(osp.exists(file_name))

                    self._remove_annotations(task_id)
                    # rewrite annotation
                    annotation_copy = copy.deepcopy(annotation)
                    annotation_copy["shapes"][0]["points"] = [0] * 16
                    response = self._put_api_v2_task_id_annotations(task_id, annotation_copy)
                    self.assertEqual(response.status_code, status.HTTP_200_OK)

                    file_name = osp.join(test_dir, f"{format_name}.zip")
                    url = self._generate_url_upload_tasks_annotations(task_id, format_name)

                    with open(file_name, 'rb') as binary_file:
                        self._upload_file(url, binary_file, self.admin)
                    task_ann = TaskAnnotation(task_id)
                    task_ann.init_from_db()

                    task_ann_prev.data["shapes"][0].pop("id")
                    task_ann.data["shapes"][0].pop("id")
                    self.assertEqual(len(task_ann_prev.data["shapes"]), len(task_ann.data["shapes"]))
                    self.assertEqual(task_ann_prev.data["shapes"], task_ann.data["shapes"])

    def test_api_v2_dump_and_upload_empty_annotation(self):
        with TestDir() as test_dir:
            task_data = self.copy_pcd_file_and_get_task_data(test_dir)
            task = self._create_task(self.task, task_data)
            task_id = task["id"]
            task_ann_prev = TaskAnnotation(task_id)
            task_ann_prev.init_from_db()

            for format_name in self.format_names:
                with self.subTest(format=f"{format_name}"):
                    url = self._generate_url_dump_tasks_annotations(task_id)
                    file_name = osp.join(test_dir, f"{format_name}.zip")
                    data = {
                        "format": format_name,
                        "action": "download",
                    }
                    self._download_file(url, data, self.admin, file_name)
                    self.assertTrue(osp.exists(file_name))

                    file_name = osp.join(test_dir, f"{format_name}.zip")
                    url = self._generate_url_upload_tasks_annotations(task_id, format_name)

                    with open(file_name, 'rb') as binary_file:
                        self._upload_file(url, binary_file, self.admin)

                    task_ann = TaskAnnotation(task_id)
                    task_ann.init_from_db()

                    self.assertEqual(len(task_ann.data["shapes"]), 0)
                    self.assertEqual(task_ann_prev.data["shapes"], task_ann.data["shapes"])

    def test_api_v2_dump_and_upload_several_jobs(self):
        job_test_cases = ["first", "all"]
        with TestDir() as test_dir:
            task_data = self.copy_pcd_file_and_get_task_data(test_dir)
            task = self._create_task(self.task_many_jobs, task_data)
            task_id = task["id"]
            annotation = self._get_tmp_annotation(task, self.cuboid_example)

            for format_name, job_test_case in itertools.product(self.format_names, job_test_cases):
                with self.subTest(format=f"{format_name}_{job_test_case}"):
                    jobs = self._get_jobs(task_id)
                    if job_test_case == "all":
                        for job in jobs:
                            response = self._put_api_v2_job_id_annotations(job["id"], annotation)
                            self.assertEqual(response.status_code, status.HTTP_200_OK)
                    else:
                        response = self._put_api_v2_job_id_annotations(jobs[1]["id"], annotation)
                        self.assertEqual(response.status_code, status.HTTP_200_OK)
                    task_ann_prev = TaskAnnotation(task_id)
                    task_ann_prev.init_from_db()
                    url = self._generate_url_dump_tasks_annotations(task_id)
                    file_name = osp.join(test_dir, f"{format_name}.zip")
                    data = {
                        "format": format_name,
                        "action": "download",
                    }
                    self._download_file(url, data, self.admin, file_name)

                    self._remove_annotations(task_id)

    def test_api_v2_upload_annotation_with_attributes(self):
        with TestDir() as test_dir:
            task_data = self.copy_pcd_file_and_get_task_data(test_dir)
            task = self._create_task(self.task_with_attributes, task_data)
            task_id = task["id"]

            for format_name in self.format_names:
                annotation = self._get_tmp_annotation(task, self.cuboid_example)
                response = self._put_api_v2_task_id_annotations(task_id, annotation)
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                task_ann_prev = TaskAnnotation(task_id)
                task_ann_prev.init_from_db()

                with self.subTest(format=f"{format_name}_dump"):
                    url = self._generate_url_dump_tasks_annotations(task_id)
                    file_name = osp.join(test_dir, f"{format_name}.zip")
                    data = {
                        "format": format_name,
                        "action": "download",
                    }
                    self._download_file(url, data, self.admin, file_name)
                    self.assertTrue(osp.exists(file_name))

                self._remove_annotations(task_id)
                with self.subTest(format=f"{format_name}_upload"):
                    file_name = osp.join(test_dir, f"{format_name}.zip")
                    url = self._generate_url_upload_tasks_annotations(task_id, format_name)

                    with open(file_name, 'rb') as binary_file:
                        self._upload_file(url, binary_file, self.admin)
                    task_ann = TaskAnnotation(task_id)
                    task_ann.init_from_db()

                    task_ann_prev.data["shapes"][0].pop("id")
                    task_ann.data["shapes"][0].pop("id")
                    self.assertEqual(task_ann_prev.data["shapes"][0]["attributes"],
                                     task_ann.data["shapes"][0]["attributes"])

    def test_api_v2_export_dataset(self):
        with TestDir() as test_dir:
            task_data = self.copy_pcd_file_and_get_task_data(test_dir)
            task = self._create_task(self.task, task_data)
            task_id = task["id"]

            for format_name in self.format_names:
                annotation = self._get_tmp_annotation(task, self.cuboid_example)
                response = self._put_api_v2_task_id_annotations(task_id, annotation)
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                task_ann_prev = TaskAnnotation(task_id)
                task_ann_prev.init_from_db()

                for user, edata in list(self.expected_dump_upload.items()):
                    with self.subTest(format=f"{format_name}_{edata['name']}_export"):
                        url = self._generate_url_dump_dataset(task_id)
                        file_name = osp.join(test_dir, f"{format_name}_{edata['name']}.zip")

                        data = {
                            "format": format_name,
                        }
                        response = self._get_request_with_data(url, data, user)
                        self.assertEqual(response.status_code, edata['accept code'])
                        response = self._get_request_with_data(url, data, user)
                        self.assertEqual(response.status_code, edata['create code'])
                        data = {
                            "format": format_name,
                            "action": "download",
                        }
                        response = self._get_request_with_data(url, data, user)
                        self.assertEqual(response.status_code, edata['code'])
                        if response.status_code == status.HTTP_200_OK:
                            content = io.BytesIO(b"".join(response.streaming_content))
                            with open(file_name, "wb") as f:
                                f.write(content.getvalue())
                        self.assertEqual(osp.exists(file_name), edata['file_exists'])
                        self._check_dump_content(content, task_ann_prev.data, format_name,related_files=False)

