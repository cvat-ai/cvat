# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
import subprocess
import sys
from pathlib import Path

import pytest
from shared.utils.config import (
    BASE_URL,
    IMPORT_EXPORT_BUCKET_ID,
    MINIO_KEY,
    MINIO_SECRET_KEY,
    USER_PASS,
)
from shared.utils.helpers import generate_image_file

from cvat_sdk import Client, models
from cvat_sdk.core.proxies.projects import Project
from cvat_sdk.core.proxies.tasks import ResourceType, Task

EXAMPLES_DIR = Path(__file__).parents[3] / "cvat-sdk" / "examples"


@pytest.fixture(scope="class")
def fxt_access_token(fxt_login: tuple[Client, str]) -> str:
    client, _ = fxt_login
    token, _ = client.api_client.auth_api.create_access_tokens(
        access_token_write_request=models.AccessTokenWriteRequest(
            name="examples tests", read_only=False
        )
    )
    return token.value


class TestExamples:
    @pytest.fixture(autouse=True)
    def setup(self, tmp_path: Path, fxt_login: tuple[Client, str], fxt_access_token: str):
        self.tmp_path = tmp_path
        self.client, self.user = fxt_login
        self.token = fxt_access_token

    def run_recipe(
        self,
        name: str,
        extra_env: dict[str, str] | None = None,
        expect_failure: bool = False,
    ) -> subprocess.CompletedProcess:
        env = {
            **os.environ,
            "CVAT_HOST": BASE_URL,
            "CVAT_ACCESS_TOKEN": self.token,
            "CVAT_EXAMPLES_CLEANUP": "1",
            **(extra_env or {}),
        }
        result = subprocess.run(
            [sys.executable, str(EXAMPLES_DIR / name)],
            env=env,
            cwd=self.tmp_path,
            capture_output=True,
            text=True,
        )
        if expect_failure:
            assert result.returncode != 0, f"{name} unexpectedly succeeded:\n{result.stdout}"
        else:
            assert result.returncode == 0, (
                f"{name} failed with code {result.returncode}\n"
                f"stdout:\n{result.stdout}\nstderr:\n{result.stderr}"
            )
        return result

    def make_image_dir(self, count: int = 2) -> Path:
        image_dir = self.tmp_path / "images"
        image_dir.mkdir(exist_ok=True)
        for i in range(count):
            path = image_dir / f"img_{i}.png"
            path.write_bytes(generate_image_file(filename=str(path), size=(5, 10)).getvalue())
        return image_dir

    def make_project(self, name: str = "Recipe project") -> Project:
        return self.client.projects.create(
            models.ProjectWriteRequest(
                name=name, labels=[models.PatchedLabelRequest(name="object")]
            )
        )

    def make_task(self, name: str = "Recipe task", resources: list[Path] | None = None) -> Task:
        if resources is None:
            resources = sorted(self.make_image_dir().iterdir())
        return self.client.tasks.create_from_data(
            spec=models.TaskWriteRequest(
                name=name, labels=[models.PatchedLabelRequest(name="object")]
            ),
            resource_type=ResourceType.LOCAL,
            resources=resources,
        )

    def make_project_with_task(self) -> Project:
        project = self.make_project()
        self.client.tasks.create_from_data(
            spec=models.TaskWriteRequest(name="Recipe project task", project_id=project.id),
            resource_type=ResourceType.LOCAL,
            resources=sorted(self.make_image_dir().iterdir()),
        )
        return project

    def test_auth_connect(self):
        result = self.run_recipe("auth_connect.py")
        assert f"Authenticated as {self.user}" in result.stdout

    def test_auth_profiles_password_fallback(self):
        result = self.run_recipe(
            "auth_profiles.py",
            {"CVAT_USERNAME": self.user, "CVAT_PASSWORD": USER_PASS},
        )
        assert "deprecated" in result.stdout
        assert f"Authenticated as {self.user}" in result.stdout

    @pytest.mark.with_external_services
    def test_cloud_storage_register(self):
        result = self.run_recipe(
            "cloud_storage_register.py",
            {
                "S3_BUCKET": "test",
                "S3_ACCESS_KEY": MINIO_KEY,
                "S3_SECRET_KEY": MINIO_SECRET_KEY,
                "S3_ENDPOINT_URL": "http://minio:9000",
            },
        )
        assert "Registered cloud storage" in result.stdout
        assert "(updated)" in result.stdout
        assert "Deleted cloud storage" in result.stdout

    def test_job_workflow(self, fxt_image_file: Path, fxt_coco_file: Path):
        # The COCO fixture references labels 'car' and 'person', so the task
        # must have them for import to succeed.
        task = self.client.tasks.create_from_data(
            spec=models.TaskWriteRequest(
                name="Workflow task",
                labels=[
                    models.PatchedLabelRequest(name="car"),
                    models.PatchedLabelRequest(name="person"),
                ],
            ),
            resource_type=ResourceType.LOCAL,
            resources=[fxt_image_file],
        )
        result = self.run_recipe(
            "job_workflow.py",
            {"CVAT_TASK_ID": str(task.id), "ANNOTATIONS_PATH": str(fxt_coco_file)},
        )
        assert "Imported COCO 1.0 annotations" in result.stdout
        assert "to the validation stage" in result.stdout
        job = task.get_jobs()[0]
        assert self.client.jobs.retrieve(job.id).get_annotations().shapes
        assert self.client.jobs.retrieve(job.id).stage == "validation"

    def test_job_list_and_assign(self):
        task = self.make_task()
        result = self.run_recipe("job_list_and_assign.py", {"CVAT_TASK_ID": str(task.id)})
        me = self.client.users.retrieve_current_user()
        assert f"-> user {me.id}" in result.stdout
        for job in task.get_jobs():
            assert self.client.jobs.retrieve(job.id).assignee.id == me.id

    @pytest.mark.with_external_services
    def test_task_inspect_and_export(self):
        task = self.make_task()
        result = self.run_recipe(
            "task_inspect_and_export.py",
            {
                "CVAT_TASK_ID": str(task.id),
                "CVAT_CLOUD_STORAGE_ID": str(IMPORT_EXPORT_BUCKET_ID),
            },
        )
        assert "labels: ['object']" in result.stdout
        local = self.tmp_path / f"task_{task.id}_dataset.zip"
        assert local.exists() and local.stat().st_size > 0
        assert f"to cloud storage {IMPORT_EXPORT_BUCKET_ID}" in result.stdout

    @pytest.mark.with_external_services
    def test_task_create_from_cloud(self):
        result = self.run_recipe(
            "task_create_from_cloud.py",
            {
                "CVAT_CLOUD_STORAGE_ID": str(IMPORT_EXPORT_BUCKET_ID),
                "CLOUD_KEYS": "images/image_1.jpg,images/image_2.jpg",
            },
        )
        assert "Created task" in result.stdout
        assert "with 2 frames" in result.stdout
        assert "Deleted task" in result.stdout

    def test_task_create_from_images_standalone(self):
        image_dir = self.make_image_dir()
        result = self.run_recipe("task_create_from_images.py", {"IMAGE_DIR": str(image_dir)})
        assert "Created task" in result.stdout
        assert "with 2 frames" in result.stdout
        assert "Deleted task" in result.stdout

    def test_task_create_from_images_in_project(self):
        project = self.make_project()
        image_dir = self.make_image_dir()
        result = self.run_recipe(
            "task_create_from_images.py",
            {"IMAGE_DIR": str(image_dir), "CVAT_PROJECT_ID": str(project.id)},
        )
        assert f"into project {project.id}" in result.stdout

    def test_task_create_from_images_empty_dir(self):
        empty = self.tmp_path / "empty"
        empty.mkdir()
        result = self.run_recipe(
            "task_create_from_images.py", {"IMAGE_DIR": str(empty)}, expect_failure=True
        )
        assert "No images found" in result.stderr

    @pytest.mark.with_external_services
    def test_project_export_dataset(self):
        project = self.make_project_with_task()
        result = self.run_recipe(
            "project_export_dataset.py",
            {
                "CVAT_PROJECT_ID": str(project.id),
                "CVAT_CLOUD_STORAGE_ID": str(IMPORT_EXPORT_BUCKET_ID),
            },
        )
        local = self.tmp_path / f"project_{project.id}_dataset.zip"
        assert local.exists() and local.stat().st_size > 0
        assert f"to cloud storage {IMPORT_EXPORT_BUCKET_ID}" in result.stdout

    def test_project_export_dataset_rejects_unknown_format(self):
        project = self.make_project_with_task()
        result = self.run_recipe(
            "project_export_dataset.py",
            {
                "CVAT_PROJECT_ID": str(project.id),
                "CVAT_CLOUD_STORAGE_ID": "1",
                "CVAT_EXPORT_FORMAT": "Bogus 9.9",
            },
            expect_failure=True,
        )
        assert "Unknown export format" in result.stderr

    def test_project_backup_restore(self):
        project = self.make_project_with_task()
        result = self.run_recipe("project_backup_restore.py", {"CVAT_PROJECT_ID": str(project.id)})
        assert (self.tmp_path / "project_backup.zip").exists()
        assert "Restored a copy as project" in result.stdout
        assert "Deleted restored project" in result.stdout

    def test_project_status_report(self):
        project = self.make_project_with_task()
        self.run_recipe("project_status_report.py", {"CVAT_PROJECT_ID": str(project.id)})
        report = self.tmp_path / "report.csv"
        assert report.exists()
        lines = report.read_text().splitlines()
        assert lines[0] == (
            "project_id,project_name,task_id,task_name,job_id,stage,state,assignee,frames"
        )
        assert len(lines) == 2  # header + one job row

    def test_project_create_and_list(self):
        result = self.run_recipe(
            "project_create_and_list.py", {"CVAT_PROJECT_NAME": "Recipes CI project"}
        )
        assert "Created project" in result.stdout
        assert "Renamed to: Recipes CI project (renamed)" in result.stdout
        assert "Deleted project" in result.stdout
        assert all(p.name != "Recipes CI project (renamed)" for p in self.client.projects.list())
