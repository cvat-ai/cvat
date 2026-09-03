# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import hashlib
import hmac
import importlib.util
import json
import os
import re
import site
import socket
import subprocess
import sys
import types
import urllib.error
import urllib.request
import zipfile
from pathlib import Path
from time import sleep

import platformdirs
import pytest
from cvat_sdk import Client, models
from cvat_sdk.core.auth import AuthStore, ProfileEntry
from cvat_sdk.core.downloading import Downloader
from cvat_sdk.core.proxies.projects import Project
from cvat_sdk.core.proxies.tasks import ResourceType, Task

from shared.utils.config import (
    BASE_URL,
    IMPORT_EXPORT_BUCKET_ID,
    MINIO_KEY,
    MINIO_SECRET_KEY,
    USER_PASS,
)
from shared.utils.helpers import generate_image_file

EXAMPLES_DIR = Path(__file__).parents[3] / "cvat-sdk" / "examples"


def receiver_target_url() -> str:
    """The in-docker webhook receiver's URL, as the CVAT server sees it —
    the same service the rest_api webhook tests deliver to.
    """
    env = {}
    receiver_env = Path(__file__).parents[1] / "webhook_receiver" / ".env"
    for line in receiver_env.read_text().splitlines():
        name, _, value = line.strip().partition("=")
        env[name] = value
    return f"http://{env['SERVER_HOST']}:{env['SERVER_PORT']}/{env['PAYLOAD_ENDPOINT']}"


# The bucket content summary printed by cloud_storage_register.py.
BUCKET_CONTENT_RE = re.compile(r"contains (\d+) entries in (\d+) page\(s\)")


def load_recipe(name: str) -> types.ModuleType:
    """Import a recipe as a module, so a test can reuse its own helpers instead
    of reimplementing (and then drifting from) what the recipe computes.
    """
    spec = importlib.util.spec_from_file_location(f"recipe_{Path(name).stem}", EXAMPLES_DIR / name)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="class")
def fxt_access_token(fxt_login: tuple[Client, str]) -> str:
    client, _ = fxt_login
    token, _ = client.api_client.auth_api.create_access_tokens(
        access_token_write_request=models.AccessTokenWriteRequest(
            name="examples tests", read_only=False
        )
    )
    return token.value


