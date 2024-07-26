# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
from http import HTTPStatus
from typing import Callable, List
from urllib.parse import urlparse

import pytest
from cvat_sdk.api_client import ApiClient, models

from shared.utils.config import make_api_client
from shared.utils.helpers import generate_image_files

from .utils import (
    create_task,
    export_job_dataset,
    export_project_backup,
    export_project_dataset,
    export_task_backup,
    export_task_dataset,
    import_task_backup,
)


def validate_action(filter_: str, filter_value: str, requests: List[models.Request]) -> bool:
    return {filter_value} == {r.operation.type.split(":")[0] for r in requests}


def validate_subresource(filter_: str, filter_value: str, requests: List[models.Request]) -> bool:
    return {filter_value} == {r.operation.type.split(":")[1] for r in requests}


def validate_status(filter_: str, filter_value: str, requests: List[models.Request]) -> bool:
    return {filter_value} == {r.status.value for r in requests}


def validate_id(filter_: str, filter_value: int, requests: List[models.Request]) -> bool:
    return {filter_value} == {getattr(r.operation, filter_) for r in requests}


def validate_resource(filter_: str, filter_value: str, requests: List[models.Request]) -> bool:
    return {filter_value} == {r.operation.target.value for r in requests}


def validate_format(filter_: str, filter_value: str, requests: List[models.Request]) -> bool:
    return {filter_value} == {r.operation.format for r in requests}


@pytest.mark.usefixtures("restore_db_per_class")
@pytest.mark.usefixtures("restore_redis_inmem_per_function")
@pytest.mark.timeout(30)
class TestListRequests:
    @pytest.fixture(autouse=True)
    def setup(self, projects, tasks, jobs, find_users):
        self.projects = projects
        self.tasks = tasks
        self.jobs = jobs
        self.user = find_users(privilege="user")[0]["username"]

    def create_resources(self):
        self.project_ids = self.create_projects()
        self.task_ids = self.create_tasks()
        self.job_ids = []
        for tid in self.task_ids:
            self.job_ids.extend(self.get_job_ids(tid))

    def make_requests(self):
        # download datasets and backups for first resources
        self.assets = {
            "project": {},
            "task": {},
            "job": {},
        }

        for resource in ("project", "task", "job"):
            for subresource in ("dataset", "annotations", "backup"):
                if resource == "job" and subresource == "backup":
                    continue

                func = {
                    ("project", "dataset"): lambda *args, **kwargs: export_project_dataset(
                        *args, **kwargs, save_images=True
                    ),
                    ("project", "annotations"): lambda *args, **kwargs: export_project_dataset(
                        *args, **kwargs, save_images=False
                    ),
                    ("project", "backup"): export_project_backup,
                    ("task", "dataset"): lambda *args, **kwargs: export_task_dataset(
                        *args, **kwargs, save_images=True
                    ),
                    ("task", "annotations"): lambda *args, **kwargs: export_task_dataset(
                        *args, **kwargs, save_images=False
                    ),
                    ("task", "backup"): export_task_backup,
                    ("job", "dataset"): lambda *args, **kwargs: export_job_dataset(
                        *args, **kwargs, save_images=True
                    ),
                    ("job", "annotations"): lambda *args, **kwargs: export_job_dataset(
                        *args, **kwargs, save_images=False
                    ),
                }[(resource, subresource)]

                data = func(self.user, api_version=2, id=getattr(self, f"{resource}_ids")[0])
                assert data
                tmp_file = io.BytesIO(data)
                tmp_file.name = f"{resource}_{subresource}.zip"

                self.assets[resource][subresource] = tmp_file

        empty_file = io.BytesIO(b"empty_file")
        empty_file.name = "empty.zip"

        # import corrupted backup
        import_task_backup(
            self.user,
            data={
                "task_file": empty_file,
            },
        )
        # import not corrupted backup
        import_task_backup(
            self.user,
            data={
                "task_file": self.assets["task"]["backup"],
            },
        )

        for project_id in self.project_ids[1:]:
            export_project_backup(self.user, api_version=2, id=project_id, download_result=False)
            export_project_dataset(
                self.user, api_version=2, save_images=True, id=project_id, download_result=False
            )
            export_project_dataset(
                self.user, api_version=2, save_images=False, id=project_id, download_result=False
            )

        for task_id in self.task_ids[1:]:
            export_task_backup(self.user, api_version=2, id=task_id, download_result=False)
            export_task_dataset(
                self.user, api_version=2, save_images=True, id=task_id, download_result=False
            )
            export_task_dataset(
                self.user, api_version=2, save_images=False, id=task_id, download_result=False
            )

        for job_id in self.job_ids[1:]:
            export_job_dataset(
                self.user,
                api_version=2,
                save_images=True,
                id=job_id,
                format="COCO 1.0",
                download_result=False,
            )
            export_job_dataset(
                self.user,
                api_version=2,
                save_images=False,
                id=job_id,
                format="YOLO 1.1",
                download_result=False,
            )

    def create_tasks(self, number: int = 2) -> List[int]:
        task_ids = []

        for idx in range(1, number + 1):
            task_id, _ = create_task(
                self.user,
                spec={"name": f"Test task {idx}", "labels": [{"name": "car"}]},
                data={
                    "image_quality": 75,
                    "client_files": generate_image_files(2),
                    "segment_size": 1,
                },
            )
            task_ids.append(task_id)
        return task_ids

    def create_projects(self, number: int = 2) -> List[int]:
        project_ids = []

        with make_api_client(self.user) as api_client:
            for idx in range(1, number + 1):
                (project, response) = api_client.projects_api.create(
                    {"name": f"Test project {idx}", "labels": [{"name": "car"}]}
                )
                assert response.status == HTTPStatus.CREATED
                project_ids.append(project.id)

        return project_ids

    def get_job_ids(self, task_id: int) -> List[int]:
        with make_api_client(self.user) as api_client:
            jobs, response = api_client.jobs_api.list(task_id=task_id)
            assert response.status == HTTPStatus.OK

            return [j.id for j in jobs.results]

    @pytest.mark.parametrize(
        "simple_filter, values, validate_func",
        [
            ("subresource", ["annotations", "dataset", "backup"], validate_subresource),
            ("action", ["create", "export", "import"], validate_action),
            ("status", ["finished", "failed"], validate_status),
            ("project_id", [], validate_id),
            ("task_id", [], validate_id),
            ("job_id", [], validate_id),
            ("format", ["CVAT for images 1.1", "COCO 1.0", "YOLO 1.1"], validate_format),
            ("resource", ["project", "task", "job"], validate_resource),
        ],
    )
    def test_list_request_with_simple_filter(
        self, simple_filter: str, values: List[str], validate_func: Callable
    ):
        self.create_resources()
        self.make_requests()
        if simple_filter in ("project_id", "task_id", "job_id"):
            # check last project|task|job
            values = getattr(self, f"{simple_filter}s")[-1:]

        with make_api_client(self.user) as api_client:
            for value in values:
                bg_requests, response = api_client.requests_api.list(**{simple_filter: value})
                assert response.status == HTTPStatus.OK
                assert len(bg_requests.results)
                assert validate_func(simple_filter, value, bg_requests.results)


