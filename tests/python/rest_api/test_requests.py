# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import json
from http import HTTPStatus
from urllib.parse import parse_qsl, urlparse

import pytest
from cvat_sdk.api_client import ApiClient, models
from cvat_sdk.api_client.api_client import Endpoint
from cvat_sdk.core.helpers import get_paginated_collection

from shared.fixtures.data import Container
from shared.fixtures.init import docker_exec_redis_inmem, kube_exec_redis_inmem
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
    import_job_annotations,
    import_project_backup,
    import_project_dataset,
    import_task_annotations,
    import_task_backup,
    wait_background_request,
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
                            file_content=tmp_file,
                        )

            empty_file = io.BytesIO(b"empty_file")
            empty_file.name = "empty.zip"

            # import corrupted backup
            import_task_backup(
                self.user,
                file_content=empty_file,
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

            data = func(self.user, id=rid, download_result=True)
            assert data, f"Failed to download {resource} {subresource} locally"
            return data

        return download_file

    @pytest.fixture
    def fxt_make_export_project_requests(self):
        def make_requests(project_ids: list[int]):
            for project_id in project_ids:
                export_project_backup(self.user, id=project_id, download_result=False)
                export_project_dataset(
                    self.user, save_images=True, id=project_id, download_result=False
                )
                export_project_dataset(
                    self.user,
                    save_images=False,
                    id=project_id,
                    download_result=False,
                )

        return make_requests

    @pytest.fixture
    def fxt_make_export_task_requests(self):
        def make_requests(task_ids: list[int]):
            for task_id in task_ids:
                export_task_backup(self.user, id=task_id, download_result=False)
                export_task_dataset(self.user, save_images=True, id=task_id, download_result=False)
                export_task_dataset(self.user, save_images=False, id=task_id, download_result=False)

        return make_requests

    @pytest.fixture
    def fxt_make_export_job_requests(self):
        def make_requests(job_ids: list[int]):
            for job_id in job_ids:
                export_job_dataset(
                    self.user,
                    save_images=True,
                    id=job_id,
                    format="COCO 1.0",
                    download_result=False,
                )
                export_job_dataset(
                    self.user,
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

    def test_list_requests_when_there_is_job_with_non_regular_or_corrupted_meta(
        self, jobs: Container, admin_user: str, request: pytest.FixtureRequest
    ):
        job = next(iter(jobs))

        export_job_dataset(admin_user, save_images=True, id=job["id"], download_result=False)
        export_job_dataset(admin_user, save_images=False, id=job["id"], download_result=False)

        with make_api_client(admin_user) as api_client:
            background_requests, response = api_client.requests_api.list(_check_status=False)
            assert response.status == HTTPStatus.OK
            assert 2 == background_requests.count

            corrupted_job, normal_job = background_requests.results
            corrupted_job_key = f"rq:job:{corrupted_job['id']}"
            remove_meta_command = f'redis-cli -e HDEL "{corrupted_job_key}" meta'

            if request.config.getoption("--platform") == "local":
                stdout, _ = docker_exec_redis_inmem(["sh", "-c", remove_meta_command])
            else:
                stdout, _ = kube_exec_redis_inmem(
                    [
                        "sh",
                        "-c",
                        'export REDISCLI_AUTH="${REDIS_PASSWORD}" && ' + remove_meta_command,
                    ]
                )
            assert bool(int(stdout.strip()))

            _, response = api_client.requests_api.list(_check_status=False, _parse_response=False)
            assert response.status == HTTPStatus.OK

            background_requests = json.loads(response.data)
            assert 1 == background_requests["count"]
            assert normal_job.id == background_requests["results"][0]["id"]


@pytest.mark.usefixtures("restore_db_per_class")
@pytest.mark.usefixtures("restore_redis_inmem_per_function")
class TestGetRequests:

    def _test_get_request_200(
        self, api_client: ApiClient, rq_id: str, validate_rq_id: bool = True, **kwargs
    ) -> models.Request:
        (background_request, response) = api_client.requests_api.retrieve(rq_id, **kwargs)
        assert response.status == HTTPStatus.OK

        if validate_rq_id:
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
            p
            for p in projects
            if p["owner"] and (p["target_storage"] or {}).get("location") == "local"
        )
        owner = project["owner"]

        subresource = "dataset" if save_images else "annotations"
        request_id = export_project_dataset(
            owner["username"],
            save_images=save_images,
            id=project["id"],
            download_result=False,
            format=format_name,
        )

        with make_api_client(owner["username"]) as owner_client:
            bg_request = self._test_get_request_200(owner_client, request_id)

            assert (
                bg_request.created_date
                < bg_request.started_date
                < bg_request.finished_date
                < bg_request.expiry_date
            )
            assert bg_request.operation.format == format_name
            assert bg_request.operation.project_id == project["id"]
            assert bg_request.operation.target == "project"
            assert bg_request.operation.task_id is None
            assert bg_request.operation.job_id is None
            assert bg_request.operation.type == f"export:{subresource}"
            assert bg_request.owner.id == owner["id"]
            assert bg_request.owner.username == owner["username"]

            parsed_url = urlparse(bg_request.result_url)
            assert all([parsed_url.scheme, parsed_url.netloc, parsed_url.path, parsed_url.query])

    def test_non_owner_cannot_retrieve_request(self, find_users, projects):
        project = next(
            p
            for p in projects
            if p["owner"] and (p["target_storage"] or {}).get("location") == "local"
        )
        owner = project["owner"]
        malefactor = find_users(exclude_username=owner["username"])[0]

        request_id = export_project_dataset(
            owner["username"],
            save_images=True,
            id=project["id"],
            download_result=False,
        )
        with make_api_client(malefactor["username"]) as malefactor_client:
            self._test_get_request_403(malefactor_client, request_id)

    def _test_get_request_using_legacy_id(
        self,
        legacy_request_id: str,
        username: str,
        *,
        action: str,
        target_type: str,
        subresource: str | None = None,
    ):
        with make_api_client(username) as api_client:
            bg_requests, _ = api_client.requests_api.list(
                target=target_type,
                action=action,
                **({"subresource": subresource} if subresource else {}),
            )
            assert len(bg_requests.results) == 1
            request_id = bg_requests.results[0].id
            bg_request = self._test_get_request_200(
                api_client, legacy_request_id, validate_rq_id=False
            )
            assert bg_request.id == request_id

    @pytest.mark.parametrize("target_type", ("project", "task", "job"))
    @pytest.mark.parametrize("save_images", (True, False))
    @pytest.mark.parametrize("export_format", ("CVAT for images 1.1",))
    @pytest.mark.parametrize("import_format", ("CVAT 1.1",))
    def test_can_retrieve_dataset_import_export_requests_using_legacy_ids(
        self,
        target_type: str,
        save_images: bool,
        export_format: str,
        import_format: str,
        projects,
        tasks,
        jobs,
    ):
        def build_legacy_id_for_export_request(
            *,
            target_type: str,
            target_id: int,
            subresource: str,
            format_name: str,
            user_id: int,
        ):
            return f"export:{target_type}-{target_id}-{subresource}-in-{format_name.replace(' ', '_').replace('.', '@')}-format-by-{user_id}"

        def build_legacy_id_for_import_request(
            *,
            target_type: str,
            target_id: int,
            subresource: str,
        ):
            return f"import:{target_type}-{target_id}-{subresource}"

        if target_type == "project":
            export_func, import_func = export_project_dataset, import_project_dataset
            target = next(iter(projects))
            owner = target["owner"]
        elif target_type == "task":
            export_func, import_func = export_task_dataset, import_task_annotations
            target = next(iter(tasks))
            owner = target["owner"]
        else:
            assert target_type == "job"
            export_func, import_func = export_job_dataset, import_job_annotations
            target = next(iter(jobs))
            owner = tasks[target["task_id"]]["owner"]

        target_id = target["id"]
        subresource = "dataset" if save_images else "annotations"
        file_content = io.BytesIO(
            export_func(
                owner["username"],
                save_images=save_images,
                format=export_format,
                id=target_id,
            )
        )
        file_content.name = "file.zip"

        legacy_request_id = build_legacy_id_for_export_request(
            target_type=target_type,
            target_id=target["id"],
            subresource=subresource,
            format_name=export_format,
            user_id=owner["id"],
        )

        self._test_get_request_using_legacy_id(
            legacy_request_id,
            owner["username"],
            action="export",
            target_type=target_type,
            subresource=subresource,
        )

        # check import requests
        if not save_images and target_type == "project" or save_images and target_type != "project":
            # skip:
            # importing annotations into a project
            # importing datasets into a task or job
            return

        import_func(
            owner["username"],
            file_content=file_content,
            id=target_id,
            format=import_format,
        )

        legacy_request_id = build_legacy_id_for_import_request(
            target_type=target_type, target_id=target_id, subresource=subresource
        )
        self._test_get_request_using_legacy_id(
            legacy_request_id,
            owner["username"],
            action="import",
            target_type=target_type,
            subresource=subresource,
        )

    @pytest.mark.parametrize("target_type", ("project", "task"))
    def test_can_retrieve_backup_import_export_requests_using_legacy_ids(
        self,
        target_type: str,
        projects,
        tasks,
    ):
        def build_legacy_id_for_export_request(
            *,
            target_type: str,
            target_id: int,
            user_id: int,
        ):
            return f"export:{target_type}-{target_id}-backup-by-{user_id}"

        def build_legacy_id_for_import_request(
            *,
            target_type: str,
            uuid_: str,
        ):
            return f"import:{target_type}-{uuid_}-backup"

        if target_type == "project":
            export_func, import_func = export_project_backup, import_project_backup
            target = next(iter(projects))
        else:
            assert target_type == "task"
            export_func, import_func = export_task_backup, import_task_backup
            target = next(iter(tasks))

        owner = target["owner"]

        # check export requests
        backup_file = io.BytesIO(
            export_func(
                owner["username"],
                id=target["id"],
            )
        )
        backup_file.name = "file.zip"

        legacy_request_id = build_legacy_id_for_export_request(
            target_type=target_type, target_id=target["id"], user_id=owner["id"]
        )
        self._test_get_request_using_legacy_id(
            legacy_request_id,
            owner["username"],
            action="export",
            target_type=target_type,
            subresource="backup",
        )

        # check import requests
        result_id = import_func(
            owner["username"],
            file_content=backup_file,
        ).id
        legacy_request_id = build_legacy_id_for_import_request(
            target_type=target_type, uuid_=dict(parse_qsl(result_id))["id"]
        )

        self._test_get_request_using_legacy_id(
            legacy_request_id,
            owner["username"],
            action="import",
            target_type=target_type,
            subresource="backup",
        )

    def test_can_retrieve_task_creation_requests_using_legacy_ids(self, admin_user: str):
        task_id = create_task(
            admin_user,
            spec={"name": "Test task", "labels": [{"name": "car"}]},
            data={
                "image_quality": 75,
                "client_files": generate_image_files(2),
                "segment_size": 1,
            },
        )[0]

        legacy_request_id = f"create:task-{task_id}"
        self._test_get_request_using_legacy_id(
            legacy_request_id, admin_user, action="create", target_type="task"
        )

    def test_can_retrieve_quality_calculation_requests_using_legacy_ids(self, jobs, tasks):
        gt_job = next(
            j
            for j in jobs
            if (
                j["type"] == "ground_truth"
                and j["stage"] == "acceptance"
                and j["state"] == "completed"
            )
        )
        task_id = gt_job["task_id"]
        owner = tasks[task_id]["owner"]

        legacy_request_id = f"quality-check-task-{task_id}-user-{owner['id']}"

        with make_api_client(owner["username"]) as api_client:
            # initiate quality report calculation
            (_, response) = api_client.quality_api.create_report(
                quality_report_create_request=models.QualityReportCreateRequest(task_id=task_id),
                _parse_response=False,
            )
            assert response.status == HTTPStatus.ACCEPTED
            request_id = json.loads(response.data)["rq_id"]

            # get background request details using common request API
            bg_request = self._test_get_request_200(
                api_client, legacy_request_id, validate_rq_id=False
            )
            assert bg_request.id == request_id

            # get quality report by legacy request ID using the deprecated API endpoint
            wait_background_request(api_client, request_id)
            api_client.quality_api.create_report(
                quality_report_create_request=models.QualityReportCreateRequest(task_id=task_id),
                rq_id=request_id,
            )
