# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
from logging import Logger
from pathlib import Path
from typing import Optional

import pytest
from cvat_sdk import Client, models
from cvat_sdk.api_client import exceptions
from cvat_sdk.core.proxies.projects import Project
from cvat_sdk.core.proxies.tasks import Task
from cvat_sdk.core.proxies.types import Location
from cvat_sdk.core.utils import filter_dict
from PIL import Image
from pytest_cases import fixture_ref, parametrize

from shared.fixtures.data import CloudStorageAssets
from shared.utils.config import IMPORT_EXPORT_BUCKET_ID

from .common import TestDatasetExport
from .util import make_pbar


class TestProjectUsecases(TestDatasetExport):
    @pytest.fixture(autouse=True)
    def setup(
        self,
        tmp_path: Path,
        fxt_login: tuple[Client, str],
        fxt_logger: tuple[Logger, io.StringIO],
        fxt_stdout: io.StringIO,
        restore_redis_ondisk_per_function,
    ):
        self.tmp_path = tmp_path
        logger, self.logger_stream = fxt_logger
        self.stdout = fxt_stdout
        self.client, self.user = fxt_login
        self.client.logger = logger

        api_client = self.client.api_client
        for k in api_client.configuration.logger:
            api_client.configuration.logger[k] = logger

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
    def fxt_new_project_with_target_storage(self):
        project = self.client.projects.create(
            spec={
                "name": "test_project",
                "labels": [{"name": "car"}, {"name": "person"}],
                "target_storage": {
                    "location": Location.CLOUD_STORAGE,
                    "cloud_storage_id": IMPORT_EXPORT_BUCKET_ID,
                },
            },
        )

        return project

    @pytest.fixture
    def fxt_empty_project(self):
        return self.client.projects.create(spec={"name": "test_project"})

    @pytest.fixture
    def fxt_project_with_shapes(self, fxt_task_with_shapes: Task):
        project = self.client.projects.create(
            spec=models.ProjectWriteRequest(
                name="test_project",
                labels=[
                    models.PatchedLabelRequest(
                        **filter_dict(label.to_dict(), drop=["id", "has_parent"])
                    )
                    for label in fxt_task_with_shapes.get_labels()
                ],
            )
        )
        fxt_task_with_shapes.update(models.PatchedTaskWriteRequest(project_id=project.id))
        project.fetch()
        return project

    @pytest.fixture
    def fxt_backup_file(self, fxt_project_with_shapes: Project):
        backup_path = self.tmp_path / "backup.zip"

        fxt_project_with_shapes.download_backup(str(backup_path))

        yield backup_path

    def test_can_create_empty_project(self):
        project = self.client.projects.create(spec=models.ProjectWriteRequest(name="test project"))

        assert project.id != 0
        assert project.name == "test project"

    def test_can_create_project_with_attribute_with_blank_default(self):
        project = self.client.projects.create(
            spec=models.ProjectWriteRequest(
                name="test project",
                labels=[
                    models.PatchedLabelRequest(
                        name="text",
                        attributes=[
                            models.AttributeRequest(
                                name="text",
                                mutable=True,
                                input_type=models.InputTypeEnum("text"),
                                values=[],
                                default_value="",
                            )
                        ],
                    )
                ],
            )
        )

        labels = project.get_labels()
        assert labels[0].attributes[0].default_value == ""

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

        assert any(p.id == project_id for p in projects)
        assert self.stdout.getvalue() == ""

    def test_can_update_project(self, fxt_new_project: Project):
        fxt_new_project.update(models.PatchedProjectWriteRequest(name="foo"))

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
        tasks = fxt_project_with_shapes.get_tasks()

        assert len(tasks) == 1
        assert tasks[0].project_id == fxt_project_with_shapes.id

    def test_can_get_labels(self, fxt_project_with_shapes: Project):
        expected_labels = {"car", "person"}

        received_labels = fxt_project_with_shapes.get_labels()

        assert {obj.name for obj in received_labels} == expected_labels
        assert self.stdout.getvalue() == ""

    def test_can_download_backup(self, fxt_project_with_shapes: Project):
        pbar_out = io.StringIO()
        pbar = make_pbar(file=pbar_out)
        backup_path = self.tmp_path / "backup.zip"

        fxt_project_with_shapes.download_backup(str(backup_path), pbar=pbar)

        assert backup_path.stat().st_size > 0
        assert "100%" in pbar_out.getvalue().strip("\r").split("\r")[-1]
        assert self.stdout.getvalue() == ""

    def test_can_create_from_backup(self, fxt_backup_file: Path):
        pbar_out = io.StringIO()
        pbar = make_pbar(file=pbar_out)

        restored_project = self.client.projects.create_from_backup(fxt_backup_file, pbar=pbar)

        assert restored_project.get_tasks()[0].size == 1
        assert "100%" in pbar_out.getvalue().strip("\r").split("\r")[-1]
        assert self.stdout.getvalue() == ""

    @pytest.mark.parametrize("format_name", ("CVAT for images 1.1",))
    @pytest.mark.parametrize("include_images", (True, False))
    @parametrize(
        "project, location",
        [
            (fixture_ref("fxt_new_project"), None),
            (fixture_ref("fxt_new_project"), Location.LOCAL),
            (
                pytest.param(
                    fixture_ref("fxt_new_project"),
                    Location.CLOUD_STORAGE,
                    marks=pytest.mark.with_external_services,
                )
            ),
            (
                pytest.param(
                    fixture_ref("fxt_new_project_with_target_storage"),
                    None,
                    marks=pytest.mark.with_external_services,
                )
            ),
            (fixture_ref("fxt_new_project_with_target_storage"), Location.LOCAL),
            (
                pytest.param(
                    fixture_ref("fxt_new_project_with_target_storage"),
                    Location.CLOUD_STORAGE,
                    marks=pytest.mark.with_external_services,
                )
            ),
        ],
    )
    def test_can_export_dataset(
        self,
        format_name: str,
        include_images: bool,
        project: Project,
        location: Optional[Location],
        request: pytest.FixtureRequest,
        cloud_storages: CloudStorageAssets,
    ):
        file_path = self.tmp_path / f"project_{project.id}-{format_name.lower()}.zip"
        self._test_can_export_dataset(
            project,
            format_name=format_name,
            file_path=file_path,
            include_images=include_images,
            location=location,
            request=request,
            cloud_storages=cloud_storages,
        )

    def test_can_download_preview(self, fxt_project_with_shapes: Project):
        frame_encoded = fxt_project_with_shapes.get_preview()
        (width, height) = Image.open(frame_encoded).size

        assert width > 0 and height > 0
        assert self.stdout.getvalue() == ""