@pytest.mark.usefixtures("restore_db_per_class")
@pytest.mark.usefixtures("restore_redis_inmem_per_function")
class TestGetRequests:

    def _test_get_request_200(self, api_client: ApiClient, rq_id: str, **kwargs) -> models.Request:
        (background_request, response) = api_client.requests_api.retrieve(rq_id, **kwargs)
        assert response.status == HTTPStatus.OK
        assert background_request.id == rq_id

        return background_request

    def _test_get_request_403(self, api_client: ApiClient, rq_id: str):
        (_, response) = api_client.requests_api.retrieve(
            rq_id, _parse_response=False, _check_status=False
        )
        assert response.status == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize("format_name", ("CVAT for images 1.1",))
    @pytest.mark.parametrize("save_images", (True, False))
    def test_owner_can_retrieve_request(self, format_name: str, save_images: bool, projects):
        project = next(
            (
                p
                for p in projects
                if p["owner"] and (p["target_storage"] or {}).get("location") == "local"
            )
        )
        owner = project["owner"]

        subresource = "dataset" if save_images else "annotations"
        export_project_dataset(
            owner["username"],
            api_version=2,
            save_images=save_images,
            id=project["id"],
            download_result=False,
        )
        rq_id = f'export:project-{project["id"]}-{subresource}-in-{format_name.replace(" ", "_").replace(".", "@")}-format-by-{owner["id"]}'

        with make_api_client(owner["username"]) as owner_client:
            bg_request = self._test_get_request_200(owner_client, rq_id)

            assert (
                bg_request.created_date
                < bg_request.started_date
                < bg_request.finished_date
                < bg_request.expiry_date
            )
            assert bg_request.operation.format == format_name
            assert bg_request.operation.project_id == project["id"]
            assert bg_request.operation.target.value == "project"
            assert bg_request.operation.task_id is None
            assert bg_request.operation.job_id is None
            assert bg_request.operation.type == f"export:{subresource}"
            assert bg_request.owner.id == owner["id"]
            assert bg_request.owner.username == owner["username"]

            parsed_url = urlparse(bg_request.result_url)
            assert all([parsed_url.scheme, parsed_url.netloc, parsed_url.path, parsed_url.query])

    @pytest.mark.parametrize("format_name", ("CVAT for images 1.1",))
    def test_non_owner_cannot_retrieve_request(self, find_users, projects, format_name: str):
        project = next(
            (
                p
                for p in projects
                if p["owner"] and (p["target_storage"] or {}).get("location") == "local"
            )
        )
        owner = project["owner"]
        malefactor = find_users(exclude_username=owner["username"])[0]

        export_project_dataset(
            owner["username"],
            api_version=2,
            save_images=True,
            id=project["id"],
            download_result=False,
        )
        rq_id = f'export:project-{project["id"]}-dataset-in-{format_name.replace(" ", "_").replace(".", "@")}-format-by-{owner["id"]}'

        with make_api_client(malefactor["username"]) as malefactor_client:
            self._test_get_request_403(malefactor_client, rq_id)
