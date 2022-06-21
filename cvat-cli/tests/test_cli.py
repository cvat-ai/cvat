# Copyright (C) 2020-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

import io
import logging
import os
import unittest.mock as mock
from contextlib import closing, redirect_stdout

import cvat.apps.engine.log as log
from cvat.apps.engine.tests.test_rest_api import create_db_users, generate_image_file
from datumaro.util.scope import on_exit_do, scoped
from django.conf import settings
from PIL import Image
from rest_framework.test import APITestCase, RequestsClient
from tqdm import tqdm

from cvat_cli.core import CLI, CVAT_API_V2, ResourceType


class TestCLI(APITestCase):
    def setUp(self):
        self._stdout_handler = redirect_stdout(io.StringIO())
        mock_stdout = self._stdout_handler.__enter__()
        log = logging.getLogger("cvat_cli")
        log.propagate = False
        log.setLevel(logging.INFO)
        log.handlers.clear()
        log.addHandler(logging.StreamHandler(mock_stdout))
        self.mock_stdout = mock_stdout

        self.client = RequestsClient()
        self.credentials = ("admin", "admin")
        self.api = CVAT_API_V2("testserver")
        self.cli = CLI(self.client, self.api, self.credentials)

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.img_file = os.path.join(settings.SHARE_ROOT, "test_cli.jpg")
        _, data = generate_image_file(cls.img_file)
        with open(cls.img_file, "wb") as image:
            image.write(data.read())

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        os.remove(cls.img_file)

    def tearDown(self):
        super().tearDown()
        self._stdout_handler.__exit__(None, None, None)
        log.close_all()  # Release logging resources correctly

    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)

    def test_tasks_create(self):
        with closing(io.StringIO()) as pbar_out:
            pbar = tqdm(file=pbar_out, mininterval=0)

            task_id = self.cli.tasks_create(
                "test_task",
                [{"name": "car"}, {"name": "person"}],
                ResourceType.LOCAL,
                [self.img_file],
                pbar=pbar,
            )

            pbar_out = pbar_out.getvalue().strip("\r").split("\r")

        self.assertEqual(1, task_id)
        self.assertRegex(pbar_out[-1], "100%")


