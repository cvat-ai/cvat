
# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT


from io import BytesIO
import os.path as osp
import tempfile
import zipfile
from unittest import skip
import copy
import json
import random
import xml.etree.ElementTree as ET

import datumaro
from datumaro.util.test_utils import compare_datasets
from PIL import Image
from django.contrib.auth.models import User, Group
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

import cvat.apps.dataset_manager as dm
from cvat.apps.dataset_manager.annotation import AnnotationIR
from cvat.apps.dataset_manager.bindings import TaskData, find_dataset_root, CvatTaskDataExtractor
from cvat.apps.dataset_manager.task import TaskAnnotation
from cvat.apps.engine.models import Task

path = osp.join(osp.dirname(__file__), 'assets', 'tasks.json')
with open(path) as f:
    tasks = json.load(f)

path = osp.join(osp.dirname(__file__), 'assets', 'annotations.json')
with open(path) as f:
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

    def _put_api_v1_job_id_annotations(self, jid, data):
        with ForceLogin(self.admin, self.client):
            response = self.client.put("/api/v1/jobs/%s/annotations" % jid,
                data=data, format="json")

        return response

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
                        elif key_get_values == "dafault":
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
        for _ in range(5):
            response = self._get_request_with_data(url, data, user)
            if response.status_code == 200:
                content = BytesIO(b"".join(response.streaming_content))
                with open(file_name, "wb") as f:
                    f.write(content.getvalue())
                break
        return response

    def _upload_file(self, url, binary_file, user):
        with ForceLogin(user, self.client):
            for _ in range(5):
                response = self.client.put(url, {"annotation_file": binary_file})
                if response.status_code == 202:
                    break
            return response

    def _check_downloaded_file(self, file_name):
        if not osp.exists(file_name):
            raise FileNotFoundError(f"File '{file_name}' was not downloaded")

