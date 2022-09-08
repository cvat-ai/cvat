# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import os
from logging import Logger
from pathlib import Path
from typing import Tuple

import pytest
from cvat_sdk import Client, models
from cvat_sdk.api_client import exceptions
from cvat_sdk.core.proxies.projects import Project
from cvat_sdk.core.proxies.tasks import ResourceType, Task
from cvat_sdk.core.utils import filter_dict

from shared.utils.config import USER_PASS

from .util import make_pbar


class TestProjectUsecases:
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

    @pytest.fixture
    def fxt_new_project(self):
        project = self.client.projects.create(
            spec={
                "name": "test_project",
                "labels": [{"name": "car"}, {"name": "person"}],
            },
        )

        return project

    @pytest.fixture
    def fxt_empty_project(self):
        project = self.client.projects.create(spec={"name": "test_project"})

        return project

    @pytest.fixture
    def fxt_project_with_shapes(self, fxt_empty_project: Project, fxt_task_with_shapes: Task):
        fxt_empty_project.update(
            models.PatchedProjectWriteRequest(
                labels=[
                    models.PatchedLabelRequest(**filter_dict(label.to_dict(), drop=["id"]))
                    for label in fxt_task_with_shapes.labels
                ]
            )
        )
        fxt_task_with_shapes.update(models.PatchedTaskWriteRequest(project_id=fxt_empty_project.id))
        fxt_empty_project.fetch()
        return fxt_empty_project

    @pytest.fixture
    def fxt_backup_file(self, fxt_project_with_shapes: Project):
        backup_path = self.tmp_path / "backup.zip"

        fxt_project_with_shapes.download_backup(str(backup_path))

        yield backup_path

    def test_can_create_empty_project(self):
        project = self.client.projects.create(spec=models.ProjectWriteRequest(name="test project"))

        assert project.id != 0
        assert project.name == "test project"

    def test_can_create_project_from_dataset(self, fxt_coco_dataset: Path):
        pbar_out = io.StringIO()
        pbar = make_pbar(file=pbar_out)

        project = self.client.projects.create_from_dataset(
            spec=models.ProjectWriteRequest(name="project with data"),
            dataset_path=fxt_coco_dataset,
            dataset_format="COCO 1.0",
            pbar=pbar,
        )

        assert project.get_tasks()[0].size == 1
        assert "100%" in pbar_out.getvalue().strip("\r").split("\r")[-1]
        assert self.stdout.getvalue() == ""

    def test_can_retrieve_project(self, fxt_new_project: Project):
        project_id = fxt_new_project.id

        project = self.client.projects.retrieve(project_id)

        assert project.id == project_id
        assert self.stdout.getvalue() == ""

    def test_can_list_projects(self, fxt_new_project: Project):
        project_id = fxt_new_project.id

        projects = self.client.projects.list()

        assert any(t.id == project_id for t in projects)
        assert self.stdout.getvalue() == ""

    def test_can_update_project(self, fxt_new_project: Project):
        fxt_new_project.update(models.PatchedTaskWriteRequest(name="foo"))

        retrieved_project = self.client.projects.retrieve(fxt_new_project.id)
        assert retrieved_project.name == "foo"
        assert fxt_new_project.name == retrieved_project.name
        assert self.stdout.getvalue() == ""

    def test_can_delete_project(self, fxt_new_project: Project):
        fxt_new_project.remove()

        with pytest.raises(exceptions.NotFoundException):
            fxt_new_project.fetch()
        assert self.stdout.getvalue() == ""

    def test_can_get_tasks(self, fxt_project_with_shapes: Project):
        task_ids = set(fxt_project_with_shapes.tasks)

        tasks = fxt_project_with_shapes.get_tasks()

        assert len(tasks) == 1
        assert {tasks[0].id} == task_ids

    def test_can_download_backup(self, fxt_project_with_shapes: Project):
        pbar_out = io.StringIO()
        pbar = make_pbar(file=pbar_out)
        backup_path = self.tmp_path / "backup.zip"

        fxt_project_with_shapes.download_backup(str(backup_path), pbar=pbar)

        assert os.stat(str(backup_path)).st_size > 0
        assert "100%" in pbar_out.getvalue().strip("\r").split("\r")[-1]
        assert self.stdout.getvalue() == ""

    def test_can_create_from_backup(self, fxt_backup_file: Path):
        pbar_out = io.StringIO()
        pbar = make_pbar(file=pbar_out)

        restored_project = self.client.projects.create_from_backup(fxt_backup_file, pbar=pbar)

        assert restored_project.get_tasks()[0].size == 1
        assert "100%" in pbar_out.getvalue().strip("\r").split("\r")[-1]
        assert self.stdout.getvalue() == ""