class TestTaskOperations(APITestCase):
    def setUp(self):
        self._stdout_handler = redirect_stdout(io.StringIO())
        mock_stdout = self._stdout_handler.__enter__()
        log = logging.getLogger("cvat_cli")
        log.propagate = False
        log.setLevel(logging.INFO)
        log.handlers.clear()
        log.addHandler(logging.StreamHandler(mock_stdout))
        self.mock_stdout = mock_stdout

        self.client = RequestsClient()
        self.credentials = ("admin", "admin")
        self.api = CVAT_API_V2("testserver")
        self.cli = CLI(self.client, self.api, self.credentials)
        self.taskname = "test_task"
        self.task_id = self.cli.tasks_create(
            self.taskname,
            [{"name": "car"}, {"name": "person"}],
            ResourceType.LOCAL,
            [self.img_file],
            pbar=mock.MagicMock(),
        )

    def tearDown(self):
        super().tearDown()
        self._stdout_handler.__exit__(None, None, None)
        log.close_all()  # Release logging resources correctly

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.img_file = os.path.join(settings.SHARE_ROOT, "test_cli.jpg")
        _, data = generate_image_file(cls.img_file)
        with open(cls.img_file, "wb") as image:
            image.write(data.read())

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        os.remove(cls.img_file)

    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)

    def test_tasks_list(self):
        self.cli.tasks_list(False)
        self.assertRegex(self.mock_stdout.getvalue(), ".*{}.*".format(self.taskname))

    def test_tasks_delete(self):
        self.cli.tasks_delete([1])
        self.cli.tasks_list(False)
        self.assertRegex(self.mock_stdout.getvalue(), ".*Task ID {} deleted.*".format(1))

    @scoped
    def test_tasks_dump(self):
        path = os.path.join(settings.SHARE_ROOT, "test_cli.zip")

        with closing(io.StringIO()) as pbar_out:
            pbar = tqdm(file=pbar_out, mininterval=0)

            self.cli.tasks_dump(self.task_id, "CVAT for images 1.1", path, pbar=pbar)
            on_exit_do(os.remove, path)

            pbar_out = pbar_out.getvalue().strip("\r").split("\r")

        self.assertTrue(os.path.exists(path))
        self.assertRegex(pbar_out[-1], "100%")

    @scoped
    def test_tasks_export(self):
        path = os.path.join(settings.SHARE_ROOT, "test_cli.zip")

        with closing(io.StringIO()) as pbar_out:
            pbar = tqdm(file=pbar_out, mininterval=0)

            self.cli.tasks_export(self.task_id, path, pbar=pbar)
            on_exit_do(os.remove, path)

            pbar_out = pbar_out.getvalue().strip("\r").split("\r")

        self.assertTrue(os.path.exists(path))
        self.assertRegex(pbar_out[-1], "100%")

    @scoped
    def test_tasks_frame_original(self):
        path = os.path.join(settings.SHARE_ROOT, "task_1_frame_000000.jpg")

        self.cli.tasks_frame(self.task_id, [0], outdir=settings.SHARE_ROOT, quality="original")
        on_exit_do(os.remove, path)

        self.assertTrue(os.path.exists(path))

    @scoped
    def test_tasks_frame(self):
        path = os.path.join(settings.SHARE_ROOT, "task_1_frame_000000.jpg")

        self.cli.tasks_frame(self.task_id, [0], outdir=settings.SHARE_ROOT, quality="compressed")
        on_exit_do(os.remove, path)

        self.assertTrue(os.path.exists(path))

    @scoped
    def test_tasks_upload(self):
        path = os.path.join(settings.SHARE_ROOT, "test_cli.json")
        self._generate_coco_file(path)
        on_exit_do(os.remove, path)

        with closing(io.StringIO()) as pbar_out:
            pbar = tqdm(file=pbar_out, mininterval=0)

            self.cli.tasks_upload(self.task_id, "COCO 1.0", path, pbar=pbar)

            pbar_out = pbar_out.getvalue().strip("\r").split("\r")

        self.assertRegex(self.mock_stdout.getvalue(), ".*{}.*".format("annotation file"))
        self.assertRegex(pbar_out[-1], "100%")

    @scoped
    def test_tasks_import(self):
        anno_path = os.path.join(settings.SHARE_ROOT, "test_cli.json")
        self._generate_coco_file(anno_path)
        on_exit_do(os.remove, anno_path)

        backup_path = os.path.join(settings.SHARE_ROOT, "task_backup.zip")
        with closing(io.StringIO()) as pbar_out:
            pbar = tqdm(file=pbar_out, mininterval=0)
            self.cli.tasks_upload(self.task_id, "COCO 1.0", anno_path, pbar=pbar)
            self.cli.tasks_export(self.task_id, backup_path, pbar=pbar)
            on_exit_do(os.remove, backup_path)

        with closing(io.StringIO()) as pbar_out:
            pbar = tqdm(file=pbar_out, mininterval=0)

            self.cli.tasks_import(backup_path, pbar=pbar)

            pbar_out = pbar_out.getvalue().strip("\r").split("\r")

        self.assertRegex(self.mock_stdout.getvalue(), ".*{}.*".format("exported sucessfully"))
        self.assertRegex(pbar_out[-1], "100%")

    def _generate_coco_file(self, path):
        test_image = Image.open(self.img_file)
        image_width, image_height = test_image.size

        content = self._generate_coco_anno(
            os.path.basename(self.img_file), image_width=image_width, image_height=image_height
        )
        with open(path, "w") as coco:
            coco.write(content)

    @staticmethod
    def _generate_coco_anno(image_path, image_width, image_height):
        return """{
        "categories": [
            {
            "id": 1,
            "name": "car",
            "supercategory": ""
            },
            {
            "id": 2,
            "name": "person",
            "supercategory": ""
            }
        ],
        "images": [
            {
            "coco_url": "",
            "date_captured": "",
            "flickr_url": "",
            "license": 0,
            "id": 0,
            "file_name": "%(image_path)s",
            "height": %(image_height)d,
            "width": %(image_width)d
            }
        ],
        "annotations": [
            {
            "category_id": 1,
            "id": 1,
            "image_id": 0,
            "iscrowd": 0,
            "segmentation": [
                []
            ],
            "area": 17702.0,
            "bbox": [
                574.0,
                407.0,
                167.0,
                106.0
            ]
            }
        ]
        }
        """ % {
            "image_path": image_path,
            "image_height": image_height,
            "image_width": image_width,
        }
