# SPDX-License-Identifier: MIT
import logging
import io
import os
import sys
import unittest
from django.conf import settings
from requests.auth import HTTPBasicAuth
from utils.cli.core import CLI, CVAT_API_V1, ResourceType
from rest_framework.test import APITestCase, RequestsClient
from cvat.apps.engine.tests.test_rest_api import create_db_users
from cvat.apps.engine.tests.test_rest_api import generate_image_file
from PIL import Image


class TestCLI(APITestCase):

    @unittest.mock.patch('sys.stdout', new_callable=io.StringIO)
    def setUp(self, mock_stdout):
        self.client = RequestsClient()
        self.client.auth = HTTPBasicAuth('admin', 'admin')
        self.api = CVAT_API_V1('testserver', '')
        self.cli = CLI(self.client, self.api)
        self.taskname = 'test_task'
        self.cli.tasks_create(self.taskname,
                              [{'name' : 'car'}, {'name': 'person'}],
                              '',
                              ResourceType.LOCAL,
                              [self.img_file])
        # redirect logging to mocked stdout to test program output
        self.mock_stdout = mock_stdout
        log = logging.getLogger('utils.cli.core')
        log.setLevel(logging.INFO)
        log.addHandler(logging.StreamHandler(sys.stdout))

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.img_file = os.path.join(settings.SHARE_ROOT, 'test_cli.jpg')
        data = generate_image_file(cls.img_file)
        with open(cls.img_file, 'wb') as image:
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
        self.assertRegex(self.mock_stdout.getvalue(), '.*{}.*'.format(self.taskname))

    def test_tasks_delete(self):
        self.cli.tasks_delete([1])
        self.cli.tasks_list(False)
        self.assertNotRegex(self.mock_stdout.getvalue(), '.*{}.*'.format(self.taskname))

    def test_tasks_dump(self):
        path = os.path.join(settings.SHARE_ROOT, 'test_cli.xml')
        self.cli.tasks_dump(1, 'CVAT XML 1.1 for images', path)
        self.assertTrue(os.path.exists(path))
        os.remove(path)

    def test_tasks_frame(self):
        path = os.path.join(settings.SHARE_ROOT, 'task_1_frame_000000.jpg')
        self.cli.tasks_frame(1, [0], outdir=settings.SHARE_ROOT)
        self.assertTrue(os.path.exists(path))
        os.remove(path)

    def test_tasks_upload(self):
        test_image = Image.open(self.img_file)
        width, height = test_image.size

        # Using generate_coco_anno() from:
        # https://github.com/opencv/cvat/blob/develop/cvat/apps/engine/tests/test_rest_api.py
        def generate_coco_anno():
            return b"""{
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
                "file_name": "test_cli.jpg",
                "height": %d,
                "width": %d
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
            }"""
        content = generate_coco_anno() % (height, width)
        path = os.path.join(settings.SHARE_ROOT, 'test_cli.json')
        with open(path, "wb") as coco:
            coco.write(content)
        self.cli.tasks_upload(1, 'COCO JSON 1.0', path)
        self.assertRegex(self.mock_stdout.getvalue(), '.*{}.*'.format("annotation file"))
        os.remove(path)
