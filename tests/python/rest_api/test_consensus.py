# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
from collections.abc import Sequence
from copy import deepcopy
from functools import partial
from http import HTTPStatus
from itertools import product
from typing import Any

import pytest
from cvat_sdk.api_client import exceptions, models
from cvat_sdk.api_client.api_client import ApiClient, Endpoint
from cvat_sdk.core.helpers import get_paginated_collection
from deepdiff import DeepDiff

from shared.utils.config import make_api_client
from shared.utils.helpers import generate_image_files

from .utils import (
    CollectionSimpleFilterTestBase,
    compare_annotations,
    create_consensus_merge,
    create_task,
    invite_user_to_org,
    register_new_user,
    wait_background_request,
)


class _PermissionTestBase:
    def request_merge(
        self,
        *,
        task_id: int | None = None,
        job_id: int | None = None,
        user: str,
    ) -> str:
        response = create_consensus_merge(
            user=user, task_id=task_id, job_id=job_id, wait_result=False
        )
        return json.loads(response.data)["rq_id"]

    @pytest.fixture
    def find_sandbox_task(self, tasks, tasks_with_replicas, users, is_task_staff):
        def _find(
            is_staff: bool, *, has_consensus_jobs: bool | None = None
        ) -> tuple[dict[str, Any], dict[str, Any]]:
            task = next(
                t
                for t in tasks
                if t["organization"] is None
                and not users[t["owner"]["id"]]["is_superuser"]
                and (
                    has_consensus_jobs is None
                    or has_consensus_jobs == (t["id"] in tasks_with_replicas.map)
                )
            )

            if is_staff:
                user = task["owner"]
            else:
                user = next(u for u in users if not is_task_staff(u["id"], task["id"]))

            return task, user

        return _find

    @pytest.fixture
    def find_sandbox_task_with_consensus(self, find_sandbox_task):
        return partial(find_sandbox_task, has_consensus_jobs=True)

    @pytest.fixture
    def find_org_task(
        self,
        restore_db_per_function,
        tasks,
        tasks_with_replicas,
        users,
        is_org_member,
        is_task_staff,
        admin_user,
    ):
        def _find(
            is_staff: bool, user_org_role: str, *, has_consensus_jobs: bool | None = None
        ) -> tuple[dict[str, Any], dict[str, Any]]:
            for user in users:
                if user["is_superuser"]:
                    continue

                task = next(
                    (
                        t
                        for t in tasks
                        if t["organization"] is not None
                        and is_task_staff(user["id"], t["id"]) == is_staff
                        and is_org_member(user["id"], t["organization"], role=user_org_role)
                        and (
                            has_consensus_jobs is None
                            or has_consensus_jobs == (t["id"] in tasks_with_replicas.map)
                        )
                    ),
                    None,
                )
                if task is not None:
                    break

            if not task:
                task = next(
                    t
                    for t in tasks
                    if t["organization"] is not None
                    if has_consensus_jobs is None
                    or has_consensus_jobs == (t["id"] in tasks_with_replicas.map)
                )
                user = next(
                    u
                    for u in users
                    if is_org_member(u["id"], task["organization"], role=user_org_role)
                )

                if is_staff:
                    with make_api_client(admin_user) as api_client:
                        api_client.tasks_api.partial_update(
                            task["id"],
                            patched_task_write_request=models.PatchedTaskWriteRequest(
                                assignee_id=user["id"]
                            ),
                        )

            return task, user

        return _find

    @pytest.fixture
    def find_org_task_with_consensus(self, find_org_task):
        return partial(find_org_task, has_consensus_jobs=True)

    _default_sandbox_cases = ("is_staff, allow", [(True, True), (False, False)])

    _default_org_cases = (
        "org_role, is_staff, allow",
        [
            ("owner", True, True),
            ("owner", False, True),
            ("maintainer", True, True),
            ("maintainer", False, True),
            ("supervisor", True, True),
            ("supervisor", False, False),
            ("worker", True, True),
            ("worker", False, False),
        ],
    )

    _default_org_roles = ("owner", "maintainer", "supervisor", "worker")


