# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import os
import zipfile

import pytest
from cvat_sdk.api_client import exceptions
from cvat_sdk.core.proxies.projects import Project
from cvat_sdk.core.proxies.tasks import ResourceType

from .util import TestCliBase, generate_images


class TestCliProjects(TestCliBase):
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
    def fxt_project_with_task(self, fxt_new_project: Project):
        files = generate_images(self.tmp_path, 5)

        self.client.tasks.create_from_data(
            spec={
                "name": "test_task",
                "project_id": fxt_new_project.id,
            },
            resource_type=ResourceType.LOCAL,
            resources=files,
        )
        fxt_new_project.fetch()

        return fxt_new_project

    @pytest.fixture
    def fxt_backup_file(self, fxt_project_with_task: Project):
        backup_path = self.tmp_path / "backup.zip"

        fxt_project_with_task.download_backup(backup_path)

        yield backup_path

    def test_can_create_project(self):
        stdout = self.run_cli(
            "project",
            "create",
            "new_project",
            "--labels",
            json.dumps([{"name": "car"}, {"name": "person"}]),
            "--bug_tracker",
            "https://bugs.example/",
        )

        project_id = int(stdout.rstrip("\n"))
        created_project = self.client.projects.retrieve(project_id)
        assert created_project.name == "new_project"
        assert created_project.bug_tracker == "https://bugs.example/"
        assert {label.name for label in created_project.get_labels()} == {"car", "person"}

    def test_can_create_project_from_dataset(self, fxt_coco_dataset):
        stdout = self.run_cli(
            "project",
            "create",
            "new_project",
            "--dataset_path",
            os.fspath(fxt_coco_dataset),
            "--dataset_format",
            "COCO 1.0",
        )

        project_id = int(stdout.rstrip("\n"))
        created_project = self.client.projects.retrieve(project_id)
        assert created_project.name == "new_project"
        assert {label.name for label in created_project.get_labels()} == {"car", "person"}
        assert created_project.tasks.count == 1

    def test_can_list_projects_in_simple_format(self, fxt_new_project: Project):
        output = self.run_cli("project", "ls")

        results = output.split("\n")
        assert any(str(fxt_new_project.id) in r for r in results)

    def test_can_list_project_in_json_format(self, fxt_new_project: Project):
        output = self.run_cli("project", "ls", "--json")

        results = json.loads(output)
        assert any(r["id"] == fxt_new_project.id for r in results)

    def test_can_delete_project(self, fxt_new_project: Project):
        self.run_cli("project", "delete", str(fxt_new_project.id))

        with pytest.raises(exceptions.NotFoundException):
            fxt_new_project.fetch()

    def test_can_download_project_backup(self, fxt_project_with_task: Project):
        filename = self.tmp_path / f"project_{fxt_project_with_task.id}-cvat.zip"
        self.run_cli(
            "project",
            "backup",
            str(fxt_project_with_task.id),
            str(filename),
            "--completion_verification_period",
            "0.01",
        )

        assert 0 < filename.stat().st_size
        with zipfile.ZipFile(filename) as backup_zip:
            assert "project.json" in backup_zip.namelist()

    def test_can_download_project_backup_with_server_filename(self, fxt_project_with_task: Project):
        output_dir = str(self.tmp_path / "save_dir") + os.path.sep
        self.run_cli(
            "project",
            "backup",
            str(fxt_project_with_task.id),
            output_dir,
            "--completion_verification_period",
            "0.01",
        )

        output_dir_files = os.listdir(output_dir)
        assert len(output_dir_files) == 1
        assert os.stat(output_dir + output_dir_files[0]).st_size > 0

    def test_can_create_project_from_backup(self, fxt_project_with_task: Project, fxt_backup_file):
        stdout = self.run_cli("project", "create-from-backup", str(fxt_backup_file))

        project_id = int(stdout.rstrip("\n"))
        assert project_id
        assert project_id != fxt_project_with_task.id

        restored_project = self.client.projects.retrieve(project_id)
        restored_tasks = restored_project.get_tasks()
        assert len(restored_tasks) == 1
        assert restored_tasks[0].size == fxt_project_with_task.get_tasks()[0].size

    def test_can_download_project_annotations(self, fxt_project_with_task: Project):
        filename = self.tmp_path / f"project_{fxt_project_with_task.id}-cvat.zip"
        self.run_cli(
            "project",
            "export-dataset",
            str(fxt_project_with_task.id),
            str(filename),
            "--format",
            "CVAT for images 1.1",
            "--with-images",
            "no",
            "--completion_verification_period",
            "0.01",
        )

        assert 0 < filename.stat().st_size

    def test_can_download_project_annotations_with_server_filename(
        self, fxt_project_with_task: Project
    ):
        output_dir = str(self.tmp_path / "save_dir") + os.path.sep
        self.run_cli(
            "project",
            "export-dataset",
            str(fxt_project_with_task.id),
            output_dir,
            "--format",
            "CVAT for images 1.1",
            "--with-images",
            "yes",
            "--completion_verification_period",
            "0.01",
        )

        output_dir_files = os.listdir(output_dir)
        assert len(output_dir_files) == 1
        assert os.stat(output_dir + output_dir_files[0]).st_size > 0

    def test_can_upload_project_annotations(self, fxt_new_project: Project, fxt_coco_dataset):
        self.run_cli(
            "project",
            "import-dataset",
            str(fxt_new_project.id),
            os.fspath(fxt_coco_dataset),
            "--format",
            "COCO 1.0",
        )

        fxt_new_project.fetch()
        assert fxt_new_project.tasks.count == 1