class TaskExportTest(_DbTestBase):
    def _generate_custom_annotations(self, annotations, task):
        self._put_api_v1_task_id_annotations(task["id"], annotations)
        return annotations

    def _generate_annotations(self, task):
        annotations = {
            "version": 0,
            "tags": [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "attributes": []
                }
            ],
            "shapes": [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "source": "manual",
                    "attributes": [
                        {
                            "spec_id": task["labels"][0]["attributes"][0]["id"],
                            "value": task["labels"][0]["attributes"][0]["values"][0]
                        },
                        {
                            "spec_id": task["labels"][0]["attributes"][1]["id"],
                            "value": task["labels"][0]["attributes"][1]["default_value"]
                        }
                    ],
                    "points": [1.0, 2.1, 100, 300.222],
                    "type": "rectangle",
                    "occluded": False
                },
                {
                    "frame": 1,
                    "label_id": task["labels"][1]["id"],
                    "group": None,
                    "source": "manual",
                    "attributes": [],
                    "points": [2.0, 2.1, 100, 300.222, 400, 500, 1, 3],
                    "type": "polygon",
                    "occluded": False
                },
                {
                    "frame": 1,
                    "label_id": task["labels"][0]["id"],
                    "group": 1,
                    "source": "manual",
                    "attributes": [],
                    "points": [100, 300.222, 400, 500, 1, 3],
                    "type": "points",
                    "occluded": False
                },
                {
                    "frame": 1,
                    "label_id": task["labels"][0]["id"],
                    "group": 1,
                    "source": "manual",
                    "attributes": [],
                    "points": [2.0, 2.1, 400, 500, 1, 3],
                    "type": "polyline",
                    "occluded": False
                },
            ],
            "tracks": [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "source": "manual",
                    "attributes": [
                        {
                            "spec_id": task["labels"][0]["attributes"][0]["id"],
                            "value": task["labels"][0]["attributes"][0]["values"][0]
                        },
                    ],
                    "shapes": [
                        {
                            "frame": 0,
                            "points": [1.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": False,
                            "outside": False,
                            "attributes": [
                                {
                                    "spec_id": task["labels"][0]["attributes"][1]["id"],
                                    "value": task["labels"][0]["attributes"][1]["default_value"]
                                }
                            ]
                        },
                        {
                            "frame": 1,
                            "attributes": [],
                            "points": [2.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": True,
                            "outside": True
                        },
                    ]
                },
                {
                    "frame": 1,
                    "label_id": task["labels"][1]["id"],
                    "group": None,
                    "source": "manual",
                    "attributes": [],
                    "shapes": [
                        {
                            "frame": 1,
                            "attributes": [],
                            "points": [1.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": False,
                            "outside": False
                        }
                    ]
                },
            ]
        }
        return self._generate_custom_annotations(annotations, task)

    def _generate_task_images(self, count): # pylint: disable=no-self-use
        images = {
            "client_files[%d]" % i: generate_image_file("image_%d.jpg" % i)
            for i in range(count)
        }
        images["image_quality"] = 75
        return images

    def _generate_task(self, images, **overrides):
        task = {
            "name": "my task #1",
            "overlap": 0,
            "segment_size": 100,
            "labels": [
                {
                    "name": "car",
                    "attributes": [
                        {
                            "name": "model",
                            "mutable": False,
                            "input_type": "select",
                            "default_value": "mazda",
                            "values": ["bmw", "mazda", "renault"]
                        },
                        {
                            "name": "parked",
                            "mutable": True,
                            "input_type": "checkbox",
                            "default_value": False
                        },
                    ]
                },
                {"name": "person"},
            ]
        }
        task.update(overrides)
        return self._create_task(task, images)

    @staticmethod
    def _test_export(check, task, format_name, **export_args):
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = osp.join(temp_dir, format_name)
            dm.task.export_task(task["id"], file_path,
                format_name, **export_args)

            check(file_path)

    def test_export_formats_query(self):
        formats = dm.views.get_export_formats()

        self.assertEqual({f.DISPLAY_NAME for f in formats},
        {
            'COCO 1.0',
            'CVAT for images 1.1',
            'CVAT for video 1.1',
            'Datumaro 1.0',
            'LabelMe 3.0',
            'MOT 1.1',
            'MOTS PNG 1.0',
            'PASCAL VOC 1.1',
            'Segmentation mask 1.1',
            'TFRecord 1.0',
            'YOLO 1.1',
            'ImageNet 1.0',
            'CamVid 1.0',
            'WiderFace 1.0',
            'VGGFace2 1.0',
        })

    def test_import_formats_query(self):
        formats = dm.views.get_import_formats()

        self.assertEqual({f.DISPLAY_NAME for f in formats},
        {
            'COCO 1.0',
            'CVAT 1.1',
            'LabelMe 3.0',
            'MOT 1.1',
            'MOTS PNG 1.0',
            'PASCAL VOC 1.1',
            'Segmentation mask 1.1',
            'TFRecord 1.0',
            'YOLO 1.1',
            'ImageNet 1.0',
            'CamVid 1.0',
            'WiderFace 1.0',
            'VGGFace2 1.0',
        })

    def test_exports(self):
        def check(file_path):
            with open(file_path, 'rb') as f:
                self.assertTrue(len(f.read()) != 0)

        for f in dm.views.get_export_formats():
            if not f.ENABLED:
                self.skipTest("Format is disabled")

            format_name = f.DISPLAY_NAME
            if format_name == "VGGFace2 1.0":
                self.skipTest("Format does not support multiple shapes for one item")

            for save_images in { True, False }:
                images = self._generate_task_images(3)
                task = self._generate_task(images)
                self._generate_annotations(task)
                with self.subTest(format=format_name, save_images=save_images):
                    self._test_export(check, task,
                        format_name, save_images=save_images)

    def test_empty_images_are_exported(self):
        dm_env = dm.formats.registry.dm_env

        for format_name, importer_name in [
            ('COCO 1.0', 'coco'),
            ('CVAT for images 1.1', 'cvat'),
            # ('CVAT for video 1.1', 'cvat'), # does not support
            ('Datumaro 1.0', 'datumaro_project'),
            ('LabelMe 3.0', 'label_me'),
            # ('MOT 1.1', 'mot_seq'), # does not support
            # ('MOTS PNG 1.0', 'mots_png'), # does not support
            ('PASCAL VOC 1.1', 'voc'),
            ('Segmentation mask 1.1', 'voc'),
            ('TFRecord 1.0', 'tf_detection_api'),
            ('YOLO 1.1', 'yolo'),
            ('ImageNet 1.0', 'imagenet_txt'),
            ('CamVid 1.0', 'camvid'),
            ('WiderFace 1.0', 'wider_face'),
            ('VGGFace2 1.0', 'vgg_face2'),
        ]:
            with self.subTest(format=format_name):
                if not dm.formats.registry.EXPORT_FORMATS[format_name].ENABLED:
                    self.skipTest("Format is disabled")

                images = self._generate_task_images(3)
                task = self._generate_task(images)

                def check(file_path):
                    def load_dataset(src):
                        if importer_name == 'datumaro_project':
                            project = datumaro.components.project. \
                                Project.load(src)

                            # NOTE: can't import cvat.utils.cli
                            # for whatever reason, so remove the dependency
                            #
                            project.config.remove('sources')

                            return project.make_dataset()
                        return datumaro.components.dataset. \
                            Dataset.import_from(src, importer_name, env=dm_env)

                    if zipfile.is_zipfile(file_path):
                        with tempfile.TemporaryDirectory() as tmp_dir:
                            zipfile.ZipFile(file_path).extractall(tmp_dir)
                            dataset = load_dataset(tmp_dir)
                            self.assertEqual(len(dataset), task["size"])
                    else:
                        dataset = load_dataset(file_path)
                        self.assertEqual(len(dataset), task["size"])

                self._test_export(check, task, format_name, save_images=False)

    def test_can_skip_outside(self):
        images = self._generate_task_images(3)
        task = self._generate_task(images)
        self._generate_annotations(task)
        task_ann = TaskAnnotation(task["id"])
        task_ann.init_from_db()
        task_data = TaskData(task_ann.ir_data, Task.objects.get(pk=task["id"]))

        extractor = CvatTaskDataExtractor(task_data)
        dm_dataset = datumaro.components.project.Dataset.from_extractors(extractor)
        self.assertEqual(4, len(dm_dataset.get("image_1").annotations))

    def test_no_outside_shapes_in_per_frame_export(self):
        images = self._generate_task_images(3)
        task = self._generate_task(images)
        self._generate_annotations(task)
        task_ann = TaskAnnotation(task["id"])
        task_ann.init_from_db()
        task_data = TaskData(task_ann.ir_data, Task.objects.get(pk=task["id"]))

        outside_count = 0
        for f in task_data.group_by_frame(include_empty=True):
            for ann in f.labeled_shapes:
                if getattr(ann, 'outside', None):
                    outside_count += 1
        self.assertEqual(0, outside_count)

    def test_cant_make_rel_frame_id_from_unknown(self):
        images = self._generate_task_images(3)
        images['frame_filter'] = 'step=2'
        task = self._generate_task(images)
        task_data = TaskData(AnnotationIR(), Task.objects.get(pk=task['id']))

        with self.assertRaisesRegex(ValueError, r'Unknown'):
            task_data.rel_frame_id(1) # the task has only 0 and 2 frames

    def test_can_make_rel_frame_id_from_known(self):
        images = self._generate_task_images(6)
        images['frame_filter'] = 'step=2'
        images['start_frame'] = 1
        task = self._generate_task(images)
        task_data = TaskData(AnnotationIR(), Task.objects.get(pk=task['id']))

        self.assertEqual(2, task_data.rel_frame_id(5))

    def test_cant_make_abs_frame_id_from_unknown(self):
        images = self._generate_task_images(3)
        images['frame_filter'] = 'step=2'
        task = self._generate_task(images)
        task_data = TaskData(AnnotationIR(), Task.objects.get(pk=task['id']))

        with self.assertRaisesRegex(ValueError, r'Unknown'):
            task_data.abs_frame_id(2) # the task has only 0 and 1 indices

    def test_can_make_abs_frame_id_from_known(self):
        images = self._generate_task_images(6)
        images['frame_filter'] = 'step=2'
        images['start_frame'] = 1
        task = self._generate_task(images)
        task_data = TaskData(AnnotationIR(), Task.objects.get(pk=task['id']))

        self.assertEqual(5, task_data.abs_frame_id(2))

    def test_frames_outside_are_not_generated(self):
        # https://github.com/openvinotoolkit/cvat/issues/2827
        images = self._generate_task_images(10)
        images['start_frame'] = 0
        task = self._generate_task(images, overlap=3, segment_size=6)
        annotations = {
            "version": 0,
            "tags": [],
            "shapes": [],
            "tracks": [
                {
                    "frame": 6,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "source": "manual",
                    "attributes": [],
                    "shapes": [
                        {
                            "frame": 6,
                            "points": [1.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": False,
                            "outside": False,
                            "attributes": [],
                        },
                    ]
                },
            ]
        }
        self._put_api_v1_job_id_annotations(
            task["segments"][2]["jobs"][0]["id"], annotations)

        task_ann = TaskAnnotation(task["id"])
        task_ann.init_from_db()
        task_data = TaskData(task_ann.ir_data, Task.objects.get(pk=task['id']))

        i = -1
        for i, frame in enumerate(task_data.group_by_frame()):
            self.assertTrue(frame.frame in range(6, 10))
        self.assertEqual(i + 1, 4)

    def test_api_v1_tasks_annotations_dump_and_upload_with_datumaro(self):
        test_name = self._testMethodName
        # get formats
        dump_formats = dm.views.get_export_formats()

        for dump_format in dump_formats:
            if dump_format.ENABLED:
                dump_format_name = dump_format.DISPLAY_NAME

                # TODO skip failed formats
                if dump_format_name in [
                    "CamVid 1.0", # issue #2840 and changed points values
                    "CVAT for video 1.1", # issue #2923 and #2924
                    "MOT 1.1", # issue #2925
                    "MOTS PNG 1.0", # issue #2925 and changed points values
                    "Datumaro 1.0", # not uploaded
                    "Segmentation mask 1.1", # changed points values
                    "WiderFace 1.0", # issue #XXX
                ]:
                    continue

                print("dump_format_name:", dump_format_name)

                # create task
                images = self._generate_task_images(3)
                task = self._create_task(tasks["main"], images)

                # create annotations
                if dump_format_name in ["MOT 1.1", "MOTS PNG 1.0", "PASCAL VOC 1.1", "Segmentation mask 1.1", "TFRecord 1.0", "YOLO 1.1", "ImageNet 1.0", "WiderFace 1.0", "VGGFace2 1.0"]:
                    self._create_annotations(task, dump_format_name, "dafault")
                else:
                    self._create_annotations(task, dump_format_name, "random")

                task_id = task["id"]
                task_ann = TaskAnnotation(task_id)
                task_ann.init_from_db()
                task_data = TaskData(task_ann.ir_data, Task.objects.get(pk=task_id))
                extractor = CvatTaskDataExtractor(task_data)
                data_from_task_before_upload = datumaro.components.project.Dataset.from_extractors(extractor)

                # dump annotations
                url = f"/api/v1/tasks/{task_id}/annotations"
                data = {
                    "format": dump_format_name,
                    "action": "download",
                }
                file_zip_name = osp.join(osp.dirname(__file__), 'assets', f'{test_name}_{dump_format_name}.zip')
                self._download_file(url, data, self.admin, file_zip_name)
                self._check_downloaded_file(file_zip_name)

                # remove annotations
                response = self._delete_request(url, self.admin)
                self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

                # upload annotations
                if dump_format_name in ["CVAT for images 1.1", "CVAT for video 1.1"]:
                    upload_format_name = "CVAT 1.1"
                else:
                    upload_format_name = dump_format_name

                url = f"/api/v1/tasks/{task_id}/annotations?format={upload_format_name}"
                with open(file_zip_name, 'rb') as binary_file:
                    response = self._upload_file(url, binary_file, self.admin)
                    self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

                # equals annotations
                task_ann = TaskAnnotation(task_id)
                task_ann.init_from_db()
                task_data = TaskData(task_ann.ir_data, Task.objects.get(pk=task_id))
                extractor = CvatTaskDataExtractor(task_data)
                data_from_task_after_upload = datumaro.components.project.Dataset.from_extractors(extractor)
                compare_datasets(self, data_from_task_before_upload, data_from_task_after_upload)

    def test_api_v1_tasks_annotations_update_wrong_label(self):
        test_name = self._testMethodName
        dump_format_name = "CVAT for images 1.1"
        upload_format_name = "CVAT 1.1"

        # create task with annotations
        images = self._generate_task_images(3)
        task = self._create_task(tasks["main"], images)
        self._create_annotations(task, dump_format_name, "dafault")
        task_id = task["id"]
        task_ann = TaskAnnotation(task_id)
        task_ann.init_from_db()

        # dump annotations
        url = f"/api/v1/tasks/{task_id}/annotations"
        data = {
            "format": dump_format_name,
            "action": "download",
        }
        file_zip_name_before_change = osp.join(osp.dirname(__file__), 'assets', f'{test_name}_{dump_format_name}.zip')
        file_zip_name_after_change = osp.join(osp.dirname(__file__), 'assets', f'{test_name}_{dump_format_name}_wrong_label.zip')

        # download zip file
        self._download_file(url, data, self.admin, file_zip_name_before_change)
        self._check_downloaded_file(file_zip_name_before_change)

        # remove annotations
        response = self._delete_request(url, self.admin)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # extract zip
        folder_name = osp.join(osp.dirname(__file__), 'assets', f'{test_name}_{dump_format_name}')
        with zipfile.ZipFile(file_zip_name_before_change, 'r') as zip_ref:
            zip_ref.extractall(folder_name)

        # change right label to wrong
        wrong_label = "wrong_label"
        tree = ET.parse(osp.join(folder_name, 'annotations.xml'))
        root = tree.getroot()
        element = root.find("./image[@id='0']/box[@label='car']")
        element.attrib["label"] = wrong_label
        tree.write(osp.join(folder_name, 'annotations.xml'))
        with zipfile.ZipFile(file_zip_name_after_change, 'w') as zip_ref:
            zip_ref.write(osp.join(folder_name, 'annotations.xml'), 'annotations.xml')

        # upload annotations
        url_upload = f"/api/v1/tasks/{task_id}/annotations?format={upload_format_name}"
        with open(file_zip_name_after_change, 'rb') as binary_file:
            with self.assertRaises(ValueError) as context:
                response = self._upload_file(url_upload, binary_file, self.admin)
            self.assertTrue(f"Label '{wrong_label}' is not registered for this task" in str(context.exception))

        # check for missing annotations
        response = self._get_request(url, self.admin)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["tags"]), 0)
        self.assertEqual(len(response.data["shapes"]), 0)
        self.assertEqual(len(response.data["tracks"]), 0)

    def test_api_v1_tasks_annotations_update_wrong_value_in_checkbox(self):
        test_name = self._testMethodName
        dump_format_name = "CVAT for images 1.1"
        upload_format_name = "CVAT 1.1"

        # create task with annotations
        images = self._generate_task_images(3)
        task = self._create_task(tasks["main"], images)
        self._create_annotations(task, dump_format_name, "random")
        task_id = task["id"]
        task_ann = TaskAnnotation(task_id)
        task_ann.init_from_db()

        # dump annotations
        url = f"/api/v1/tasks/{task_id}/annotations"
        data = {
            "format": dump_format_name,
            "action": "download",
        }
        file_zip_name_before_change = osp.join(osp.dirname(__file__), 'assets', f'{test_name}_{dump_format_name}.zip')
        file_zip_name_after_change = osp.join(osp.dirname(__file__), 'assets', f'{test_name}_{dump_format_name}_wrong_checkbox_value.zip')

        # download zip file
        self._download_file(url, data, self.admin, file_zip_name_before_change)
        self._check_downloaded_file(file_zip_name_before_change)

        # remove annotations
        response = self._delete_request(url, self.admin)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # extract zip
        folder_name = osp.join(osp.dirname(__file__), 'assets', f'{test_name}_{dump_format_name}')
        with zipfile.ZipFile(file_zip_name_before_change, 'r') as zip_ref:
            zip_ref.extractall(folder_name)

        # change right label to wrong
        wrong_checkbox_value = "wrong_checkbox_value"
        tree = ET.parse(osp.join(folder_name, 'annotations.xml'))
        root = tree.getroot()
        element = root.find("./image[@id='0']/box[@label='car']/attribute[@name='check_name']")
        element.text = wrong_checkbox_value
        tree.write(osp.join(folder_name, 'annotations.xml'))
        with zipfile.ZipFile(file_zip_name_after_change, 'w') as zip_ref:
            zip_ref.write(osp.join(folder_name, 'annotations.xml'), 'annotations.xml')

        # upload annotations
        url_upload = f"/api/v1/tasks/{task_id}/annotations?format={upload_format_name}"
        with open(file_zip_name_after_change, 'rb') as binary_file:
            with self.assertRaises(Exception) as context:
                response = self._upload_file(url_upload, binary_file, self.admin)
            self.assertTrue(f"Failed to convert attribute 'car'='{wrong_checkbox_value}'" in str(context.exception))

        # check for missing annotations
        response = self._get_request(url, self.admin)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["tags"]), 0)
        self.assertEqual(len(response.data["shapes"]), 0)
        self.assertEqual(len(response.data["tracks"]), 0)

    def test_api_v1_tasks_annotations_dump_others_user(self):
        test_name = self._testMethodName
        dump_format_name = "CVAT for images 1.1"

        # create task with annotations
        images = self._generate_task_images(3)
        task = self._create_task(tasks["main"], images)
        self._create_annotations(task, dump_format_name, "random")
        task_id = task["id"]
        task_ann = TaskAnnotation(task_id)
        task_ann.init_from_db()

        # dump annotations
        url = f"/api/v1/tasks/{task_id}/annotations"
        data = {
            "format": dump_format_name,
            "action": "download",
        }

        file_zip_name = osp.join(osp.dirname(__file__), 'assets', f'{test_name}_admin_{dump_format_name}.zip')
        response = self._download_file(url, data, self.admin, file_zip_name)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self._check_downloaded_file(file_zip_name)

        file_zip_name = osp.join(osp.dirname(__file__), 'assets', f'{test_name}_user_{dump_format_name}.zip')
        response = self._download_file(url, data, self.user, file_zip_name)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self._check_downloaded_file(file_zip_name)

        file_zip_name = osp.join(osp.dirname(__file__), 'assets', f'{test_name}_None_{dump_format_name}.zip')
        response = self._download_file(url, data, None, file_zip_name)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        with self.assertRaises(FileNotFoundError):
            self._check_downloaded_file(file_zip_name)

    def test_api_v1_tasks_dataset_export_others_user(self):
        test_name = self._testMethodName
        dump_format_name = "CVAT for images 1.1"

        # create task with annotations
        images = self._generate_task_images(3)
        task = self._create_task(tasks["main"], images)
        self._create_annotations(task, dump_format_name, "random")
        task_id = task["id"]
        task_ann = TaskAnnotation(task_id)
        task_ann.init_from_db()

        # dump dataset
        url = f"/api/v1/tasks/{task_id}/dataset"
        data = {
            "format": dump_format_name,
            "action": "download",
        }

        file_zip_name = osp.join(osp.dirname(__file__), 'assets', f'{test_name}_admin_{dump_format_name}.zip')
        response = self._download_file(url, data, self.admin, file_zip_name)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self._check_downloaded_file(file_zip_name)

        file_zip_name = osp.join(osp.dirname(__file__), 'assets', f'{test_name}_user_{dump_format_name}.zip')
        response = self._download_file(url, data, self.user, file_zip_name)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self._check_downloaded_file(file_zip_name)

        file_zip_name = osp.join(osp.dirname(__file__), 'assets', f'{test_name}_None_{dump_format_name}.zip')
        response = self._download_file(url, data, None, file_zip_name)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        with self.assertRaises(FileNotFoundError):
            self._check_downloaded_file(file_zip_name)

    def test_api_v1_tasks_annotations_update_others_user(self):
        test_name = self._testMethodName
        dump_format_name = "CVAT for images 1.1"
        upload_format_name = "CVAT 1.1"

        # create task with annotations
        images = self._generate_task_images(3)
        task = self._create_task(tasks["main"], images)
        self._create_annotations(task, dump_format_name, "random")
        task_id = task["id"]
        task_ann = TaskAnnotation(task_id)
        task_ann.init_from_db()

        # dump annotations
        url = f"/api/v1/tasks/{task_id}/annotations"
        data = {
            "format": dump_format_name,
            "action": "download",
        }
        file_zip_name = osp.join(osp.dirname(__file__), 'assets', f'{test_name}_{dump_format_name}.zip')
        response = self._download_file(url, data, self.admin, file_zip_name)
        self._check_downloaded_file(file_zip_name)

        url_upload = f"/api/v1/tasks/{task_id}/annotations?format={upload_format_name}"
        for user in [self.admin, self.user, None]:
            with open(file_zip_name, 'rb') as binary_file:
                # remove annotations
                response = self._delete_request(url, self.admin)
                self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

                # upload annotations
                response = self._upload_file(url_upload, binary_file, user)

                if user is None:
                    self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
                    # check for missing annotations
                    response = self._get_request(url, self.admin)
                    self.assertEqual(response.status_code, status.HTTP_200_OK)
                    self.assertEqual(len(response.data["tags"]), 0)
                    self.assertEqual(len(response.data["shapes"]), 0)
                else:
                    self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
                    # check for presence annotations
                    response = self._get_request(url, self.admin)
                    self.assertEqual(response.status_code, status.HTTP_200_OK)
                    self.assertNotEqual(len(response.data["tags"]), 0)
                    self.assertNotEqual(len(response.data["shapes"]), 0)

    def test_api_v1_tasks_annotations_dump_and_dataset_export_with_datumaro(self):
        test_name = self._testMethodName
        importer_format_name = {
            'COCO 1.0': 'coco',
            'CVAT for images 1.1': 'cvat',
            'CVAT for video 1.1': 'cvat',
            'Datumaro 1.0': 'datumaro_project',
            'LabelMe 3.0': 'label_me',
            'MOT 1.1': 'mot_seq',
            'MOTS PNG 1.0': 'mots_png',
            'PASCAL VOC 1.1': 'voc',
            'Segmentation mask 1.1': 'voc',
            'TFRecord 1.0': 'tf_detection_api',
            'YOLO 1.1': 'yolo',
            'ImageNet 1.0': 'imagenet_txt',
            'CamVid 1.0': 'camvid',
            'WiderFace 1.0': 'wider_face',
            'VGGFace2 1.0': 'vgg_face2',
        }

        # get formats
        dump_formats = dm.views.get_export_formats()

        for dump_format in dump_formats:
            if dump_format.ENABLED:
                dump_format_name = dump_format.DISPLAY_NAME

                if dump_format_name != "Datumaro 1.0":
                    continue
                # TODO skip failed formats
                if dump_format_name in [
                    "CVAT for video 1.1",
                    "YOLO 1.1",
                    "ImageNet 1.0",
                    "Datumaro 1.0",
                ]:
                    continue

                print("dump_format_name:", dump_format_name)

                # create task
                images = self._generate_task_images(3)
                task = self._create_task(tasks["main"], images)

                 # create annotations
                if dump_format_name in ["MOT 1.1", "MOTS PNG 1.0", "PASCAL VOC 1.1", "Segmentation mask 1.1", "TFRecord 1.0", "YOLO 1.1", "ImageNet 1.0", "WiderFace 1.0", "VGGFace2 1.0"]:
                    self._create_annotations(task, dump_format_name, "dafault")
                else:
                    self._create_annotations(task, dump_format_name, "random")

                task_id = task["id"]
                task_ann = TaskAnnotation(task_id)
                task_ann.init_from_db()

                data_datumaro = {
                    "dataset": None,
                    "annotations": None,
                }

                for type_file in ("dataset", "annotations"):
                    # dump file
                    url = f"/api/v1/tasks/{task_id}/{type_file}"
                    data = {
                        "format": dump_format_name,
                        "action": "download",
                    }
                    file_zip_name = osp.join(osp.dirname(__file__), 'assets', f'{test_name}_{type_file}_{dump_format_name}.zip')
                    self._download_file(url, data, self.admin, file_zip_name)
                    self._check_downloaded_file(file_zip_name)

                    # extract zip
                    folder_name = osp.join(osp.dirname(__file__), 'assets', f'{test_name}_{type_file}_{dump_format_name}')
                    with zipfile.ZipFile(file_zip_name, 'r') as zip_ref:
                        zip_ref.extractall(folder_name)
                    data_datumaro[type_file] = datumaro.components.project.Dataset.import_from(folder_name, importer_format_name[dump_format_name])

                # equals dataset vs annotations
                compare_datasets(self, data_datumaro["dataset"], data_datumaro["annotations"])

    @skip("Fail")
    def test_api_v1_tasks_annotations_dump_and_upload_with_datumaro_many_jobs(self):
        test_name = self._testMethodName
        # create task with annotations
        for dump_format_name in ["CVAT for images 1.1", "CVAT for video 1.1"]:
            images = self._generate_task_images(13)
            task = self._create_task(tasks["many jobs"], images)
            self._create_annotations(task, f'{dump_format_name} many jobs', "dafault")

            task_id = task["id"]
            task_ann = TaskAnnotation(task_id)
            task_ann.init_from_db()
            task_data = TaskData(task_ann.ir_data, Task.objects.get(pk=task_id))
            extractor = CvatTaskDataExtractor(task_data)
            data_from_task_before_upload = datumaro.components.project.Dataset.from_extractors(extractor)

            # dump annotations
            url = f"/api/v1/tasks/{task_id}/annotations"
            data = {
                "format": dump_format_name,
                "action": "download",
            }
            file_zip_name = osp.join(osp.dirname(__file__), 'assets', f'{test_name}_{dump_format_name}.zip')
            self._download_file(url, data, self.admin, file_zip_name)
            self._check_downloaded_file(file_zip_name)

            # remove annotations
            response = self._delete_request(url, self.admin)
            self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

            # upload annotations
            if dump_format_name in ["CVAT for images 1.1", "CVAT for video 1.1"]:
                upload_format_name = "CVAT 1.1"
            else:
                upload_format_name = dump_format_name

            url = f"/api/v1/tasks/{task_id}/annotations?format={upload_format_name}"
            with open(file_zip_name, 'rb') as binary_file:
                response = self._upload_file(url, binary_file, self.admin)
                self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

            # equals annotations
            task_ann = TaskAnnotation(task_id)
            task_ann.init_from_db()
            task_data = TaskData(task_ann.ir_data, Task.objects.get(pk=task_id))
            extractor = CvatTaskDataExtractor(task_data)
            data_from_task_after_upload = datumaro.components.project.Dataset.from_extractors(extractor)
            compare_datasets(self, data_from_task_before_upload, data_from_task_after_upload)

    def test_api_v1_tasks_annotations_dump_and_dataset_export_empty_data_with_datumaro(self):
        test_name = self._testMethodName
        dump_format_name = "CVAT for images 1.1"
        upload_format_name = "CVAT 1.1"
        importer_format_name = "cvat"
        data_datumaro = {
            "dataset": None,
            "annotations": None,
        }

        # create task without annotations
        images = self._generate_task_images(3)
        task = self._create_task(tasks["main"], images)
        task_id = task["id"]
        task_ann = TaskAnnotation(task_id)
        task_ann.init_from_db()
        task_data = TaskData(task_ann.ir_data, Task.objects.get(pk=task_id))
        extractor = CvatTaskDataExtractor(task_data)
        data_from_task_before_upload = datumaro.components.project.Dataset.from_extractors(extractor)

        # dump dataset
        for type_file in ("dataset", "annotations"):
            # dump file
            url = f"/api/v1/tasks/{task_id}/{type_file}"
            data = {
                "format": dump_format_name,
                "action": "download",
            }
            file_zip_name = osp.join(osp.dirname(__file__), 'assets', f'{test_name}_{type_file}_{dump_format_name}.zip')
            self._download_file(url, data, self.admin, file_zip_name)
            self._check_downloaded_file(file_zip_name)

            # extract zip
            folder_name = osp.join(osp.dirname(__file__), 'assets', f'{test_name}_{type_file}_{dump_format_name}')
            with zipfile.ZipFile(file_zip_name, 'r') as zip_ref:
                zip_ref.extractall(folder_name)
            data_datumaro[type_file] = datumaro.components.project.Dataset.import_from(folder_name, importer_format_name)

        # equals dataset vs annotations
        compare_datasets(self, data_datumaro["dataset"], data_datumaro["annotations"])

        # upload annotations
        url = f"/api/v1/tasks/{task_id}/annotations?format={upload_format_name}"
        with open(file_zip_name, 'rb') as binary_file:
            response = self._upload_file(url, binary_file, self.admin)
            self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

        # equals annotations
        task_ann = TaskAnnotation(task_id)
        task_ann.init_from_db()
        task_data = TaskData(task_ann.ir_data, Task.objects.get(pk=task_id))
        extractor = CvatTaskDataExtractor(task_data)
        data_from_task_after_upload = datumaro.components.project.Dataset.from_extractors(extractor)
        compare_datasets(self, data_from_task_before_upload, data_from_task_after_upload)