@pytest.mark.usefixtures("restore_db_per_function")
@pytest.mark.usefixtures("restore_redis_inmem_per_function")
class TestPostConsensusMerge(_PermissionTestBase):
    def test_can_merge_task_with_consensus_jobs(self, admin_user, tasks_with_replicas):
        task_id = next(iter(tasks_with_replicas))["id"]

        create_consensus_merge(user=admin_user, task_id=task_id)

    def test_can_merge_consensus_job(self, admin_user, jobs):
        parent_job_ids = {j["parent_job_id"] for j in jobs if j["type"] == "replica"}
        job_id = next(
            j["id"] for j in jobs if j["type"] == "annotation" and j["id"] in parent_job_ids
        )

        create_consensus_merge(user=admin_user, job_id=job_id)

    @pytest.mark.parametrize("dimension", ["1d", "3d"])
    def test_cannot_merge_non_2d_task(self, admin_user, tasks, dimension: str):
        task_id = next(t["id"] for t in tasks if t["dimension"] == dimension)

        with pytest.raises(exceptions.ApiException) as capture:
            create_consensus_merge(user=admin_user, task_id=task_id)

        assert "Merging is only supported in 2d tasks" in capture.value.body

    def test_cannot_merge_task_without_annotation_stage_jobs(
        self, admin_user, tasks_with_replicas, jobs
    ):
        task_id = next(iter(tasks_with_replicas))["id"]

        with make_api_client(admin_user) as api_client:
            for j in jobs:
                if j["task_id"] == task_id and j["type"] == "annotation":
                    api_client.jobs_api.partial_update(
                        id=j["id"],
                        patched_job_write_request=models.PatchedJobWriteRequest(stage="validation"),
                    )

        with pytest.raises(exceptions.ApiException) as capture:
            create_consensus_merge(user=admin_user, task_id=task_id)

        assert "No annotation jobs in the annotation stage" in capture.value.body

    @pytest.mark.parametrize("job_type", ["replica", "ground_truth"])
    def test_cannot_merge_job_of_unsupported_type(self, admin_user, tasks, jobs, job_type: str):
        task_ids_2d = {t["id"] for t in tasks if t["dimension"] == "2d"}
        job_id = next(
            j["id"] for j in jobs if j["type"] == job_type and j["task_id"] in task_ids_2d
        )

        with pytest.raises(exceptions.ApiException) as capture:
            create_consensus_merge(user=admin_user, job_id=job_id)

        assert (
            f"Job {job_id} is not an annotation job in the annotation stage" in capture.value.body
        )

    def test_cannot_merge_job_outside_annotation_stage(self, admin_user, jobs):
        parent_job_ids = {j["parent_job_id"] for j in jobs if j["type"] == "replica"}
        job_id = next(
            j["id"] for j in jobs if j["type"] == "annotation" and j["id"] in parent_job_ids
        )

        with make_api_client(admin_user) as api_client:
            api_client.jobs_api.partial_update(
                id=job_id,
                patched_job_write_request=models.PatchedJobWriteRequest(stage="validation"),
            )

        with pytest.raises(exceptions.ApiException) as capture:
            create_consensus_merge(user=admin_user, job_id=job_id)

        assert (
            f"Job {job_id} is not an annotation job in the annotation stage" in capture.value.body
        )

    def _test_merge_200(self, user: str, *, task_id: int | None = None, job_id: int | None = None):
        return create_consensus_merge(user=user, task_id=task_id, job_id=job_id)

    def _test_merge_403(self, user: str, *, task_id: int | None = None, job_id: int | None = None):
        response = create_consensus_merge(
            user=user, task_id=task_id, job_id=job_id, raise_on_error=False
        )
        assert response.status == HTTPStatus.FORBIDDEN
        return response

    @pytest.mark.parametrize(*_PermissionTestBase._default_sandbox_cases)
    def test_user_merge_in_sandbox_task(self, is_staff, allow, find_sandbox_task_with_consensus):
        task, user = find_sandbox_task_with_consensus(is_staff)

        if allow:
            self._test_merge_200(user["username"], task_id=task["id"])
        else:
            self._test_merge_403(user["username"], task_id=task["id"])

    @pytest.mark.parametrize(*_PermissionTestBase._default_org_cases)
    def test_user_merge_in_org_task(
        self,
        find_org_task_with_consensus,
        org_role,
        is_staff,
        allow,
    ):
        task, user = find_org_task_with_consensus(is_staff, org_role)

        if allow:
            self._test_merge_200(user["username"], task_id=task["id"])
        else:
            self._test_merge_403(user["username"], task_id=task["id"])

    # users with task:view rights can check status of report creation
    def _test_check_merge_status(
        self,
        rq_id: str,
        *,
        staff_user: str,
        another_user: str,
        another_user_status: int = HTTPStatus.FORBIDDEN,
    ):
        with make_api_client(another_user) as api_client:
            _, response = api_client.requests_api.retrieve(
                rq_id, _parse_response=False, _check_status=False
            )
            assert response.status == another_user_status

        with make_api_client(staff_user) as api_client:
            wait_background_request(api_client, rq_id)

    def test_user_without_rights_cannot_check_status_of_merge_in_sandbox(
        self,
        find_sandbox_task_with_consensus,
        users,
    ):
        task, task_staff = find_sandbox_task_with_consensus(is_staff=True)

        another_user = next(
            u
            for u in users
            if (
                u["id"] != task_staff["id"]
                and not u["is_superuser"]
                and u["id"] != task["owner"]["id"]
                and u["id"] != (task["assignee"] or {}).get("id")
            )
        )

        rq_id = self.request_merge(task_id=task["id"], user=task_staff["username"])
        self._test_check_merge_status(
            rq_id, staff_user=task_staff["username"], another_user=another_user["username"]
        )

    @pytest.mark.parametrize(
        "same_org, role",
        [
            pair
            for pair in product([True, False], _PermissionTestBase._default_org_roles)
            if not (pair[0] and pair[1] in ["owner", "maintainer"])
        ],
    )
    def test_user_without_rights_cannot_check_status_of_merge_in_org(
        self,
        find_org_task_with_consensus,
        same_org: bool,
        role: str,
        organizations,
    ):
        task, task_staff = find_org_task_with_consensus(is_staff=True, user_org_role="supervisor")

        # create a new user that passes the requirements
        another_user = register_new_user(f"{same_org}{role}")
        org_id = (
            task["organization"]
            if same_org
            else next(o for o in organizations if o["id"] != task["organization"])["id"]
        )
        invite_user_to_org(another_user["email"], org_id, role)

        rq_id = self.request_merge(task_id=task["id"], user=task_staff["username"])
        self._test_check_merge_status(
            rq_id, staff_user=task_staff["username"], another_user=another_user["username"]
        )

    @pytest.mark.parametrize(
        "role",
        # owner and maintainer have rights even without being assigned to a task
        ("supervisor", "worker"),
    )
    def test_task_assignee_can_check_status_of_merge_in_org(
        self,
        find_org_task_with_consensus,
        role: str,
    ):
        task, another_user = find_org_task_with_consensus(is_staff=False, user_org_role=role)
        task_owner = task["owner"]

        rq_id = self.request_merge(task_id=task["id"], user=task_owner["username"])
        self._test_check_merge_status(
            rq_id,
            staff_user=task_owner["username"],
            another_user=another_user["username"],
        )

        with make_api_client(task_owner["username"]) as api_client:
            api_client.tasks_api.partial_update(
                task["id"],
                patched_task_write_request=models.PatchedTaskWriteRequest(
                    assignee_id=another_user["id"]
                ),
            )

        self._test_check_merge_status(
            rq_id,
            staff_user=task_owner["username"],
            another_user=another_user["username"],
            another_user_status=HTTPStatus.OK,
        )

    @pytest.mark.parametrize("is_sandbox", (True, False))
    def test_admin_can_check_status_of_merge(
        self,
        find_org_task_with_consensus,
        find_sandbox_task_with_consensus,
        users,
        is_sandbox: bool,
    ):
        if is_sandbox:
            task, task_staff = find_sandbox_task_with_consensus(is_staff=True)
        else:
            task, task_staff = find_org_task_with_consensus(is_staff=True, user_org_role="owner")

        admin = next(
            u
            for u in users
            if (
                u["is_superuser"]
                and u["id"] != task_staff["id"]
                and u["id"] != task["owner"]["id"]
                and u["id"] != (task["assignee"] or {}).get("id")
            )
        )

        rq_id = self.request_merge(task_id=task["id"], user=task_staff["username"])

        with make_api_client(admin["username"]) as api_client:
            wait_background_request(api_client, rq_id)


