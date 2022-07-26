# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import os
from pathlib import Path

import pytest
from cvat_sdk.usecases.auth import login
from cvat_sdk.usecases.tasks import create_task, delete_tasks, list_tasks
from cvat_sdk.usecases.types import ResourceType
from PIL import Image
from rest_api.utils.config import USER_PASS
from rest_api.utils.helpers import generate_image_file

from .util import make_pbar


@pytest.mark.usefixtures("changedb")
class TestTaskUsecases:
    def test_can_create_task(
        self, tmp_path: Path, cvat_client, mock_stdout, users_by_name
    ):
        tmp_img = tmp_path / "img.png"
        with tmp_img.open("wb") as f:
            f.write(generate_image_file().getvalue())

        user = next(iter(users_by_name.keys()))

        pbar_out = io.StringIO()
        pbar = make_pbar(file=pbar_out)

        with cvat_client:
            login(cvat_client, (user, USER_PASS))

            task_id = create_task(
                cvat_client,
                spec={
                    "name": "test_task",
                    "labels": [{"name": "car"}, {"name": "person"}],
                },
                resource_type=ResourceType.LOCAL,
                resources=[tmp_img],
                pbar=pbar,
            )

        assert task_id
        assert "100%" in pbar_out.getvalue().strip("\r").split("\r")[-1]
        assert mock_stdout.getvalue() == ""

    # def test_can_list_all_tasks(self):
    #     tasks = list_tasks(self.client)

    #     self.assertEqual(len(tasks), 1)
    #     self.assertRegex(self.logger_stream.getvalue(), f".*{self.taskname}.*")
    #     self.assertEqual(self.mock_stdout.getvalue(), "")

    # def test_delete_tasks(self):
    #     delete_tasks(self.client, [self.task_id])

    #     tasks = list_tasks(self.client)

    #     self.assertEqual(len(tasks), 0)
    #     self.assertRegex(self.mock_stdout.getvalue(), f".*Task ID {self.task_id} deleted.*")
    #     self.assertEqual(self.mock_stdout.getvalue(), "")

    # @scoped
    # def test_tasks_dump(self):
    #     path = os.path.join(settings.SHARE_ROOT, "test_cli.zip")

    #     pbar_out = io.StringIO()
    #     pbar = make_pbar(file=pbar_out)

    #     self.cli.tasks_dump(self.task_id, "CVAT for images 1.1", path, pbar=pbar)
    #     on_exit_do(os.remove, path)

    #     pbar_out = pbar_out.getvalue().strip("\r").split("\r")

    #     self.assertTrue(os.path.exists(path))
    #     self.assertRegex(pbar_out[-1], "100%")

    # @scoped
    # def test_tasks_export(self):
    #     path = os.path.join(settings.SHARE_ROOT, "test_cli.zip")

    #     pbar_out = io.StringIO()
    #     pbar = make_pbar(file=pbar_out)

    #     self.cli.tasks_export(self.task_id, path, pbar=pbar)
    #     on_exit_do(os.remove, path)

    #     pbar_out = pbar_out.getvalue().strip("\r").split("\r")

    #     self.assertTrue(os.path.exists(path))
    #     self.assertRegex(pbar_out[-1], "100%")

    # @scoped
    # def test_tasks_frame_original(self):
    #     path = os.path.join(settings.SHARE_ROOT, "task_1_frame_000000.jpg")

    #     self.cli.tasks_frame(self.task_id, [0], outdir=settings.SHARE_ROOT, quality="original")
    #     on_exit_do(os.remove, path)

    #     self.assertTrue(os.path.exists(path))

    # @scoped
    # def test_tasks_frame(self):
    #     path = os.path.join(settings.SHARE_ROOT, "task_1_frame_000000.jpg")

    #     self.cli.tasks_frame(self.task_id, [0], outdir=settings.SHARE_ROOT, quality="compressed")
    #     on_exit_do(os.remove, path)

    #     self.assertTrue(os.path.exists(path))

    # @scoped
    # def test_tasks_upload(self):
    #     path = os.path.join(settings.SHARE_ROOT, "test_cli.json")
    #     self._generate_coco_file(path)
    #     on_exit_do(os.remove, path)

    #     pbar_out = io.StringIO()
    #     pbar = make_pbar(file=pbar_out)

    #     self.cli.tasks_upload(self.task_id, "COCO 1.0", path, pbar=pbar)

    #     pbar_out = pbar_out.getvalue().strip("\r").split("\r")

    #     self.assertRegex(self.mock_stdout.getvalue(), ".*{}.*".format("annotation file"))
    #     self.assertRegex(pbar_out[-1], "100%")

    # @scoped
    # def test_tasks_import(self):
    #     anno_path = os.path.join(settings.SHARE_ROOT, "test_cli.json")
    #     self._generate_coco_file(anno_path)
    #     on_exit_do(os.remove, anno_path)

    #     backup_path = os.path.join(settings.SHARE_ROOT, "task_backup.zip")
    #     self.cli.tasks_upload(self.task_id, "COCO 1.0", anno_path)
    #     self.cli.tasks_export(self.task_id, backup_path)
    #     on_exit_do(os.remove, backup_path)

    #     pbar_out = io.StringIO()
    #     pbar = make_pbar(file=pbar_out)
    #     self.cli.tasks_import(backup_path, pbar=pbar)

    #     pbar_out = pbar_out.getvalue().strip("\r").split("\r")

    #     self.assertRegex(self.mock_stdout.getvalue(), ".*{}.*".format("exported sucessfully"))
    #     self.assertRegex(pbar_out[-1], "100%")

    def _generate_coco_file(self, path):
        test_image = Image.open(self.img_file)
        image_width, image_height = test_image.size

        content = self._generate_coco_anno(
            os.path.basename(self.img_file),
            image_width=image_width,
            image_height=image_height,
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
