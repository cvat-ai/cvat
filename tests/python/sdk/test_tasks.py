# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import os.path as osp
import zipfile
from logging import Logger
from pathlib import Path
from typing import Tuple

import pytest
from cvat_sdk import Client, models
from cvat_sdk.api_client import exceptions
from cvat_sdk.core.proxies.tasks import ResourceType, Task
from cvat_sdk.core.uploading import Uploader, _MyTusUploader
from PIL import Image

from shared.utils.helpers import generate_image_files

from .util import make_pbar


class TestTaskUsecases:
    @pytest.fixture(autouse=True)
    def setup(
        self,
        tmp_path: Path,
        fxt_login: Tuple[Client, str],
        fxt_logger: Tuple[Logger, io.StringIO],
        fxt_stdout: io.StringIO,
    ):
        self.tmp_path = tmp_path
        logger, self.logger_stream = fxt_logger
        self.stdout = fxt_stdout
        self.client, self.user = fxt_login
        self.client.logger = logger

        api_client = self.client.api_client
        for k in api_client.configuration.logger:
            api_client.configuration.logger[k] = logger

        yield

    @pytest.fixture
    def fxt_backup_file(self, fxt_new_task: Task, fxt_coco_file: str):
        backup_path = self.tmp_path / "backup.zip"

        fxt_new_task.import_annotations("COCO 1.0", filename=fxt_coco_file)
        fxt_new_task.download_backup(backup_path)

        yield backup_path

    @pytest.fixture
    def fxt_new_task(self, fxt_image_file: Path):
        task = self.client.tasks.create_from_data(
            spec={
                "name": "test_task",
                "labels": [{"name": "car"}, {"name": "person"}],
            },
            resources=[fxt_image_file],
            data_params={"image_quality": 80},
        )

        return task

    @pytest.fixture
    def fxt_new_task_without_data(self):
        task = self.client.tasks.create(
            spec={
                "name": "test_task",
                "labels": [{"name": "car"}, {"name": "person"}],
            },
        )

        return task

    @pytest.fixture
    def fxt_task_with_shapes(self, fxt_new_task: Task):
        labels = fxt_new_task.get_labels()
        fxt_new_task.set_annotations(
            models.LabeledDataRequest(
                shapes=[
                    models.LabeledShapeRequest(
                        frame=0,
                        label_id=labels[0].id,
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
            fname = self.tmp_path / f.name
            fname.write_bytes(f.getvalue())
            task_files[i] = fname

        task = self.client.tasks.create_from_data(
            spec=task_spec,
            data_params=data_params,
            resources=task_files,
            pbar=pbar,
        )

        assert task.size == 7
        assert "100%" in pbar_out.getvalue().strip("\r").split("\r")[-1]
        assert self.stdout.getvalue() == ""

    def test_can_create_task_with_local_data_and_predefined_sorting(
        self, fxt_new_task_without_data: Task
    ):
        task = fxt_new_task_without_data

        task_files = generate_image_files(6)
        task_filenames = []
        for f in task_files:
            fname = self.tmp_path / osp.basename(f.name)
            fname.write_bytes(f.getvalue())
            task_filenames.append(fname)

        task_filenames = [task_filenames[i] for i in [2, 4, 1, 5, 0, 3]]

        task.upload_data(
            resources=task_filenames,
            params={"sorting_method": "predefined"},
        )

        assert [f.name for f in task.get_frames_info()] == [f.name for f in task_filenames]

    def test_can_create_task_with_remote_data(self):
        task = self.client.tasks.create_from_data(
            spec={
                "name": "test_task",
                "labels": [{"name": "car"}, {"name": "person"}],
            },
            resource_type=ResourceType.SHARE,
            resources=["images/image_1.jpg", "images/image_2.jpg"],
            # make sure string fields are transferred correctly;
            # see https://github.com/cvat-ai/cvat/issues/4962
            data_params={"sorting_method": "lexicographical"},
        )

        assert task.size == 2
        assert task.get_frames_info()[0].name == "images/image_1.jpg"
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

    def test_can_upload_data_to_empty_task(self):
        pbar_out = io.StringIO()
        pbar = make_pbar(file=pbar_out)

        task = self.client.tasks.create(
            {
                "name": f"test task",
                "labels": [{"name": "car"}],
            }
        )

        data_params = {
            "image_quality": 75,
        }

        task_files = generate_image_files(7)
        for i, f in enumerate(task_files):
            fname = self.tmp_path / f.name
            fname.write_bytes(f.getvalue())
            task_files[i] = fname

        task.upload_data(
            resources=task_files,
            resource_type=ResourceType.LOCAL,
            params=data_params,
            pbar=pbar,
        )

        assert task.size == 7
        assert "100%" in pbar_out.getvalue().strip("\r").split("\r")[-1]
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
        path = self.tmp_path / f"task_{task_id}-cvat.zip"
        task = self.client.tasks.retrieve(task_id)
        task.export_dataset(
            format_name="CVAT for images 1.1",
            filename=path,
            pbar=pbar,
            include_images=include_images,
        )

        assert "100%" in pbar_out.getvalue().strip("\r").split("\r")[-1]
        assert path.is_file()
        assert self.stdout.getvalue() == ""

    def test_can_download_backup(self, fxt_new_task: Task):
        pbar_out = io.StringIO()
        pbar = make_pbar(file=pbar_out)

        task_id = fxt_new_task.id
        path = self.tmp_path / f"task_{task_id}-backup.zip"
        task = self.client.tasks.retrieve(task_id)
        task.download_backup(filename=path, pbar=pbar)

        assert "100%" in pbar_out.getvalue().strip("\r").split("\r")[-1]
        assert path.is_file()
        assert self.stdout.getvalue() == ""

    def test_can_download_preview(self, fxt_new_task: Task):
        frame_encoded = fxt_new_task.get_preview()
        (width, height) = Image.open(frame_encoded).size

        assert width > 0 and height > 0
        assert self.stdout.getvalue() == ""

    @pytest.mark.parametrize("quality", ("compressed", "original"))
    def test_can_download_frame(self, fxt_new_task: Task, quality: str):
        frame_encoded = fxt_new_task.get_frame(0, quality=quality)
        (width, height) = Image.open(frame_encoded).size

        assert width > 0 and height > 0
        assert self.stdout.getvalue() == ""

    @pytest.mark.parametrize("quality", ("compressed", "original"))
    @pytest.mark.parametrize("image_extension", (None, "bmp"))
    def test_can_download_frames(self, fxt_new_task: Task, quality: str, image_extension: str):
        fxt_new_task.download_frames(
            [0],
            image_extension=image_extension,
            quality=quality,
            outdir=self.tmp_path,
            filename_pattern="frame-{frame_id}{frame_ext}",
        )

        if image_extension is not None:
            expected_frame_ext = image_extension
        else:
            if quality == "original":
                expected_frame_ext = "png"
            else:
                expected_frame_ext = "jpg"

        assert (self.tmp_path / f"frame-0.{expected_frame_ext}").is_file()
        assert self.stdout.getvalue() == ""

    @pytest.mark.parametrize("quality", ("compressed", "original"))
    def test_can_download_chunk(self, fxt_new_task: Task, quality: str):
        chunk_path = self.tmp_path / "chunk.zip"

        with open(chunk_path, "wb") as chunk_file:
            fxt_new_task.download_chunk(0, chunk_file, quality=quality)

        with zipfile.ZipFile(chunk_path, "r") as chunk_zip:
            assert chunk_zip.testzip() is None
            assert len(chunk_zip.infolist()) == 1
        assert self.stdout.getvalue() == ""

    def test_can_upload_annotations(self, fxt_new_task: Task, fxt_coco_file: Path):
        pbar_out = io.StringIO()
        pbar = make_pbar(file=pbar_out)

        fxt_new_task.import_annotations(format_name="COCO 1.0", filename=fxt_coco_file, pbar=pbar)

        assert "uploaded" in self.logger_stream.getvalue()
        assert "100%" in pbar_out.getvalue().strip("\r").split("\r")[-1]
        assert self.stdout.getvalue() == ""

    def _test_can_create_from_backup(self, fxt_new_task: Task, fxt_backup_file: Path):
        pbar_out = io.StringIO()
        pbar = make_pbar(file=pbar_out)

        task = self.client.tasks.create_from_backup(fxt_backup_file, pbar=pbar)

        assert task.id
        assert task.id != fxt_new_task.id
        assert task.size == fxt_new_task.size
        assert "imported successfully" in self.logger_stream.getvalue()
        assert "100%" in pbar_out.getvalue().strip("\r").split("\r")[-1]
        assert self.stdout.getvalue() == ""

    def test_can_create_from_backup(self, fxt_new_task: Task, fxt_backup_file: Path):
        self._test_can_create_from_backup(fxt_new_task, fxt_backup_file)

    def test_can_create_from_backup_in_chunks(
        self, monkeypatch: pytest.MonkeyPatch, fxt_new_task: Task, fxt_backup_file: Path
    ):
        monkeypatch.setattr(Uploader, "_CHUNK_SIZE", 100)

        num_requests = 0
        original_do_request = _MyTusUploader._do_request

        def counting_do_request(uploader):
            nonlocal num_requests
            num_requests += 1
            original_do_request(uploader)

        monkeypatch.setattr(_MyTusUploader, "_do_request", counting_do_request)

        self._test_can_create_from_backup(fxt_new_task, fxt_backup_file)

        # make sure the upload was actually chunked
        assert num_requests > 1

    def test_can_get_labels(self, fxt_new_task: Task):
        expected_labels = {"car", "person"}

        received_labels = fxt_new_task.get_labels()

        assert {obj.name for obj in received_labels} == expected_labels
        assert self.stdout.getvalue() == ""

    def test_can_get_jobs(self, fxt_new_task: Task):
        jobs = fxt_new_task.get_jobs()

        assert len(jobs) != 0
        assert self.stdout.getvalue() == ""

    def test_can_get_meta(self, fxt_new_task: Task):
        meta = fxt_new_task.get_meta()

        assert meta.image_quality == 80
        assert meta.size == 1
        assert not meta.deleted_frames
        assert self.stdout.getvalue() == ""

    def test_can_get_frame_info(self, fxt_new_task: Task):
        meta = fxt_new_task.get_meta()
        frames = fxt_new_task.get_frames_info()

        assert len(frames) == meta.size
        assert frames[0].name == "img.png"
        assert frames[0].width == 5
        assert frames[0].height == 10
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
        labels = fxt_new_task.get_labels()
        fxt_new_task.set_annotations(
            models.LabeledDataRequest(
                tags=[models.LabeledImageRequest(frame=0, label_id=labels[0].id)],
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
        labels = fxt_new_task.get_labels()
        fxt_new_task.set_annotations(
            models.LabeledDataRequest(
                shapes=[
                    models.LabeledShapeRequest(
                        frame=0,
                        label_id=labels[0].id,
                        type="rectangle",
                        points=[1, 1, 2, 2],
                    ),
                    models.LabeledShapeRequest(
                        frame=0,
                        label_id=labels[0].id,
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
        labels = fxt_task_with_shapes.get_labels()
        fxt_task_with_shapes.update_annotations(
            models.PatchedLabeledDataRequest(
                shapes=[
                    models.LabeledShapeRequest(
                        frame=0,
                        label_id=labels[0].id,
                        type="rectangle",
                        points=[0, 1, 2, 3],
                    ),
                ],
                tracks=[
                    models.LabeledTrackRequest(
                        frame=0,
                        label_id=labels[0].id,
                        shapes=[
                            models.TrackedShapeRequest(
                                frame=0, type="polygon", points=[3, 2, 2, 3, 3, 4]
                            ),
                        ],
                    )
                ],
                tags=[models.LabeledImageRequest(frame=0, label_id=labels[0].id)],
            )
        )

        anns = fxt_task_with_shapes.get_annotations()
        assert len(anns.shapes) == 2
        assert len(anns.tracks) == 1
        assert len(anns.tags) == 1
        assert self.stdout.getvalue() == ""