class TestSimpleConsensusSettingsFilters(CollectionSimpleFilterTestBase):
    @pytest.fixture(autouse=True)
    def setup(self, admin_user, consensus_settings):
        self.user = admin_user
        self.samples = consensus_settings

    def _get_endpoint(self, api_client: ApiClient) -> Endpoint:
        return api_client.consensus_api.list_settings_endpoint

    @pytest.mark.parametrize("field", ("task_id",))
    def test_can_use_simple_filter_for_object_list(self, field):
        return super()._test_can_use_simple_filter_for_object_list(field)


class TestListSettings(_PermissionTestBase):
    def _test_list_settings_200(
        self, user: str, task_id: int, *, expected_data: dict[str, Any] | None = None, **kwargs
    ):
        with make_api_client(user) as api_client:
            actual = get_paginated_collection(
                api_client.consensus_api.list_settings_endpoint,
                task_id=task_id,
                **kwargs,
                return_json=True,
            )

        if expected_data is not None:
            assert DeepDiff(expected_data, actual, ignore_order=True) == {}

    def _test_list_settings_403(self, user: str, task_id: int, **kwargs):
        with make_api_client(user) as api_client:
            _, response = api_client.consensus_api.list_settings(
                task_id=task_id, **kwargs, _parse_response=False, _check_status=False
            )
            assert response.status == HTTPStatus.FORBIDDEN

        return response

    @pytest.mark.parametrize(*_PermissionTestBase._default_sandbox_cases)
    def test_user_list_settings_in_sandbox_task(
        self, is_staff, allow, find_sandbox_task_with_consensus, consensus_settings
    ):
        task, user = find_sandbox_task_with_consensus(is_staff)
        settings = next(s for s in consensus_settings if s["task_id"] == task["id"])

        if allow:
            self._test_list_settings_200(user["username"], task["id"], expected_data=[settings])
        else:
            self._test_list_settings_403(user["username"], task["id"])

    @pytest.mark.parametrize(*_PermissionTestBase._default_org_cases)
    def test_user_list_settings_in_org_task(
        self,
        consensus_settings,
        find_org_task_with_consensus,
        org_role: str,
        is_staff,
        allow: bool,
    ):
        task, user = find_org_task_with_consensus(is_staff, org_role)
        settings = next(s for s in consensus_settings if s["task_id"] == task["id"])
        org_id = task["organization"]

        if allow:
            self._test_list_settings_200(
                user["username"], task["id"], expected_data=[settings], org_id=org_id
            )
        else:
            self._test_list_settings_403(user["username"], task["id"], org_id=org_id)


