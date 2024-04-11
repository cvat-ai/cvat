# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
from logging import Logger
from pathlib import Path
from typing import Tuple

import pytest
from cvat_sdk import Client
from cvat_sdk.api_client import models
from cvat_sdk.core.proxies.tasks import ResourceType, Task
from PIL import Image

from .util import make_pbar


class TestJobUsecases:
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
    def fxt_new_task(self, fxt_image_file: Path):
        task = self.client.tasks.create_from_data(
            spec={
                "name": "test_task",
                "labels": [{"name": "car"}, {"name": "person"}],
            },
            resource_type=ResourceType.LOCAL,
            resources=[fxt_image_file],
            data_params={"image_quality": 80},
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

    def test_can_retrieve_job(self, fxt_new_task: Task):
        job_id = fxt_new_task.get_jobs()[0].id

        job = self.client.jobs.retrieve(job_id)

        assert job.id == job_id
        assert self.stdout.getvalue() == ""

    def test_can_list_jobs(self, fxt_new_task: Task):
        task_job_ids = set(j.id for j in fxt_new_task.get_jobs())

        jobs = self.client.jobs.list()

        assert len(task_job_ids) != 0
        assert task_job_ids.issubset(j.id for j in jobs)
        assert self.stdout.getvalue() == ""

    def test_can_update_job_field_directly(self, fxt_new_task: Task):
        job = self.client.jobs.list()[0]
        assert not job.assignee
        new_assignee = self.client.users.list()[0]

        job.update({"assignee": new_assignee.id})

        updated_job = self.client.jobs.retrieve(job.id)
        assert updated_job.assignee.id == new_assignee.id
        assert self.stdout.getvalue() == ""

    def test_can_get_labels(self, fxt_new_task: Task):
        expected_labels = {"car", "person"}

        received_labels = fxt_new_task.get_jobs()[0].get_labels()

        assert {obj.name for obj in received_labels} == expected_labels
        assert self.stdout.getvalue() == ""

    @pytest.mark.parametrize("include_images", (True, False))
    def test_can_download_dataset(self, fxt_new_task: Task, include_images: bool):
        pbar_out = io.StringIO()
        pbar = make_pbar(file=pbar_out)

        task_id = fxt_new_task.id
        path = self.tmp_path / f"task_{task_id}-cvat.zip"
        job_id = fxt_new_task.get_jobs()[0].id
        job = self.client.jobs.retrieve(job_id)
        job.export_dataset(
            format_name="CVAT for images 1.1",
            filename=path,
            pbar=pbar,
            include_images=include_images,
        )

        assert "100%" in pbar_out.getvalue().strip("\r").split("\r")[-1]
        assert path.is_file()
        assert self.stdout.getvalue() == ""

    def test_can_download_preview(self, fxt_new_task: Task):
        frame_encoded = fxt_new_task.get_jobs()[0].get_preview()
        (width, height) = Image.open(frame_encoded).size

        assert width > 0 and height > 0
        assert self.stdout.getvalue() == ""

    @pytest.mark.parametrize("quality", ("compressed", "original"))
    def test_can_download_frame(self, fxt_new_task: Task, quality: str):
        frame_encoded = fxt_new_task.get_jobs()[0].get_frame(0, quality=quality)
        (width, height) = Image.open(frame_encoded).size

        assert width > 0 and height > 0
        assert self.stdout.getvalue() == ""

    @pytest.mark.parametrize("quality", ("compressed", "original"))
    @pytest.mark.parametrize("image_extension", (None, "bmp"))
    def test_can_download_frames(self, fxt_new_task: Task, quality: str, image_extension: str):
        fxt_new_task.get_jobs()[0].download_frames(
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

    def test_can_upload_annotations(self, fxt_new_task: Task, fxt_coco_file: Path):
        pbar_out = io.StringIO()
        pbar = make_pbar(file=pbar_out)

        fxt_new_task.get_jobs()[0].import_annotations(
            format_name="COCO 1.0", filename=fxt_coco_file, pbar=pbar
        )

        assert "uploaded" in self.logger_stream.getvalue()
        assert "100%" in pbar_out.getvalue().strip("\r").split("\r")[-1]
        assert self.stdout.getvalue() == ""

    def test_can_get_meta(self, fxt_new_task: Task):
        meta = fxt_new_task.get_jobs()[0].get_meta()

        assert meta.image_quality == 80
        assert meta.size == 1
        assert not meta.deleted_frames
        assert self.stdout.getvalue() == ""

    def test_can_get_frame_info(self, fxt_new_task: Task):
        job = meta = fxt_new_task.get_jobs()[0]
        meta = job.get_meta()
        frames = job.get_frames_info()

        assert len(frames) == meta.size
        assert frames[0].name == "img.png"
        assert frames[0].width == 5
        assert frames[0].height == 10
        assert self.stdout.getvalue() == ""

    def test_can_remove_frames(self, fxt_new_task: Task):
        fxt_new_task.get_jobs()[0].remove_frames_by_ids([0])

        meta = fxt_new_task.get_jobs()[0].get_meta()
        assert meta.deleted_frames == [0]
        assert self.stdout.getvalue() == ""

    def test_can_get_issues(self, fxt_new_task: Task):
        issue = self.client.issues.create(
            models.IssueWriteRequest(
                frame=0,
                position=[2.0, 4.0],
                job=fxt_new_task.get_jobs()[0].id,
                message="hello",
            )
        )

        job_issue_ids = set(j.id for j in fxt_new_task.get_jobs()[0].get_issues())

        assert {issue.id} == job_issue_ids
        assert self.stdout.getvalue() == ""

    def test_can_get_annotations(self, fxt_task_with_shapes: Task):
        anns = fxt_task_with_shapes.get_jobs()[0].get_annotations()

        assert len(anns.shapes) == 1
        assert anns.shapes[0].type.value == "rectangle"
        assert self.stdout.getvalue() == ""

    def test_can_set_annotations(self, fxt_new_task: Task):
        labels = fxt_new_task.get_labels()
        fxt_new_task.get_jobs()[0].set_annotations(
            models.LabeledDataRequest(
                tags=[models.LabeledImageRequest(frame=0, label_id=labels[0].id)],
            )
        )

        anns = fxt_new_task.get_jobs()[0].get_annotations()

        assert len(anns.tags) == 1
        assert self.stdout.getvalue() == ""

    def test_can_clear_annotations(self, fxt_task_with_shapes: Task):
        fxt_task_with_shapes.get_jobs()[0].remove_annotations()

        anns = fxt_task_with_shapes.get_jobs()[0].get_annotations()
        assert len(anns.tags) == 0
        assert len(anns.tracks) == 0
        assert len(anns.shapes) == 0
        assert self.stdout.getvalue() == ""

    def test_can_remove_annotations(self, fxt_new_task: Task):
        labels = fxt_new_task.get_labels()
        fxt_new_task.get_jobs()[0].set_annotations(
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
        anns = fxt_new_task.get_jobs()[0].get_annotations()

        fxt_new_task.get_jobs()[0].remove_annotations(ids=[anns.shapes[0].id])

        anns = fxt_new_task.get_jobs()[0].get_annotations()
        assert len(anns.tags) == 0
        assert len(anns.tracks) == 0
        assert len(anns.shapes) == 1
        assert self.stdout.getvalue() == ""

    def test_can_update_annotations(self, fxt_task_with_shapes: Task):
        labels = fxt_task_with_shapes.get_labels()
        fxt_task_with_shapes.get_jobs()[0].update_annotations(
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

        anns = fxt_task_with_shapes.get_jobs()[0].get_annotations()
        assert len(anns.shapes) == 2
        assert len(anns.tracks) == 1
        assert len(anns.tags) == 1
        assert self.stdout.getvalue() == ""
