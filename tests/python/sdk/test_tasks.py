# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import os.path as osp
from logging import Logger
from pathlib import Path
from typing import Tuple

import pytest
from cvat_sdk import Client, exceptions
from cvat_sdk.core.tasks import TaskProxy
from cvat_sdk.core.types import ResourceType
from PIL import Image

from shared.utils.config import USER_PASS
from shared.utils.helpers import generate_image_file, generate_image_files

from .util import generate_coco_json, make_pbar


class TestTaskUsecases:
    @pytest.fixture(autouse=True)
    def setup(
        self,
        changedb,  # force fixture call order to allow DB setup
        tmp_path: Path,
        fxt_logger: Tuple[Logger, io.StringIO],
        fxt_client: Client,
        fxt_stdout: io.StringIO,
        admin_user: str,
    ):
        self.tmp_path = tmp_path
        _, self.logger_stream = fxt_logger
        self.client = fxt_client
        self.stdout = fxt_stdout
        self.user = admin_user
        self.client.login((self.user, USER_PASS))

        yield

        self.tmp_path = None
        self.client = None
        self.stdout = None

    @pytest.fixture
    def fxt_image_file(self):
        img_path = self.tmp_path / "img.png"
        with img_path.open("wb") as f:
            f.write(generate_image_file(filename=str(img_path)).getvalue())

        return img_path

    @pytest.fixture
    def fxt_coco_file(self, fxt_image_file):
        img_filename = fxt_image_file
        img_size = Image.open(img_filename).size
        ann_filename = self.tmp_path / "coco.json"
        generate_coco_json(ann_filename, img_info=(img_filename, *img_size))

        yield ann_filename

    @pytest.fixture
    def fxt_backup_file(self, fxt_new_task: TaskProxy, fxt_coco_file: str):
        backup_path = self.tmp_path / "backup.zip"

        fxt_new_task.import_annotations("COCO 1.0", filename=fxt_coco_file)
        fxt_new_task.download_backup(str(backup_path))

        yield backup_path

    @pytest.fixture
    def fxt_new_task(self, fxt_image_file):
        task = self.client.create_task(
            spec={
                "name": "test_task",
                "labels": [{"name": "car"}, {"name": "person"}],
            },
            resource_type=ResourceType.LOCAL,
            resources=[fxt_image_file],
        )

        return task

    def test_can_create_task_with_local_data(self):
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

    def test_cant_create_task_with_no_data(self):
        pbar_out = io.StringIO()
        pbar = make_pbar(file=pbar_out)

        task_spec = {
            "name": f"test {self.user} to create a task with no data",
            "labels": [
                {
                    "name": "car",
                }
            ],
        }

        with pytest.raises(exceptions.ApiException) as capture:
            self.client.create_task(
                spec=task_spec,
                resource_type=ResourceType.LOCAL,
                resources=[],
                pbar=pbar,
            )

        assert capture.match("No media data found")
        assert self.stdout.getvalue() == ""

    def test_can_retrieve_task(self, fxt_new_task):
        task_id = fxt_new_task.id

        task = self.client.retrieve_task(task_id)

        assert task.id == task_id

    def test_can_list_tasks(self, fxt_new_task):
        task_id = fxt_new_task.id

        tasks = self.client.list_tasks()

        assert any(t.id == task_id for t in tasks)
        assert self.stdout.getvalue() == ""

    def test_can_delete_tasks_by_ids(self, fxt_new_task):
        task_id = fxt_new_task.id
        old_tasks = self.client.list_tasks()

        self.client.delete_tasks([task_id])

        new_tasks = self.client.list_tasks()
        assert any(t.id == task_id for t in old_tasks)
        assert all(t.id != task_id for t in new_tasks)
        assert self.logger_stream.getvalue(), f".*Task ID {task_id} deleted.*"
        assert self.stdout.getvalue() == ""

    def test_can_delete_task(self, fxt_new_task):
        task_id = fxt_new_task.id
        task = self.client.retrieve_task(task_id)
        old_tasks = self.client.list_tasks()

        task.remove()

        new_tasks = self.client.list_tasks()
        assert any(t.id == task_id for t in old_tasks)
        assert all(t.id != task_id for t in new_tasks)
        assert self.stdout.getvalue() == ""

    @pytest.mark.parametrize("include_images", (True, False))
    def test_can_download_dataset(self, fxt_new_task: TaskProxy, include_images: bool):
        pbar_out = io.StringIO()
        pbar = make_pbar(file=pbar_out)

        task_id = fxt_new_task.id
        path = str(self.tmp_path / f"task_{task_id}-cvat.zip")
        task = self.client.retrieve_task(task_id)
        task.export_dataset(
            format_name="CVAT for images 1.1",
            filename=path,
            pbar=pbar,
            include_images=include_images,
        )

        assert "100%" in pbar_out.getvalue().strip("\r").split("\r")[-1]
        assert osp.isfile(path)
        assert self.stdout.getvalue() == ""

    def test_can_download_backup(self, fxt_new_task):
        pbar_out = io.StringIO()
        pbar = make_pbar(file=pbar_out)

        task_id = fxt_new_task.id
        path = str(self.tmp_path / f"task_{task_id}-backup.zip")
        task = self.client.retrieve_task(task_id)
        task.download_backup(filename=path, pbar=pbar)

        assert "100%" in pbar_out.getvalue().strip("\r").split("\r")[-1]
        assert osp.isfile(path)
        assert self.stdout.getvalue() == ""

    @pytest.mark.parametrize("quality", ("compressed", "original"))
    def test_can_download_frame(self, fxt_new_task: TaskProxy, quality: str):
        frame_encoded = fxt_new_task.retrieve_frame(0, quality=quality)

        assert Image.open(frame_encoded).size != 0
        assert self.stdout.getvalue() == ""

    @pytest.mark.parametrize("quality", ("compressed", "original"))
    def test_can_download_frames(self, fxt_new_task: TaskProxy, quality: str):
        fxt_new_task.download_frames(
            [0],
            quality=quality,
            outdir=str(self.tmp_path),
            filename_pattern="frame-{frame_id}{frame_ext}",
        )

        assert osp.isfile(self.tmp_path / "frame-0.jpg")
        assert self.stdout.getvalue() == ""

    def test_can_upload_annotations(self, fxt_new_task: TaskProxy, fxt_coco_file: Path):
        pbar_out = io.StringIO()
        pbar = make_pbar(file=pbar_out)

        fxt_new_task.import_annotations(
            format_name="COCO 1.0", filename=str(fxt_coco_file), pbar=pbar
        )

        assert str(fxt_coco_file) in self.logger_stream.getvalue()
        assert "100%" in pbar_out.getvalue().strip("\r").split("\r")[-1]
        assert self.stdout.getvalue() == ""

    def test_can_create_from_backup(self, fxt_new_task: TaskProxy, fxt_backup_file: Path):
        pbar_out = io.StringIO()
        pbar = make_pbar(file=pbar_out)

        task = self.client.create_task_from_backup(str(fxt_backup_file), pbar=pbar)

        assert task.id
        assert task.id != fxt_new_task.id
        assert task.size == fxt_new_task.size
        assert "exported sucessfully" in self.logger_stream.getvalue()
        assert "100%" in pbar_out.getvalue().strip("\r").split("\r")[-1]
        assert self.stdout.getvalue() == ""