# Every test here runs a recipe in a fresh interpreter, so it pays for process
# startup and the SDK import; a recipe that waits on server-side jobs then pays in
# multiples of the SDK's default 5s poll period, and some run two recipes. That
# does not fit pytest.ini's global 15s budget, which is sized for in-process tests.
@pytest.mark.timeout(90)
class TestExamples:
    @pytest.fixture(autouse=True)
    def setup(self, tmp_path: Path, fxt_login: tuple[Client, str], fxt_access_token: str):
        self.tmp_path = tmp_path
        self.client, self.user = fxt_login
        self.token = fxt_access_token

    def run_recipe(
        self,
        name: str,
        args: list[str] | None = None,
        with_auth: bool = True,
        with_cleanup: bool = True,
        expect_failure: bool = False,
        env: dict[str, str] | None = None,
    ) -> subprocess.CompletedProcess:
        cmd = [sys.executable, str(EXAMPLES_DIR / name)]
        if with_auth:
            cmd += ["--host", BASE_URL, "--token", self.token]
        if with_cleanup:
            cmd += ["--cleanup"]
        cmd += list(args or [])
        result = subprocess.run(
            cmd,
            cwd=self.tmp_path,
            capture_output=True,
            text=True,
            env=env,
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

    def make_project(
        self, name: str = "Recipe project", labels: tuple[str, ...] = ("object",)
    ) -> Project:
        return self.client.projects.create(
            models.ProjectWriteRequest(
                name=name, labels=[models.PatchedLabelRequest(name=label) for label in labels]
            )
        )

    def make_task(
        self,
        name: str = "Recipe task",
        resources: list[Path] | None = None,
        segment_size: int | None = None,
        labels: tuple[str, ...] = ("object",),
    ) -> Task:
        if resources is None:
            resources = sorted(self.make_image_dir().iterdir())
        return self.client.tasks.create_from_data(
            spec=models.TaskWriteRequest(
                name=name,
                labels=[models.PatchedLabelRequest(name=label) for label in labels],
                **({"segment_size": segment_size} if segment_size else {}),
            ),
            resource_type=ResourceType.LOCAL,
            resources=resources,
        )

    def make_task_in_project(self, project: Project, name: str = "Recipe project task") -> Task:
        return self.client.tasks.create_from_data(
            spec=models.TaskWriteRequest(name=name, project_id=project.id),
            resource_type=ResourceType.LOCAL,
            resources=sorted(self.make_image_dir().iterdir()),
        )

    def make_project_with_task(self) -> Project:
        project = self.make_project()
        self.make_task_in_project(project)
        return project

    def test_auth_token(self):
        result = self.run_recipe("auth_token.py", with_cleanup=False)
        assert f"Authenticated as {self.user}" in result.stdout

    def _seeded_profile_env(self, name: str, *, set_default: bool) -> dict[str, str]:
        # Point the subprocess's AuthStore at a private path via XDG_CONFIG_HOME
        # (Linux/Docker CI), then seed one profile at that same path.
        config_home = self.tmp_path / "auth_config"
        env = os.environ.copy()
        # Preserve `pip install --user` site-packages: Python resolves it from
        # HOME (or PYTHONUSERBASE) at startup, and we override HOME below.
        env["PYTHONUSERBASE"] = site.getuserbase()
        env["XDG_CONFIG_HOME"] = str(config_home)
        env["HOME"] = str(self.tmp_path)
        # platformdirs reads env at call time — mirror the subprocess env briefly
        # to compute the exact auth.json path the recipe will look at.
        with pytest.MonkeyPatch.context() as mp:
            mp.setenv("XDG_CONFIG_HOME", env["XDG_CONFIG_HOME"])
            mp.setenv("HOME", env["HOME"])
            store_path = (
                platformdirs.user_config_path("cvat-sdk", "CVAT.ai", roaming=False) / "auth.json"
            )
        AuthStore(path=store_path).put_profile(
            name,
            ProfileEntry(
                server=BASE_URL, token=self.token, created_date="2026-01-01T00:00:00+00:00"
            ),
            set_default=set_default,
        )
        return env

    def test_auth_profile_named(self):
        env = self._seeded_profile_env("recipes_named", set_default=False)
        result = self.run_recipe(
            "auth_profile.py",
            args=["--profile", "recipes_named"],
            with_auth=False,
            with_cleanup=False,
            env=env,
        )
        assert "Using profile 'recipes_named'" in result.stdout
        assert f"Authenticated as {self.user}" in result.stdout

    def test_auth_profile_default(self):
        env = self._seeded_profile_env("recipes_default", set_default=True)
        result = self.run_recipe(
            "auth_profile.py",
            with_auth=False,
            with_cleanup=False,
            env=env,
        )
        assert "Using default profile 'recipes_default'" in result.stdout
        assert f"Authenticated as {self.user}" in result.stdout

    def test_auth_profile_missing_default_fails(self):
        config_home = self.tmp_path / "empty_auth_config"
        env = os.environ.copy()
        env["PYTHONUSERBASE"] = site.getuserbase()
        env["XDG_CONFIG_HOME"] = str(config_home)
        env["HOME"] = str(self.tmp_path)
        result = self.run_recipe(
            "auth_profile.py",
            with_auth=False,
            with_cleanup=False,
            expect_failure=True,
            env=env,
        )
        assert "No default profile configured" in result.stderr

    def test_auth_cli_password_auth(self):
        # make_client_from_cli's --auth USER:PASS path — same shape as cvat-cli.
        result = self.run_recipe(
            "auth_cli.py",
            args=["--server-host", BASE_URL, "--auth", f"{self.user}:{USER_PASS}"],
            with_auth=False,
            with_cleanup=False,
        )
        assert f"Authenticated as {self.user}" in result.stdout

    def register_test_bucket(self, page_size: int | None = None) -> subprocess.CompletedProcess:
        args = [
            "--bucket",
            "test",
            "--access-key",
            MINIO_KEY,
            "--secret-key",
            MINIO_SECRET_KEY,
            "--endpoint-url",
            "http://minio:9000",
        ]
        if page_size is not None:
            args += ["--page-size", str(page_size)]
        return self.run_recipe("cloud_storage_register.py", args=args)

    @staticmethod
    def parse_bucket_content(stdout: str) -> tuple[int, int]:
        """The (entries, pages) the recipe reported for the bucket listing."""
        match = BUCKET_CONTENT_RE.search(stdout)
        assert match, f"no bucket content summary in:\n{stdout}"
        return int(match.group(1)), int(match.group(2))

    @pytest.mark.with_external_services
    def test_cloud_storage_register(self):
        result = self.register_test_bucket()
        assert "Registered cloud storage" in result.stdout
        assert "Bucket 'test' contains" in result.stdout
        assert "(updated)" in result.stdout
        assert "Deleted cloud storage" in result.stdout

    @pytest.mark.with_external_services
    def test_cloud_storage_register_paginates_bucket_content(self):
        entries, pages = self.parse_bucket_content(self.register_test_bucket().stdout)
        assert entries > 1
        assert pages == 1, "the default page size should cover the test bucket in one page"

        # One entry per request forces the next_token loop to actually loop, and
        # the walk must still see the same bucket.
        paged_entries, paged_pages = self.parse_bucket_content(
            self.register_test_bucket(page_size=1).stdout
        )
        assert paged_entries == entries
        assert paged_pages > 1

    def test_job_workflow_advances_completed_jobs(self):
        task = self.make_task()
        # Seed: mark the first job of the task as completed at annotation stage;
        # leave the rest untouched — they must not be advanced.
        jobs = task.get_jobs()
        target = jobs[0]
        target.update(models.PatchedJobWriteRequest(stage="annotation", state="completed"))

        result = self.run_recipe(
            "job_workflow.py",
            args=["--from-stage", "annotation", "--task-id", str(task.id)],
            with_cleanup=False,
        )
        assert f"job {target.id}: annotation -> validation" in result.stdout
        assert "Moved 1 jobs to stage 'validation'" in result.stdout
        assert self.client.jobs.retrieve(target.id).stage == "validation"
        for other in jobs[1:]:
            assert self.client.jobs.retrieve(other.id).stage == "annotation"

    def test_job_list(self):
        task = self.make_task()
        result = self.run_recipe(
            "job_list.py",
            args=["--task-id", str(task.id)],
            with_cleanup=False,
        )
        assert f"Task {task.id}:" in result.stdout
        for job in task.get_jobs():
            assert f"job {job.id}:" in result.stdout

    def test_job_list_by_project(self):
        project = self.make_project_with_task()
        result = self.run_recipe(
            "job_list.py",
            args=["--project-id", str(project.id)],
            with_cleanup=False,
        )
        assert f"Project {project.id}:" in result.stdout

    def test_job_list_csv(self):
        project = self.make_project_with_task()
        self.run_recipe(
            "job_list.py",
            args=["--project-id", str(project.id), "--csv"],
            with_cleanup=False,
        )
        report = self.tmp_path / "report.csv"
        assert report.exists()
        lines = report.read_text().splitlines()
        assert lines[0] == (
            "project_id,project_name,task_id,task_name,job_id,stage,state,assignee,frames"
        )
        assert len(lines) == 2

    def test_job_list_filters_by_stage_and_state(self):
        # One job per frame, so that a filter has something to exclude.
        task = self.make_task(segment_size=1)
        jobs = task.get_jobs()
        assert len(jobs) == 2
        moved, kept = jobs
        moved.update(models.PatchedJobWriteRequest(stage="validation"))

        result = self.run_recipe(
            "job_list.py",
            args=["--task-id", str(task.id), "--stage", "annotation", "--state", "new"],
            with_cleanup=False,
        )
        assert f"Task {task.id}: 1 matching jobs" in result.stdout
        assert f"job {kept.id}: stage=annotation, state=new" in result.stdout
        assert f"job {moved.id}:" not in result.stdout

    def test_job_assign_self(self):
        task = self.make_task()
        result = self.run_recipe(
            "job_assign.py",
            args=["--task-id", str(task.id)],
            with_cleanup=False,
        )
        me = self.client.users.retrieve_current_user()
        assert f"self-assigning as {me.username}" in result.stdout
        # CSV is written to the recipe's cwd (== tmp_path)
        report = self.tmp_path / "assignments.csv"
        assert report.exists()
        lines = report.read_text().splitlines()
        assert lines[0] == "job_id,previous_assignee,new_assignee,new_assignee_id"
        for job in task.get_jobs():
            assert self.client.jobs.retrieve(job.id).assignee.id == me.id

    def test_job_assign_by_username(self):
        task = self.make_task()
        me = self.client.users.retrieve_current_user()
        result = self.run_recipe(
            "job_assign.py",
            args=["--task-id", str(task.id), "--assignees", me.username],
            with_cleanup=False,
        )
        assert f"-> {me.username}" in result.stdout
        for job in task.get_jobs():
            assert self.client.jobs.retrieve(job.id).assignee.id == me.id

    @pytest.mark.parametrize("scope_by_id", [False, True])
    def test_job_assign_searches_organization_members(self, scope_by_id: bool):
        me = self.client.users.retrieve_current_user()
        org = self.client.organizations.create(models.OrganizationWriteRequest(slug="recipesorg"))
        try:
            # The task has to live in the organization too: the recipe scopes its
            # job query by the same --org/--org-id it searches users with.
            with self.client.organization_context(org.slug):
                task = self.make_task(name="Org recipe task")
                jobs = task.get_jobs()
                org_args = ["--org-id", str(org.id)] if scope_by_id else ["--org", org.slug]
                result = self.run_recipe(
                    "job_assign.py",
                    args=["--task-id", str(task.id), "--search", me.username, *org_args],
                    with_cleanup=False,
                )
                assert f"Users matching {me.username!r}:" in result.stdout
                assert f"{me.id}\t{me.username}" in result.stdout
                assert f"Task {task.id}: {len(jobs)} unassigned jobs" in result.stdout
                for job in jobs:
                    assert self.client.jobs.retrieve(job.id).assignee.id == me.id
        finally:
            # Slugs are unique server-side, and the DB is only restored per class.
            org.remove()

    def test_job_assign_search_requires_org(self):
        result = self.run_recipe(
            "job_assign.py",
            args=["--task-id", "1", "--search", "annotator-team"],
            with_cleanup=False,
            expect_failure=True,
        )
        assert "--search requires --org or --org-id" in result.stderr

    def seed_rectangle(self, task: Task, *, label_id: int | None = None, frame: int = 0) -> None:
        """Put one rectangle on a task, so annotation recipes have data to work on."""
        if label_id is None:
            label_id = task.get_labels()[0].id
        task.set_annotations(
            models.LabeledDataRequest(
                shapes=[
                    models.LabeledShapeRequest(
                        frame=frame, label_id=label_id, type="rectangle", points=[1, 1, 3, 4]
                    )
                ]
            )
        )

    def test_task_import_annotations(self):
        # Round trip: export a seeded task's annotations, wipe them, and let the
        # recipe bring them back from the exported file.
        task = self.make_task()
        self.seed_rectangle(task)
        exported = self.tmp_path / "annotations.zip"
        task.export_dataset("COCO 1.0", exported, include_images=False)
        task.remove_annotations()
        assert not task.get_annotations().shapes

        result = self.run_recipe(
            "task_import_annotations.py",
            args=["--task-id", str(task.id), "--annotations-file", str(exported)],
            with_cleanup=False,
        )
        assert f"Task {task.id}: 0 objects before import" in result.stdout
        assert f"Task {task.id}: 1 objects after import" in result.stdout
        assert len(task.get_annotations().shapes) == 1

    def test_task_import_annotations_rejects_unknown_format(self):
        task = self.make_task()
        annotations_file = self.tmp_path / "annotations.zip"
        annotations_file.write_bytes(b"")
        result = self.run_recipe(
            "task_import_annotations.py",
            args=[
                "--task-id",
                str(task.id),
                "--annotations-file",
                str(annotations_file),
                "--import-format",
                "Bogus 9.9",
            ],
            with_cleanup=False,
            expect_failure=True,
        )
        assert "Unknown import format" in result.stderr

    def test_task_edit_annotations_relabel(self):
        task = self.make_task(labels=("object", "defect"))
        labels = {label.name: label.id for label in task.get_labels()}
        self.seed_rectangle(task, label_id=labels["object"])

        result = self.run_recipe(
            "task_edit_annotations.py",
            args=["--task-id", str(task.id), "--relabel", "object", "defect"],
            with_cleanup=False,
        )
        assert "object: 1 -> 0" in result.stdout
        assert "defect: 0 -> 1" in result.stdout
        shapes = task.get_annotations().shapes
        assert [shape.label_id for shape in shapes] == [labels["defect"]]

    def test_task_edit_annotations_delete_label(self):
        task = self.make_task(labels=("object", "defect"))
        labels = {label.name: label.id for label in task.get_labels()}
        self.seed_rectangle(task, label_id=labels["object"])

        result = self.run_recipe(
            "task_edit_annotations.py",
            args=["--task-id", str(task.id), "--delete-label", "object"],
            with_cleanup=False,
        )
        assert "object: 1 -> 0" in result.stdout
        assert not task.get_annotations().shapes

    def test_task_edit_annotations_rejects_unknown_label(self):
        task = self.make_task()
        result = self.run_recipe(
            "task_edit_annotations.py",
            args=["--task-id", str(task.id), "--relabel", "bogus", "object"],
            with_cleanup=False,
            expect_failure=True,
        )
        assert "Label 'bogus' not found in task" in result.stderr

    def test_task_inspect_and_export(self):
        task = self.make_task()
        result = self.run_recipe(
            "task_inspect_and_export.py",
            args=["--task-id", str(task.id)],
            with_cleanup=False,
        )
        assert "labels: ['object']" in result.stdout
        local = self.tmp_path / f"task_{task.id}_dataset.zip"
        assert local.exists() and local.stat().st_size > 0
        events = self.tmp_path / f"task_{task.id}_events.csv"
        assert events.exists() and events.stat().st_size > 0
        assert "0 people currently assigned, 0 reworks" in result.stdout

    # The wait for ClickHouse below plus a full recipe run needs more than the
    # class-wide budget.
    @pytest.mark.timeout(150)
    def test_task_inspect_and_export_reports_assignment_and_rework(self):
        task = self.make_task()
        job = task.get_jobs()[0]
        me = self.client.users.retrieve_current_user()
        job.update(models.PatchedJobWriteRequest(assignee=me.id))
        job.update(models.PatchedJobWriteRequest(state="rejected"))

        # Events reach ClickHouse asynchronously. Retrying the whole recipe would
        # pay for an interpreter start and a dataset export on every miss, so wait
        # here on the cheap half only - the event log export - and reuse the
        # recipe's own counter, so the wait and the recipe agree by construction.
        # The recipe then runs once, on data already known to be there.
        recipe = load_recipe("task_inspect_and_export.py")
        probe_path = self.tmp_path / "events_probe.csv"
        for _ in range(20):
            probe_path.unlink(missing_ok=True)
            Downloader(self.client).prepare_and_download_file_from_endpoint(
                self.client.api_client.events_api.create_export_endpoint,
                probe_path,
                query_params={"task_id": task.id},
            )
            if recipe.count_reworks(probe_path) == 1:
                break
            sleep(1)
        else:
            pytest.fail("The exported event log never reported the job's rework")

        result = self.run_recipe(
            "task_inspect_and_export.py",
            args=["--task-id", str(task.id)],
            with_cleanup=False,
        )
        assert "1 people currently assigned, 1 reworks" in result.stdout

    @pytest.mark.with_external_services
    def test_task_create_from_cloud(self):
        result = self.run_recipe(
            "task_create_from_cloud.py",
            args=[
                "--cloud-storage-id",
                str(IMPORT_EXPORT_BUCKET_ID),
                "--cloud-keys",
                "images/image_1.jpg",
                "images/image_2.jpg",
            ],
        )
        assert "Created task" in result.stdout
        assert "with 2 frames" in result.stdout
        assert "Deleted task" in result.stdout

    @pytest.mark.with_external_services
    def test_tasks_bulk_from_cloud(self):
        project = self.make_project()
        result = self.run_recipe(
            "tasks_bulk_from_cloud.py",
            args=[
                "--cloud-storage-id",
                str(IMPORT_EXPORT_BUCKET_ID),
                "--project-id",
                str(project.id),
                "--task",
                "images/image_1.jpg",
                "--task",
                "images/image_2.jpg,images/image_3.jpg",
            ],
        )
        assert "Created 2 tasks in project" in result.stdout
        assert "Deleted 2 tasks" in result.stdout

    @pytest.mark.with_external_services
    def test_tasks_bulk_from_cloud_task_pattern(self):
        project = self.make_project()
        # The bucket ships a manifest next to two .png images; the server expands
        # the wildcard against it, so one pattern becomes one two-frame task.
        pattern = "images_with_manifest/*.png"
        result = self.run_recipe(
            "tasks_bulk_from_cloud.py",
            args=[
                "--cloud-storage-id",
                str(IMPORT_EXPORT_BUCKET_ID),
                "--project-id",
                str(project.id),
                "--manifest",
                "images_with_manifest/manifest.jsonl",
                "--task-pattern",
                pattern,
            ],
        )
        assert f"(2 frames) from pattern {pattern!r}" in result.stdout
        assert f"Created 1 tasks in project {project.id}" in result.stdout
        assert "Deleted 1 tasks" in result.stdout

    def test_tasks_bulk_from_cloud_rejects_empty_task(self):
        result = self.run_recipe(
            "tasks_bulk_from_cloud.py",
            args=[
                "--cloud-storage-id",
                "1",
                "--project-id",
                "1",
                "--task",
                ",",
            ],
            expect_failure=True,
            with_cleanup=False,
        )
        assert "each --task must contain at least one non-empty key" in result.stderr

    def test_tasks_bulk_from_cloud_requires_task_or_pattern(self):
        result = self.run_recipe(
            "tasks_bulk_from_cloud.py",
            args=["--cloud-storage-id", "1", "--project-id", "1"],
            expect_failure=True,
            with_cleanup=False,
        )
        assert "at least one --task or --task-pattern is required" in result.stderr

    @pytest.mark.with_external_services
    def test_project_export_dataset(self):
        project = self.make_project_with_task()
        task = project.get_tasks()[0]
        result = self.run_recipe(
            "project_export_dataset.py",
            args=[
                "--project-id",
                str(project.id),
                "--cloud-storage-id",
                str(IMPORT_EXPORT_BUCKET_ID),
            ],
            with_cleanup=False,
        )
        local = self.tmp_path / f"task_{task.id}_dataset.zip"
        assert local.exists() and local.stat().st_size > 0
        with zipfile.ZipFile(local) as archive:
            assert not any(name.startswith("images/") for name in archive.namelist())
        assert f"to cloud storage {IMPORT_EXPORT_BUCKET_ID}" in result.stdout
        assert "Exported 1 task dataset(s) from project" in result.stdout

    @pytest.mark.with_external_services
    def test_project_export_dataset_filters_by_task_id(self):
        project = self.make_project_with_task()
        extra_task = self.make_task_in_project(project, name="Extra task")
        target_task = next(t for t in project.get_tasks() if t.id != extra_task.id)
        result = self.run_recipe(
            "project_export_dataset.py",
            args=[
                "--project-id",
                str(project.id),
                "--cloud-storage-id",
                str(IMPORT_EXPORT_BUCKET_ID),
                "--task-id",
                str(target_task.id),
            ],
            with_cleanup=False,
        )
        assert (self.tmp_path / f"task_{target_task.id}_dataset.zip").exists()
        assert not (self.tmp_path / f"task_{extra_task.id}_dataset.zip").exists()
        assert "Exported 1 task dataset(s) from project" in result.stdout

    def test_project_export_dataset_rejects_unknown_format(self):
        project = self.make_project_with_task()
        result = self.run_recipe(
            "project_export_dataset.py",
            args=[
                "--project-id",
                str(project.id),
                "--cloud-storage-id",
                "1",
                "--export-format",
                "Bogus 9.9",
            ],
            with_cleanup=False,
            expect_failure=True,
        )
        assert "Unknown export format" in result.stderr

    def test_project_export_dataset_rejects_unknown_task_id(self):
        project = self.make_project_with_task()
        result = self.run_recipe(
            "project_export_dataset.py",
            args=[
                "--project-id",
                str(project.id),
                "--cloud-storage-id",
                "1",
                "--task-id",
                "999999",
            ],
            with_cleanup=False,
            expect_failure=True,
        )
        assert "not found in project" in result.stderr

    def test_project_backup_then_restore(self):
        project = self.make_project_with_task()
        backup_result = self.run_recipe(
            "project_backup.py",
            args=["--project-id", str(project.id)],
            with_cleanup=False,
        )
        backup_path = self.tmp_path / f"project_{project.id}_backup.zip"
        assert backup_path.exists()
        assert f"Backed up project {project.id}" in backup_result.stdout

        restore_result = self.run_recipe(
            "project_restore.py",
            args=["--backup", str(backup_path)],
        )
        assert "Restored a copy as project" in restore_result.stdout
        assert "Deleted restored project" in restore_result.stdout

    def test_project_create_and_list(self):
        result = self.run_recipe(
            "project_create_and_list.py",
            args=["--name", "Recipes CI project"],
        )
        assert "Created project" in result.stdout
        assert "Renamed to: Recipes CI project (renamed)" in result.stdout
        assert "Deleted project" in result.stdout
        assert all(p.name != "Recipes CI project (renamed)" for p in self.client.projects.list())

    def test_project_add_labels(self):
        project = self.make_project()
        result = self.run_recipe(
            "project_add_labels.py",
            args=["--project-id", str(project.id), "--labels", "car", "person"],
            with_cleanup=False,
        )
        assert f"Added 2 labels to project {project.id}" in result.stdout
        names = {label.name for label in project.get_labels()}
        assert {"object", "car", "person"} <= names

    def test_project_add_labels_with_attributes(self):
        project = self.make_project()
        self.run_recipe(
            "project_add_labels.py",
            args=[
                "--project-id",
                str(project.id),
                "--labels",
                "car",
                "--attr",
                "car",
                "color",
                "red",
                "green",
                "blue",
            ],
            with_cleanup=False,
        )
        car = next(label for label in project.get_labels() if label.name == "car")
        assert len(car.attributes) == 1
        attribute = car.attributes[0]
        assert attribute.name == "color"
        assert attribute.values == ["red", "green", "blue"]

    def test_project_add_labels_skips_existing(self):
        project = self.make_project()
        result = self.run_recipe(
            "project_add_labels.py",
            args=["--project-id", str(project.id), "--labels", "object", "car"],
            with_cleanup=False,
        )
        assert "Label 'object' already exists, skipping" in result.stdout
        assert f"Added 1 labels to project {project.id}" in result.stdout

    def test_project_add_labels_rejects_attr_for_unlisted_label(self):
        result = self.run_recipe(
            "project_add_labels.py",
            args=[
                "--project-id",
                "1",
                "--labels",
                "car",
                "--attr",
                "person",
                "age",
                "young",
                "old",
            ],
            with_cleanup=False,
            expect_failure=True,
        )
        assert "--attr refers to label 'person', which is not in --labels" in result.stderr

    def test_project_annotation_stats(self):
        project = self.make_project(labels=("object", "defect"))
        task = self.make_task_in_project(project, name="Stats recipe task")
        labels = {label.name: label.id for label in project.get_labels()}
        task.set_annotations(
            models.LabeledDataRequest(
                shapes=[
                    models.LabeledShapeRequest(
                        frame=0, label_id=labels["object"], type="rectangle", points=[1, 1, 3, 4]
                    ),
                    models.LabeledShapeRequest(
                        frame=0,
                        label_id=labels["object"],
                        type="polygon",
                        points=[1, 1, 3, 1, 3, 4],
                    ),
                    models.LabeledShapeRequest(
                        frame=1, label_id=labels["defect"], type="rectangle", points=[2, 2, 4, 5]
                    ),
                ],
                tags=[models.LabeledImageRequest(frame=0, label_id=labels["defect"])],
            )
        )

        result = self.run_recipe(
            "project_annotation_stats.py",
            args=["--project-id", str(project.id)],
            with_cleanup=False,
        )
        assert f"Project {project.id}: 4 objects across 1 tasks" in result.stdout

        report = self.tmp_path / "annotation_stats.csv"
        assert report.exists()
        rows = report.read_text().splitlines()
        assert rows[0] == "task_id,task_name,label,type,count"
        body = {tuple(row.split(",")) for row in rows[1:]}
        assert (str(task.id), "Stats recipe task", "object", "rectangle", "1") in body
        assert (str(task.id), "Stats recipe task", "object", "polygon", "1") in body
        assert (str(task.id), "Stats recipe task", "defect", "rectangle", "1") in body
        assert (str(task.id), "Stats recipe task", "defect", "tag", "1") in body

    @pytest.mark.with_external_services
    def test_register_webhook(self):
        project = self.make_project()
        result = self.run_recipe(
            "register_webhook.py",
            args=[
                "--project-id",
                str(project.id),
                "--target-url",
                receiver_target_url(),
                "--secret",
                "recipe-secret",
            ],
        )
        assert "Created webhook" in result.stdout
        assert "Ping delivery: HTTP 200" in result.stdout
        assert "1 deliveries, by status: 200 x1" in result.stdout
        assert "Deleted webhook" in result.stdout

    @pytest.mark.with_external_services
    def test_register_webhook_organization(self):
        org = self.client.organizations.create(models.OrganizationWriteRequest(slug="recipeswhorg"))
        try:
            result = self.run_recipe(
                "register_webhook.py",
                args=[
                    "--org",
                    org.slug,
                    "--target-url",
                    receiver_target_url(),
                    "--secret",
                    "recipe-secret",
                ],
            )
            assert f"Created webhook" in result.stdout
            assert f"organization {org.slug!r}" in result.stdout
            assert "Deleted webhook" in result.stdout
        finally:
            org.remove()

    def test_register_webhook_requires_scope(self):
        result = self.run_recipe(
            "register_webhook.py",
            args=["--target-url", "http://example.com/payload", "--secret", "s"],
            with_cleanup=False,
            expect_failure=True,
        )
        assert "one of the arguments --project-id --org is required" in result.stderr

    def post_webhook_event(
        self, port: int, payload: dict, secret: str | None = "recipe-secret"
    ) -> int:
        """POST a payload to the monitor recipe's receiver the way the CVAT server
        would: JSON body signed with HMAC-SHA256 in X-Signature-256. Pass
        secret=None to send an unsigned (forged) delivery.
        """
        body = json.dumps(payload).encode()
        if secret is not None:
            signature = (
                "sha256=" + hmac.new(secret.encode(), body, digestmod=hashlib.sha256).hexdigest()
            )
        else:
            signature = "sha256=" + "0" * 64
        request = urllib.request.Request(
            f"http://localhost:{port}/payload",
            data=body,
            headers={"Content-Type": "application/json", "X-Signature-256": signature},
        )
        try:
            with urllib.request.urlopen(request) as response:
                return response.status
        except urllib.error.HTTPError as error:
            return error.code

    def test_webhook_resource_monitoring(self):
        project = self.make_project()
        with socket.socket() as probe:
            probe.bind(("", 0))
            port = probe.getsockname()[1]

        process = subprocess.Popen(
            [
                sys.executable,
                str(EXAMPLES_DIR / "webhook_resource_monitoring.py"),
                "--host",
                BASE_URL,
                "--token",
                self.token,
                "--project-id",
                str(project.id),
                "--public-url",
                f"http://host.docker.internal:{port}/payload",
                "--port",
                str(port),
                "--secret",
                "recipe-secret",
                "--max-events",
                "2",
                "--cleanup",
            ],
            cwd=self.tmp_path,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        try:
            for _ in range(200):
                if process.poll() is not None:
                    break
                try:
                    with socket.create_connection(("localhost", port), timeout=0.1):
                        break
                except OSError:
                    sleep(0.1)
            else:
                pytest.fail("The recipe's receiver never started listening")

            assert self.post_webhook_event(port, {"event": "ping"}, secret=None) == 403
            assert (
                self.post_webhook_event(
                    port,
                    {
                        "event": "create:task",
                        "task": {"id": 1, "name": "Monitored"},
                        "sender": {"username": "worker"},
                    },
                )
                == 200
            )
            assert (
                self.post_webhook_event(
                    port,
                    {
                        "event": "create:task",
                        "task": {"id": 2, "name": "Also monitored"},
                        "sender": {"username": "worker"},
                    },
                )
                == 200
            )
            stdout, stderr = process.communicate(timeout=60)
        finally:
            process.kill()

        assert process.returncode == 0, f"stdout:\n{stdout}\nstderr:\n{stderr}"
        assert "new task 1: 'Monitored'" in stdout
        assert "new task 2: 'Also monitored'" in stdout
        assert "Received 2 events: create:task x2" in stdout
        assert "Rejected 1 deliveries with a bad signature" in stdout
        assert "Deleted webhook" in stdout
        hooks, _ = self.client.api_client.webhooks_api.list(project_id=project.id)
        assert not hooks.results
