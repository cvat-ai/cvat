# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
from copy import deepcopy
from functools import partial
from http import HTTPStatus
from itertools import product
from typing import Any

import pytest
import urllib3
from cvat_sdk.api_client import exceptions, models
from cvat_sdk.api_client.api_client import ApiClient, Endpoint
from cvat_sdk.core.helpers import get_paginated_collection
from deepdiff import DeepDiff

from shared.utils.config import make_api_client

from .utils import (
    CollectionSimpleFilterTestBase,
    compare_annotations,
    invite_user_to_org,
    register_new_user,
    wait_background_request,
)


class _PermissionTestBase:
    def merge(
        self,
        *,
        task_id: int | None = None,
        job_id: int | None = None,
        user: str,
        raise_on_error: bool = True,
        wait_result: bool = True,
    ) -> urllib3.HTTPResponse:
        assert task_id is not None or job_id is not None

        kwargs = {}
        if task_id is not None:
            kwargs["task_id"] = task_id
        if job_id is not None:
            kwargs["job_id"] = job_id

        with make_api_client(user) as api_client:
            (_, response) = api_client.consensus_api.create_merge(
                consensus_merge_create_request=models.ConsensusMergeCreateRequest(**kwargs),
                _parse_response=False,
                _check_status=raise_on_error,
            )

            if not raise_on_error and response.status != HTTPStatus.ACCEPTED:
                return response
            assert response.status == HTTPStatus.ACCEPTED

            if wait_result:
                rq_id = json.loads(response.data)["rq_id"]
                background_request, _ = wait_background_request(api_client, rq_id)
                assert (
                    background_request.status.value
                    == models.RequestStatus.allowed_values[("value",)]["FINISHED"]
                )

            return response

    def request_merge(
        self,
        *,
        task_id: int | None = None,
        job_id: int | None = None,
        user: str,
    ) -> str:
        response = self.merge(user=user, task_id=task_id, job_id=job_id, wait_result=False)
        return json.loads(response.data)["rq_id"]

    @pytest.fixture
    def find_sandbox_task(self, tasks, jobs, users, is_task_staff):
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
                    or has_consensus_jobs
                    == any(
                        j
                        for j in jobs
                        if j["task_id"] == t["id"] and j["type"] == "consensus_replica"
                    )
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
        self, restore_db_per_function, tasks, jobs, users, is_org_member, is_task_staff, admin_user
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
                            or has_consensus_jobs
                            == any(
                                j
                                for j in jobs
                                if j["task_id"] == t["id"] and j["type"] == "consensus_replica"
                            )
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
                    if has_consensus_jobs is None or has_consensus_jobs == t["consensus_enabled"]
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
    def test_can_merge_task_with_consensus_jobs(self, admin_user, tasks):
        task_id = next(t["id"] for t in tasks if t["consensus_enabled"])

        self.merge(user=admin_user, task_id=task_id)

    def test_can_merge_consensus_job(self, admin_user, jobs):
        job_id = next(
            j["id"] for j in jobs if j["type"] == "annotation" and j["consensus_replicas"] > 0
        )

        self.merge(user=admin_user, job_id=job_id)

    def test_cannot_merge_task_without_consensus_jobs(self, admin_user, tasks):
        task_id = next(t["id"] for t in tasks if not t["consensus_enabled"])

        with pytest.raises(exceptions.ApiException) as capture:
            self.merge(user=admin_user, task_id=task_id)

        assert "Consensus is not enabled in this task" in capture.value.body

    def test_cannot_merge_task_without_mergeable_parent_jobs(self, admin_user, tasks, jobs):
        task_id = next(t["id"] for t in tasks if t["consensus_enabled"])

        for j in jobs:
            if (j["stage"] != "annotation" or j["state"] != "new") and (
                j["task_id"] == task_id and j["type"] in ("annotation", "consensus_replica")
            ):
                with make_api_client(admin_user) as api_client:
                    api_client.jobs_api.partial_update(
                        j["id"],
                        patched_job_write_request=models.PatchedJobWriteRequest(
                            state="new", stage="annotation"
                        ),
                    )

        with pytest.raises(exceptions.ApiException) as capture:
            self.merge(user=admin_user, task_id=task_id)

        assert "No annotation jobs in the annotation stage" in capture.value.body

    def test_cannot_merge_replica_job(self, admin_user, tasks, jobs):
        job_id = next(
            j["id"]
            for j in jobs
            if j["type"] == "consensus_replica"
            if tasks.map[j["task_id"]]["consensus_enabled"]
        )

        with pytest.raises(exceptions.ApiException) as capture:
            self.merge(user=admin_user, job_id=job_id)

        assert "No annotated consensus jobs found for parent job" in capture.value.body

    def _test_merge_200(self, user: str, *, task_id: int | None = None, job_id: int | None = None):
        return self.merge(user=user, task_id=task_id, job_id=job_id)

    def _test_merge_403(self, user: str, *, task_id: int | None = None, job_id: int | None = None):
        response = self.merge(user=user, task_id=task_id, job_id=job_id, raise_on_error=False)
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
            (_, response) = api_client.requests_api.retrieve(
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
            (_, response) = api_client.consensus_api.list_settings(
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
            (_, response) = api_client.consensus_api.retrieve_settings(obj_id, **kwargs)
            assert response.status == HTTPStatus.OK

        if expected_data is not None:
            assert DeepDiff(expected_data, json.loads(response.data), ignore_order=True) == {}

        return response

    def _test_get_settings_403(self, user: str, obj_id: int, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.consensus_api.retrieve_settings(
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
            (_, response) = api_client.consensus_api.partial_update_settings(
                obj_id, patched_consensus_settings_request=data, **kwargs
            )
            assert response.status == HTTPStatus.OK

        if expected_data is not None:
            assert DeepDiff(expected_data, json.loads(response.data), ignore_order=True) == {}

        return response

    def _test_patch_settings_403(self, user: str, obj_id: int, data: dict[str, Any], **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.consensus_api.partial_update_settings(
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
    @pytest.mark.parametrize("task_id", [31])
    def test_quorum_is_applied(self, admin_user, jobs, labels, consensus_settings, task_id: int):
        task_labels = [l for l in labels if l.get("task_id") == task_id]
        settings = next(s for s in consensus_settings if s["task_id"] == task_id)

        task_jobs = [j for j in jobs if j["task_id"] == task_id]
        parent_job = next(
            j for j in task_jobs if j["type"] == "annotation" if j["consensus_replicas"] > 0
        )
        replicas = [
            j
            for j in task_jobs
            if j["type"] == "consensus_replica"
            if j["parent_job_id"] == parent_job["id"]
        ]
        assert len(replicas) == 2

        with make_api_client(admin_user) as api_client:
            api_client.tasks_api.destroy_annotations(task_id)

            for replica in replicas:
                api_client.jobs_api.destroy_annotations(replica["id"])

            api_client.consensus_api.partial_update_settings(
                settings["id"],
                patched_consensus_settings_request=models.PatchedConsensusSettingsRequest(
                    quorum=0.6
                ),
            )

            # Should be used > quorum times, must be present in the resulting dataset
            bbox1 = models.LabeledShapeRequest(
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

            # Should be used < quorum times
            bbox2 = models.LabeledShapeRequest(
                type="rectangle",
                frame=parent_job["start_frame"],
                label_id=task_labels[0]["id"],
                points=[4, 0, 6, 2],
            )

            api_client.jobs_api.update_annotations(
                replicas[0]["id"],
                labeled_data_request=models.LabeledDataRequest(shapes=[bbox1]),
            )
            api_client.jobs_api.update_annotations(
                replicas[1]["id"],
                labeled_data_request=models.LabeledDataRequest(shapes=[bbox1, bbox2]),
            )

            self.merge(job_id=parent_job["id"], user=admin_user)

            merged_annotations = json.loads(
                api_client.jobs_api.retrieve_annotations(parent_job["id"])[1].data
            )
            assert (
                compare_annotations(
                    merged_annotations,
                    {"version": 0, "tags": [], "shapes": [bbox1.to_dict()], "tracks": []},
                )
                == {}
            )

    @pytest.mark.parametrize("job_id", [42, 51])
    def test_unmodified_job_produces_same_annotations(self, admin_user, annotations, job_id: int):
        old_annotations = annotations["job"][str(job_id)]

        self.merge(job_id=job_id, user=admin_user)

        with make_api_client(admin_user) as api_client:
            new_annotations = json.loads(api_client.jobs_api.retrieve_annotations(job_id)[1].data)

            assert compare_annotations(old_annotations, new_annotations) == {}

    @pytest.mark.parametrize("job_id", [42, 51])
    def test_modified_job_produces_different_annotations(
        self, admin_user, annotations, jobs, consensus_settings, job_id: int
    ):
        settings = next(
            s for s in consensus_settings if s["task_id"] == jobs.map[job_id]["task_id"]
        )
        old_annotations = annotations["job"][str(job_id)]

        with make_api_client(admin_user) as api_client:
            api_client.consensus_api.partial_update_settings(
                settings["id"],
                patched_consensus_settings_request=models.PatchedConsensusSettingsRequest(
                    quorum=0.9,
                    iou_threshold=0.8,
                ),
            )

        self.merge(job_id=job_id, user=admin_user)

        with make_api_client(admin_user) as api_client:
            new_annotations = json.loads(api_client.jobs_api.retrieve_annotations(job_id)[1].data)

            assert compare_annotations(old_annotations, new_annotations) != {}
