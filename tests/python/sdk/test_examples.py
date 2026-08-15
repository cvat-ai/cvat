# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import sys
from logging import Logger
from pathlib import Path

import pytest
from cvat_sdk import Client

sys.path.insert(0, str(Path(__file__).parents[3] / "cvat-sdk"))


class TestExamples:
    @pytest.fixture(autouse=True)
    def setup(
        self,
        tmp_path: Path,
        fxt_login: tuple[Client, str],
        fxt_logger: tuple[Logger, io.StringIO],
    ):
        self.tmp_path = tmp_path
        self.client, self.user = fxt_login

    def test_examples_package_importable(self):
        from examples import _auth

        assert hasattr(_auth, "open_client")

    def test_auth_whoami(self):
        from examples import authentication

        assert authentication.whoami(self.client) == self.user

    @pytest.mark.with_external_services
    def test_cloud_storage_lifecycle(self):
        from shared.utils.config import MINIO_KEY, MINIO_SECRET_KEY

        from examples import cloud_storage

        cs_id = cloud_storage.register_cloud_storage(
            self.client,
            bucket="test",
            key=MINIO_KEY,
            secret_key=MINIO_SECRET_KEY,
            endpoint_url="http://minio:9000",
            display_name="example-minio",
        )
        assert isinstance(cs_id, int)
        assert any(cs.id == cs_id for cs in cloud_storage.list_cloud_storages(self.client))

        assert cloud_storage.get_cloud_storage(self.client, cs_id).display_name == "example-minio"

        updated = cloud_storage.update_cloud_storage(
            self.client, cs_id, display_name="example-minio (renamed)"
        )
        assert updated.display_name == "example-minio (renamed)"

        cloud_storage.delete_cloud_storage(self.client, cs_id)
        assert all(cs.id != cs_id for cs in cloud_storage.list_cloud_storages(self.client))

    def test_project_crud_and_report(self):
        from examples import project_management as pm

        project = pm.create_project(self.client, "Example project", ["car", "person"])
        assert project.id
        assert {label.name for label in project.get_labels()} == {"car", "person"}

        assert any(p.id == project.id for p in pm.list_projects(self.client, name_contains="Example"))
        assert pm.get_project(self.client, project.id).id == project.id

        renamed = pm.rename_project(self.client, project.id, "Example project (renamed)")
        assert renamed.name == "Example project (renamed)"

        report = pm.export_project_report_csv(
            self.client, project.id, self.tmp_path / "report.csv"
        )
        assert report.exists()
        header = report.read_text().splitlines()[0]
        assert header == "project_id,project_name,task_id,task_name,job_id,stage,state,assignee,frames"

        pm.delete_projects(self.client, [project.id])
        assert all(p.id != project.id for p in pm.list_projects(self.client))

    def test_task_local_lifecycle(self, fxt_image_file: Path):
        from examples import task_management as tm

        task = tm.create_task_from_local(
            self.client, "Example task", ["sign"], [fxt_image_file]
        )
        assert task.size == 1

        assert any(t.id == task.id for t in tm.list_tasks(self.client))
        assert tm.get_task(self.client, task.id).id == task.id

        renamed = tm.rename_task(self.client, task.id, "Example task (renamed)")
        assert renamed.name == "Example task (renamed)"

        summary = tm.inspect_task(self.client, task.id)
        assert summary["labels"] == ["sign"]
        assert summary["frames"] == 1

        tm.delete_tasks(self.client, [task.id])
        assert all(t.id != task.id for t in tm.list_tasks(self.client))

    @pytest.mark.with_external_services
    def test_task_from_cloud(self):
        from shared.utils.config import IMPORT_EXPORT_BUCKET_ID

        from examples import task_management as tm

        task = tm.create_task_from_cloud(
            self.client,
            "From bucket",
            ["sign"],
            keys=["images/image_1.jpg", "images/image_2.jpg"],
            cloud_storage_id=IMPORT_EXPORT_BUCKET_ID,
        )
        assert task.size == 2

    def test_job_list_and_assign(self, fxt_image_file: Path):
        from examples import job_management as jm
        from examples import task_management as tm

        task = tm.create_task_from_local(self.client, "Jobs task", ["sign"], [fxt_image_file])
        jobs = jm.list_jobs(self.client, task_id=task.id)
        assert len(jobs) >= 1

        unassigned = jm.list_unassigned_jobs(self.client, task_id=task.id)
        assert len(unassigned) == len(jobs)

        searched = jm.search_jobs(self.client, ordering="-id")
        assert any(j.id == jobs[0].id for j in searched)

        me = self.client.users.retrieve_current_user()
        mapping = jm.auto_assign_task_jobs(self.client, task.id, [me.id])
        assert set(mapping) == {job.id for job in jobs}

        for job_id in mapping:
            assert jm.get_job(self.client, job_id).assignee.id == me.id

        tm.delete_tasks(self.client, [task.id])

    def test_job_import_annotations(self, fxt_image_file: Path, fxt_coco_file: Path):
        from examples import job_management as jm
        from examples import task_management as tm

        task = tm.create_task_from_local(self.client, "Import task", ["sign"], [fxt_image_file])
        job_id = jm.list_jobs(self.client, task_id=task.id)[0].id

        jm.import_job_annotations(self.client, job_id, "COCO 1.0", fxt_coco_file)
        assert jm.get_job(self.client, job_id).get_annotations().shapes

        tm.delete_tasks(self.client, [task.id])

    def test_task_export_formats_and_local(self, fxt_image_file: Path):
        from examples import task_management as tm

        formats = tm.list_export_formats(self.client)
        assert "COCO 1.0" in formats

        task = tm.create_task_from_local(self.client, "Export task", ["sign"], [fxt_image_file])
        out = tm.export_dataset_local(
            self.client, task.id, "COCO 1.0", self.tmp_path / "ds.zip", include_images=False
        )
        assert out.exists() and out.stat().st_size > 0
        tm.delete_tasks(self.client, [task.id])

    def test_project_export_local(self, fxt_image_file: Path):
        from examples import project_management as pm
        from examples import task_management as tm

        project = pm.create_project(self.client, "Export project", ["sign"])
        task = tm.create_task_in_project(
            self.client, "Export project task", project.id, [fxt_image_file]
        )
        out = pm.export_dataset_local(
            self.client, project.id, "COCO 1.0", self.tmp_path / "project_ds.zip",
            include_images=False,
        )
        assert out.exists() and out.stat().st_size > 0
        tm.delete_tasks(self.client, [task.id])
        pm.delete_projects(self.client, [project.id])

    @pytest.mark.with_external_services
    def test_task_export_to_cloud(self, fxt_image_file: Path):
        from shared.utils.config import IMPORT_EXPORT_BUCKET_ID

        from examples import task_management as tm

        task = tm.create_task_from_local(self.client, "Cloud export", ["sign"], [fxt_image_file])
        tm.export_dataset_to_cloud(
            self.client, task.id, "CVAT for images 1.1", "cloud_ds.zip",
            cloud_storage_id=IMPORT_EXPORT_BUCKET_ID, include_images=False,
        )
        tm.delete_tasks(self.client, [task.id])