class FrameMatchingTest(_DbTestBase):
    def _generate_task_images(self, paths): # pylint: disable=no-self-use
        f = BytesIO()
        with zipfile.ZipFile(f, 'w') as archive:
            for path in paths:
                archive.writestr(path, generate_image_file(path).getvalue())
        f.name = 'images.zip'
        f.seek(0)

        return {
            'client_files[0]': f,
            'image_quality': 75,
        }

    def _generate_task(self, images):
        task = {
            "name": "my task #1",
            "overlap": 0,
            "segment_size": 100,
            "labels": [
                {
                    "name": "car",
                    "attributes": [
                        {
                            "name": "model",
                            "mutable": False,
                            "input_type": "select",
                            "default_value": "mazda",
                            "values": ["bmw", "mazda", "renault"]
                        },
                        {
                            "name": "parked",
                            "mutable": True,
                            "input_type": "checkbox",
                            "default_value": False
                        },
                    ]
                },
                {"name": "person"},
            ]
        }
        return self._create_task(task, images)

    def test_frame_matching(self):
        task_paths = [
            'a.jpg',
            'a/a.jpg',
            'a/b.jpg',
            'b/a.jpg',
            'b/c.jpg',
            'a/b/c.jpg',
            'a/b/d.jpg',
        ]

        images = self._generate_task_images(task_paths)
        task = self._generate_task(images)
        task_data = TaskData(AnnotationIR(), Task.objects.get(pk=task["id"]))

        for input_path, expected, root in [
            ('z.jpg', None, ''), # unknown item
            ('z/a.jpg', None, ''), # unknown item

            ('d.jpg', 'a/b/d.jpg', 'a/b'), # match with root hint
            ('b/d.jpg', 'a/b/d.jpg', 'a'), # match with root hint
        ] + list(zip(task_paths, task_paths, [None] * len(task_paths))): # exact matches
            with self.subTest(input=input_path):
                actual = task_data.match_frame(input_path, root)
                if actual is not None:
                    actual = task_data.frame_info[actual]['path']
                self.assertEqual(expected, actual)

    def test_dataset_root(self):
        for task_paths, dataset_paths, expected in [
            ([ 'a.jpg', 'b/c/a.jpg' ], [ 'a.jpg', 'b/c/a.jpg' ], ''),
            ([ 'b/a.jpg', 'b/c/a.jpg' ], [ 'a.jpg', 'c/a.jpg' ], 'b'), # 'images from share' case
            ([ 'b/c/a.jpg' ], [ 'a.jpg' ], 'b/c'), # 'images from share' case
            ([ 'a.jpg' ], [ 'z.jpg' ], None),
        ]:
            with self.subTest(expected=expected):
                images = self._generate_task_images(task_paths)
                task = self._generate_task(images)
                task_data = TaskData(AnnotationIR(),
                    Task.objects.get(pk=task["id"]))
                dataset = [
                    datumaro.components.extractor.DatasetItem(
                        id=osp.splitext(p)[0])
                    for p in dataset_paths]

                root = find_dataset_root(dataset, task_data)
                self.assertEqual(expected, root)
