# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
from http import HTTPStatus
from urllib.parse import urlparse

import pytest
from cvat_sdk.api_client import ApiClient, models
from cvat_sdk.api_client.api_client import Endpoint
from cvat_sdk.core.helpers import get_paginated_collection

from shared.utils.config import make_api_client
from shared.utils.helpers import generate_image_files

from .utils import (
    CollectionSimpleFilterTestBase,
    create_task,
    export_job_dataset,
    export_project_backup,
    export_project_dataset,
    export_task_backup,
    export_task_dataset,
    import_task_backup,
)


@pytest.mark.usefixtures("restore_db_per_class")
@pytest.mark.usefixtures("restore_redis_inmem_per_function")
@pytest.mark.usefixtures("restore_redis_ondisk_per_function")
@pytest.mark.timeout(30)
class TestRequestsListFilters(CollectionSimpleFilterTestBase):

    field_lookups = {
        "target": ["operation", "target"],
        "subresource": ["operation", "type", lambda x: x.split(":")[1]],
        "action": ["operation", "type", lambda x: x.split(":")[0]],
        "project_id": ["operation", "project_id"],
        "task_id": ["operation", "task_id"],
        "job_id": ["operation", "job_id"],
        "format": ["operation", "format"],
    }

    def _get_endpoint(self, api_client: ApiClient) -> Endpoint:
        return api_client.requests_api.list_endpoint

    @pytest.fixture(autouse=True)
    def setup(self, find_users):
        self.user = find_users(privilege="user")[0]["username"]

    @pytest.fixture
    def fxt_resources_ids(self):
        with make_api_client(self.user) as api_client:
            project_ids = [
                api_client.projects_api.create(
                    {"name": f"Test project {idx + 1}", "labels": [{"name": "car"}]}
                )[0].id
                for idx in range(3)
            ]

            task_ids = [
                create_task(
                    self.user,
                    spec={"name": f"Test task {idx + 1}", "labels": [{"name": "car"}]},
                    data={
                        "image_quality": 75,
                        "client_files": generate_image_files(2),
                        "segment_size": 1,
                    },
                )[0]
                for idx in range(3)
            ]

            job_ids = []
            for task_id in task_ids:
                jobs, _ = api_client.jobs_api.list(task_id=task_id)
                job_ids.extend([j.id for j in jobs.results])

        return project_ids, task_ids, job_ids

    @pytest.fixture
    def fxt_make_requests(
        self,
        fxt_make_export_project_requests,
        fxt_make_export_task_requests,
        fxt_make_export_job_requests,
        fxt_download_file,
    ):
        def _make_requests(project_ids: list[int], task_ids: list[int], job_ids: list[int]):
            # make requests to export projects|tasks|jobs annotations|datasets|backups
            fxt_make_export_project_requests(project_ids[1:])
            fxt_make_export_task_requests(task_ids[1:])
            fxt_make_export_job_requests(job_ids[1:])

            # make requests to download files and then import them
            for resource_type, first_resource in zip(
                ("project", "task", "job"), (project_ids[0], task_ids[0], job_ids[0])
            ):
                for subresource in ("dataset", "annotations", "backup"):
                    if resource_type == "job" and subresource == "backup":
                        continue

                    data = fxt_download_file(resource_type, first_resource, subresource)

                    tmp_file = io.BytesIO(data)
                    tmp_file.name = f"{resource_type}_{subresource}.zip"

                    if resource_type == "task" and subresource == "backup":
                        import_task_backup(
                            self.user,
                            data={
                                "task_file": tmp_file,
                            },
                        )

            empty_file = io.BytesIO(b"empty_file")
            empty_file.name = "empty.zip"

            # import corrupted backup
            import_task_backup(
                self.user,
                data={
                    "task_file": empty_file,
                },
            )

        return _make_requests

    @pytest.fixture
    def fxt_download_file(self):
        def download_file(resource: str, rid: int, subresource: str):
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

            data = func(self.user, api_version=2, id=rid, download_result=True)
            assert data, f"Failed to download {resource} {subresource} locally"
            return data

        return download_file

    @pytest.fixture
    def fxt_make_export_project_requests(self):
        def make_requests(project_ids: list[int]):
            for project_id in project_ids:
                export_project_backup(
                    self.user, api_version=2, id=project_id, download_result=False
                )
                export_project_dataset(
                    self.user, api_version=2, save_images=True, id=project_id, download_result=False
                )
                export_project_dataset(
                    self.user,
                    api_version=2,
                    save_images=False,
                    id=project_id,
                    download_result=False,
                )

        return make_requests

    @pytest.fixture
    def fxt_make_export_task_requests(self):
        def make_requests(task_ids: list[int]):
            for task_id in task_ids:
                export_task_backup(self.user, api_version=2, id=task_id, download_result=False)
                export_task_dataset(
                    self.user, api_version=2, save_images=True, id=task_id, download_result=False
                )
                export_task_dataset(
                    self.user, api_version=2, save_images=False, id=task_id, download_result=False
                )

        return make_requests

    @pytest.fixture
    def fxt_make_export_job_requests(self):
        def make_requests(job_ids: list[int]):
            for job_id in job_ids:
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

        return make_requests

    @pytest.mark.parametrize(
        "simple_filter, values",
        [
            ("subresource", ["annotations", "dataset", "backup"]),
            ("action", ["create", "export", "import"]),
            ("status", ["finished", "failed"]),
            ("project_id", []),
            ("task_id", []),
            ("job_id", []),
            ("format", ["CVAT for images 1.1", "COCO 1.0", "YOLO 1.1"]),
            ("target", ["project", "task", "job"]),
        ],
    )
    def test_can_use_simple_filter_for_object_list(
        self, simple_filter: str, values: list, fxt_resources_ids, fxt_make_requests
    ):
        project_ids, task_ids, job_ids = fxt_resources_ids
        fxt_make_requests(project_ids, task_ids, job_ids)

        if simple_filter in ("project_id", "task_id", "job_id"):
            # check last project|task|job
            if simple_filter == "project_id":
                values = project_ids[-1:]
            elif simple_filter == "task_id":
                values = task_ids[-1:]
            else:
                values = job_ids[-1:]

        with make_api_client(self.user) as api_client:
            self.samples = get_paginated_collection(
                self._get_endpoint(api_client), return_json=True
            )

        return super()._test_can_use_simple_filter_for_object_list(simple_filter, values)


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
