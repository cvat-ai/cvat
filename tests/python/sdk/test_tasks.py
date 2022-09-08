# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import os.path as osp
from logging import Logger
from pathlib import Path
from typing import Tuple

import pytest
from cvat_sdk import Client, models
from cvat_sdk.api_client import exceptions
from cvat_sdk.core.proxies.tasks import ResourceType, Task
from PIL import Image

from shared.utils.config import USER_PASS
from shared.utils.helpers import generate_image_files

from .util import make_pbar


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

    @pytest.fixture
    def fxt_backup_file(self, fxt_new_task: Task, fxt_coco_file: str):
        backup_path = self.tmp_path / "backup.zip"

        fxt_new_task.import_annotations("COCO 1.0", filename=fxt_coco_file)
        fxt_new_task.download_backup(str(backup_path))

        yield backup_path

    @pytest.fixture
    def fxt_new_task(self, fxt_image_file: Path):
        task = self.client.tasks.create_from_data(
            spec={
                "name": "test_task",
                "labels": [{"name": "car"}, {"name": "person"}],
            },
            resource_type=ResourceType.LOCAL,
            resources=[str(fxt_image_file)],
            data_params={"image_quality": 80},
        )

        return task

    @pytest.fixture
    def fxt_task_with_shapes(self, fxt_new_task: Task):
        fxt_new_task.set_annotations(
            models.LabeledDataRequest(
                shapes=[
                    models.LabeledShapeRequest(
                        frame=0,
                        label_id=fxt_new_task.labels[0].id,
                        type="rectangle",
                        points=[1, 1, 2, 2],
                    ),
                ],
            )
        )

        return fxt_new_task

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

        task = self.client.tasks.create_from_data(
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
            self.client.tasks.create_from_data(
                spec=task_spec,
                resource_type=ResourceType.LOCAL,
                resources=[],
                pbar=pbar,
            )

        assert capture.match("No media data found")
        assert self.stdout.getvalue() == ""

    def test_can_retrieve_task(self, fxt_new_task: Task):
        task_id = fxt_new_task.id

        task = self.client.tasks.retrieve(task_id)

        assert task.id == task_id
        assert self.stdout.getvalue() == ""

    def test_can_list_tasks(self, fxt_new_task: Task):
        task_id = fxt_new_task.id

        tasks = self.client.tasks.list()

        assert any(t.id == task_id for t in tasks)
        assert self.stdout.getvalue() == ""

    def test_can_update_task(self, fxt_new_task: Task):
        fxt_new_task.update(models.PatchedTaskWriteRequest(name="foo"))

        retrieved_task = self.client.tasks.retrieve(fxt_new_task.id)
        assert retrieved_task.name == "foo"
        assert fxt_new_task.name == retrieved_task.name
        assert self.stdout.getvalue() == ""

    def test_can_delete_task(self, fxt_new_task: Task):
        fxt_new_task.remove()

        with pytest.raises(exceptions.NotFoundException):
            fxt_new_task.fetch()
        assert self.stdout.getvalue() == ""

    def test_can_delete_tasks_by_ids(self, fxt_new_task: Task):
        task_id = fxt_new_task.id
        old_tasks = self.client.tasks.list()

        self.client.tasks.remove_by_ids([task_id])

        new_tasks = self.client.tasks.list()
        assert any(t.id == task_id for t in old_tasks)
        assert all(t.id != task_id for t in new_tasks)
        assert self.logger_stream.getvalue(), f".*Task ID {task_id} deleted.*"
        assert self.stdout.getvalue() == ""

    @pytest.mark.parametrize("include_images", (True, False))
    def test_can_download_dataset(self, fxt_new_task: Task, include_images: bool):
        pbar_out = io.StringIO()
        pbar = make_pbar(file=pbar_out)

        task_id = fxt_new_task.id
        path = str(self.tmp_path / f"task_{task_id}-cvat.zip")
        task = self.client.tasks.retrieve(task_id)
        task.export_dataset(
            format_name="CVAT for images 1.1",
            filename=path,
            pbar=pbar,
            include_images=include_images,
        )

        assert "100%" in pbar_out.getvalue().strip("\r").split("\r")[-1]
        assert osp.isfile(path)
        assert self.stdout.getvalue() == ""

    def test_can_download_backup(self, fxt_new_task: Task):
        pbar_out = io.StringIO()
        pbar = make_pbar(file=pbar_out)

        task_id = fxt_new_task.id
        path = str(self.tmp_path / f"task_{task_id}-backup.zip")
        task = self.client.tasks.retrieve(task_id)
        task.download_backup(filename=path, pbar=pbar)

        assert "100%" in pbar_out.getvalue().strip("\r").split("\r")[-1]
        assert osp.isfile(path)
        assert self.stdout.getvalue() == ""

    def test_can_download_preview(self, fxt_new_task: Task):
        frame_encoded = fxt_new_task.get_preview()

        assert Image.open(frame_encoded).size != 0
        assert self.stdout.getvalue() == ""

    @pytest.mark.parametrize("quality", ("compressed", "original"))
    def test_can_download_frame(self, fxt_new_task: Task, quality: str):
        frame_encoded = fxt_new_task.get_frame(0, quality=quality)

        assert Image.open(frame_encoded).size != 0
        assert self.stdout.getvalue() == ""

    @pytest.mark.parametrize("quality", ("compressed", "original"))
    def test_can_download_frames(self, fxt_new_task: Task, quality: str):
        fxt_new_task.download_frames(
            [0],
            quality=quality,
            outdir=str(self.tmp_path),
            filename_pattern="frame-{frame_id}{frame_ext}",
        )

        assert osp.isfile(self.tmp_path / "frame-0.jpg")
        assert self.stdout.getvalue() == ""

    def test_can_upload_annotations(self, fxt_new_task: Task, fxt_coco_file: Path):
        pbar_out = io.StringIO()
        pbar = make_pbar(file=pbar_out)

        fxt_new_task.import_annotations(
            format_name="COCO 1.0", filename=str(fxt_coco_file), pbar=pbar
        )

        assert "uploaded" in self.logger_stream.getvalue()
        assert "100%" in pbar_out.getvalue().strip("\r").split("\r")[-1]
        assert self.stdout.getvalue() == ""

    def test_can_create_from_backup(self, fxt_new_task: Task, fxt_backup_file: Path):
        pbar_out = io.StringIO()
        pbar = make_pbar(file=pbar_out)

        task = self.client.tasks.create_from_backup(str(fxt_backup_file), pbar=pbar)

        assert task.id
        assert task.id != fxt_new_task.id
        assert task.size == fxt_new_task.size
        assert "imported sucessfully" in self.logger_stream.getvalue()
        assert "100%" in pbar_out.getvalue().strip("\r").split("\r")[-1]
        assert self.stdout.getvalue() == ""

    def test_can_get_jobs(self, fxt_new_task: Task):
        jobs = fxt_new_task.get_jobs()

        assert len(jobs) != 0
        assert self.stdout.getvalue() == ""

    def test_can_get_meta(self, fxt_new_task: Task):
        meta = fxt_new_task.get_meta()

        assert meta.image_quality == 80
        assert meta.size == 1
        assert len(meta.frames) == meta.size
        assert meta.frames[0].name == "img.png"
        assert meta.frames[0].width == 5
        assert meta.frames[0].height == 10
        assert not meta.deleted_frames
        assert self.stdout.getvalue() == ""

    def test_can_remove_frames(self, fxt_new_task: Task):
        fxt_new_task.remove_frames_by_ids([0])

        meta = fxt_new_task.get_meta()
        assert meta.deleted_frames == [0]
        assert self.stdout.getvalue() == ""

    def test_can_get_annotations(self, fxt_task_with_shapes: Task):
        anns = fxt_task_with_shapes.get_annotations()

        assert len(anns.shapes) == 1
        assert anns.shapes[0].type.value == "rectangle"
        assert self.stdout.getvalue() == ""

    def test_can_set_annotations(self, fxt_new_task: Task):
        fxt_new_task.set_annotations(
            models.LabeledDataRequest(
                tags=[models.LabeledImageRequest(frame=0, label_id=fxt_new_task.labels[0].id)],
            )
        )

        anns = fxt_new_task.get_annotations()

        assert len(anns.tags) == 1
        assert self.stdout.getvalue() == ""

    def test_can_clear_annotations(self, fxt_task_with_shapes: Task):
        fxt_task_with_shapes.remove_annotations()

        anns = fxt_task_with_shapes.get_annotations()
        assert len(anns.tags) == 0
        assert len(anns.tracks) == 0
        assert len(anns.shapes) == 0
        assert self.stdout.getvalue() == ""

    def test_can_remove_annotations(self, fxt_new_task: Task):
        fxt_new_task.set_annotations(
            models.LabeledDataRequest(
                shapes=[
                    models.LabeledShapeRequest(
                        frame=0,
                        label_id=fxt_new_task.labels[0].id,
                        type="rectangle",
                        points=[1, 1, 2, 2],
                    ),
                    models.LabeledShapeRequest(
                        frame=0,
                        label_id=fxt_new_task.labels[0].id,
                        type="rectangle",
                        points=[2, 2, 3, 3],
                    ),
                ],
            )
        )
        anns = fxt_new_task.get_annotations()

        fxt_new_task.remove_annotations(ids=[anns.shapes[0].id])

        anns = fxt_new_task.get_annotations()
        assert len(anns.tags) == 0
        assert len(anns.tracks) == 0
        assert len(anns.shapes) == 1
        assert self.stdout.getvalue() == ""

    def test_can_update_annotations(self, fxt_task_with_shapes: Task):
        fxt_task_with_shapes.update_annotations(
            models.PatchedLabeledDataRequest(
                shapes=[
                    models.LabeledShapeRequest(
                        frame=0,
                        label_id=fxt_task_with_shapes.labels[0].id,
                        type="rectangle",
                        points=[0, 1, 2, 3],
                    ),
                ],
                tracks=[
                    models.LabeledTrackRequest(
                        frame=0,
                        label_id=fxt_task_with_shapes.labels[0].id,
                        shapes=[
                            models.TrackedShapeRequest(
                                frame=0, type="polygon", points=[3, 2, 2, 3, 3, 4]
                            ),
                        ],
                    )
                ],
                tags=[
                    models.LabeledImageRequest(frame=0, label_id=fxt_task_with_shapes.labels[0].id)
                ],
            )
        )

        anns = fxt_task_with_shapes.get_annotations()
        assert len(anns.shapes) == 2
        assert len(anns.tracks) == 1
        assert len(anns.tags) == 1
        assert self.stdout.getvalue() == ""
