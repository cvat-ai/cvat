# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import os
import os.path as osp
from logging import Logger
from pathlib import Path
from typing import Tuple

import pytest
from PIL import Image
from rest_api.utils.config import USER_PASS
from rest_api.utils.helpers import generate_image_file, generate_image_files

from cvat_sdk.impl.client import CvatClient
from cvat_sdk.impl.types import ResourceType

from .util import make_pbar


@pytest.mark.usefixtures("changedb")
class TestTaskUsecases:
    @pytest.fixture(autouse=True)
    def setup(
        self,
        tmp_path: Path,
        fxt_logger: Tuple[Logger, io.StringIO],
        fxt_cvat_client: CvatClient,
        fxt_stdout: io.StringIO,
        users_by_name,
    ):
        self.tmp_path = tmp_path
        _, self.logger_stream = fxt_logger
        self.client = fxt_cvat_client
        self.stdout = fxt_stdout
        self.user = next(iter(users_by_name))
        self.client.login((self.user, USER_PASS))

        yield

        self.tmp_path = None
        self.client = None
        self.stdout = None

    @pytest.fixture
    def fxt_new_task(self):
        tmp_img = self.tmp_path / "img.png"
        with tmp_img.open("wb") as f:
            f.write(generate_image_file().getvalue())

        task = self.client.create_task(
            spec={
                "name": "test_task",
                "labels": [{"name": "car"}, {"name": "person"}],
            },
            resource_type=ResourceType.LOCAL,
            resources=[tmp_img],
        )

        return task.id

    def test_can_create_task_with_local_data(self):
        tmp_img = self.tmp_path / "img.png"
        with tmp_img.open("wb") as f:
            f.write(generate_image_file().getvalue())

        pbar_out = io.StringIO()
        pbar = make_pbar(file=pbar_out)

        task_spec = {
            "name": f"test {self.user} to create a task with local data",
            "labels": [
                {
                    "name": "car",
                    "color": "#ff00ff",
                    "attributes": [
                        {
                            "name": "a",
                            "mutable": True,
                            "input_type": "number",
                            "default_value": "5",
                            "values": ["4", "5", "6"],
                        }
                    ],
                }
            ],
        }

        data_params = {
            "image_quality": 75,
        }

        task_files = generate_image_files(7)
        for i, f in enumerate(task_files):
            fname = self.tmp_path / osp.basename(f.name)
            with fname.open("wb") as fd:
                fd.write(f.getvalue())
                task_files[i] = str(fname)

        task = self.client.create_task(
            spec=task_spec,
            data_params=data_params,
            resource_type=ResourceType.LOCAL,
            resources=task_files,
            pbar=pbar,
        )

        assert task.size == 7
        assert "100%" in pbar_out.getvalue().strip("\r").split("\r")[-1]
        assert self.stdout.getvalue() == ""

    def test_can_retrieve_task(self, fxt_new_task):
        task_id = fxt_new_task

        task = self.client.retrieve_task(task_id)

        assert task.id == task_id

    def test_can_list_tasks(self, fxt_new_task):
        task_id = fxt_new_task

        tasks = self.client.list_tasks()

        assert any(t.id == task_id for t in tasks)
        assert self.stdout.getvalue() == ""

    def test_can_delete_tasks_by_ids(self, fxt_new_task):
        task_id = fxt_new_task
        old_tasks = self.client.list_tasks()

        self.client.delete_tasks([task_id])

        new_tasks = self.client.list_tasks()
        assert any(t.id == task_id for t in old_tasks)
        assert all(t.id != task_id for t in new_tasks)
        assert self.logger_stream.getvalue(), f".*Task ID {task_id} deleted.*"
        assert self.stdout.getvalue() == ""

    def test_can_delete_task(self, fxt_new_task):
        task_id = fxt_new_task
        task = self.client.retrieve_task(task_id)
        old_tasks = self.client.list_tasks()

        task.remove()

        new_tasks = self.client.list_tasks()
        assert any(t.id == task_id for t in old_tasks)
        assert all(t.id != task_id for t in new_tasks)
        assert self.stdout.getvalue() == ""

    def test_can_download_annotations(self, fxt_new_task):
        pbar_out = io.StringIO()
        pbar = make_pbar(file=pbar_out)

        task_id = fxt_new_task
        path = str(self.tmp_path / f"task_{task_id}_-cvat.zip")
        task = self.client.retrieve_task(task_id)
        task.download_dataset(format_name="CVAT for images 1.1", filename=path, pbar=pbar)

        assert "100%" in pbar_out.getvalue().strip("\r").split("\r")[-1]
        assert osp.isfile(path)

    def test_can_download_backup(self, fxt_new_task):
        pbar_out = io.StringIO()
        pbar = make_pbar(file=pbar_out)

        task_id = fxt_new_task
        path = str(self.tmp_path / f"task_{task_id}_-backup.zip")
        task = self.client.retrieve_task(task_id)
        task.download_backup(filename=path, pbar=pbar)

        assert "100%" in pbar_out.getvalue().strip("\r").split("\r")[-1]
        assert osp.isfile(path)

    # def test_tasks_frame_original(self):
    #     path = os.path.join(settings.SHARE_ROOT, "task_1_frame_000000.jpg")

    #     self.cli.tasks_frame(self.task_id, [0], outdir=settings.SHARE_ROOT, quality="original")
    #     on_exit_do(os.remove, path)

    #     self.assertTrue(os.path.exists(path))

    # def test_tasks_frame(self):
    #     path = os.path.join(settings.SHARE_ROOT, "task_1_frame_000000.jpg")

    #     self.cli.tasks_frame(self.task_id, [0], outdir=settings.SHARE_ROOT, quality="compressed")
    #     on_exit_do(os.remove, path)

    #     self.assertTrue(os.path.exists(path))

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