class TestGetSettings(_PermissionTestBase):
    def _test_get_settings_200(
        self, user: str, obj_id: int, *, expected_data: dict[str, Any] | None = None, **kwargs
    ):
        with make_api_client(user) as api_client:
            _, response = api_client.consensus_api.retrieve_settings(obj_id, **kwargs)
            assert response.status == HTTPStatus.OK

        if expected_data is not None:
            assert DeepDiff(expected_data, json.loads(response.data), ignore_order=True) == {}

        return response

    def _test_get_settings_403(self, user: str, obj_id: int, **kwargs):
        with make_api_client(user) as api_client:
            _, response = api_client.consensus_api.retrieve_settings(
                obj_id, **kwargs, _parse_response=False, _check_status=False
            )
            assert response.status == HTTPStatus.FORBIDDEN

        return response

    def test_can_get_settings(self, admin_user, consensus_settings):
        settings = next(iter(consensus_settings))
        self._test_get_settings_200(admin_user, settings["id"], expected_data=settings)

    @pytest.mark.parametrize(*_PermissionTestBase._default_sandbox_cases)
    def test_user_get_settings_in_sandbox_task(
        self, is_staff, allow, find_sandbox_task_with_consensus, consensus_settings
    ):
        task, user = find_sandbox_task_with_consensus(is_staff)
        settings = next(s for s in consensus_settings if s["task_id"] == task["id"])

        if allow:
            self._test_get_settings_200(user["username"], settings["id"], expected_data=settings)
        else:
            self._test_get_settings_403(user["username"], settings["id"])

    @pytest.mark.parametrize(*_PermissionTestBase._default_org_cases)
    def test_user_get_settings_in_org_task(
        self,
        consensus_settings,
        find_org_task_with_consensus,
        org_role: str,
        is_staff,
        allow: bool,
    ):
        task, user = find_org_task_with_consensus(is_staff, org_role)
        settings = next(s for s in consensus_settings if s["task_id"] == task["id"])

        if allow:
            self._test_get_settings_200(user["username"], settings["id"], expected_data=settings)
        else:
            self._test_get_settings_403(user["username"], settings["id"])


@pytest.mark.usefixtures("restore_db_per_function")
class TestPatchSettings(_PermissionTestBase):
    def _test_patch_settings_200(
        self,
        user: str,
        obj_id: int,
        data: dict[str, Any],
        *,
        expected_data: dict[str, Any] | None = None,
        **kwargs,
    ):
        with make_api_client(user) as api_client:
            _, response = api_client.consensus_api.partial_update_settings(
                obj_id, patched_consensus_settings_request=data, **kwargs
            )
            assert response.status == HTTPStatus.OK

        if expected_data is not None:
            assert DeepDiff(expected_data, json.loads(response.data), ignore_order=True) == {}

        return response

    def _test_patch_settings_403(self, user: str, obj_id: int, data: dict[str, Any], **kwargs):
        with make_api_client(user) as api_client:
            _, response = api_client.consensus_api.partial_update_settings(
                obj_id,
                patched_consensus_settings_request=data,
                **kwargs,
                _parse_response=False,
                _check_status=False,
            )
            assert response.status == HTTPStatus.FORBIDDEN

        return response

    def _get_request_data(self, data: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
        patched_data = deepcopy(data)

        for field, value in data.items():
            if isinstance(value, bool):
                patched_data[field] = not value
            elif isinstance(value, float):
                patched_data[field] = 1 - value

        expected_data = deepcopy(patched_data)

        return patched_data, expected_data

    def test_can_patch_settings(self, admin_user, consensus_settings):
        settings = next(iter(consensus_settings))
        data, expected_data = self._get_request_data(settings)
        self._test_patch_settings_200(admin_user, settings["id"], data, expected_data=expected_data)

    @pytest.mark.parametrize(*_PermissionTestBase._default_sandbox_cases)
    def test_user_patch_settings_in_sandbox_task(
        self, consensus_settings, find_sandbox_task_with_consensus, is_staff: bool, allow: bool
    ):
        task, user = find_sandbox_task_with_consensus(is_staff)
        settings = next(s for s in consensus_settings if s["task_id"] == task["id"])
        request_data, expected_data = self._get_request_data(settings)

        if allow:
            self._test_patch_settings_200(
                user["username"], settings["id"], request_data, expected_data=expected_data
            )
        else:
            self._test_patch_settings_403(user["username"], settings["id"], request_data)

    @pytest.mark.parametrize(
        "org_role, is_staff, allow",
        [
            ("owner", True, True),
            ("owner", False, True),
            ("maintainer", True, True),
            ("maintainer", False, True),
            ("supervisor", True, True),
            ("supervisor", False, False),
            ("worker", True, True),
            ("worker", False, False),
        ],
    )
    def test_user_patch_settings_in_org_task(
        self,
        consensus_settings,
        find_org_task_with_consensus,
        org_role: str,
        is_staff: bool,
        allow: bool,
    ):
        task, user = find_org_task_with_consensus(is_staff, org_role)
        settings = next(s for s in consensus_settings if s["task_id"] == task["id"])
        request_data, expected_data = self._get_request_data(settings)

        if allow:
            self._test_patch_settings_200(
                user["username"], settings["id"], request_data, expected_data=expected_data
            )
        else:
            self._test_patch_settings_403(user["username"], settings["id"], request_data)


@pytest.mark.usefixtures("restore_db_per_function")
@pytest.mark.usefixtures("restore_redis_inmem_per_function")
class TestMerging(_PermissionTestBase):
    def _create_task(self, user: str, initial_replicas: int, segments: int = 1) -> int:
        segment_size = 2

        task_id, _ = create_task(
            username=user,
            spec={
                "name": "A task to merge jobs in",
                "labels": [{"name": "car"}],
                "segment_size": segment_size,
                "initial_replicas": initial_replicas,
            },
            data={
                "image_quality": 70,
                "client_files": generate_image_files(count=segment_size * segments),
            },
        )
        return task_id

    @staticmethod
    def _retrieve_jobs(api_client: ApiClient, task_id: int) -> list[dict[str, Any]]:
        return get_paginated_collection(
            endpoint=api_client.jobs_api.list_endpoint, task_id=task_id, return_json=True
        )

    @staticmethod
    def _retrieve_task_labels(api_client: ApiClient, task_id: int) -> list[dict[str, Any]]:
        return get_paginated_collection(
            endpoint=api_client.labels_api.list_endpoint, task_id=task_id, return_json=True
        )

    @staticmethod
    def _retrieve_job(api_client: ApiClient, job_id: int) -> dict[str, Any]:
        _, response = api_client.jobs_api.retrieve(id=job_id, _parse_response=False)
        return json.loads(response.data)

    @staticmethod
    def _patch_job(api_client: ApiClient, job_id: int, **fields: str) -> None:
        api_client.jobs_api.partial_update(
            id=job_id, patched_job_write_request=models.PatchedJobWriteRequest(**fields)
        )

    @staticmethod
    def _annotate_job(
        api_client: ApiClient,
        job: dict[str, Any],
        label_id: int,
        boxes: Sequence[list[float]],
    ) -> None:
        api_client.jobs_api.update_annotations(
            id=job["id"],
            labeled_data_request=models.LabeledDataRequest(
                shapes=[
                    models.LabeledShapeRequest(
                        type="rectangle",
                        frame=job["start_frame"],
                        label_id=label_id,
                        points=points,
                        rotation=0,
                        z_order=0,
                        occluded=False,
                        outside=False,
                        group=0,
                        attributes=[],
                    )
                    for points in boxes
                ]
            ),
        )

    @staticmethod
    def _retrieve_job_annotations(api_client: ApiClient, job_id: int) -> dict[str, Any]:
        _, response = api_client.jobs_api.retrieve_annotations(id=job_id)
        return json.loads(response.data)

    @pytest.mark.parametrize("task_id", [31])
    def test_merged_annotations_have_scores(self, admin_user, jobs, labels, task_id: int):
        """Test that merged annotations have score attributes based on agreement."""
        task_labels = [l for l in labels if l.get("task_id") == task_id]

        task_jobs = [j for j in jobs if j["task_id"] == task_id]
        parent_job_ids = {j["parent_job_id"] for j in task_jobs if j["type"] == "replica"}
        parent_job = next(
            j for j in task_jobs if j["type"] == "annotation" if j["id"] in parent_job_ids
        )
        replicas = [
            j for j in task_jobs if j["type"] == "replica" if j["parent_job_id"] == parent_job["id"]
        ]

        with make_api_client(admin_user) as api_client:
            api_client.tasks_api.destroy_annotations(task_id)

            for replica in replicas:
                api_client.jobs_api.destroy_annotations(replica["id"])

            bbox_full_agreement = models.LabeledShapeRequest(
                type="rectangle",
                frame=parent_job["start_frame"],
                label_id=task_labels[0]["id"],
                points=[0, 0, 2, 2],
                attributes=[
                    {"spec_id": attr["id"], "value": attr["default_value"]}
                    for attr in task_labels[0]["attributes"]
                ],
                rotation=0,
                z_order=0,
                occluded=False,
                outside=False,
                group=0,
            )

            bbox_partial_agreement = models.LabeledShapeRequest(
                type="rectangle",
                frame=parent_job["start_frame"],
                label_id=task_labels[0]["id"],
                points=[4, 0, 6, 2],
                rotation=0,
                z_order=0,
                occluded=False,
                outside=False,
                group=0,
            )

            for replica in replicas:
                api_client.jobs_api.update_annotations(
                    replica["id"],
                    labeled_data_request=models.LabeledDataRequest(shapes=[bbox_full_agreement]),
                )

            api_client.jobs_api.update_annotations(
                replicas[0]["id"],
                labeled_data_request=models.LabeledDataRequest(
                    shapes=[bbox_full_agreement, bbox_partial_agreement]
                ),
            )

            create_consensus_merge(job_id=parent_job["id"], user=admin_user)

            merged_annotations = json.loads(
                api_client.jobs_api.retrieve_annotations(parent_job["id"])[1].data
            )

            assert compare_annotations(
                merged_annotations,
                {
                    "shapes": [
                        {**bbox_full_agreement.to_dict(), "source": "consensus", "score": 1.0},
                        {
                            **bbox_partial_agreement.to_dict(),
                            "source": "consensus",
                            "score": 1 / len(replicas),
                        },
                    ]
                },
                ignore_source=False,
                ignore_score=False,
            )

    def test_cannot_merge_task_without_replicas(self, admin_user):
        task_id = self._create_task(user=admin_user, initial_replicas=0, segments=2)

        with pytest.raises(exceptions.ApiException) as capture:
            create_consensus_merge(user=admin_user, task_id=task_id)

        assert (
            "No annotation jobs in the annotation stage or "
            "no replica jobs not in the annotation - new state found"
        ) in capture.value.body

    def test_can_merge_job_with_one_replica(self, admin_user):
        task_id = self._create_task(user=admin_user, initial_replicas=1)

        with make_api_client(admin_user) as api_client:
            (label,) = self._retrieve_task_labels(api_client=api_client, task_id=task_id)
            jobs = self._retrieve_jobs(api_client=api_client, task_id=task_id)
            (parent_job,) = (j for j in jobs if j["type"] == "annotation")
            (replica_job,) = (j for j in jobs if j["parent_job_id"] == parent_job["id"])

            self._annotate_job(
                api_client=api_client,
                job=replica_job,
                label_id=label["id"],
                boxes=[[0, 0, 2, 2], [4, 0, 6, 2]],
            )
            self._patch_job(api_client=api_client, job_id=replica_job["id"], state="in progress")
            self._annotate_job(
                api_client=api_client, job=parent_job, label_id=label["id"], boxes=[[8, 0, 10, 2]]
            )

            create_consensus_merge(user=admin_user, job_id=parent_job["id"])

            merged_annotations = self._retrieve_job_annotations(
                api_client=api_client, job_id=parent_job["id"]
            )
            replica_annotations = self._retrieve_job_annotations(
                api_client=api_client, job_id=replica_job["id"]
            )

            assert len(merged_annotations["shapes"]) == 2
            assert (
                compare_annotations(
                    merged_annotations, replica_annotations, ignore_source=True, ignore_score=True
                )
                == {}
            )
            assert {
                (shape["source"], shape["score"]) for shape in merged_annotations["shapes"]
            } == {("consensus", 1.0)}
            assert (
                self._retrieve_job(api_client=api_client, job_id=parent_job["id"])["state"]
                == "completed"
            )

    def test_cannot_merge_job_without_replicas(self, admin_user):
        task_id = self._create_task(user=admin_user, initial_replicas=0)

        with make_api_client(admin_user) as api_client:
            (job,) = self._retrieve_jobs(api_client=api_client, task_id=task_id)

        with pytest.raises(exceptions.ApiException) as capture:
            create_consensus_merge(user=admin_user, job_id=job["id"])

        assert f"No annotated replica jobs found for parent job {job['id']}" in capture.value.body

    def test_cannot_merge_more_replicas_than_allowed(self, admin_user):
        # the default of the MAX_CONSENSUS_REPLICAS server setting
        max_replicas = 11
        task_id = self._create_task(user=admin_user, initial_replicas=max_replicas + 1)

        with make_api_client(admin_user) as api_client:
            jobs = self._retrieve_jobs(api_client=api_client, task_id=task_id)
            (parent_job,) = (j for j in jobs if j["type"] == "annotation")
            replica_job_ids = [j["id"] for j in jobs if j["type"] == "replica"]
            assert len(replica_job_ids) == max_replicas + 1

            # the replicas that are not started are not merged, so they do not count
            for replica_job_id in replica_job_ids[:-1]:
                self._patch_job(api_client=api_client, job_id=replica_job_id, state="in progress")

            create_consensus_merge(user=admin_user, job_id=parent_job["id"])

            self._patch_job(api_client=api_client, job_id=replica_job_ids[-1], state="in progress")

        for target in ({"job_id": parent_job["id"]}, {"task_id": task_id}):
            with pytest.raises(exceptions.ApiException) as capture:
                create_consensus_merge(user=admin_user, **target)

            assert (
                f"Job {parent_job['id']} has {max_replicas + 1} replica jobs to merge, "
                f"the maximum supported is {max_replicas}"
            ) in capture.value.body
