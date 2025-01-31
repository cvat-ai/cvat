# Copyright (C) 2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import itertools
import json
import math
import operator
import os
import os.path as osp
import re
import zipfile
from abc import ABCMeta, abstractmethod
from collections import Counter
from collections.abc import Generator, Iterable, Sequence
from contextlib import closing
from copy import deepcopy
from datetime import datetime
from enum import Enum
from functools import partial
from http import HTTPStatus
from itertools import chain, groupby, product
from math import ceil
from operator import itemgetter
from pathlib import Path, PurePosixPath
from tempfile import NamedTemporaryFile, TemporaryDirectory
from time import sleep, time
from typing import Any, Callable, ClassVar, Optional, Union

import attrs
import numpy as np
import pytest
from cvat_sdk import exceptions
from cvat_sdk.api_client import models
from cvat_sdk.api_client.api_client import ApiClient, ApiException, Endpoint
from cvat_sdk.api_client.exceptions import ForbiddenException
from cvat_sdk.core.helpers import get_paginated_collection
from cvat_sdk.core.progress import NullProgressReporter
from cvat_sdk.core.proxies.tasks import ResourceType, Task
from cvat_sdk.core.uploading import Uploader
from deepdiff import DeepDiff
from PIL import Image
from pytest_cases import fixture, fixture_ref, parametrize

import shared.utils.s3 as s3
from shared.fixtures.init import container_exec_cvat
from shared.utils.config import (
    delete_method,
    get_method,
    make_api_client,
    make_sdk_client,
    patch_method,
    post_method,
    put_method,
)
from shared.utils.helpers import (
    generate_image_file,
    generate_image_files,
    generate_manifest,
    generate_video_file,
    read_video_file,
)

from .utils import (
    DATUMARO_FORMAT_FOR_DIMENSION,
    CollectionSimpleFilterTestBase,
    calc_end_frame,
    compare_annotations,
    create_task,
    export_dataset,
    export_task_backup,
    export_task_dataset,
    parse_frame_step,
    unique,
    wait_until_task_is_created,
)


def get_cloud_storage_content(username: str, cloud_storage_id: int, manifest: Optional[str] = None):
    with make_api_client(username) as api_client:
        kwargs = {"manifest_path": manifest} if manifest else {}

        (data, _) = api_client.cloudstorages_api.retrieve_content_v2(cloud_storage_id, **kwargs)
        return [f"{f['name']}{'/' if str(f['type']) == 'DIR' else ''}" for f in data["content"]]


def count_frame_uses(data: Sequence[int], *, included_frames: Sequence[int]) -> dict[int, int]:
    use_counts = {f: 0 for f in included_frames}
    for f in data:
        if f in included_frames:
            use_counts[f] += 1

    return use_counts


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetTasks:
    def _test_task_list_200(self, user, project_id, data, exclude_paths="", **kwargs):
        with make_api_client(user) as api_client:
            results = get_paginated_collection(
                api_client.tasks_api.list_endpoint,
                return_json=True,
                project_id=project_id,
                **kwargs,
            )
            assert DeepDiff(data, results, ignore_order=True, exclude_paths=exclude_paths) == {}

    def _test_users_to_see_task_list(
        self, project_id, tasks, users, is_staff, is_allow, is_project_staff, **kwargs
    ):
        if is_staff:
            users = [user for user in users if is_project_staff(user["id"], project_id)]
        else:
            users = [user for user in users if not is_project_staff(user["id"], project_id)]
        assert len(users)

        for user in users:
            if not is_allow:
                # Users outside project or org should not know if one exists.
                # Thus, no error should be produced on a list request.
                tasks = []

            self._test_task_list_200(user["username"], project_id, tasks, **kwargs)

    def _test_assigned_users_to_see_task_data(self, tasks, users, is_task_staff, **kwargs):
        for task in tasks:
            staff_users = [user for user in users if is_task_staff(user["id"], task["id"])]
            assert len(staff_users)

            for user in staff_users:
                with make_api_client(user["username"]) as api_client:
                    (_, response) = api_client.tasks_api.list(**kwargs)
                    assert response.status == HTTPStatus.OK
                    response_data = json.loads(response.data)

                assert any(_task["id"] == task["id"] for _task in response_data["results"])

    @pytest.mark.parametrize("project_id", [1])
    @pytest.mark.parametrize(
        "groups, is_staff, is_allow",
        [
            ("admin", False, True),
        ],
    )
    def test_project_tasks_visibility(
        self, project_id, groups, users, tasks, is_staff, is_allow, find_users, is_project_staff
    ):
        users = find_users(privilege=groups)
        tasks = list(filter(lambda x: x["project_id"] == project_id, tasks))
        assert len(tasks)

        self._test_users_to_see_task_list(
            project_id, tasks, users, is_staff, is_allow, is_project_staff
        )

    @pytest.mark.parametrize("project_id, groups", [(1, "user")])
    def test_task_assigned_to_see_task(
        self, project_id, groups, users, tasks, find_users, is_task_staff
    ):
        users = find_users(privilege=groups)
        tasks = list(filter(lambda x: x["project_id"] == project_id and x["assignee"], tasks))
        assert len(tasks)

        self._test_assigned_users_to_see_task_data(tasks, users, is_task_staff)

    @pytest.mark.parametrize("org, project_id", [({"id": 2, "slug": "org2"}, 2)])
    @pytest.mark.parametrize(
        "role, is_staff, is_allow",
        [
            ("maintainer", False, True),
            ("supervisor", False, False),
        ],
    )
    def test_org_project_tasks_visibility(
        self,
        org,
        project_id,
        role,
        is_staff,
        is_allow,
        tasks,
        is_task_staff,
        is_project_staff,
        find_users,
    ):
        users = find_users(org=org["id"], role=role)
        tasks = list(filter(lambda x: x["project_id"] == project_id, tasks))
        assert len(tasks)

        self._test_users_to_see_task_list(
            project_id, tasks, users, is_staff, is_allow, is_project_staff, org=org["slug"]
        )

    @pytest.mark.parametrize("org, project_id, role", [({"id": 2, "slug": "org2"}, 2, "worker")])
    def test_org_task_assigneed_to_see_task(
        self, org, project_id, role, users, tasks, find_users, is_task_staff
    ):
        users = find_users(org=org["id"], role=role)
        tasks = list(filter(lambda x: x["project_id"] == project_id and x["assignee"], tasks))
        assert len(tasks)

        self._test_assigned_users_to_see_task_data(tasks, users, is_task_staff, org=org["slug"])

    @pytest.mark.usefixtures("restore_db_per_function")
    def test_can_get_job_validation_summary(self, admin_user, tasks, jobs):
        task = next(t for t in tasks if t["jobs"]["count"] > 0 if t["jobs"]["validation"] == 0)
        job = next(j for j in jobs if j["task_id"] == task["id"])

        with make_api_client(admin_user) as api_client:
            api_client.jobs_api.partial_update(
                job["id"],
                patched_job_write_request=models.PatchedJobWriteRequest(stage="validation"),
            )

            (server_task, _) = api_client.tasks_api.retrieve(task["id"])

        assert server_task.jobs.validation == 1

    @pytest.mark.usefixtures("restore_db_per_function")
    def test_can_get_job_completed_summary(self, admin_user, tasks, jobs):
        task = next(t for t in tasks if t["jobs"]["count"] > 0 if t["jobs"]["completed"] == 0)
        job = next(j for j in jobs if j["task_id"] == task["id"])

        with make_api_client(admin_user) as api_client:
            api_client.jobs_api.partial_update(
                job["id"],
                patched_job_write_request=models.PatchedJobWriteRequest(
                    state="completed", stage="acceptance"
                ),
            )

            (server_task, _) = api_client.tasks_api.retrieve(task["id"])

        assert server_task.jobs.completed == 1

    @pytest.mark.usefixtures("restore_db_per_function")
    def test_can_remove_owner_and_fetch_with_sdk(self, admin_user, tasks):
        # test for API schema regressions
        source_task = next(
            t for t in tasks if t.get("owner") and t["owner"]["username"] != admin_user
        ).copy()

        with make_api_client(admin_user) as api_client:
            api_client.users_api.destroy(source_task["owner"]["id"])

            (_, response) = api_client.tasks_api.retrieve(source_task["id"])
            fetched_task = json.loads(response.data)

        source_task["owner"] = None
        assert DeepDiff(source_task, fetched_task, ignore_order=True) == {}

    @pytest.mark.usefixtures("restore_db_per_function")
    def test_check_task_status_after_changing_job_state(self, admin_user, tasks, jobs):
        task = next(t for t in tasks if t["jobs"]["count"] == 1 if t["jobs"]["completed"] == 0)
        job = next(j for j in jobs if j["task_id"] == task["id"])

        with make_api_client(admin_user) as api_client:
            api_client.jobs_api.partial_update(
                job["id"],
                patched_job_write_request=models.PatchedJobWriteRequest(stage="acceptance"),
            )

            api_client.jobs_api.partial_update(
                job["id"],
                patched_job_write_request=models.PatchedJobWriteRequest(state="completed"),
            )

            (server_task, _) = api_client.tasks_api.retrieve(task["id"])

        assert server_task.status == "completed"


class TestListTasksFilters(CollectionSimpleFilterTestBase):
    field_lookups = {
        "owner": ["owner", "username"],
        "assignee": ["assignee", "username"],
        "tracker_link": ["bug_tracker"],
    }

    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_class, admin_user, tasks):
        self.user = admin_user
        self.samples = tasks

    def _get_endpoint(self, api_client: ApiClient) -> Endpoint:
        return api_client.tasks_api.list_endpoint

    @pytest.mark.parametrize(
        "field",
        (
            "assignee",
            "dimension",
            "mode",
            "name",
            "owner",
            "project_id",
            "status",
            "subset",
            "tracker_link",
            "validation_mode",
        ),
    )
    def test_can_use_simple_filter_for_object_list(self, field):
        return super()._test_can_use_simple_filter_for_object_list(field)


@pytest.mark.usefixtures("restore_db_per_function")
class TestPostTasks:
    def _test_create_task_201(self, user, spec, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.tasks_api.create(spec, **kwargs)
            assert response.status == HTTPStatus.CREATED

        return response

    def _test_create_task_403(self, user, spec, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.tasks_api.create(
                spec, **kwargs, _parse_response=False, _check_status=False
            )
            assert response.status == HTTPStatus.FORBIDDEN

        return response

    def _test_users_to_create_task_in_project(
        self, project_id, users, is_staff, is_allow, is_project_staff, **kwargs
    ):
        if is_staff:
            users = [user for user in users if is_project_staff(user["id"], project_id)]
        else:
            users = [user for user in users if not is_project_staff(user["id"], project_id)]
        assert len(users)

        for user in users:
            username = user["username"]
            spec = {
                "name": f"test {username} to create a task within a project",
                "project_id": project_id,
            }

            if is_allow:
                self._test_create_task_201(username, spec, **kwargs)
            else:
                self._test_create_task_403(username, spec, **kwargs)

    @pytest.mark.parametrize("project_id", [1])
    @pytest.mark.parametrize(
        "groups, is_staff, is_allow",
        [
            ("admin", False, True),
            ("user", True, True),
        ],
    )
    def test_users_to_create_task_in_project(
        self, project_id, groups, is_staff, is_allow, is_project_staff, find_users
    ):
        users = find_users(privilege=groups)
        self._test_users_to_create_task_in_project(
            project_id, users, is_staff, is_allow, is_project_staff
        )

    @pytest.mark.parametrize("org, project_id", [({"id": 2, "slug": "org2"}, 2)])
    @pytest.mark.parametrize(
        "role, is_staff, is_allow",
        [
            ("worker", False, False),
        ],
    )
    def test_worker_cannot_create_task_in_project_without_ownership(
        self, org, project_id, role, is_staff, is_allow, is_project_staff, find_users
    ):
        users = find_users(org=org["id"], role=role)
        self._test_users_to_create_task_in_project(
            project_id, users, is_staff, is_allow, is_project_staff, org=org["slug"]
        )

    def test_create_response_matches_get(self, admin_user):
        username = admin_user

        spec = {"name": "test create task", "labels": [{"name": "a"}]}

        response = self._test_create_task_201(username, spec)
        task = json.loads(response.data)

        with make_api_client(username) as api_client:
            (_, response) = api_client.tasks_api.retrieve(task["id"])
            assert DeepDiff(task, json.loads(response.data), ignore_order=True) == {}

    def test_can_create_task_with_skeleton(self, admin_user):
        username = admin_user

        spec = {
            "name": f"test admin1 to create a task with skeleton",
            "labels": [
                {
                    "name": "s1",
                    "color": "#5c5eba",
                    "attributes": [
                        {
                            "name": "color",
                            "mutable": False,
                            "input_type": "select",
                            "default_value": "white",
                            "values": ["white", "black"],
                        }
                    ],
                    "type": "skeleton",
                    "sublabels": [
                        {
                            "name": "1",
                            "color": "#d53957",
                            "attributes": [
                                {
                                    "id": 23,
                                    "name": "attr",
                                    "mutable": False,
                                    "input_type": "select",
                                    "default_value": "val1",
                                    "values": ["val1", "val2"],
                                }
                            ],
                            "type": "points",
                        },
                        {"name": "2", "color": "#4925ec", "attributes": [], "type": "points"},
                        {"name": "3", "color": "#59a8fe", "attributes": [], "type": "points"},
                    ],
                    "svg": '<line x1="36.329429626464844" y1="45.98662185668945" x2="59.07190704345703" y2="23.076923370361328" '
                    'stroke="black" data-type="edge" data-node-from="2" stroke-width="0.5" data-node-to="3"></line>'
                    '<line x1="22.61705780029297" y1="25.75250816345215" x2="36.329429626464844" y2="45.98662185668945" '
                    'stroke="black" data-type="edge" data-node-from="1" stroke-width="0.5" data-node-to="2"></line>'
                    '<circle r="1.5" stroke="black" fill="#b3b3b3" cx="22.61705780029297" cy="25.75250816345215" '
                    'stroke-width="0.1" data-type="element node" data-element-id="1" data-node-id="1" data-label-name="1">'
                    '</circle><circle r="1.5" stroke="black" fill="#b3b3b3" cx="36.329429626464844" cy="45.98662185668945" '
                    'stroke-width="0.1" data-type="element node" data-element-id="2" data-node-id="2" data-label-name="2"></circle>'
                    '<circle r="1.5" stroke="black" fill="#b3b3b3" cx="59.07190704345703" cy="23.076923370361328" '
                    'stroke-width="0.1" data-type="element node" data-element-id="3" data-node-id="3" data-label-name="3"></circle>',
                }
            ],
        }

        self._test_create_task_201(username, spec)

    @pytest.mark.parametrize("assignee", [None, "admin1"])
    def test_can_create_with_assignee(self, admin_user, users_by_name, assignee):
        task_spec = {
            "name": "test task creation with assignee",
            "labels": [{"name": "car"}],
            "assignee_id": users_by_name[assignee]["id"] if assignee else None,
        }

        with make_api_client(admin_user) as api_client:
            (task, _) = api_client.tasks_api.create(task_write_request=task_spec)

            if assignee:
                assert task.assignee.username == assignee
                assert task.assignee_updated_date
            else:
                assert task.assignee is None
                assert task.assignee_updated_date is None


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetData:
    _USERNAME = "user1"

    @pytest.mark.parametrize(
        "content_type, task_id",
        [
            ("image/png", 8),
            ("image/png", 5),
            ("image/x.point-cloud-data", 6),
        ],
    )
    def test_frame_content_type(self, content_type, task_id):
        with make_api_client(self._USERNAME) as api_client:
            (_, response) = api_client.tasks_api.retrieve_data(
                task_id, type="frame", quality="original", number=0
            )
            assert response.status == HTTPStatus.OK
            assert response.headers["Content-Type"] == content_type


@pytest.mark.usefixtures("restore_db_per_function")
class TestPatchTaskAnnotations:
    def _test_check_response(self, is_allow, response, data=None):
        if is_allow:
            assert response.status == HTTPStatus.OK
            assert compare_annotations(data, json.loads(response.data)) == {}
        else:
            assert response.status == HTTPStatus.FORBIDDEN

    @pytest.fixture(scope="class")
    def request_data(self, annotations):
        def get_data(tid):
            data = deepcopy(annotations["task"][str(tid)])
            if data["shapes"][0]["type"] == "skeleton":
                data["shapes"][0]["elements"][0].update({"points": [2.0, 3.0, 4.0, 5.0]})
            else:
                data["shapes"][0].update({"points": [2.0, 3.0, 4.0, 5.0, 6.0, 7.0]})
            data["version"] += 1
            return data

        return get_data

    @pytest.mark.parametrize("org", [""])
    @pytest.mark.parametrize(
        "privilege, task_staff, is_allow",
        [
            ("admin", True, True),
            ("admin", False, True),
            ("worker", True, True),
            ("worker", False, False),
            ("user", True, True),
            ("user", False, False),
        ],
    )
    def test_user_update_task_annotations(
        self,
        org,
        privilege,
        task_staff,
        is_allow,
        find_task_staff_user,
        find_users,
        request_data,
        tasks_by_org,
        filter_tasks_with_shapes,
    ):
        users = find_users(privilege=privilege)
        tasks = tasks_by_org[org]
        filtered_tasks = filter_tasks_with_shapes(tasks)
        username, tid = find_task_staff_user(filtered_tasks, users, task_staff, [21])

        data = request_data(tid)
        with make_api_client(username) as api_client:
            (_, response) = api_client.tasks_api.partial_update_annotations(
                id=tid,
                action="update",
                patched_labeled_data_request=deepcopy(data),
                _parse_response=False,
                _check_status=False,
            )

        self._test_check_response(is_allow, response, data)

    @pytest.mark.parametrize("org", [2])
    @pytest.mark.parametrize(
        "role, task_staff, is_allow",
        [
            ("maintainer", False, True),
            ("owner", False, True),
            ("supervisor", False, False),
            ("worker", False, False),
            ("maintainer", True, True),
            ("owner", True, True),
            ("supervisor", True, True),
            ("worker", True, True),
        ],
    )
    def test_member_update_task_annotation(
        self,
        org,
        role,
        task_staff,
        is_allow,
        find_task_staff_user,
        find_users,
        request_data,
        tasks_with_shapes,
    ):
        users = find_users(role=role, org=org)
        tasks = (
            t
            for t in tasks_with_shapes
            if t["organization"] == org
            if t["validation_mode"] != "gt_pool"
        )
        username, tid = find_task_staff_user(tasks, users, task_staff)

        data = request_data(tid)
        with make_api_client(username) as api_client:
            (_, response) = api_client.tasks_api.partial_update_annotations(
                id=tid,
                action="update",
                patched_labeled_data_request=deepcopy(data),
                _parse_response=False,
                _check_status=False,
            )

        self._test_check_response(is_allow, response, data)

    def test_cannot_update_validation_frames_in_honeypot_task(
        self,
        admin_user,
        tasks,
        request_data,
    ):
        task_id = next(t for t in tasks if t["validation_mode"] == "gt_pool" and t["size"] > 0)[
            "id"
        ]

        data = request_data(task_id)
        with make_api_client(admin_user) as api_client:
            (_, response) = api_client.tasks_api.partial_update_annotations(
                id=task_id,
                action="update",
                patched_labeled_data_request=deepcopy(data),
                _parse_response=False,
                _check_status=False,
            )

        assert response.status == HTTPStatus.BAD_REQUEST
        assert b"can only be edited via task import or the GT job" in response.data

    def test_can_update_honeypot_frames_in_honeypot_task(
        self,
        admin_user,
        tasks,
        jobs,
        request_data,
    ):
        task_id = next(t for t in tasks if t["validation_mode"] == "gt_pool" and t["size"] > 0)[
            "id"
        ]
        gt_job = next(j for j in jobs if j["task_id"] == task_id and j["type"] == "ground_truth")

        validation_frames = range(gt_job["start_frame"], gt_job["stop_frame"] + 1)
        data = request_data(task_id)
        data["tags"] = [a for a in data["tags"] if a["frame"] not in validation_frames]
        data["shapes"] = [a for a in data["shapes"] if a["frame"] not in validation_frames]
        data["tracks"] = []  # tracks cannot be used in honeypot tasks
        with make_api_client(admin_user) as api_client:
            (_, response) = api_client.tasks_api.partial_update_annotations(
                id=task_id,
                action="update",
                patched_labeled_data_request=deepcopy(data),
                _parse_response=False,
                _check_status=False,
            )

        self._test_check_response(True, response, data)

    def test_remove_first_keyframe(self):
        endpoint = "tasks/8/annotations"
        shapes0 = [
            {"type": "rectangle", "frame": 1, "points": [1, 2, 3, 4]},
            {"type": "rectangle", "frame": 4, "points": [5, 6, 7, 8]},
        ]

        annotations = {"tracks": [{"label_id": 13, "frame": 0, "shapes": shapes0}]}

        response = patch_method("admin1", endpoint, annotations, action="create")
        assert response.status_code == HTTPStatus.OK, response.content

        annotations["tracks"][0]["shapes"] = shapes0[1:]
        response = patch_method("admin1", endpoint, annotations, action="update")
        assert response.status_code == HTTPStatus.OK

    def test_can_split_skeleton_tracks_on_jobs(self, jobs):
        # https://github.com/cvat-ai/cvat/pull/6968
        task_id = 21

        task_jobs = [job for job in jobs if job["task_id"] == task_id]

        frame_ranges = {}
        for job in task_jobs:
            frame_ranges[job["id"]] = set(range(job["start_frame"], job["stop_frame"] + 1))

        # skeleton track that covers few jobs
        annotations = {
            "tracks": [
                {
                    "frame": 0,
                    "label_id": 58,
                    "shapes": [{"type": "skeleton", "frame": 0, "points": []}],
                    "elements": [
                        {
                            "label_id": 59,
                            "frame": 0,
                            "shapes": [
                                # https://github.com/cvat-ai/cvat/issues/7498
                                # https://github.com/cvat-ai/cvat/pull/7615
                                # This shape covers frame 0 to 7,
                                # We need to check if frame 5 is generated correctly for job#1
                                {"type": "points", "frame": 0, "points": [1.0, 2.0]},
                                {"type": "points", "frame": 7, "points": [2.0, 4.0]},
                            ],
                        },
                    ],
                }
            ]
        }

        # clear task annotations
        response = delete_method("admin1", f"tasks/{task_id}/annotations")
        assert response.status_code == 204, f"Cannot delete task's annotations: {response.content}"

        # create skeleton track that covers few jobs
        response = patch_method(
            "admin1", f"tasks/{task_id}/annotations", annotations, action="create"
        )
        assert response.status_code == 200, f"Cannot update task's annotations: {response.content}"

        # check that server splitted skeleton track's elements on jobs correctly
        for job_id, job_frame_range in frame_ranges.items():
            response = get_method("admin1", f"jobs/{job_id}/annotations")
            assert response.status_code == 200, f"Cannot get job's annotations: {response.content}"

            job_annotations = response.json()
            assert len(job_annotations["tracks"]) == 1, "Expected to see only one track"

            track = job_annotations["tracks"][0]
            assert track.get("elements", []), "Expected to see track with elements"

            def interpolate(frame):
                # simple interpolate from ([1, 2], 1) to ([2, 4], 7)
                return [(2.0 - 1.0) / 7 * (frame - 0) + 1.0, (4.0 - 2.0) / 7 * (frame - 0) + 2.0]

            for element in track["elements"]:
                element_frames = set(shape["frame"] for shape in element["shapes"])
                assert all(
                    [
                        not DeepDiff(
                            interpolate(shape["frame"]), shape["points"], significant_digits=2
                        )
                        for shape in element["shapes"]
                        if shape["frame"] >= 0 and shape["frame"] <= 7
                    ]
                )
                assert len(element["shapes"]) == 2
                assert element_frames <= job_frame_range, "Track shapes get out of job frame range"


@pytest.mark.usefixtures("restore_db_per_class")
@pytest.mark.usefixtures("restore_redis_inmem_per_function")
@pytest.mark.usefixtures("restore_redis_ondisk_after_class")
class TestGetTaskDataset:

    @staticmethod
    def _test_can_export_dataset(
        username: str,
        task_id: int,
        *,
        api_version: Union[int, tuple[int]],
        local_download: bool = True,
        **kwargs,
    ) -> Optional[bytes]:
        dataset = export_task_dataset(username, api_version, save_images=True, id=task_id, **kwargs)
        if local_download:
            assert zipfile.is_zipfile(io.BytesIO(dataset))
        else:
            assert dataset is None

        return dataset

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize("api_version", product((1, 2), repeat=2))
    @pytest.mark.parametrize(
        "local_download", (True, pytest.param(False, marks=pytest.mark.with_external_services))
    )
    def test_can_export_task_dataset_locally_and_to_cloud_with_both_api_versions(
        self,
        admin_user,
        tasks_with_shapes,
        filter_tasks,
        api_version: tuple[int],
        local_download: bool,
    ):
        filter_ = "target_storage__location"
        if local_download:
            filter_ = "exclude_" + filter_
        filtered_ids = {t["id"] for t in filter_tasks(**{filter_: "cloud_storage"})}

        task_id = next(iter(filtered_ids & {t["id"] for t in tasks_with_shapes}))
        self._test_can_export_dataset(
            admin_user,
            task_id,
            api_version=api_version,
            local_download=local_download,
        )

    @pytest.mark.parametrize("api_version", (1, 2))
    @pytest.mark.parametrize("tid", [21])
    @pytest.mark.parametrize(
        "format_name", ["CVAT for images 1.1", "CVAT for video 1.1", "COCO Keypoints 1.0"]
    )
    def test_can_export_task_with_several_jobs(
        self, admin_user, tid, format_name, api_version: int
    ):
        self._test_can_export_dataset(
            admin_user,
            tid,
            format=format_name,
            api_version=api_version,
        )

    @pytest.mark.parametrize("api_version", (1, 2))
    @pytest.mark.parametrize("tid", [8])
    def test_can_export_task_to_coco_format(self, admin_user: str, tid: int, api_version: int):
        # these annotations contains incorrect frame numbers
        # in order to check that server handle such cases
        annotations = {
            "version": 0,
            "tags": [],
            "shapes": [],
            "tracks": [
                {
                    "label_id": 63,
                    "frame": 1,
                    "group": 0,
                    "source": "manual",
                    "shapes": [
                        {
                            "type": "skeleton",
                            "frame": 1,
                            "occluded": False,
                            "outside": False,
                            "z_order": 0,
                            "rotation": 0,
                            "points": [],
                            "attributes": [],
                        }
                    ],
                    "attributes": [],
                    "elements": [
                        {
                            "label_id": 64,
                            "frame": 0,
                            "group": 0,
                            "source": "manual",
                            "shapes": [
                                {
                                    "type": "points",
                                    "frame": 1,
                                    "occluded": False,
                                    "outside": True,
                                    "z_order": 0,
                                    "rotation": 0,
                                    "points": [74.14935096036425, 79.09960455479086],
                                    "attributes": [],
                                },
                                {
                                    "type": "points",
                                    "frame": 7,
                                    "occluded": False,
                                    "outside": False,
                                    "z_order": 0,
                                    "rotation": 0,
                                    "points": [74.14935096036425, 79.09960455479086],
                                    "attributes": [],
                                },
                            ],
                            "attributes": [],
                        },
                        {
                            "label_id": 65,
                            "frame": 0,
                            "group": 0,
                            "source": "manual",
                            "shapes": [
                                {
                                    "type": "points",
                                    "frame": 0,
                                    "occluded": False,
                                    "outside": False,
                                    "z_order": 0,
                                    "rotation": 0,
                                    "points": [285.07319976630424, 353.51583641966175],
                                    "attributes": [],
                                }
                            ],
                            "attributes": [],
                        },
                    ],
                }
            ],
        }
        response = patch_method(
            admin_user, f"tasks/{tid}/annotations", annotations, action="update"
        )
        assert response.status_code == HTTPStatus.OK

        # check that we can export task dataset
        self._test_can_export_dataset(
            admin_user,
            tid,
            format="COCO Keypoints 1.0",
            api_version=api_version,
        )

        # check that server saved track annotations correctly
        response = get_method(admin_user, f"tasks/{tid}/annotations")
        assert response.status_code == HTTPStatus.OK

        annotations = response.json()
        assert annotations["tracks"][0]["frame"] == 0
        assert annotations["tracks"][0]["shapes"][0]["frame"] == 0
        assert annotations["tracks"][0]["elements"][0]["shapes"][0]["frame"] == 0

    @pytest.mark.parametrize("api_version", (1, 2))
    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.usefixtures("restore_redis_ondisk_per_function")
    def test_can_download_task_with_special_chars_in_name(self, admin_user: str, api_version: int):
        # Control characters in filenames may conflict with the Content-Disposition header
        # value restrictions, as it needs to include the downloaded file name.

        task_spec = {
            "name": "test_special_chars_{}_in_name".format("".join(chr(c) for c in range(1, 127))),
            "labels": [{"name": "cat"}],
        }

        task_data = {
            "image_quality": 75,
            "client_files": generate_image_files(1),
        }

        task_id, _ = create_task(admin_user, task_spec, task_data)

        dataset = self._test_can_export_dataset(admin_user, task_id, api_version=api_version)
        assert zipfile.is_zipfile(io.BytesIO(dataset))

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize("api_version", (1, 2))
    def test_export_dataset_after_deleting_related_cloud_storage(
        self, admin_user: str, tasks, api_version: int
    ):
        related_field = "target_storage"

        task = next(
            t for t in tasks if t[related_field] and t[related_field]["location"] == "cloud_storage"
        )
        task_id = task["id"]
        cloud_storage_id = task[related_field]["cloud_storage_id"]

        with make_api_client(admin_user) as api_client:
            _, response = api_client.cloudstorages_api.destroy(cloud_storage_id)
            assert response.status == HTTPStatus.NO_CONTENT

            result, response = api_client.tasks_api.retrieve(task_id)
            assert not result[related_field]

            self._test_can_export_dataset(admin_user, task["id"], api_version=api_version)

    @pytest.mark.parametrize(
        "export_format, default_subset_name, subset_path_template",
        [
            ("Datumaro 1.0", "", "images/{subset}"),
            ("YOLO 1.1", "train", "obj_{subset}_data"),
            ("Ultralytics YOLO Detection 1.0", "train", "images/{subset}"),
        ],
    )
    @pytest.mark.parametrize("api_version", (1, 2))
    def test_uses_subset_name(
        self,
        admin_user,
        filter_tasks,
        export_format,
        default_subset_name,
        subset_path_template,
        api_version: int,
    ):
        tasks = filter_tasks(exclude_target_storage__location="cloud_storage")
        group_key_func = itemgetter("subset")
        subsets_and_tasks = [
            (subset, next(group))
            for subset, group in itertools.groupby(
                sorted(tasks, key=group_key_func),
                key=group_key_func,
            )
        ]
        for subset_name, task in subsets_and_tasks:
            dataset = self._test_can_export_dataset(
                admin_user,
                task["id"],
                api_version=api_version,
                format=export_format,
            )
            with zipfile.ZipFile(io.BytesIO(dataset)) as zip_file:
                subset_path = subset_path_template.format(subset=subset_name or default_subset_name)
                assert any(
                    subset_path in path for path in zip_file.namelist()
                ), f"No {subset_path} in {zip_file.namelist()}"

    @pytest.mark.parametrize(
        "dimension, mode", [("2d", "annotation"), ("2d", "interpolation"), ("3d", "annotation")]
    )
    def test_datumaro_export_without_annotations_includes_image_info(
        self, admin_user, tasks, mode, dimension
    ):
        task = next(
            t for t in tasks if t.get("size") if t["mode"] == mode if t["dimension"] == dimension
        )

        with make_api_client(admin_user) as api_client:
            dataset_file = io.BytesIO(
                export_dataset(
                    api_client.tasks_api,
                    api_version=2,
                    id=task["id"],
                    format=DATUMARO_FORMAT_FOR_DIMENSION[dimension],
                    save_images=False,
                )
            )

        with zipfile.ZipFile(dataset_file) as zip_file:
            annotations = json.loads(zip_file.read("annotations/default.json"))

        assert annotations["items"]
        for item in annotations["items"]:
            assert "media" not in item

            if dimension == "2d":
                assert osp.splitext(item["image"]["path"])[0] == item["id"]
                assert not Path(item["image"]["path"]).is_absolute()
                assert tuple(item["image"]["size"]) > (0, 0)
            elif dimension == "3d":
                assert osp.splitext(osp.basename(item["point_cloud"]["path"]))[0] == item["id"]
                assert not Path(item["point_cloud"]["path"]).is_absolute()
                for related_image in item["related_images"]:
                    assert not Path(related_image["path"]).is_absolute()
                    if "size" in related_image:
                        assert tuple(related_image["size"]) > (0, 0)


@pytest.mark.usefixtures("restore_db_per_function")
@pytest.mark.usefixtures("restore_cvat_data_per_function")
@pytest.mark.usefixtures("restore_redis_ondisk_per_function")
@pytest.mark.usefixtures("restore_redis_ondisk_after_class")
@pytest.mark.usefixtures("restore_redis_inmem_per_function")
class TestPostTaskData:
    _USERNAME = "admin1"

    def _test_cannot_create_task(self, username, spec, data, **kwargs):
        with make_api_client(username) as api_client:
            (task, response) = api_client.tasks_api.create(spec, **kwargs)
            assert response.status == HTTPStatus.CREATED

            (result, response) = api_client.tasks_api.create_data(
                task.id, data_request=deepcopy(data), _content_type="application/json", **kwargs
            )
            assert response.status == HTTPStatus.ACCEPTED

            request_details = wait_until_task_is_created(api_client.requests_api, result.rq_id)
            assert request_details.status.value == "failed"

        return request_details

    def test_can_create_task_with_defined_start_and_stop_frames(self):
        task_spec = {
            "name": f"test {self._USERNAME} to create a task with defined start and stop frames",
            "labels": [
                {
                    "name": "car",
                    "color": "#ff00ff",
                    "attributes": [
                        {
                            "name": "a",
                            "mutable": True,
                            "input_type": "number",
                            "default_value": "5",
                            "values": ["4", "5", "6"],
                        }
                    ],
                }
            ],
        }

        task_data = {
            "image_quality": 75,
            "start_frame": 2,
            "stop_frame": 5,
            "client_files": generate_image_files(7),
        }

        task_id, _ = create_task(self._USERNAME, task_spec, task_data)

        # check task size
        with make_api_client(self._USERNAME) as api_client:
            (task, _) = api_client.tasks_api.retrieve(task_id)
            assert task.size == 4

    def test_default_overlap_for_small_segment_size(self):
        task_spec = {
            "name": f"test {self._USERNAME} with default overlap and small segment_size",
            "labels": [{"name": "car"}],
            "segment_size": 5,
        }

        task_data = {
            "image_quality": 75,
            "client_files": [generate_video_file(8)],
        }

        task_id, _ = create_task(self._USERNAME, task_spec, task_data)

        # check task size
        with make_api_client(self._USERNAME) as api_client:
            paginated_job_list, _ = api_client.jobs_api.list(task_id=task_id)

            jobs = paginated_job_list.results
            jobs.sort(key=lambda job: job.start_frame)

            assert len(jobs) == 2
            # overlap should be 2 frames (frames 3 & 4)
            assert jobs[0].start_frame == 0
            assert jobs[0].stop_frame == 4
            assert jobs[1].start_frame == 3
            assert jobs[1].stop_frame == 7

    @pytest.mark.parametrize(
        "size,expected_segments",
        [
            (2, [(0, 1)]),
            (3, [(0, 2)]),
            (4, [(0, 2), (2, 3)]),
            (5, [(0, 2), (2, 4)]),
            (6, [(0, 2), (2, 4), (4, 5)]),
        ],
    )
    def test_task_segmentation(self, size, expected_segments):
        task_spec = {
            "name": f"test {self._USERNAME} to check segmentation into jobs",
            "labels": [{"name": "car"}],
            "segment_size": 3,
            "overlap": 1,
        }

        task_data = {
            "image_quality": 75,
            "client_files": generate_image_files(size),
        }

        task_id, _ = create_task(self._USERNAME, task_spec, task_data)

        # check task size
        with make_api_client(self._USERNAME) as api_client:
            paginated_job_list, _ = api_client.jobs_api.list(task_id=task_id)

            jobs = paginated_job_list.results
            jobs.sort(key=lambda job: job.start_frame)

            assert [(j.start_frame, j.stop_frame) for j in jobs] == expected_segments

    def test_can_create_task_with_exif_rotated_images(self):
        task_spec = {
            "name": f"test {self._USERNAME} to create a task with exif rotated images",
            "labels": [
                {
                    "name": "car",
                }
            ],
        }

        image_files = ["images/exif_rotated/left.jpg", "images/exif_rotated/right.jpg"]
        task_data = {
            "server_files": image_files,
            "image_quality": 70,
            "segment_size": 500,
            "use_cache": True,
            "sorting_method": "natural",
        }

        task_id, _ = create_task(self._USERNAME, task_spec, task_data)

        # check that the frames have correct width and height
        for chunk_quality in ["original", "compressed"]:
            with make_api_client(self._USERNAME) as api_client:
                _, response = api_client.tasks_api.retrieve_data(
                    task_id, number=0, type="chunk", quality=chunk_quality
                )
                data_meta, _ = api_client.tasks_api.retrieve_data_meta(task_id)

                with zipfile.ZipFile(io.BytesIO(response.data)) as zip_file:
                    for name, frame_meta in zip(zip_file.namelist(), data_meta.frames):
                        with zip_file.open(name) as zipped_img:
                            im = Image.open(zipped_img)
                            # original is 480x640 with 90/-90 degrees rotation
                            assert frame_meta.height == 640 and frame_meta.width == 480
                            assert im.height == 640 and im.width == 480
                            assert im.getexif().get(274, 1) == 1

    def test_can_create_task_with_big_images(self):
        # Checks for regressions about the issue
        # https://github.com/cvat-ai/cvat/issues/6878
        # In the case of big files (>2.5 MB by default),
        # uploaded files could be write-appended twice,
        # leading to bigger raw file sizes than expected.

        task_spec = {
            "name": f"test {self._USERNAME} to create a task with big images",
            "labels": [
                {
                    "name": "car",
                }
            ],
        }

        # We need a big file to reproduce the problem
        image_file = generate_image_file("big_image.bmp", size=(4000, 4000), color=(100, 200, 30))
        image_bytes = image_file.getvalue()
        file_size = len(image_bytes)
        assert 10 * 2**20 < file_size

        task_data = {
            "client_files": [image_file],
            "image_quality": 70,
            "use_cache": False,
            "use_zip_chunks": True,
        }

        task_id, _ = create_task(self._USERNAME, task_spec, task_data)

        # check that the original chunk image have the original size
        # this is less accurate than checking the uploaded file directly, but faster
        with make_api_client(self._USERNAME) as api_client:
            _, response = api_client.tasks_api.retrieve_data(
                task_id, number=0, quality="original", type="chunk", _parse_response=False
            )
            chunk_file = io.BytesIO(response.data)

        with zipfile.ZipFile(chunk_file) as chunk_zip:
            infos = chunk_zip.infolist()
            assert len(infos) == 1
            assert infos[0].file_size == file_size

            chunk_image = chunk_zip.read(infos[0])
            assert chunk_image == image_bytes

    def test_can_create_task_with_exif_rotated_tif_image(self):
        task_spec = {
            "name": f"test {self._USERNAME} to create a task with exif rotated tif image",
            "labels": [
                {
                    "name": "car",
                }
            ],
        }

        image_files = ["images/exif_rotated/tif_left.tif"]
        task_data = {
            "server_files": image_files,
            "image_quality": 70,
            "segment_size": 500,
            "use_cache": False,
            "sorting_method": "natural",
        }

        task_id, _ = create_task(self._USERNAME, task_spec, task_data)

        for chunk_quality in ["original", "compressed"]:
            # check that the frame has correct width and height
            with make_api_client(self._USERNAME) as api_client:
                _, response = api_client.tasks_api.retrieve_data(
                    task_id, number=0, type="chunk", quality=chunk_quality
                )

                with zipfile.ZipFile(io.BytesIO(response.data)) as zip_file:
                    assert len(zip_file.namelist()) == 1
                    name = zip_file.namelist()[0]
                    assert name == "000000.tif" if chunk_quality == "original" else "000000.jpeg"
                    with zip_file.open(name) as zipped_img:
                        im = Image.open(zipped_img)
                        # raw image is horizontal 100x150 with -90 degrees rotation
                        assert im.height == 150 and im.width == 100
                        assert im.getexif().get(274, 1) == 1

    def test_can_create_task_with_sorting_method_natural(self):
        task_spec = {
            "name": f"test {self._USERNAME} to create a task with a custom sorting method",
            "labels": [
                {
                    "name": "car",
                }
            ],
        }

        image_files = generate_image_files(15)

        task_data = {
            "client_files": image_files[5:] + image_files[:5],  # perturb the order
            "image_quality": 70,
            "sorting_method": "natural",
        }

        task_id, _ = create_task(self._USERNAME, task_spec, task_data)

        # check that the frames were sorted again
        with make_api_client(self._USERNAME) as api_client:
            data_meta, _ = api_client.tasks_api.retrieve_data_meta(task_id)

            # generate_image_files produces files that are already naturally sorted
            for image_file, frame in zip(image_files, data_meta.frames):
                assert image_file.name == frame.name

    def test_can_create_task_with_video_without_keyframes(self):
        task_spec = {
            "name": f"test {self._USERNAME} to create a task with a video without keyframes",
            "labels": [
                {
                    "name": "label1",
                }
            ],
        }

        task_data = {
            "server_files": [osp.join("videos", "video_without_valid_keyframes.mp4")],
            "image_quality": 70,
        }

        task_id, _ = create_task(self._USERNAME, task_spec, task_data)

        with make_api_client(self._USERNAME) as api_client:
            (_, response) = api_client.tasks_api.retrieve(task_id)
            assert response.status == HTTPStatus.OK

    @pytest.mark.parametrize("data_source", ["client_files", "server_files"])
    def test_can_create_task_with_sorting_method_predefined(self, data_source):
        task_spec = {
            "name": f"test {self._USERNAME} to create a task with a custom sorting method",
            "labels": [
                {
                    "name": "car",
                }
            ],
        }

        if data_source == "client_files":
            image_files = generate_image_files(15)

            # shuffle to check for occasional sorting, e.g. in the DB
            image_files = image_files[7:] + image_files[5:7] + image_files[:5]
        elif data_source == "server_files":
            # Files from the test file share
            image_files = ["images/image_3.jpg", "images/image_1.jpg", "images/image_2.jpg"]
        else:
            assert False

        task_data = {
            data_source: image_files,
            "image_quality": 70,
            "sorting_method": "predefined",
        }

        (task_id, _) = create_task(self._USERNAME, task_spec, task_data)

        # check that the frames were sorted again
        with make_api_client(self._USERNAME) as api_client:
            (data_meta, _) = api_client.tasks_api.retrieve_data_meta(task_id)

            for image_file, frame in zip(image_files, data_meta.frames):
                if isinstance(image_file, str):
                    image_name = image_file
                else:
                    image_name = image_file.name

                assert image_name == frame.name

    def test_can_get_annotations_from_new_task_with_skeletons(self):
        spec = {
            "name": f"test admin1 to create a task with skeleton",
            "labels": [
                {
                    "name": "s1",
                    "color": "#5c5eba",
                    "attributes": [],
                    "type": "skeleton",
                    "sublabels": [
                        {"name": "1", "color": "#d12345", "attributes": [], "type": "points"},
                        {"name": "2", "color": "#350dea", "attributes": [], "type": "points"},
                    ],
                    "svg": '<line x1="19.464284896850586" y1="21.922269821166992" x2="54.08613586425781" y2="43.60293960571289" '
                    'stroke="black" data-type="edge" data-node-from="1" stroke-width="0.5" data-node-to="2"></line>'
                    '<circle r="1.5" stroke="black" fill="#b3b3b3" cx="19.464284896850586" cy="21.922269821166992" '
                    'stroke-width="0.1" data-type="element node" data-element-id="1" data-node-id="1" data-label-id="103"></circle>'
                    '<circle r="1.5" stroke="black" fill="#b3b3b3" cx="54.08613586425781" cy="43.60293960571289" '
                    'stroke-width="0.1" data-type="element node" data-element-id="2" data-node-id="2" data-label-id="104"></circle>',
                }
            ],
        }

        task_data = {
            "image_quality": 75,
            "client_files": generate_image_files(3),
        }

        task_id, _ = create_task(self._USERNAME, spec, task_data)

        response = get_method(self._USERNAME, "labels", task_id=f"{task_id}")
        label_ids = {}
        for root_label in response.json()["results"]:
            for label in [root_label] + root_label["sublabels"]:
                label_ids.setdefault(label["type"], []).append(label["id"])

        response = get_method(self._USERNAME, "jobs", task_id=f"{task_id}")
        job_id = response.json()["results"][0]["id"]
        patch_data = {
            "shapes": [
                {
                    "type": "skeleton",
                    "occluded": False,
                    "outside": False,
                    "z_order": 0,
                    "rotation": 0,
                    "points": [],
                    "frame": 0,
                    "label_id": label_ids["skeleton"][0],
                    "group": 0,
                    "source": "manual",
                    "attributes": [],
                    "elements": [
                        {
                            "type": "points",
                            "occluded": False,
                            "outside": False,
                            "z_order": 0,
                            "rotation": 0,
                            "points": [131.63947368421032, 165.0868421052637],
                            "frame": 0,
                            "label_id": label_ids["points"][0],
                            "group": 0,
                            "source": "manual",
                            "attributes": [],
                        },
                        {
                            "type": "points",
                            "occluded": False,
                            "outside": False,
                            "z_order": 0,
                            "rotation": 0,
                            "points": [354.98157894736823, 304.2710526315795],
                            "frame": 0,
                            "label_id": label_ids["points"][1],
                            "group": 0,
                            "source": "manual",
                            "attributes": [],
                        },
                    ],
                }
            ],
            "tracks": [
                {
                    "frame": 0,
                    "label_id": label_ids["skeleton"][0],
                    "group": 0,
                    "source": "manual",
                    "shapes": [
                        {
                            "type": "skeleton",
                            "occluded": False,
                            "outside": False,
                            "z_order": 0,
                            "rotation": 0,
                            "points": [],
                            "frame": 0,
                            "attributes": [],
                        }
                    ],
                    "attributes": [],
                    "elements": [
                        {
                            "frame": 0,
                            "label_id": label_ids["points"][0],
                            "group": 0,
                            "source": "manual",
                            "shapes": [
                                {
                                    "type": "points",
                                    "occluded": False,
                                    "outside": False,
                                    "z_order": 0,
                                    "rotation": 0,
                                    "points": [295.6394736842103, 472.5868421052637],
                                    "frame": 0,
                                    "attributes": [],
                                }
                            ],
                            "attributes": [],
                        },
                        {
                            "frame": 0,
                            "label_id": label_ids["points"][1],
                            "group": 0,
                            "source": "manual",
                            "shapes": [
                                {
                                    "type": "points",
                                    "occluded": False,
                                    "outside": False,
                                    "z_order": 0,
                                    "rotation": 0,
                                    "points": [619.3236842105262, 846.9815789473689],
                                    "frame": 0,
                                    "attributes": [],
                                }
                            ],
                            "attributes": [],
                        },
                    ],
                }
            ],
            "tags": [],
            "version": 0,
        }

        response = patch_method(
            self._USERNAME, f"jobs/{job_id}/annotations", patch_data, action="create"
        )
        response = get_method(self._USERNAME, f"jobs/{job_id}/annotations")
        assert response.status_code == HTTPStatus.OK

    @pytest.mark.with_external_services
    @pytest.mark.parametrize(
        "use_cache, cloud_storage_id, manifest, use_bucket_content, org",
        [
            (True, 1, "manifest.jsonl", False, ""),  # public bucket
            (True, 2, "sub/manifest.jsonl", True, "org2"),  # private bucket
            (True, 2, "sub/manifest.jsonl", True, "org2"),  # private bucket
            (True, 1, None, False, ""),
            (True, 2, None, True, "org2"),
            (True, 2, None, True, "org2"),
            (False, 1, None, False, ""),
            (False, 2, None, True, "org2"),
            (False, 2, None, True, "org2"),
        ],
    )
    def test_create_task_with_cloud_storage_files(
        self,
        use_cache: bool,
        cloud_storage_id: int,
        manifest: str,
        use_bucket_content: bool,
        org: str,
    ):
        if use_bucket_content:
            cloud_storage_content = get_cloud_storage_content(
                self._USERNAME, cloud_storage_id, manifest
            )
        else:
            cloud_storage_content = ["image_case_65_1.png", "image_case_65_2.png"]
        if manifest:
            cloud_storage_content.append(manifest)

        task_spec = {
            "name": f"Task with files from cloud storage {cloud_storage_id}",
            "labels": [
                {
                    "name": "car",
                }
            ],
        }

        data_spec = {
            "image_quality": 75,
            "use_cache": use_cache,
            "cloud_storage_id": cloud_storage_id,
            "server_files": cloud_storage_content,
        }

        kwargs = {"org": org} if org else {}
        create_task(self._USERNAME, task_spec, data_spec, **kwargs)

    def _create_task_with_cloud_data(
        self,
        request,
        cloud_storage: Any,
        use_manifest: bool,
        server_files: list[str],
        use_cache: bool = True,
        sorting_method: str = "lexicographical",
        data_type: str = "image",
        video_frame_count: int = 10,
        server_files_exclude: Optional[list[str]] = None,
        org: str = "",
        filenames: Optional[list[str]] = None,
        task_spec_kwargs: Optional[dict[str, Any]] = None,
        data_spec_kwargs: Optional[dict[str, Any]] = None,
    ) -> tuple[int, Any]:
        s3_client = s3.make_client(bucket=cloud_storage["resource"])
        if data_type == "video":
            video = generate_video_file(video_frame_count)
            s3_client.create_file(
                data=video,
                filename=f"test/video/{video.name}",
            )
            request.addfinalizer(
                partial(
                    s3_client.remove_file,
                    filename=f"test/video/{video.name}",
                )
            )
        else:
            images = generate_image_files(
                3,
                sizes=[(100, 50) if i % 2 else (50, 100) for i in range(3)],
                **({"prefixes": ["img_"] * 3} if not filenames else {"filenames": filenames}),
            )

            for image in images:
                for i in range(2):
                    image.seek(0)
                    s3_client.create_file(
                        data=image,
                        filename=f"test/sub_{i}/{image.name}",
                    )
                    request.addfinalizer(
                        partial(
                            s3_client.remove_file,
                            filename=f"test/sub_{i}/{image.name}",
                        )
                    )

        if use_manifest:
            with TemporaryDirectory() as tmp_dir:
                manifest_root_path = f"{tmp_dir}/test/"
                for i in range(2):
                    path_with_sub_folders = f"{tmp_dir}/test/sub_{i}/"
                    os.makedirs(path_with_sub_folders)
                    for image in images:
                        with open(osp.join(path_with_sub_folders, image.name), "wb") as f:
                            f.write(image.getvalue())

                generate_manifest(manifest_root_path)

                with open(osp.join(manifest_root_path, "manifest.jsonl"), mode="rb") as m_file:
                    s3_client.create_file(
                        data=m_file.read(),
                        filename="test/manifest.jsonl",
                    )
                    request.addfinalizer(
                        partial(
                            s3_client.remove_file,
                            filename="test/manifest.jsonl",
                        )
                    )
        task_spec = {
            "name": f"Task created from directories from cloud storage {cloud_storage['id']}",
            "labels": [
                {
                    "name": "car",
                }
            ],
            **(task_spec_kwargs or {}),
        }

        data_spec = {
            "image_quality": 75,
            "use_cache": use_cache,
            "cloud_storage_id": cloud_storage["id"],
            "server_files": (
                server_files if not use_manifest else server_files + ["test/manifest.jsonl"]
            ),
            "sorting_method": sorting_method,
            **(data_spec_kwargs or {}),
        }

        if server_files_exclude:
            data_spec["server_files_exclude"] = server_files_exclude

        return create_task(self._USERNAME, task_spec, data_spec, org=org)

    @pytest.mark.with_external_services
    @pytest.mark.parametrize("cloud_storage_id", [2])
    @pytest.mark.parametrize(
        "use_cache, use_manifest, server_files, server_files_exclude, task_size",
        [
            (True, False, ["test/"], None, 6),
            (True, False, ["test/sub_0/", "test/sub_1/"], None, 6),
            (True, False, ["test/"], ["test/sub_0/", "test/sub_1/img_1.jpeg"], 2),
            (True, True, ["test/"], None, 6),
            (True, True, ["test/sub_0/", "test/sub_1/"], None, 6),
            (True, True, ["test/"], ["test/sub_0/", "test/sub_1/img_1.jpeg"], 2),
            (False, False, ["test/"], None, 6),
            (False, False, ["test/sub_0/", "test/sub_1/"], None, 6),
            (False, False, ["test/"], ["test/sub_0/", "test/sub_1/img_1.jpeg"], 2),
        ],
    )
    @pytest.mark.parametrize("org", [""])
    def test_create_task_with_cloud_storage_directories_and_excluded_files(
        self,
        cloud_storage_id: int,
        use_cache: bool,
        use_manifest: bool,
        server_files: list[str],
        server_files_exclude: Optional[list[str]],
        task_size: int,
        org: str,
        cloud_storages,
        request,
    ):
        cloud_storage = cloud_storages[cloud_storage_id]
        task_id, _ = self._create_task_with_cloud_data(
            request,
            cloud_storage,
            use_manifest,
            server_files,
            use_cache=use_cache,
            server_files_exclude=server_files_exclude,
            org=org,
        )

        with make_api_client(self._USERNAME) as api_client:
            (task, response) = api_client.tasks_api.retrieve(task_id)
            assert response.status == HTTPStatus.OK
            assert task.size == task_size

    @pytest.mark.with_external_services
    @pytest.mark.parametrize("cloud_storage_id", [2])
    @pytest.mark.parametrize("use_manifest", [True, False])
    @pytest.mark.parametrize(
        "server_files, expected_result",
        [
            (
                ["test/sub_1/", "test/sub_0/"],
                [
                    "test/sub_1/img_0.jpeg",
                    "test/sub_1/img_1.jpeg",
                    "test/sub_1/img_2.jpeg",
                    "test/sub_0/img_0.jpeg",
                    "test/sub_0/img_1.jpeg",
                    "test/sub_0/img_2.jpeg",
                ],
            )
        ],
    )
    @pytest.mark.parametrize("org", [""])
    def test_create_task_with_cloud_storage_directories_and_predefined_sorting(
        self,
        cloud_storage_id: int,
        use_manifest: bool,
        server_files: list[str],
        expected_result: list[str],
        org: str,
        cloud_storages,
        request,
    ):
        cloud_storage = cloud_storages[cloud_storage_id]
        task_id, _ = self._create_task_with_cloud_data(
            request, cloud_storage, use_manifest, server_files, sorting_method="predefined", org=org
        )

        with make_api_client(self._USERNAME) as api_client:
            (_, response) = api_client.tasks_api.retrieve(task_id)
            assert response.status == HTTPStatus.OK

            # check sequence of frames
            (data_meta, _) = api_client.tasks_api.retrieve_data_meta(task_id)
            assert expected_result == list(map(lambda x: x.name, data_meta.frames))

    @pytest.mark.with_external_services
    @pytest.mark.parametrize(
        "storage_id, manifest",
        [
            (1, "manifest.jsonl"),  # public bucket
            (2, "sub/manifest.jsonl"),  # private bucket
        ],
    )
    @pytest.mark.parametrize(
        "spec, field",
        [
            ("spec", "source_storage"),
            ("spec", "target_storage"),
            ("data", "cloud_storage_id"),
        ],
    )
    def test_user_cannot_create_task_with_cloud_storage_without_access(
        self, storage_id, spec, field, manifest, regular_lonely_user
    ):
        user = regular_lonely_user

        task_spec = {
            "name": f"Task with files from foreign cloud storage {storage_id}",
            "labels": [
                {
                    "name": "car",
                }
            ],
        }

        data_spec = {
            "image_quality": 75,
            "use_cache": True,
        }

        if spec == "spec":
            task_spec.update(
                {
                    field: {
                        "location": "cloud_storage",
                        "cloud_storage_id": storage_id,
                    }
                }
            )
            data_spec["server_files"] = ["images/image_1.jpg"]

        elif spec == "data":
            data_spec.update(
                {
                    field: storage_id,
                    "filename_pattern": "*",
                    "server_files": [manifest],
                }
            )
        else:
            assert False

        with pytest.raises(exceptions.ApiException) as capture:
            create_task(user, task_spec, data_spec)

        assert capture.value.status == HTTPStatus.FORBIDDEN

    @pytest.mark.with_external_services
    @pytest.mark.parametrize("cloud_storage_id", [1])
    @pytest.mark.parametrize(
        "manifest, filename_pattern, sub_dir, task_size",
        [
            ("manifest.jsonl", "*", True, 3),  # public bucket
            ("manifest.jsonl", "test/*", True, 3),
            ("manifest.jsonl", "test/sub*1.jpeg", True, 1),
            ("manifest.jsonl", "*image*.jpeg", True, 3),
            ("manifest.jsonl", "wrong_pattern", True, 0),
            ("abc_manifest.jsonl", "[a-c]*.jpeg", False, 2),
            ("abc_manifest.jsonl", "[d]*.jpeg", False, 1),
            ("abc_manifest.jsonl", "[e-z]*.jpeg", False, 0),
            (None, "*", True, 5),
            (None, "test/*", True, 3),
            (None, "test/sub*1.jpeg", True, 1),
            (None, "*image*.jpeg", True, 3),
            (None, "wrong_pattern", True, 0),
            (None, "[a-c]*.jpeg", False, 2),
            (None, "[d]*.jpeg", False, 1),
            (None, "[e-z]*.jpeg", False, 0),
        ],
    )
    def test_create_task_with_file_pattern(
        self,
        cloud_storage_id,
        manifest,
        filename_pattern,
        sub_dir,
        task_size,
        cloud_storages,
        request,
    ):
        # prepare dataset on the bucket
        prefixes = ("test_image_",) * 3 if sub_dir else ("a_", "b_", "d_")
        images = generate_image_files(3, prefixes=prefixes)
        s3_client = s3.make_client()

        cloud_storage = cloud_storages[cloud_storage_id]

        for image in images:
            s3_client.create_file(
                data=image,
                bucket=cloud_storage["resource"],
                filename=f"{'test/sub/' if sub_dir else ''}{image.name}",
            )
            request.addfinalizer(
                partial(
                    s3_client.remove_file,
                    bucket=cloud_storage["resource"],
                    filename=f"{'test/sub/' if sub_dir else ''}{image.name}",
                )
            )

        if manifest:
            with TemporaryDirectory() as tmp_dir:
                for image in images:
                    with open(osp.join(tmp_dir, image.name), "wb") as f:
                        f.write(image.getvalue())

                generate_manifest(tmp_dir)

                with open(osp.join(tmp_dir, "manifest.jsonl"), mode="rb") as m_file:
                    s3_client.create_file(
                        data=m_file.read(),
                        bucket=cloud_storage["resource"],
                        filename=f"test/sub/{manifest}" if sub_dir else manifest,
                    )
                    request.addfinalizer(
                        partial(
                            s3_client.remove_file,
                            bucket=cloud_storage["resource"],
                            filename=f"test/sub/{manifest}" if sub_dir else manifest,
                        )
                    )

        task_spec = {
            "name": f"Task with files from cloud storage {cloud_storage_id}",
            "labels": [
                {
                    "name": "car",
                }
            ],
        }

        data_spec = {
            "image_quality": 75,
            "use_cache": True,
            "cloud_storage_id": cloud_storage_id,
            "filename_pattern": filename_pattern,
        }
        if manifest:
            data_spec["server_files"] = [f"test/sub/{manifest}" if sub_dir else manifest]

        if task_size:
            task_id, _ = create_task(self._USERNAME, task_spec, data_spec)

            with make_api_client(self._USERNAME) as api_client:
                (task, response) = api_client.tasks_api.retrieve(task_id)
                assert response.status == HTTPStatus.OK
                assert task.size == task_size
        else:
            rq_job_details = self._test_cannot_create_task(self._USERNAME, task_spec, data_spec)
            assert "No media data found" in rq_job_details.message

    @pytest.mark.with_external_services
    @pytest.mark.parametrize("use_manifest", [True, False])
    @pytest.mark.parametrize("use_cache", [True, False])
    @pytest.mark.parametrize(
        "sorting_method", ["natural", "predefined", "lexicographical", "random"]
    )
    @pytest.mark.parametrize(
        "cloud_storage_id, org",
        [
            (1, ""),
        ],
    )
    def test_create_task_with_cloud_storage_and_retrieve_data(
        self,
        use_manifest: bool,
        use_cache: bool,
        sorting_method: str,
        cloud_storage_id: int,
        org: str,
        cloud_storages,
        request,
    ):
        cloud_storage = cloud_storages[cloud_storage_id]
        task_id, _ = self._create_task_with_cloud_data(
            request=request,
            cloud_storage=cloud_storage,
            # manifest file should not be uploaded if random sorting is used or if cache is not used
            use_manifest=use_manifest and use_cache and (sorting_method != "random"),
            use_cache=use_cache,
            server_files=[f"test/sub_{i}/img_{j}.jpeg" for i in range(2) for j in range(3)],
            org=org,
            sorting_method=sorting_method,
        )

        with make_api_client(self._USERNAME) as api_client:
            (_, response) = api_client.tasks_api.retrieve_data(
                task_id, type="chunk", quality="compressed", number=0
            )
            assert response.status == HTTPStatus.OK

    @pytest.mark.with_external_services
    @pytest.mark.parametrize(
        "filenames, sorting_method",
        [
            (["img_1.jpeg", "img_2.jpeg", "img_10.jpeg"], "natural"),
            (["img_10.jpeg", "img_1.jpeg", "img_2.jpeg"], "predefined"),
            (["img_1.jpeg", "img_10.jpeg", "img_2.jpeg"], "lexicographical"),
        ],
    )
    @pytest.mark.parametrize(
        "cloud_storage_id, org",
        [
            (1, ""),
        ],
    )
    def test_create_task_with_cloud_storage_and_check_data_sorting(
        self,
        filenames: list[str],
        sorting_method: str,
        cloud_storage_id: int,
        org: str,
        cloud_storages,
        request,
    ):
        cloud_storage = cloud_storages[cloud_storage_id]

        task_id, _ = self._create_task_with_cloud_data(
            request=request,
            cloud_storage=cloud_storage,
            use_manifest=False,
            use_cache=True,
            server_files=["test/sub_0/" + f for f in filenames],
            org=org,
            sorting_method=sorting_method,
            filenames=filenames,
        )

        with make_api_client(self._USERNAME) as api_client:
            data_meta, _ = api_client.tasks_api.retrieve_data_meta(task_id)

            for image_name, frame in zip(filenames, data_meta.frames):
                assert frame.name.rsplit("/", maxsplit=1)[1] == image_name

    @pytest.mark.with_external_services
    @pytest.mark.parametrize(
        "cloud_storage_id, org",
        [
            (1, ""),
        ],
    )
    def test_create_task_with_cloud_storage_and_check_retrieve_data_meta(
        self,
        cloud_storage_id: int,
        org: str,
        cloud_storages,
        request,
    ):
        cloud_storage = cloud_storages[cloud_storage_id]

        data_spec = {
            "start_frame": 2,
            "stop_frame": 6,
            "frame_filter": "step=2",
        }

        task_id, _ = self._create_task_with_cloud_data(
            request=request,
            cloud_storage=cloud_storage,
            use_manifest=False,
            use_cache=False,
            server_files=["test/video/video.avi"],
            org=org,
            data_spec_kwargs=data_spec,
            data_type="video",
        )

        with make_api_client(self._USERNAME) as api_client:
            data_meta, _ = api_client.tasks_api.retrieve_data_meta(task_id)

        assert data_meta.start_frame == 2
        assert data_meta.stop_frame == 6
        assert data_meta.size == 3

    def test_can_specify_file_job_mapping(self):
        task_spec = {
            "name": f"test file-job mapping",
            "labels": [{"name": "car"}],
        }

        files = generate_image_files(7)
        filenames = [osp.basename(f.name) for f in files]
        expected_segments = [
            filenames[0:1],
            filenames[1:5][::-1],  # a reversed fragment
            filenames[5:7],
        ]

        data_spec = {
            "image_quality": 75,
            "client_files": files,
            "job_file_mapping": expected_segments,
        }

        task_id, _ = create_task(
            self._USERNAME, task_spec, data_spec, content_type="application/json"
        )

        with make_api_client(self._USERNAME) as api_client:
            jobs: list[models.JobRead] = get_paginated_collection(
                api_client.jobs_api.list_endpoint, task_id=task_id, sort="id"
            )
            (task_meta, _) = api_client.tasks_api.retrieve_data_meta(id=task_id)

            assert [f.name for f in task_meta.frames] == list(
                chain.from_iterable(expected_segments)
            )

            start_frame = 0
            for i, job in enumerate(jobs):
                expected_size = len(expected_segments[i])
                stop_frame = start_frame + expected_size - 1
                assert job.start_frame == start_frame
                assert job.stop_frame == stop_frame

                start_frame = stop_frame + 1

    def test_cannot_create_task_with_same_labels(self):
        task_spec = {
            "name": "test cannot create task with same labels",
            "labels": [{"name": "l1"}, {"name": "l1"}],
        }
        response = post_method(self._USERNAME, "tasks", task_spec)
        assert response.status_code == HTTPStatus.BAD_REQUEST

        response = get_method(self._USERNAME, "tasks")
        assert response.status_code == HTTPStatus.OK

    def test_cannot_create_task_with_same_skeleton_sublabels(self):
        task_spec = {
            "name": "test cannot create task with same skeleton sublabels",
            "labels": [
                {"name": "s1", "type": "skeleton", "sublabels": [{"name": "1"}, {"name": "1"}]}
            ],
        }
        response = post_method(self._USERNAME, "tasks", task_spec)
        assert response.status_code == HTTPStatus.BAD_REQUEST

        response = get_method(self._USERNAME, "tasks")
        assert response.status_code == HTTPStatus.OK

    @pytest.mark.with_external_services
    @pytest.mark.parametrize("cloud_storage_id", [2])
    @pytest.mark.parametrize("use_manifest", [True, False])
    @pytest.mark.parametrize("server_files", [["test/"]])
    @pytest.mark.parametrize(
        "default_prefix, expected_task_size",
        [
            (
                "test/sub_1/img_0",
                1,
            ),
            (
                "test/sub_1/",
                3,
            ),
        ],
    )
    @pytest.mark.parametrize("org", [""])
    def test_create_task_with_cloud_storage_directories_and_default_bucket_prefix(
        self,
        cloud_storage_id: int,
        use_manifest: bool,
        server_files: list[str],
        default_prefix: str,
        expected_task_size: int,
        org: str,
        cloud_storages,
        request,
    ):
        cloud_storage = cloud_storages[cloud_storage_id]

        with make_api_client(self._USERNAME) as api_client:
            (_, response) = api_client.cloudstorages_api.partial_update(
                cloud_storage_id,
                patched_cloud_storage_write_request={
                    "specific_attributes": f'{cloud_storage["specific_attributes"]}&prefix={default_prefix}'
                },
            )
            assert response.status == HTTPStatus.OK

        task_id, _ = self._create_task_with_cloud_data(
            request, cloud_storage, use_manifest, server_files, org=org
        )

        with make_api_client(self._USERNAME) as api_client:
            (task, response) = api_client.tasks_api.retrieve(task_id)
            assert response.status == HTTPStatus.OK
            assert task.size == expected_task_size

    @parametrize(
        "frame_selection_method, method_params, per_job_count_param",
        map(
            lambda e: (*e[0], e[1]),
            product(
                [
                    *tuple(product(["random_uniform"], [{"frame_count"}, {"frame_share"}])),
                    ("manual", {}),
                ],
                ["frames_per_job_count", "frames_per_job_share"],
            ),
        ),
    )
    def test_can_create_task_with_honeypots(
        self,
        fxt_test_name,
        frame_selection_method: str,
        method_params: set[str],
        per_job_count_param: str,
    ):
        base_segment_size = 4
        total_frame_count = 15
        validation_frames_count = 5
        validation_per_job_count = 2
        regular_frame_count = total_frame_count - validation_frames_count
        resulting_task_size = (
            regular_frame_count
            + validation_per_job_count * math.ceil(regular_frame_count / base_segment_size)
            + validation_frames_count
        )

        image_files = generate_image_files(total_frame_count)

        validation_params = {"mode": "gt_pool", "frame_selection_method": frame_selection_method}

        if per_job_count_param == "frames_per_job_count":
            validation_params[per_job_count_param] = validation_per_job_count
        elif per_job_count_param == "frames_per_job_share":
            validation_params[per_job_count_param] = validation_per_job_count / base_segment_size
        else:
            assert False

        if frame_selection_method == "random_uniform":
            validation_params["random_seed"] = 42

            for method_param in method_params:
                if method_param == "frame_count":
                    validation_params[method_param] = validation_frames_count
                elif method_param == "frame_share":
                    validation_params[method_param] = validation_frames_count / total_frame_count
                else:
                    assert False
        elif frame_selection_method == "manual":
            rng = np.random.Generator(np.random.MT19937(seed=42))
            validation_params["frames"] = rng.choice(
                [f.name for f in image_files], validation_frames_count, replace=False
            ).tolist()
        else:
            assert False

        task_params = {
            "name": fxt_test_name,
            "labels": [{"name": "a"}],
            "segment_size": base_segment_size,
        }

        data_params = {
            "image_quality": 70,
            "client_files": image_files,
            "sorting_method": "random",
            "validation_params": validation_params,
        }

        task_id, _ = create_task(self._USERNAME, spec=task_params, data=data_params)

        with make_api_client(self._USERNAME) as api_client:
            (task, _) = api_client.tasks_api.retrieve(task_id)
            (task_meta, _) = api_client.tasks_api.retrieve_data_meta(task_id)
            annotation_job_metas = [
                api_client.jobs_api.retrieve_data_meta(job.id)[0]
                for job in get_paginated_collection(
                    api_client.jobs_api.list_endpoint, task_id=task_id, type="annotation"
                )
            ]
            gt_job_metas = [
                api_client.jobs_api.retrieve_data_meta(job.id)[0]
                for job in get_paginated_collection(
                    api_client.jobs_api.list_endpoint, task_id=task_id, type="ground_truth"
                )
            ]

            assert len(gt_job_metas) == 1

        assert task.segment_size == 0  # means "custom segments"
        assert task.size == resulting_task_size
        assert task_meta.size == resulting_task_size

        # validation frames (pool frames) must be appended in the end of the task, in the GT job
        validation_frames = set(f.name for f in task_meta.frames[-validation_frames_count:])
        if frame_selection_method == "manual":
            assert sorted(validation_frames) == sorted(validation_params["frames"])
            assert sorted(f.name for f in gt_job_metas[0].frames) == sorted(
                validation_params["frames"]
            )

        annotation_job_frame_counts = Counter(
            f.name for f in task_meta.frames[:-validation_frames_count]
        )

        regular_frame_counts = {
            k: v for k, v in annotation_job_frame_counts.items() if k not in validation_frames
        }
        # regular frames must not repeat
        assert regular_frame_counts == {
            f.name: 1 for f in image_files if f.name not in validation_frames
        }

        # only validation frames can repeat
        assert set(fn for fn, count in annotation_job_frame_counts.items() if count != 1).issubset(
            validation_frames
        )

        if frame_selection_method == "random_uniform":
            # Test distribution
            validation_frame_counts = {
                f: annotation_job_frame_counts.get(f, 0) + 1 for f in validation_frames
            }
            assert max(validation_frame_counts.values()) <= 1 + min(
                validation_frame_counts.values()
            )

        # each job must have the specified number of validation frames
        for job_meta in annotation_job_metas:
            assert (
                len(set(f.name for f in job_meta.frames if f.name in validation_frames))
                == validation_per_job_count
            )

    @pytest.mark.parametrize("random_seed", [1, 2, 5])
    def test_can_create_task_with_honeypots_random_seed_guarantees_the_same_layout(
        self, fxt_test_name, random_seed: int
    ):
        base_segment_size = 4
        total_frame_count = 15
        validation_frames_count = 5
        validation_per_job_count = 2

        image_files = generate_image_files(total_frame_count)

        validation_params = {
            "mode": "gt_pool",
            "frame_selection_method": "random_uniform",
            "frame_count": validation_frames_count,
            "frames_per_job_count": validation_per_job_count,
            "random_seed": random_seed,
        }

        task_params = {
            "name": fxt_test_name,
            "labels": [{"name": "a"}],
            "segment_size": base_segment_size,
        }

        data_params = {
            "image_quality": 70,
            "client_files": image_files,
            "sorting_method": "random",
            "validation_params": validation_params,
        }

        def _create_task():
            with make_api_client(self._USERNAME) as api_client:
                task_id, _ = create_task(
                    self._USERNAME, spec=deepcopy(task_params), data=deepcopy(data_params)
                )
                task_meta = json.loads(api_client.tasks_api.retrieve_data_meta(task_id)[1].data)
                task_validation_layout = json.loads(
                    api_client.tasks_api.retrieve_validation_layout(task_id)[1].data
                )
                return task_meta, task_validation_layout

        task1_meta, task1_validation_layout = _create_task()
        task2_meta, task2_validation_layout = _create_task()

        assert (
            DeepDiff(
                task1_meta,
                task2_meta,
                ignore_order=False,
                exclude_regex_paths=[r"root\['chunks_updated_date'\]"],  # must be different
            )
            == {}
        )
        assert DeepDiff(task1_validation_layout, task2_validation_layout, ignore_order=False) == {}

    @parametrize(
        "frame_selection_method, method_params",
        [
            *tuple(product(["random_uniform"], [{"frame_count"}, {"frame_share"}])),
            *tuple(
                product(["random_per_job"], [{"frames_per_job_count"}, {"frames_per_job_share"}])
            ),
            ("manual", {}),
        ],
        idgen=lambda **args: "-".join([args["frame_selection_method"], *args["method_params"]]),
    )
    def test_can_create_task_with_gt_job_from_images(
        self,
        request: pytest.FixtureRequest,
        frame_selection_method: str,
        method_params: set[str],
    ):
        segment_size = 4
        total_frame_count = 15
        resulting_task_size = total_frame_count

        image_files = generate_image_files(total_frame_count)

        validation_params = {"mode": "gt", "frame_selection_method": frame_selection_method}

        if "random" in frame_selection_method:
            validation_params["random_seed"] = 42

        if frame_selection_method == "random_uniform":
            validation_frames_count = 5

            for method_param in method_params:
                if method_param == "frame_count":
                    validation_params[method_param] = validation_frames_count
                elif method_param == "frame_share":
                    validation_params[method_param] = validation_frames_count / total_frame_count
                else:
                    assert False
        elif frame_selection_method == "random_per_job":
            validation_per_job_count = 2
            validation_frames_count = validation_per_job_count * math.ceil(
                total_frame_count / segment_size
            )

            for method_param in method_params:
                if method_param == "frames_per_job_count":
                    validation_params[method_param] = validation_per_job_count
                elif method_param == "frames_per_job_share":
                    validation_params[method_param] = validation_per_job_count / segment_size
                else:
                    assert False
        elif frame_selection_method == "manual":
            validation_frames_count = 5

            rng = np.random.Generator(np.random.MT19937(seed=42))
            validation_params["frames"] = rng.choice(
                [f.name for f in image_files], validation_frames_count, replace=False
            ).tolist()
        else:
            assert False

        task_params = {
            "name": request.node.name,
            "labels": [{"name": "a"}],
            "segment_size": segment_size,
        }

        data_params = {
            "image_quality": 70,
            "client_files": image_files,
            "validation_params": validation_params,
        }

        task_id, _ = create_task(self._USERNAME, spec=task_params, data=data_params)

        with make_api_client(self._USERNAME) as api_client:
            (task, _) = api_client.tasks_api.retrieve(task_id)
            (task_meta, _) = api_client.tasks_api.retrieve_data_meta(task_id)
            annotation_job_metas = [
                api_client.jobs_api.retrieve_data_meta(job.id)[0]
                for job in get_paginated_collection(
                    api_client.jobs_api.list_endpoint, task_id=task_id, type="annotation"
                )
            ]
            gt_job_metas = [
                api_client.jobs_api.retrieve_data_meta(job.id)[0]
                for job in get_paginated_collection(
                    api_client.jobs_api.list_endpoint, task_id=task_id, type="ground_truth"
                )
            ]

            assert len(gt_job_metas) == 1

            if frame_selection_method in ("random_uniform", "manual"):
                assert gt_job_metas[0].size == validation_frames_count
            elif frame_selection_method == "random_per_job":
                assert gt_job_metas[0].size == (
                    resulting_task_size // segment_size * validation_per_job_count
                    + min(resulting_task_size % segment_size, validation_per_job_count)
                )
            else:
                assert False

        assert task.segment_size == segment_size
        assert task.size == resulting_task_size
        assert task_meta.size == resulting_task_size

        validation_frames = [
            gt_job_metas[0].frames[rel_frame_id].name
            for rel_frame_id, abs_frame_id in enumerate(
                range(
                    gt_job_metas[0].start_frame,
                    gt_job_metas[0].stop_frame + 1,
                    int((gt_job_metas[0].frame_filter or "step=1").split("=")[1]),
                )
            )
            if abs_frame_id in gt_job_metas[0].included_frames
        ]
        if frame_selection_method == "manual":
            assert sorted(validation_params["frames"]) == sorted(validation_frames)

        assert len(validation_frames) == validation_frames_count

        # frames must not repeat
        assert sorted(f.name for f in image_files) == sorted(f.name for f in task_meta.frames)

        if frame_selection_method == "random_per_job":
            # each job must have the specified number of validation frames
            for job_meta in annotation_job_metas:
                assert (
                    len([f.name for f in job_meta.frames if f.name in validation_frames])
                    == validation_per_job_count
                )

    @parametrize(
        "frame_selection_method, method_params",
        [
            *tuple(product(["random_uniform"], [{"frame_count"}, {"frame_share"}])),
            *tuple(
                product(["random_per_job"], [{"frames_per_job_count"}, {"frames_per_job_share"}])
            ),
        ],
        idgen=lambda **args: "-".join([args["frame_selection_method"], *args["method_params"]]),
    )
    def test_can_create_task_with_gt_job_from_video(
        self,
        request: pytest.FixtureRequest,
        frame_selection_method: str,
        method_params: set[str],
    ):
        segment_size = 4
        total_frame_count = 15
        resulting_task_size = total_frame_count

        video_file = generate_video_file(total_frame_count)

        validation_params = {"mode": "gt", "frame_selection_method": frame_selection_method}

        if "random" in frame_selection_method:
            validation_params["random_seed"] = 42

        if frame_selection_method == "random_uniform":
            validation_frames_count = 5

            for method_param in method_params:
                if method_param == "frame_count":
                    validation_params[method_param] = validation_frames_count
                elif method_param == "frame_share":
                    validation_params[method_param] = validation_frames_count / total_frame_count
                else:
                    assert False
        elif frame_selection_method == "random_per_job":
            validation_per_job_count = 2

            for method_param in method_params:
                if method_param == "frames_per_job_count":
                    validation_params[method_param] = validation_per_job_count
                elif method_param == "frames_per_job_share":
                    validation_params[method_param] = validation_per_job_count / segment_size
                else:
                    assert False

        task_params = {
            "name": request.node.name,
            "labels": [{"name": "a"}],
            "segment_size": segment_size,
        }

        data_params = {
            "image_quality": 70,
            "client_files": [video_file],
            "validation_params": validation_params,
        }

        task_id, _ = create_task(self._USERNAME, spec=task_params, data=data_params)

        with make_api_client(self._USERNAME) as api_client:
            (task, _) = api_client.tasks_api.retrieve(task_id)
            (task_meta, _) = api_client.tasks_api.retrieve_data_meta(task_id)
            annotation_job_metas = [
                api_client.jobs_api.retrieve_data_meta(job.id)[0]
                for job in get_paginated_collection(
                    api_client.jobs_api.list_endpoint, task_id=task_id, type="annotation"
                )
            ]
            gt_job_metas = [
                api_client.jobs_api.retrieve_data_meta(job.id)[0]
                for job in get_paginated_collection(
                    api_client.jobs_api.list_endpoint, task_id=task_id, type="ground_truth"
                )
            ]

            assert len(gt_job_metas) == 1

            if frame_selection_method == "random_uniform":
                assert gt_job_metas[0].size == validation_frames_count
            elif frame_selection_method == "random_per_job":
                assert gt_job_metas[0].size == (
                    resulting_task_size // segment_size * validation_per_job_count
                    + min(resulting_task_size % segment_size, validation_per_job_count)
                )
            else:
                assert False

        assert task.segment_size == segment_size
        assert task.size == resulting_task_size
        assert task_meta.size == resulting_task_size

        frame_step = parse_frame_step(gt_job_metas[0].frame_filter)
        validation_frames = [
            abs_frame_id
            for abs_frame_id in range(
                gt_job_metas[0].start_frame,
                gt_job_metas[0].stop_frame + 1,
                frame_step,
            )
            if abs_frame_id in gt_job_metas[0].included_frames
        ]

        if frame_selection_method == "random_per_job":
            # each job must have the specified number of validation frames
            for job_meta in annotation_job_metas:
                assert (
                    len(
                        set(
                            range(job_meta.start_frame, job_meta.stop_frame + 1, frame_step)
                        ).intersection(validation_frames)
                    )
                    == validation_per_job_count
                )
        else:
            assert len(validation_frames) == validation_frames_count

    @pytest.mark.with_external_services
    @pytest.mark.parametrize("cloud_storage_id", [2])
    @pytest.mark.parametrize(
        "validation_mode",
        [
            models.ValidationMode("gt"),
            models.ValidationMode("gt_pool"),
        ],
    )
    def test_can_create_task_with_validation_and_cloud_data(
        self,
        cloud_storage_id: int,
        validation_mode: models.ValidationMode,
        request: pytest.FixtureRequest,
        admin_user: str,
        cloud_storages: Iterable,
    ):
        cloud_storage = cloud_storages[cloud_storage_id]
        server_files = [f"test/sub_0/img_{i}.jpeg" for i in range(3)]
        validation_frames = ["test/sub_0/img_1.jpeg"]

        (task_id, _) = self._create_task_with_cloud_data(
            request,
            cloud_storage,
            use_manifest=False,
            server_files=server_files,
            sorting_method=models.SortingMethod(
                "random"
            ),  # only random sorting can be used with gt_pool
            data_spec_kwargs={
                "validation_params": models.DataRequestValidationParams._from_openapi_data(
                    mode=validation_mode,
                    frames=validation_frames,
                    frame_selection_method=models.FrameSelectionMethod("manual"),
                    frames_per_job_count=1,
                )
            },
            task_spec_kwargs={
                # in case of gt_pool: each regular job will contain 1 regular and 1 validation frames,
                # (number of validation frames is not included into segment_size)
                "segment_size": 1,
            },
        )

        with make_api_client(admin_user) as api_client:
            # check that GT job was created
            (paginated_jobs, _) = api_client.jobs_api.list(task_id=task_id, type="ground_truth")
            assert 1 == len(paginated_jobs["results"])

            (paginated_jobs, _) = api_client.jobs_api.list(task_id=task_id, type="annotation")
            jobs_count = (
                len(server_files) - len(validation_frames)
                if validation_mode == models.ValidationMode("gt_pool")
                else len(server_files)
            )
            assert jobs_count == len(paginated_jobs["results"])
            # check that the returned meta of images corresponds to the chunk data
            # Note: meta is based on the order of images from database
            # while chunk with CS data is based on the order of images in a manifest
            for job in paginated_jobs["results"]:
                (job_meta, _) = api_client.jobs_api.retrieve_data_meta(job["id"])
                (_, response) = api_client.jobs_api.retrieve_data(
                    job["id"], type="chunk", quality="compressed", index=0
                )
                chunk_file = io.BytesIO(response.data)
                assert zipfile.is_zipfile(chunk_file)

                with zipfile.ZipFile(chunk_file, "r") as chunk_archive:
                    chunk_images = {
                        int(os.path.splitext(name)[0]): np.array(
                            Image.open(io.BytesIO(chunk_archive.read(name)))
                        )
                        for name in chunk_archive.namelist()
                    }
                    chunk_images = dict(sorted(chunk_images.items(), key=lambda e: e[0]))

                    for img, img_meta in zip(chunk_images.values(), job_meta.frames):
                        assert (img.shape[0], img.shape[1]) == (img_meta.height, img_meta.width)

    def test_can_create_task_with_consensus(self, request: pytest.FixtureRequest):
        segment_size = 2
        regular_job_count = 2
        replication = 2
        images = generate_image_files(segment_size * regular_job_count)
        resulting_task_size = len(images)

        task_params = {
            "name": request.node.name,
            "labels": [{"name": "a"}],
            "segment_size": segment_size,
            "consensus_replicas": replication,
        }

        data_params = {
            "image_quality": 70,
            "client_files": images,
        }

        task_id, _ = create_task(self._USERNAME, spec=task_params, data=data_params)

        with make_api_client(self._USERNAME) as api_client:
            (task, _) = api_client.tasks_api.retrieve(task_id)
            (task_meta, _) = api_client.tasks_api.retrieve_data_meta(task_id)
            jobs = get_paginated_collection(api_client.jobs_api.list_endpoint, task_id=task_id)

            annotation_job_metas = {
                job.id: json.loads(api_client.jobs_api.retrieve_data_meta(job.id)[1].data)
                for job in jobs
                if job.type == "annotation"
            }
            consensus_job_metas = {
                job.id: json.loads(api_client.jobs_api.retrieve_data_meta(job.id)[1].data)
                for job in jobs
                if job.type == "consensus_replica"
            }

        assert task.segment_size == segment_size
        assert task.size == resulting_task_size
        assert task_meta.size == resulting_task_size

        assert len(jobs) == regular_job_count * (1 + replication)
        assert len(annotation_job_metas) == regular_job_count
        assert len(consensus_job_metas) == regular_job_count * replication

        for annotation_job in (j for j in jobs if j.type == "annotation"):
            assert annotation_job_metas[annotation_job.id]["size"] == segment_size

            job_replicas = [j for j in jobs if j.parent_job_id == annotation_job.id]
            assert len(job_replicas) == replication

            for replica in job_replicas:
                assert (
                    DeepDiff(
                        consensus_job_metas[replica.id], annotation_job_metas[annotation_job.id]
                    )
                    == {}
                )


class _SourceDataType(Enum):
    images = "images"
    video = "video"


class _TaskSpec(models.ITaskWriteRequest, models.IDataRequest, metaclass=ABCMeta):
    size: int
    frame_step: int
    source_data_type: _SourceDataType

    @abstractmethod
    def read_frame(self, i: int) -> Image.Image: ...


@attrs.define
class _TaskSpecBase(_TaskSpec):
    _params: Union[dict, models.TaskWriteRequest]
    _data_params: Union[dict, models.DataRequest]
    size: int = attrs.field(kw_only=True)

    @property
    def frame_step(self) -> int:
        return parse_frame_step(getattr(self, "frame_filter", ""))

    def __getattr__(self, k: str) -> Any:
        notfound = object()

        for params in [self._params, self._data_params]:
            if isinstance(params, dict):
                v = params.get(k, notfound)
            else:
                v = getattr(params, k, notfound)

            if v is not notfound:
                return v

        raise AttributeError(k)


@attrs.define
class _ImagesTaskSpec(_TaskSpecBase):
    source_data_type: ClassVar[_SourceDataType] = _SourceDataType.images

    _get_frame: Callable[[int], bytes] = attrs.field(kw_only=True)

    def read_frame(self, i: int) -> Image.Image:
        return Image.open(io.BytesIO(self._get_frame(i)))


@attrs.define
class _VideoTaskSpec(_TaskSpecBase):
    source_data_type: ClassVar[_SourceDataType] = _SourceDataType.video

    _get_video_file: Callable[[], io.IOBase] = attrs.field(kw_only=True)

    def read_frame(self, i: int) -> Image.Image:
        with closing(read_video_file(self._get_video_file())) as reader:
            for _ in range(i + 1):
                frame = next(reader)

            return frame


class _TestTasksBase:
    _USERNAME = "admin1"

    def _uploaded_images_task_fxt_base(
        self,
        request: pytest.FixtureRequest,
        *,
        frame_count: Optional[int] = 10,
        image_files: Optional[Sequence[io.BytesIO]] = None,
        start_frame: Optional[int] = None,
        stop_frame: Optional[int] = None,
        step: Optional[int] = None,
        segment_size: Optional[int] = None,
        job_replication: Optional[int] = None,
        **data_kwargs,
    ) -> Generator[tuple[_ImagesTaskSpec, int], None, None]:
        task_params = {
            "name": f"{request.node.name}[{request.fixturename}]",
            "labels": [{"name": "a"}],
            **({"segment_size": segment_size} if segment_size else {}),
            **({"consensus_replicas": job_replication} if job_replication else {}),
        }

        assert bool(image_files) ^ bool(
            frame_count
        ), "Expected only one of 'image_files' and 'frame_count'"
        if not image_files:
            image_files = generate_image_files(frame_count)
        elif not frame_count:
            frame_count = len(image_files)

        images_data = [f.getvalue() for f in image_files]

        resulting_task_size = len(
            range(start_frame or 0, (stop_frame or len(images_data) - 1) + 1, step or 1)
        )

        data_params = {
            "image_quality": 70,
            "client_files": image_files,
            "sorting_method": "natural",
            "chunk_size": max(1, (segment_size or resulting_task_size) // 2),
        }
        data_params.update(data_kwargs)

        if start_frame is not None:
            data_params["start_frame"] = start_frame

        if stop_frame is not None:
            data_params["stop_frame"] = stop_frame

        if step is not None:
            data_params["frame_filter"] = f"step={step}"

        def get_frame(i: int) -> bytes:
            return images_data[i]

        task_id, _ = create_task(self._USERNAME, spec=task_params, data=data_params)
        yield _ImagesTaskSpec(
            models.TaskWriteRequest._from_openapi_data(**task_params),
            models.DataRequest._from_openapi_data(**data_params),
            get_frame=get_frame,
            size=resulting_task_size,
        ), task_id

    @pytest.fixture(scope="class")
    def fxt_uploaded_images_task(
        self, request: pytest.FixtureRequest
    ) -> Generator[tuple[_TaskSpec, int], None, None]:
        yield from self._uploaded_images_task_fxt_base(request=request)

    @pytest.fixture(scope="class")
    def fxt_uploaded_images_task_with_segments(
        self, request: pytest.FixtureRequest
    ) -> Generator[tuple[_TaskSpec, int], None, None]:
        yield from self._uploaded_images_task_fxt_base(request=request, segment_size=4)

    @fixture(scope="class")
    @parametrize("step", [2, 5])
    @parametrize("stop_frame", [15, 26])
    @parametrize("start_frame", [3, 7])
    def fxt_uploaded_images_task_with_segments_start_stop_step(
        self, request: pytest.FixtureRequest, start_frame: int, stop_frame: Optional[int], step: int
    ) -> Generator[tuple[_TaskSpec, int], None, None]:
        yield from self._uploaded_images_task_fxt_base(
            request=request,
            frame_count=30,
            segment_size=4,
            start_frame=start_frame,
            stop_frame=stop_frame,
            step=step,
        )

    @pytest.fixture(scope="class")
    def fxt_uploaded_images_task_with_segments_and_consensus(
        self, request: pytest.FixtureRequest
    ) -> Generator[tuple[_TaskSpec, int], None, None]:
        yield from self._uploaded_images_task_fxt_base(
            request=request, segment_size=4, job_replication=2
        )

    def _uploaded_images_task_with_honeypots_and_segments_base(
        self,
        request: pytest.FixtureRequest,
        *,
        start_frame: Optional[int] = None,
        step: Optional[int] = None,
        random_seed: int = 42,
    ) -> Generator[tuple[_TaskSpec, int], None, None]:
        validation_params = models.DataRequestValidationParams._from_openapi_data(
            mode="gt_pool",
            frame_selection_method="random_uniform",
            random_seed=random_seed,
            frame_count=5,
            frames_per_job_count=2,
        )

        used_frames_count = 15
        total_frame_count = (start_frame or 0) + used_frames_count * (step or 1)
        base_segment_size = 4
        regular_frame_count = used_frames_count - validation_params.frame_count
        final_segment_size = base_segment_size + validation_params.frames_per_job_count
        final_task_size = (
            regular_frame_count
            + validation_params.frames_per_job_count
            * math.ceil(regular_frame_count / base_segment_size)
            + validation_params.frame_count
        )

        image_files = generate_image_files(total_frame_count)

        with closing(
            self._uploaded_images_task_fxt_base(
                request=request,
                frame_count=None,
                image_files=image_files,
                segment_size=base_segment_size,
                sorting_method="random",
                start_frame=start_frame,
                step=step,
                validation_params=validation_params,
            )
        ) as task_gen:
            for task_spec, task_id in task_gen:
                # Get the actual frame order after the task is created
                with make_api_client(self._USERNAME) as api_client:
                    (task_meta, _) = api_client.tasks_api.retrieve_data_meta(task_id)
                    frame_map = [
                        next(i for i, f in enumerate(image_files) if f.name == frame_info.name)
                        for frame_info in task_meta.frames
                    ]

                _get_frame = task_spec._get_frame
                task_spec._get_frame = lambda i: _get_frame(frame_map[i])

                task_spec.size = final_task_size
                task_spec._params.segment_size = final_segment_size

                # These parameters are not applicable to the resulting task,
                # they are only effective during task creation
                if start_frame or step:
                    task_spec._data_params.start_frame = 0
                    task_spec._data_params.stop_frame = task_spec.size
                    task_spec._data_params.frame_filter = ""

                yield task_spec, task_id

    @fixture(scope="class")
    def fxt_uploaded_images_task_with_honeypots_and_segments(
        self, request: pytest.FixtureRequest
    ) -> Generator[tuple[_TaskSpec, int], None, None]:
        yield from self._uploaded_images_task_with_honeypots_and_segments_base(request)

    @fixture(scope="class")
    @parametrize("start_frame, step", [(2, 3)])
    def fxt_uploaded_images_task_with_honeypots_and_segments_start_step(
        self, request: pytest.FixtureRequest, start_frame: Optional[int], step: Optional[int]
    ) -> Generator[tuple[_TaskSpec, int], None, None]:
        yield from self._uploaded_images_task_with_honeypots_and_segments_base(
            request, start_frame=start_frame, step=step
        )

    @fixture(scope="class")
    @parametrize("random_seed", [1, 2, 5])
    def fxt_uploaded_images_task_with_honeypots_and_changed_real_frames(
        self, request: pytest.FixtureRequest, random_seed: int
    ) -> Generator[tuple[_TaskSpec, int], None, None]:
        with closing(
            self._uploaded_images_task_with_honeypots_and_segments_base(
                request, start_frame=2, step=3, random_seed=random_seed
            )
        ) as gen_iter:
            task_spec, task_id = next(gen_iter)

            with make_api_client(self._USERNAME) as api_client:
                validation_layout, _ = api_client.tasks_api.retrieve_validation_layout(task_id)
                validation_frames = validation_layout.validation_frames

                new_honeypot_real_frames = [
                    validation_frames[(validation_frames.index(f) + 1) % len(validation_frames)]
                    for f in validation_layout.honeypot_real_frames
                ]
                api_client.tasks_api.partial_update_validation_layout(
                    task_id,
                    patched_task_validation_layout_write_request=(
                        models.PatchedTaskValidationLayoutWriteRequest(
                            frame_selection_method="manual",
                            honeypot_real_frames=new_honeypot_real_frames,
                        )
                    ),
                )

                # Get the new frame order
                frame_map = dict(zip(validation_layout.honeypot_frames, new_honeypot_real_frames))

                _get_frame = task_spec._get_frame
                task_spec._get_frame = lambda i: _get_frame(frame_map.get(i, i))

            yield task_spec, task_id

    def _uploaded_images_task_with_gt_and_segments_base(
        self,
        request: pytest.FixtureRequest,
        *,
        start_frame: Optional[int] = None,
        step: Optional[int] = None,
        frame_selection_method: str = "random_uniform",
        job_replication: Optional[int] = None,
    ) -> Generator[tuple[_TaskSpec, int], None, None]:
        used_frames_count = 16
        total_frame_count = (start_frame or 0) + used_frames_count * (step or 1)
        segment_size = 5
        image_files = generate_image_files(total_frame_count)

        validation_params_kwargs = {"frame_selection_method": frame_selection_method}

        if "random" in frame_selection_method:
            validation_params_kwargs["random_seed"] = 42

        if frame_selection_method == "random_uniform":
            validation_frames_count = 10
            validation_params_kwargs["frame_count"] = validation_frames_count
        elif frame_selection_method == "random_per_job":
            frames_per_job_count = 3
            validation_params_kwargs["frames_per_job_count"] = frames_per_job_count
            validation_frames_count = used_frames_count // segment_size + min(
                used_frames_count % segment_size, frames_per_job_count
            )
        elif frame_selection_method == "manual":
            validation_frames_count = 10

            valid_frame_ids = range(
                (start_frame or 0), (start_frame or 0) + used_frames_count * (step or 1), step or 1
            )
            rng = np.random.Generator(np.random.MT19937(seed=42))
            validation_params_kwargs["frames"] = rng.choice(
                [f.name for i, f in enumerate(image_files) if i in valid_frame_ids],
                validation_frames_count,
                replace=False,
            ).tolist()
        else:
            raise NotImplementedError

        validation_params = models.DataRequestValidationParams._from_openapi_data(
            mode="gt",
            **validation_params_kwargs,
        )

        yield from self._uploaded_images_task_fxt_base(
            request=request,
            frame_count=None,
            image_files=image_files,
            segment_size=segment_size,
            sorting_method="natural",
            start_frame=start_frame,
            step=step,
            validation_params=validation_params,
            job_replication=job_replication,
        )

    @pytest.fixture(scope="class")
    def fxt_uploaded_images_task_with_gt_and_segments_and_consensus(
        self, request: pytest.FixtureRequest
    ) -> Generator[tuple[_TaskSpec, int], None, None]:
        yield from self._uploaded_images_task_with_gt_and_segments_base(
            request=request, job_replication=2
        )

    @fixture(scope="class")
    @parametrize("start_frame, step", [(2, 3)])
    @parametrize("frame_selection_method", ["random_uniform", "random_per_job", "manual"])
    def fxt_uploaded_images_task_with_gt_and_segments_start_step(
        self,
        request: pytest.FixtureRequest,
        start_frame: Optional[int],
        step: Optional[int],
        frame_selection_method: str,
    ) -> Generator[tuple[_TaskSpec, int], None, None]:
        yield from self._uploaded_images_task_with_gt_and_segments_base(
            request,
            start_frame=start_frame,
            step=step,
            frame_selection_method=frame_selection_method,
        )

    def _uploaded_video_task_fxt_base(
        self,
        request: pytest.FixtureRequest,
        *,
        frame_count: int = 10,
        segment_size: Optional[int] = None,
        start_frame: Optional[int] = None,
        stop_frame: Optional[int] = None,
        step: Optional[int] = None,
    ) -> Generator[tuple[_VideoTaskSpec, int], None, None]:
        task_params = {
            "name": f"{request.node.name}[{request.fixturename}]",
            "labels": [{"name": "a"}],
        }
        if segment_size:
            task_params["segment_size"] = segment_size

        resulting_task_size = len(
            range(start_frame or 0, (stop_frame or frame_count - 1) + 1, step or 1)
        )

        video_file = generate_video_file(frame_count)
        video_data = video_file.getvalue()
        data_params = {
            "image_quality": 70,
            "client_files": [video_file],
            "chunk_size": max(1, (segment_size or resulting_task_size) // 2),
        }

        if start_frame is not None:
            data_params["start_frame"] = start_frame

        if stop_frame is not None:
            data_params["stop_frame"] = stop_frame

        if step is not None:
            data_params["frame_filter"] = f"step={step}"

        def get_video_file() -> io.BytesIO:
            return io.BytesIO(video_data)

        task_id, _ = create_task(self._USERNAME, spec=task_params, data=data_params)
        yield _VideoTaskSpec(
            models.TaskWriteRequest._from_openapi_data(**task_params),
            models.DataRequest._from_openapi_data(**data_params),
            get_video_file=get_video_file,
            size=resulting_task_size,
        ), task_id

    @pytest.fixture(scope="class")
    def fxt_uploaded_video_task(
        self,
        request: pytest.FixtureRequest,
    ) -> Generator[tuple[_TaskSpec, int], None, None]:
        yield from self._uploaded_video_task_fxt_base(request=request)

    @pytest.fixture(scope="class")
    def fxt_uploaded_video_task_with_segments(
        self, request: pytest.FixtureRequest
    ) -> Generator[tuple[_TaskSpec, int], None, None]:
        yield from self._uploaded_video_task_fxt_base(request=request, segment_size=4)

    @fixture(scope="class")
    @parametrize("step", [2, 5])
    @parametrize("stop_frame", [15, 26])
    @parametrize("start_frame", [3, 7])
    def fxt_uploaded_video_task_with_segments_start_stop_step(
        self, request: pytest.FixtureRequest, start_frame: int, stop_frame: Optional[int], step: int
    ) -> Generator[tuple[_TaskSpec, int], None, None]:
        yield from self._uploaded_video_task_fxt_base(
            request=request,
            frame_count=30,
            segment_size=4,
            start_frame=start_frame,
            stop_frame=stop_frame,
            step=step,
        )

    def _compute_annotation_segment_params(self, task_spec: _TaskSpec) -> list[tuple[int, int]]:
        segment_params = []
        frame_step = task_spec.frame_step
        segment_size = getattr(task_spec, "segment_size", 0) or task_spec.size * frame_step
        start_frame = getattr(task_spec, "start_frame", 0)
        stop_frame = getattr(task_spec, "stop_frame", None) or (
            start_frame + (task_spec.size - 1) * frame_step
        )
        end_frame = calc_end_frame(start_frame, stop_frame, frame_step)

        validation_params = getattr(task_spec, "validation_params", None)
        if validation_params and validation_params.mode.value == "gt_pool":
            end_frame = min(
                end_frame, (task_spec.size - validation_params.frame_count) * frame_step
            )
            segment_size = min(segment_size, end_frame - 1)

        overlap = min(
            (
                getattr(task_spec, "overlap", None) or 0
                if task_spec.source_data_type == _SourceDataType.images
                else 5
            ),
            segment_size // 2,
        )
        segment_start = start_frame
        while segment_start < end_frame:
            if start_frame < segment_start:
                segment_start -= overlap * frame_step

            segment_end = segment_start + frame_step * segment_size

            segment_params.append((segment_start, min(segment_end, end_frame) - frame_step))
            segment_start = segment_end

        return segment_params

    @staticmethod
    def _compare_images(
        expected: Image.Image, actual: Image.Image, *, must_be_identical: bool = True
    ):
        expected_pixels = np.array(expected)
        chunk_frame_pixels = np.array(actual)
        assert expected_pixels.shape == chunk_frame_pixels.shape

        if not must_be_identical:
            # video chunks can have slightly changed colors, due to codec specifics
            # compressed images can also be distorted
            assert np.allclose(chunk_frame_pixels, expected_pixels, atol=2)
        else:
            assert np.array_equal(chunk_frame_pixels, expected_pixels)

    def _get_job_abs_frame_set(self, job_meta: models.DataMetaRead) -> Sequence[int]:
        if job_meta.included_frames:
            return job_meta.included_frames
        else:
            return range(
                job_meta.start_frame,
                job_meta.stop_frame + 1,
                parse_frame_step(job_meta.frame_filter),
            )

    _tasks_with_honeypots_cases = [
        fixture_ref("fxt_uploaded_images_task_with_honeypots_and_segments"),
        fixture_ref("fxt_uploaded_images_task_with_honeypots_and_segments_start_step"),
        fixture_ref("fxt_uploaded_images_task_with_honeypots_and_changed_real_frames"),
    ]

    _tasks_with_simple_gt_job_cases = [
        fixture_ref("fxt_uploaded_images_task_with_gt_and_segments_start_step"),
        fixture_ref("fxt_uploaded_images_task_with_gt_and_segments_and_consensus"),
    ]

    _tasks_with_consensus_cases = [
        fixture_ref("fxt_uploaded_images_task_with_segments_and_consensus"),
        fixture_ref("fxt_uploaded_images_task_with_gt_and_segments_and_consensus"),
    ]

    # Keep in mind that these fixtures are generated eagerly
    # (before each depending test or group of tests),
    # e.g. a failing task creation in one the fixtures will fail all the depending tests cases.
    _all_task_cases = unique(
        [
            fixture_ref("fxt_uploaded_images_task"),
            fixture_ref("fxt_uploaded_images_task_with_segments"),
            fixture_ref("fxt_uploaded_images_task_with_segments_start_stop_step"),
            fixture_ref("fxt_uploaded_video_task"),
            fixture_ref("fxt_uploaded_video_task_with_segments"),
            fixture_ref("fxt_uploaded_video_task_with_segments_start_stop_step"),
        ]
        + _tasks_with_honeypots_cases
        + _tasks_with_simple_gt_job_cases
        + _tasks_with_consensus_cases,
        key=lambda fxt_ref: fxt_ref.fixture,
    )


@pytest.mark.usefixtures("restore_db_per_class")
@pytest.mark.usefixtures("restore_cvat_data_per_class")
@pytest.mark.usefixtures("restore_redis_ondisk_per_function")
@pytest.mark.usefixtures("restore_redis_ondisk_after_class")
@pytest.mark.usefixtures("restore_redis_inmem_per_function")
class TestTaskData(_TestTasksBase):
    @parametrize("task_spec, task_id", _TestTasksBase._all_task_cases)
    def test_can_get_task_meta(self, task_spec: _TaskSpec, task_id: int):
        with make_api_client(self._USERNAME) as api_client:
            (task_meta, _) = api_client.tasks_api.retrieve_data_meta(task_id)

            assert task_meta.size == task_spec.size
            assert task_meta.start_frame == getattr(task_spec, "start_frame", 0)
            assert task_meta.stop_frame == getattr(task_spec, "stop_frame", None) or task_spec.size
            assert task_meta.frame_filter == getattr(task_spec, "frame_filter", "")

            task_frame_set = set(
                range(task_meta.start_frame, task_meta.stop_frame + 1, task_spec.frame_step)
            )
            assert len(task_frame_set) == task_meta.size

            if getattr(task_spec, "chunk_size", None):
                assert task_meta.chunk_size == task_spec.chunk_size

            if task_spec.source_data_type == _SourceDataType.video:
                assert len(task_meta.frames) == 1
            else:
                assert len(task_meta.frames) == task_meta.size

    @pytest.mark.timeout(
        # This test has to check all the task frames availability, it can make many requests
        timeout=300
    )
    @parametrize("task_spec, task_id", _TestTasksBase._all_task_cases)
    def test_can_get_task_frames(self, task_spec: _TaskSpec, task_id: int):
        with make_api_client(self._USERNAME) as api_client:
            (task_meta, _) = api_client.tasks_api.retrieve_data_meta(task_id)

            for quality, abs_frame_id in product(
                ["original", "compressed"],
                range(task_meta.start_frame, task_meta.stop_frame + 1, task_spec.frame_step),
            ):
                rel_frame_id = (
                    abs_frame_id - getattr(task_spec, "start_frame", 0)
                ) // task_spec.frame_step
                (_, response) = api_client.tasks_api.retrieve_data(
                    task_id,
                    type="frame",
                    quality=quality,
                    number=rel_frame_id,
                    _parse_response=False,
                )

                if task_spec.source_data_type == _SourceDataType.video:
                    frame_size = (task_meta.frames[0].width, task_meta.frames[0].height)
                else:
                    frame_size = (
                        task_meta.frames[rel_frame_id].width,
                        task_meta.frames[rel_frame_id].height,
                    )

                frame = Image.open(io.BytesIO(response.data))
                assert frame_size == frame.size

                self._compare_images(
                    task_spec.read_frame(abs_frame_id),
                    frame,
                    must_be_identical=(
                        task_spec.source_data_type == _SourceDataType.images
                        and quality == "original"
                    ),
                )

    @pytest.mark.timeout(
        # This test has to check all the task chunks availability, it can make many requests
        timeout=300
    )
    @parametrize("task_spec, task_id", _TestTasksBase._all_task_cases)
    def test_can_get_task_chunks(self, task_spec: _TaskSpec, task_id: int):
        with make_api_client(self._USERNAME) as api_client:
            (task, _) = api_client.tasks_api.retrieve(task_id)
            (task_meta, _) = api_client.tasks_api.retrieve_data_meta(task_id)

            if task_spec.source_data_type == _SourceDataType.images:
                assert task.data_original_chunk_type == "imageset"
                assert task.data_compressed_chunk_type == "imageset"
            elif task_spec.source_data_type == _SourceDataType.video:
                assert task.data_original_chunk_type == "video"

                if getattr(task_spec, "use_zip_chunks", False):
                    assert task.data_compressed_chunk_type == "imageset"
                else:
                    assert task.data_compressed_chunk_type == "video"
            else:
                assert False

            task_abs_frames = range(
                task_meta.start_frame, task_meta.stop_frame + 1, task_spec.frame_step
            )
            task_chunk_frames = [
                (chunk_number, list(chunk_frames))
                for chunk_number, chunk_frames in groupby(
                    task_abs_frames,
                    key=lambda abs_frame: (
                        (abs_frame - task_meta.start_frame) // task_spec.frame_step
                    )
                    // task_meta.chunk_size,
                )
            ]
            for quality, (chunk_id, expected_chunk_frame_ids) in product(
                ["original", "compressed"], task_chunk_frames
            ):
                (_, response) = api_client.tasks_api.retrieve_data(
                    task_id, type="chunk", quality=quality, number=chunk_id, _parse_response=False
                )

                chunk_file = io.BytesIO(response.data)
                if zipfile.is_zipfile(chunk_file):
                    with zipfile.ZipFile(chunk_file, "r") as chunk_archive:
                        chunk_images = {
                            int(os.path.splitext(name)[0]): np.array(
                                Image.open(io.BytesIO(chunk_archive.read(name)))
                            )
                            for name in chunk_archive.namelist()
                        }
                        chunk_images = dict(sorted(chunk_images.items(), key=lambda e: e[0]))
                else:
                    chunk_images = dict(enumerate(read_video_file(chunk_file)))

                assert sorted(chunk_images.keys()) == list(range(len(expected_chunk_frame_ids)))

                for chunk_frame, abs_frame_id in zip(chunk_images, expected_chunk_frame_ids):
                    self._compare_images(
                        task_spec.read_frame(abs_frame_id),
                        chunk_images[chunk_frame],
                        must_be_identical=(
                            task_spec.source_data_type == _SourceDataType.images
                            and quality == "original"
                        ),
                    )

    @pytest.mark.timeout(
        # This test has to check all the task meta availability, it can make many requests
        timeout=300
    )
    @parametrize("task_spec, task_id", _TestTasksBase._all_task_cases)
    def test_can_get_annotation_job_meta(self, task_spec: _TaskSpec, task_id: int):
        segment_params = self._compute_annotation_segment_params(task_spec)

        with make_api_client(self._USERNAME) as api_client:
            jobs = sorted(
                get_paginated_collection(
                    api_client.jobs_api.list_endpoint, task_id=task_id, type="annotation"
                ),
                key=lambda j: j.start_frame,
            )
            assert len(jobs) == len(segment_params)

            for (segment_start, segment_stop), job in zip(segment_params, jobs):
                (job_meta, _) = api_client.jobs_api.retrieve_data_meta(job.id)

                assert (job_meta.start_frame, job_meta.stop_frame) == (segment_start, segment_stop)
                assert job_meta.frame_filter == getattr(task_spec, "frame_filter", "")

                segment_size = math.ceil((segment_stop - segment_start + 1) / task_spec.frame_step)
                assert job_meta.size == segment_size

                job_abs_frame_set = self._get_job_abs_frame_set(job_meta)
                assert len(job_abs_frame_set) == job_meta.size
                assert set(job_abs_frame_set).issubset(
                    range(
                        job_meta.start_frame,
                        job_meta.stop_frame + 1,
                        parse_frame_step(job_meta.frame_filter),
                    )
                )

                if getattr(task_spec, "chunk_size", None):
                    assert job_meta.chunk_size == task_spec.chunk_size

                if task_spec.source_data_type == _SourceDataType.video:
                    assert len(job_meta.frames) == 1
                else:
                    assert len(job_meta.frames) == job_meta.size

    @parametrize("task_spec, task_id", _TestTasksBase._tasks_with_simple_gt_job_cases)
    def test_can_get_simple_gt_job_meta(self, task_spec: _TaskSpec, task_id: int):
        with make_api_client(self._USERNAME) as api_client:
            jobs = sorted(
                get_paginated_collection(
                    api_client.jobs_api.list_endpoint, task_id=task_id, type="ground_truth"
                ),
                key=lambda j: j.start_frame,
            )
            assert len(jobs) == 1

            gt_job = jobs[0]
            (job_meta, _) = api_client.jobs_api.retrieve_data_meta(gt_job.id)

            task_start_frame = getattr(task_spec, "start_frame", 0)
            assert (job_meta.start_frame, job_meta.stop_frame) == (
                task_start_frame,
                task_start_frame + (task_spec.size - 1) * task_spec.frame_step,
            )
            assert job_meta.frame_filter == getattr(task_spec, "frame_filter", "")

            frame_selection_method = task_spec.validation_params.frame_selection_method.value
            if frame_selection_method == "random_uniform":
                validation_frames_count = task_spec.validation_params.frame_count
            elif frame_selection_method == "random_per_job":
                frames_per_job_count = task_spec.validation_params.frames_per_job_count
                validation_frames_count = (
                    task_spec.size // task_spec.segment_size * frames_per_job_count
                    + min(task_spec.size % task_spec.segment_size, frames_per_job_count)
                )
            elif frame_selection_method == "manual":
                validation_frames_count = len(task_spec.validation_params.frames)
            else:
                raise NotImplementedError(frame_selection_method)

            assert job_meta.size == validation_frames_count

            job_abs_frame_set = self._get_job_abs_frame_set(job_meta)
            assert len(job_abs_frame_set) == job_meta.size
            assert set(job_abs_frame_set).issubset(
                range(
                    job_meta.start_frame,
                    job_meta.stop_frame + 1,
                    parse_frame_step(job_meta.frame_filter),
                )
            )

            if getattr(task_spec, "chunk_size", None):
                assert job_meta.chunk_size == task_spec.chunk_size

            if task_spec.source_data_type == _SourceDataType.video:
                assert len(job_meta.frames) == 1
            else:
                # there are placeholders on the non-included places
                assert len(job_meta.frames) == task_spec.size

    @parametrize("task_spec, task_id", _TestTasksBase._tasks_with_honeypots_cases)
    def test_can_get_honeypot_gt_job_meta(self, task_spec: _TaskSpec, task_id: int):
        with make_api_client(self._USERNAME) as api_client:
            gt_jobs = get_paginated_collection(
                api_client.jobs_api.list_endpoint, task_id=task_id, type="ground_truth"
            )
            assert len(gt_jobs) == 1

            gt_job = gt_jobs[0]
            segment_start = task_spec.size - task_spec.validation_params.frame_count
            segment_stop = task_spec.size - 1

            (job_meta, _) = api_client.jobs_api.retrieve_data_meta(gt_job.id)

            assert (job_meta.start_frame, job_meta.stop_frame) == (segment_start, segment_stop)
            assert job_meta.frame_filter == getattr(task_spec, "frame_filter", "")

            segment_size = math.ceil((segment_stop - segment_start + 1) / task_spec.frame_step)
            assert job_meta.size == segment_size

            task_frame_set = set(
                range(job_meta.start_frame, job_meta.stop_frame + 1, task_spec.frame_step)
            )
            assert len(task_frame_set) == job_meta.size

            if getattr(task_spec, "chunk_size", None):
                assert job_meta.chunk_size == task_spec.chunk_size

            if task_spec.source_data_type == _SourceDataType.video:
                assert len(job_meta.frames) == 1
            else:
                assert len(job_meta.frames) == job_meta.size

    @pytest.mark.timeout(
        # This test has to check the job meta for all jobs, it can make many requests
        timeout=300
    )
    @parametrize("task_spec, task_id", _TestTasksBase._tasks_with_consensus_cases)
    def test_can_get_consensus_replica_job_meta(self, task_spec: _TaskSpec, task_id: int):
        with make_api_client(self._USERNAME) as api_client:
            jobs = sorted(
                get_paginated_collection(api_client.jobs_api.list_endpoint, task_id=task_id),
                key=lambda j: j.start_frame,
            )

            # Only annotation jobs can have replicas
            annotation_jobs = [j for j in jobs if j.type == "annotation"]
            assert (
                len([j for j in jobs if j.type == "consensus_replica"])
                == len(annotation_jobs) * task_spec.consensus_replicas
            )

            for job in annotation_jobs:
                annotation_job_meta = json.loads(
                    api_client.jobs_api.retrieve_data_meta(job.id)[1].data
                )

                replicas = [
                    j for j in jobs if j.type == "consensus_replica" if j.parent_job_id == job.id
                ]
                assert len(replicas) == task_spec.consensus_replicas

                for replica_job in replicas:
                    replica_job_meta = json.loads(
                        api_client.jobs_api.retrieve_data_meta(replica_job.id)[1].data
                    )
                    assert DeepDiff(annotation_job_meta, replica_job_meta) == {}

    @pytest.mark.timeout(
        # This test has to check all the job frames availability, it can make many requests
        timeout=300
    )
    @parametrize("task_spec, task_id", _TestTasksBase._all_task_cases)
    def test_can_get_job_frames(self, task_spec: _TaskSpec, task_id: int):
        with make_api_client(self._USERNAME) as api_client:
            jobs = sorted(
                get_paginated_collection(api_client.jobs_api.list_endpoint, task_id=task_id),
                key=lambda j: j.start_frame,
            )
            for job in jobs:
                (job_meta, _) = api_client.jobs_api.retrieve_data_meta(job.id)
                job_abs_frames = self._get_job_abs_frame_set(job_meta)

                for quality, (frame_pos, abs_frame_id) in product(
                    ["original", "compressed"],
                    enumerate(job_abs_frames),
                ):
                    rel_frame_id = (
                        abs_frame_id - getattr(task_spec, "start_frame", 0)
                    ) // task_spec.frame_step
                    (_, response) = api_client.jobs_api.retrieve_data(
                        job.id,
                        type="frame",
                        quality=quality,
                        number=rel_frame_id,
                        _parse_response=False,
                    )

                    if task_spec.source_data_type == _SourceDataType.video:
                        frame_size = (job_meta.frames[0].width, job_meta.frames[0].height)
                    else:
                        frame_size = (
                            job_meta.frames[frame_pos].width,
                            job_meta.frames[frame_pos].height,
                        )

                    frame = Image.open(io.BytesIO(response.data))
                    assert frame_size == frame.size

                    self._compare_images(
                        task_spec.read_frame(abs_frame_id),
                        frame,
                        must_be_identical=(
                            task_spec.source_data_type == _SourceDataType.images
                            and quality == "original"
                        ),
                    )

    @pytest.mark.timeout(
        # This test has to check all the job chunks availability, it can make many requests
        timeout=300
    )
    @parametrize("task_spec, task_id", _TestTasksBase._all_task_cases)
    @parametrize("indexing", ["absolute", "relative"])
    def test_can_get_job_chunks(self, task_spec: _TaskSpec, task_id: int, indexing: str):
        _placeholder_image = Image.fromarray(np.zeros((1, 1, 3), dtype=np.uint8))

        with make_api_client(self._USERNAME) as api_client:
            jobs = sorted(
                get_paginated_collection(api_client.jobs_api.list_endpoint, task_id=task_id),
                key=lambda j: j.start_frame,
            )

            (task_meta, _) = api_client.tasks_api.retrieve_data_meta(task_id)

            for job in jobs:
                (job_meta, _) = api_client.jobs_api.retrieve_data_meta(job.id)

                if job_meta.included_frames:
                    assert len(job_meta.included_frames) == job_meta.size

                if task_spec.source_data_type == _SourceDataType.images:
                    assert job.data_original_chunk_type == "imageset"
                    assert job.data_compressed_chunk_type == "imageset"
                elif task_spec.source_data_type == _SourceDataType.video:
                    assert job.data_original_chunk_type == "video"

                    if getattr(task_spec, "use_zip_chunks", False):
                        assert job.data_compressed_chunk_type == "imageset"
                    else:
                        assert job.data_compressed_chunk_type == "video"
                else:
                    assert False

                if indexing == "absolute":
                    chunk_count = math.ceil(task_meta.size / task_meta.chunk_size)

                    def get_task_chunk_abs_frame_ids(chunk_id: int) -> Sequence[int]:
                        return range(
                            task_meta.start_frame
                            + chunk_id * task_meta.chunk_size * task_spec.frame_step,
                            task_meta.start_frame
                            + min((chunk_id + 1) * task_meta.chunk_size, task_meta.size)
                            * task_spec.frame_step,
                            task_spec.frame_step,
                        )

                    def get_job_frame_ids() -> Sequence[int]:
                        return range(
                            job_meta.start_frame, job_meta.stop_frame + 1, task_spec.frame_step
                        )

                    def get_expected_chunk_abs_frame_ids(chunk_id: int):
                        return sorted(
                            set(get_task_chunk_abs_frame_ids(chunk_id)) & set(get_job_frame_ids())
                        )

                    job_chunk_ids = (
                        task_chunk_id
                        for task_chunk_id in range(chunk_count)
                        if get_expected_chunk_abs_frame_ids(task_chunk_id)
                    )
                else:
                    chunk_count = math.ceil(job_meta.size / job_meta.chunk_size)
                    job_chunk_ids = range(chunk_count)

                    def get_expected_chunk_abs_frame_ids(chunk_id: int):
                        job_abs_frames = self._get_job_abs_frame_set(job_meta)
                        return job_abs_frames[
                            chunk_id * job_meta.chunk_size : (chunk_id + 1) * job_meta.chunk_size
                        ]

                for quality, chunk_id in product(["original", "compressed"], job_chunk_ids):
                    expected_chunk_abs_frame_ids = get_expected_chunk_abs_frame_ids(chunk_id)

                    kwargs = {}
                    if indexing == "absolute":
                        kwargs["number"] = chunk_id
                    elif indexing == "relative":
                        kwargs["index"] = chunk_id
                    else:
                        assert False

                    (_, response) = api_client.jobs_api.retrieve_data(
                        job.id,
                        type="chunk",
                        quality=quality,
                        **kwargs,
                        _parse_response=False,
                    )

                    chunk_file = io.BytesIO(response.data)
                    if zipfile.is_zipfile(chunk_file):
                        with zipfile.ZipFile(chunk_file, "r") as chunk_archive:
                            chunk_images = {
                                int(os.path.splitext(name)[0]): np.array(
                                    Image.open(io.BytesIO(chunk_archive.read(name)))
                                )
                                for name in chunk_archive.namelist()
                            }
                            chunk_images = dict(sorted(chunk_images.items(), key=lambda e: e[0]))
                    else:
                        chunk_images = dict(enumerate(read_video_file(chunk_file)))

                    assert sorted(chunk_images.keys()) == list(
                        range(len(expected_chunk_abs_frame_ids))
                    )

                    for chunk_frame, abs_frame_id in zip(
                        chunk_images, expected_chunk_abs_frame_ids
                    ):
                        if (
                            indexing == "absolute"
                            and job_meta.included_frames
                            and abs_frame_id not in job_meta.included_frames
                        ):
                            expected_image = _placeholder_image
                        else:
                            expected_image = task_spec.read_frame(abs_frame_id)

                        self._compare_images(
                            expected_image,
                            chunk_images[chunk_frame],
                            must_be_identical=(
                                task_spec.source_data_type == _SourceDataType.images
                                and quality == "original"
                            ),
                        )


@pytest.mark.usefixtures("restore_db_per_function")
class TestPatchTaskLabel:
    def _get_task_labels(self, pid, user, **kwargs) -> list[models.Label]:
        kwargs.setdefault("return_json", True)
        with make_api_client(user) as api_client:
            return get_paginated_collection(
                api_client.labels_api.list_endpoint, task_id=pid, **kwargs
            )

    def test_can_delete_label(self, tasks_wlc, labels, admin_user):
        task = [t for t in tasks_wlc if t["project_id"] is None and t["labels"]["count"] > 0][0]
        label = deepcopy([l for l in labels if l.get("task_id") == task["id"]][0])
        label_payload = {"id": label["id"], "deleted": True}

        prev_lc = get_method(admin_user, "labels", task_id=task["id"]).json()["count"]
        response = patch_method(admin_user, f'tasks/{task["id"]}', {"labels": [label_payload]})
        curr_lc = get_method(admin_user, "labels", task_id=task["id"]).json()["count"]
        assert response.status_code == HTTPStatus.OK, response.content
        assert curr_lc == prev_lc - 1

    def test_can_delete_skeleton_label(self, tasks, labels, admin_user):
        task = next(
            t
            for t in tasks
            if any(
                label
                for label in labels
                if label.get("task_id") == t["id"]
                if label["type"] == "skeleton"
            )
        )
        task_labels = deepcopy([l for l in labels if l.get("task_id") == task["id"]])
        label = next(l for l in task_labels if l["type"] == "skeleton")
        task_labels.remove(label)
        label_payload = {"id": label["id"], "deleted": True}

        prev_lc = get_method(admin_user, "labels", task_id=task["id"]).json()["count"]
        response = patch_method(admin_user, f'tasks/{task["id"]}', {"labels": [label_payload]})
        curr_lc = get_method(admin_user, "labels", task_id=task["id"]).json()["count"]
        assert response.status_code == HTTPStatus.OK
        assert curr_lc == prev_lc - 1

        resulting_labels = self._get_task_labels(task["id"], admin_user)
        assert DeepDiff(resulting_labels, task_labels, ignore_order=True) == {}

    def test_can_rename_label(self, tasks_wlc, labels, admin_user):
        task = [t for t in tasks_wlc if t["project_id"] is None and t["labels"]["count"] > 0][0]
        task_labels = deepcopy([l for l in labels if l.get("task_id") == task["id"]])
        task_labels[0].update({"name": "new name"})

        response = patch_method(admin_user, f'tasks/{task["id"]}', {"labels": [task_labels[0]]})
        assert response.status_code == HTTPStatus.OK

        resulting_labels = self._get_task_labels(task["id"], admin_user)
        assert DeepDiff(resulting_labels, task_labels, ignore_order=True) == {}

    def test_cannot_rename_label_to_duplicate_name(self, tasks_wlc, labels, admin_user):
        task = [t for t in tasks_wlc if t["project_id"] is None and t["labels"]["count"] > 1][0]
        task_labels = deepcopy([l for l in labels if l.get("task_id") == task["id"]])
        task_labels[0].update({"name": task_labels[1]["name"]})

        label_payload = {"id": task_labels[0]["id"], "name": task_labels[0]["name"]}

        response = patch_method(admin_user, f'tasks/{task["id"]}', {"labels": [label_payload]})
        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert "All label names must be unique" in response.text

    def test_cannot_add_foreign_label(self, tasks, labels, admin_user):
        task = [t for t in tasks if t["project_id"] is None][0]
        new_label = deepcopy(
            [
                l
                for l in labels
                if l.get("task_id") != task["id"]
                if not l.get("project_id") or l.get("project_id") != task.get("project_id")
            ][0]
        )

        response = patch_method(admin_user, f'tasks/{task["id"]}', {"labels": [new_label]})
        assert response.status_code == HTTPStatus.NOT_FOUND
        assert f"Not found label with id #{new_label['id']} to change" in response.text

    def test_admin_can_add_label(self, tasks, admin_user):
        task = [t for t in tasks if t["project_id"] is None][0]
        new_label = {"name": "new name"}

        prev_lc = get_method(admin_user, "labels", task_id=task["id"]).json()["count"]
        response = patch_method(admin_user, f'tasks/{task["id"]}', {"labels": [new_label]})
        curr_lc = get_method(admin_user, "labels", task_id=task["id"]).json()["count"]
        assert response.status_code == HTTPStatus.OK
        assert curr_lc == prev_lc + 1

    @pytest.mark.parametrize("role", ["maintainer", "owner"])
    def test_non_task_staff_privileged_org_members_can_add_label(
        self,
        find_users,
        tasks,
        is_task_staff,
        is_org_member,
        role,
    ):
        users = find_users(role=role, exclude_privilege="admin")

        user, task = next(
            (user, task)
            for user, task in product(users, tasks)
            if not is_task_staff(user["id"], task["id"])
            and task["organization"]
            and is_org_member(user["id"], task["organization"] and task["project_id"] is None)
        )

        new_label = {"name": "new name"}
        prev_lc = get_method(user["username"], "labels", task_id=task["id"]).json()["count"]

        response = patch_method(
            user["username"],
            f'tasks/{task["id"]}',
            {"labels": [new_label]},
        )
        curr_lc = get_method(user["username"], "labels", task_id=task["id"]).json()["count"]
        assert response.status_code == HTTPStatus.OK
        assert curr_lc == prev_lc + 1

    @pytest.mark.parametrize("role", ["supervisor", "worker"])
    def test_non_task_staff_org_members_cannot_add_label(
        self,
        find_users,
        tasks,
        is_task_staff,
        is_org_member,
        role,
    ):
        users = find_users(exclude_privilege="admin")

        user, task = next(
            (user, task)
            for user, task in product(users, tasks)
            if not is_task_staff(user["id"], task["id"])
            and task["organization"]
            and is_org_member(user["id"], task["organization"], role=role)
        )

        new_label = {"name": "new name"}
        response = patch_method(
            user["username"],
            f'tasks/{task["id"]}',
            {"labels": [new_label]},
        )
        assert response.status_code == HTTPStatus.FORBIDDEN

    # TODO: add supervisor too, but this leads to a test-side problem with DB restoring
    @pytest.mark.parametrize("role", ["worker"])
    def test_task_staff_org_members_can_add_label(
        self, find_users, tasks, is_task_staff, is_org_member, labels, role
    ):
        users = find_users(role=role, exclude_privilege="admin")

        user, task = next(
            (user, task)
            for user, task in product(users, tasks)
            if is_task_staff(user["id"], task["id"])
            and task["organization"]
            and is_org_member(user["id"], task["organization"])
            and any(label.get("task_id") == task["id"] for label in labels)
        )

        prev_lc = get_method(user["username"], "labels", task_id=task["id"]).json()["count"]
        new_label = {"name": "new name"}
        response = patch_method(
            user["username"],
            f'tasks/{task["id"]}',
            {"labels": [new_label]},
        )
        curr_lc = get_method(user["username"], "labels", task_id=task["id"]).json()["count"]
        assert response.status_code == HTTPStatus.OK
        assert curr_lc == prev_lc + 1

    def test_admin_can_add_skeleton(self, tasks, admin_user):
        task = [t for t in tasks if t["project_id"] is None][0]
        new_skeleton = {
            "name": "new skeleton",
            "type": "skeleton",
            "sublabels": [
                {
                    "name": "1",
                    "type": "points",
                }
            ],
            "svg": '<circle r="1.5" stroke="black" fill="#b3b3b3" cx="48.794559478759766" '
            'cy="36.98698806762695" stroke-width="0.1" data-type="element node" '
            'data-element-id="1" data-node-id="1" data-label-name="597501"></circle>',
        }

        prev_lc = get_method(admin_user, "labels", task_id=task["id"]).json()["count"]
        response = patch_method(admin_user, f'tasks/{task["id"]}', {"labels": [new_skeleton]})
        curr_lc = get_method(admin_user, "labels", task_id=task["id"]).json()["count"]
        assert response.status_code == HTTPStatus.OK
        assert curr_lc == prev_lc + 1


@pytest.mark.usefixtures("restore_db_per_function")
@pytest.mark.usefixtures("restore_cvat_data_per_function")
@pytest.mark.usefixtures("restore_redis_ondisk_per_function")
@pytest.mark.usefixtures("restore_redis_inmem_per_function")
class TestWorkWithTask:
    _USERNAME = "admin1"

    @pytest.mark.with_external_services
    @pytest.mark.parametrize(
        "cloud_storage_id, manifest",
        [(1, "manifest.jsonl")],  # public bucket
    )
    def test_work_with_task_containing_non_stable_cloud_storage_files(
        self, cloud_storage_id, manifest, cloud_storages, request
    ):
        image_name = "image_case_65_1.png"
        cloud_storage_content = [image_name, manifest]

        task_spec = {
            "name": f"Task with mythical file from cloud storage {cloud_storage_id}",
            "labels": [{"name": "car"}],
        }

        data_spec = {
            "image_quality": 75,
            "use_cache": True,
            "cloud_storage_id": cloud_storage_id,
            "server_files": cloud_storage_content,
        }

        task_id, _ = create_task(self._USERNAME, task_spec, data_spec)

        # save image from the "public" bucket and remove it temporary
        bucket_name = cloud_storages[cloud_storage_id]["resource"]
        s3_client = s3.make_client(bucket=bucket_name)

        image = s3_client.download_fileobj(image_name)
        s3_client.remove_file(image_name)
        request.addfinalizer(partial(s3_client.create_file, filename=image_name, data=image))

        with make_api_client(self._USERNAME) as api_client:
            try:
                api_client.tasks_api.retrieve_data(
                    task_id, number=0, quality="original", type="frame"
                )
                raise AssertionError("Frame should not exist")
            except AssertionError:
                raise
            except Exception as ex:
                assert ex.status == HTTPStatus.NOT_FOUND
                assert image_name in ex.body


@pytest.mark.usefixtures("restore_redis_inmem_per_function")
@pytest.mark.usefixtures("restore_redis_ondisk_per_class")
@pytest.mark.usefixtures("restore_redis_ondisk_after_class")
class TestTaskBackups:
    @pytest.fixture(autouse=True)
    def setup(
        self,
        restore_db_per_function,
        restore_cvat_data_per_function,
        tmp_path: Path,
        admin_user: str,
    ):
        self.tmp_dir = tmp_path

        self.user = admin_user

        with make_sdk_client(self.user) as client:
            self.client = client

    @pytest.mark.parametrize("api_version", product((1, 2), repeat=2))
    @pytest.mark.parametrize(
        "local_download", (True, pytest.param(False, marks=pytest.mark.with_external_services))
    )
    def test_can_export_backup_with_both_api_versions(
        self, filter_tasks, api_version: tuple[int], local_download: bool
    ):
        task = filter_tasks(
            **{("exclude_" if local_download else "") + "target_storage__location": "cloud_storage"}
        )[0]
        backup = export_task_backup(self.user, api_version, id=task["id"])

        if local_download:
            assert zipfile.is_zipfile(io.BytesIO(backup))
        else:
            assert backup is None

    def _test_can_export_backup(self, task_id: int):
        task = self.client.tasks.retrieve(task_id)

        filename = self.tmp_dir / f"task_{task.id}_backup.zip"
        task.download_backup(filename)

        assert filename.is_file()
        assert filename.stat().st_size > 0

    @pytest.mark.parametrize("mode", ["annotation", "interpolation"])
    def test_can_export_backup(self, tasks, mode):
        task_id = next(t for t in tasks if t["mode"] == mode and not t["validation_mode"])["id"]
        self._test_can_export_backup(task_id)

    def test_can_export_backup_for_consensus_task(self, tasks):
        task_id = next(t for t in tasks if t["consensus_enabled"])["id"]
        self._test_can_export_backup(task_id)

    def test_can_export_backup_for_honeypot_task(self, tasks):
        task_id = next(t for t in tasks if t["validation_mode"] == "gt_pool")["id"]
        self._test_can_export_backup(task_id)

    def test_cannot_export_backup_for_task_without_data(self, tasks):
        task_id = next(t for t in tasks if t["jobs"]["count"] == 0)["id"]

        with pytest.raises(ApiException) as exc:
            self._test_can_export_backup(task_id)

            assert exc.status == HTTPStatus.BAD_REQUEST
            assert "Backup of a task without data is not allowed" == exc.body.encode()

    @pytest.mark.parametrize("mode", ["annotation", "interpolation"])
    def test_can_import_backup(self, tasks, mode):
        task_id = next(t for t in tasks if t["mode"] == mode)["id"]
        self._test_can_restore_task_from_backup(task_id)

    def test_can_import_backup_with_honeypot_task(self, tasks):
        task_id = next(t for t in tasks if t["validation_mode"] == "gt_pool")["id"]
        self._test_can_restore_task_from_backup(task_id)

    def test_can_import_backup_with_consensus_task(self, tasks):
        task_id = next(t for t in tasks if t["consensus_enabled"])["id"]
        self._test_can_restore_task_from_backup(task_id)

    @pytest.mark.parametrize("mode", ["annotation", "interpolation"])
    def test_can_import_backup_for_task_in_nondefault_state(self, tasks, mode):
        # Reproduces the problem with empty 'mode' in a restored task,
        # described in the reproduction steps https://github.com/cvat-ai/cvat/issues/5668

        task_json = next(t for t in tasks if t["mode"] == mode and t["jobs"]["count"])

        task = self.client.tasks.retrieve(task_json["id"])
        jobs = task.get_jobs()
        for j in jobs:
            j.update({"stage": "validation"})

        self._test_can_restore_task_from_backup(task_json["id"])

    def test_can_import_backup_with_gt_job(self, tasks, jobs, job_has_annotations):
        gt_job = next(
            j
            for j in jobs
            if j["type"] == "ground_truth"
            if job_has_annotations(j["id"])
            if tasks[j["task_id"]]["validation_mode"] == "gt"
            if tasks[j["task_id"]]["size"]
        )
        task = tasks[gt_job["task_id"]]

        self._test_can_restore_task_from_backup(task["id"])

    def _test_can_restore_task_from_backup(self, task_id: int):
        old_task = self.client.tasks.retrieve(task_id)
        (_, response) = self.client.api_client.tasks_api.retrieve(task_id)
        task_json = json.loads(response.data)

        filename = self.tmp_dir / f"task_{old_task.id}_backup.zip"
        old_task.download_backup(filename)

        new_task = self.client.tasks.create_from_backup(filename)

        old_meta = json.loads(old_task.api.retrieve_data_meta(old_task.id)[1].data)
        new_meta = json.loads(new_task.api.retrieve_data_meta(new_task.id)[1].data)
        assert (
            DeepDiff(
                old_meta,
                new_meta,
                ignore_order=True,
                exclude_regex_paths=[r"root\['chunks_updated_date'\]"],  # must be different
            )
            == {}
        )

        old_jobs = sorted(old_task.get_jobs(), key=lambda j: (j.start_frame, j.type))
        new_jobs = sorted(new_task.get_jobs(), key=lambda j: (j.start_frame, j.type))
        assert len(old_jobs) == len(new_jobs)

        for old_job, new_job in zip(old_jobs, new_jobs):
            old_job_meta = json.loads(old_job.api.retrieve_data_meta(old_job.id)[1].data)
            new_job_meta = json.loads(new_job.api.retrieve_data_meta(new_job.id)[1].data)
            assert (
                DeepDiff(
                    old_job_meta,
                    new_job_meta,
                    ignore_order=True,
                    exclude_regex_paths=[r"root\['chunks_updated_date'\]"],  # must be different
                )
                == {}
            )

            old_job_annotations = json.loads(old_job.api.retrieve_annotations(old_job.id)[1].data)
            new_job_annotations = json.loads(new_job.api.retrieve_annotations(new_job.id)[1].data)
            assert compare_annotations(old_job_annotations, new_job_annotations) == {}

        (_, response) = self.client.api_client.tasks_api.retrieve(new_task.id)
        restored_task_json = json.loads(response.data)

        assert restored_task_json["assignee"] is None
        assert restored_task_json["owner"]["username"] == self.user
        assert restored_task_json["id"] != task_json["id"]
        assert restored_task_json["data"] != task_json["data"]
        assert restored_task_json["organization"] is None
        assert restored_task_json["data_compressed_chunk_type"] in ["imageset", "video"]
        if task_json["jobs"]["count"] == 1:
            assert restored_task_json["overlap"] == 0
        else:
            assert restored_task_json["overlap"] == task_json["overlap"]
        assert restored_task_json["jobs"]["completed"] == 0
        assert restored_task_json["jobs"]["validation"] == 0
        assert restored_task_json["source_storage"] is None
        assert restored_task_json["target_storage"] is None
        assert restored_task_json["project_id"] is None

        assert (
            DeepDiff(
                task_json,
                restored_task_json,
                ignore_order=True,
                exclude_regex_paths=[
                    r"root\['id'\]",  # id, must be different
                    r"root\['created_date'\]",  # must be different
                    r"root\['updated_date'\]",  # must be different
                    r"root\['assignee'\]",  # id, depends on the situation
                    r"root\['owner'\]",  # id, depends on the situation
                    r"root\['data'\]",  # id, must be different
                    r"root\['organization'\]",  # depends on the task setup
                    r"root\['project_id'\]",  # should be dropped
                    r"root(\['.*'\])*\['url'\]",  # depends on the task id
                    r"root\['data_compressed_chunk_type'\]",  # depends on the server configuration
                    r"root\['source_storage'\]",  # should be dropped
                    r"root\['target_storage'\]",  # should be dropped
                    r"root\['jobs'\]\['completed'\]",  # job statuses should be renewed
                    r"root\['jobs'\]\['validation'\]",  # job statuses should be renewed
                    r"root\['status'\]",  # task status should be renewed
                    # depends on the actual job configuration,
                    # unlike to what is obtained from the regular task creation,
                    # where the requested number is recorded
                    r"root\['overlap'\]",
                ],
            )
            == {}
        )

        old_task_annotations = json.loads(old_task.api.retrieve_annotations(old_task.id)[1].data)
        new_task_annotations = json.loads(new_task.api.retrieve_annotations(new_task.id)[1].data)
        assert compare_annotations(old_task_annotations, new_task_annotations) == {}


@pytest.mark.usefixtures("restore_db_per_function")
class TestWorkWithSimpleGtJobTasks:
    @fixture
    def fxt_task_with_gt_job(
        self, tasks, jobs, job_has_annotations
    ) -> Generator[dict[str, Any], None, None]:
        gt_job = next(
            j
            for j in jobs
            if j["type"] == "ground_truth"
            if job_has_annotations(j["id"])
            if tasks[j["task_id"]]["validation_mode"] == "gt"
            if tasks[j["task_id"]]["size"]
        )

        task = tasks[gt_job["task_id"]]

        annotation_jobs = sorted(
            [j for j in jobs if j["task_id"] == task["id"] if j["id"] != gt_job["id"]],
            key=lambda j: j["start_frame"],
        )

        yield task, gt_job, annotation_jobs

    @parametrize("task, gt_job, annotation_jobs", [fixture_ref(fxt_task_with_gt_job)])
    def test_gt_job_annotations_are_not_present_in_task_annotation_export(
        self, tmp_path, admin_user, task, gt_job, annotation_jobs
    ):
        with make_sdk_client(admin_user) as client:
            for j in annotation_jobs:
                client.jobs.retrieve(j["id"]).remove_annotations()

            task_obj = client.tasks.retrieve(task["id"])
            task_raw_annotations = task_obj.get_annotations()

            # It's quite hard to parse the dataset files, just import the data back instead
            dataset_format = "CVAT for images 1.1"

            dataset_file = tmp_path / "dataset.zip"
            task_obj.export_dataset(dataset_format, dataset_file, include_images=True)
            task_obj.import_annotations("CVAT 1.1", dataset_file)
            task_dataset_file_annotations = task_obj.get_annotations()

            annotations_file = tmp_path / "annotations.zip"
            task_obj.export_dataset(dataset_format, annotations_file, include_images=False)
            task_obj.import_annotations("CVAT 1.1", annotations_file)
            task_annotations_file_annotations = task_obj.get_annotations()

        for annotation_source in [
            task_raw_annotations,
            task_dataset_file_annotations,
            task_annotations_file_annotations,
        ]:
            assert not annotation_source.tags
            assert not annotation_source.shapes
            assert not annotation_source.tracks

    @parametrize("task, gt_job, annotation_jobs", [fixture_ref(fxt_task_with_gt_job)])
    def test_can_exclude_and_restore_gt_frames_via_gt_job_meta(
        self, admin_user, task, gt_job, annotation_jobs
    ):
        with make_api_client(admin_user) as api_client:
            task_meta, _ = api_client.tasks_api.retrieve_data_meta(task["id"])
            gt_job_meta, _ = api_client.jobs_api.retrieve_data_meta(gt_job["id"])
            frame_step = parse_frame_step(task_meta.frame_filter)

            for deleted_gt_frames in [
                [i]
                for i in range(gt_job_meta["start_frame"], gt_job["stop_frame"] + 1)
                if gt_job_meta.start_frame + i * frame_step in gt_job_meta.included_frames
            ] + [[]]:
                updated_gt_job_meta, _ = api_client.jobs_api.partial_update_data_meta(
                    gt_job["id"],
                    patched_job_data_meta_write_request=models.PatchedJobDataMetaWriteRequest(
                        deleted_frames=deleted_gt_frames
                    ),
                )

                assert updated_gt_job_meta.deleted_frames == deleted_gt_frames

                # the excluded GT frames must be excluded only from the GT job
                updated_task_meta, _ = api_client.tasks_api.retrieve_data_meta(task["id"])
                assert updated_task_meta.deleted_frames == []

                for j in annotation_jobs:
                    updated_job_meta, _ = api_client.jobs_api.retrieve_data_meta(j["id"])
                    assert updated_job_meta.deleted_frames == []

    @parametrize("task, gt_job, annotation_jobs", [fixture_ref(fxt_task_with_gt_job)])
    def test_can_delete_gt_frames_by_changing_job_meta_in_owning_annotation_job(
        self, admin_user, task, gt_job, annotation_jobs
    ):
        with make_api_client(admin_user) as api_client:
            task_meta, _ = api_client.tasks_api.retrieve_data_meta(task["id"])
            gt_job_meta, _ = api_client.jobs_api.retrieve_data_meta(gt_job["id"])
            frame_step = parse_frame_step(task_meta.frame_filter)

            gt_frames = [
                (f - gt_job_meta.start_frame) // frame_step for f in gt_job_meta.included_frames
            ]
            deleted_gt_frame = gt_frames[0]

            annotation_job = next(
                j
                for j in annotation_jobs
                if j["start_frame"] <= deleted_gt_frame <= j["stop_frame"]
            )
            api_client.jobs_api.partial_update_data_meta(
                annotation_job["id"],
                patched_job_data_meta_write_request=models.PatchedJobDataMetaWriteRequest(
                    deleted_frames=[deleted_gt_frame]
                ),
            )

            # in this case deleted frames are deleted everywhere
            updated_gt_job_meta, _ = api_client.jobs_api.retrieve_data_meta(gt_job["id"])
            assert updated_gt_job_meta.deleted_frames == [deleted_gt_frame]

            updated_task_meta, _ = api_client.tasks_api.retrieve_data_meta(task["id"])
            assert updated_task_meta.deleted_frames == [deleted_gt_frame]


@pytest.mark.usefixtures("restore_db_per_function")
class TestWorkWithHoneypotTasks:
    @fixture
    def fxt_task_with_honeypots(
        self, tasks, jobs, job_has_annotations
    ) -> Generator[dict[str, Any], None, None]:
        gt_job = next(
            j
            for j in jobs
            if j["type"] == "ground_truth"
            if j["frame_count"] >= 4
            if job_has_annotations(j["id"])
            if tasks[j["task_id"]]["validation_mode"] == "gt_pool"
            if tasks[j["task_id"]]["size"]
        )

        task = tasks[gt_job["task_id"]]

        annotation_jobs = sorted(
            [j for j in jobs if j["task_id"] == task["id"] if j["id"] != gt_job["id"]],
            key=lambda j: j["start_frame"],
        )

        yield task, gt_job, annotation_jobs

    @parametrize("task, gt_job, annotation_jobs", [fixture_ref(fxt_task_with_honeypots)])
    def test_gt_job_annotations_are_present_in_task_annotation_export(
        self, tmp_path, admin_user, task, gt_job, annotation_jobs
    ):
        with make_sdk_client(admin_user) as client:
            for j in annotation_jobs:
                client.jobs.retrieve(j["id"]).remove_annotations()

            task_obj = client.tasks.retrieve(task["id"])
            task_raw_annotations = json.loads(task_obj.api.retrieve_annotations(task["id"])[1].data)

            # It's quite hard to parse the dataset files, just import the data back instead
            dataset_format = "CVAT for images 1.1"

            dataset_file = tmp_path / "dataset.zip"
            task_obj.export_dataset(dataset_format, dataset_file, include_images=True)
            task_obj.import_annotations("CVAT 1.1", dataset_file)
            task_dataset_file_annotations = json.loads(
                task_obj.api.retrieve_annotations(task["id"])[1].data
            )

            annotations_file = tmp_path / "annotations.zip"
            task_obj.export_dataset(dataset_format, annotations_file, include_images=False)
            task_obj.import_annotations("CVAT 1.1", annotations_file)
            task_annotations_file_annotations = json.loads(
                task_obj.api.retrieve_annotations(task["id"])[1].data
            )

        # there will be other annotations after uploading into a honeypot task,
        # we need to compare only the validation frames in this test
        validation_frames = range(gt_job["start_frame"], gt_job["stop_frame"] + 1)
        for anns in [
            task_raw_annotations,
            task_dataset_file_annotations,
            task_annotations_file_annotations,
        ]:
            anns["tags"] = [t for t in anns["tags"] if t["frame"] in validation_frames]
            anns["shapes"] = [t for t in anns["shapes"] if t["frame"] in validation_frames]

        assert task_raw_annotations["tags"] or task_raw_annotations["shapes"]
        assert not task_raw_annotations["tracks"]  # tracks are prohibited in such tasks
        assert compare_annotations(task_raw_annotations, task_dataset_file_annotations) == {}
        assert compare_annotations(task_raw_annotations, task_annotations_file_annotations) == {}

    @parametrize("task, gt_job, annotation_jobs", [fixture_ref(fxt_task_with_honeypots)])
    @pytest.mark.parametrize("dataset_format", ["CVAT for images 1.1", "Datumaro 1.0"])
    def test_placeholder_frames_are_not_present_in_task_annotation_export(
        self, tmp_path, admin_user, task, gt_job, annotation_jobs, dataset_format
    ):
        with make_sdk_client(admin_user) as client:
            for j in annotation_jobs:
                client.jobs.retrieve(j["id"]).remove_annotations()

            task_obj = client.tasks.retrieve(task["id"])

            dataset_file = tmp_path / "dataset.zip"
            task_obj.export_dataset(dataset_format, dataset_file, include_images=True)

            task_meta = task_obj.get_meta()

        task_frame_names = [frame.name for frame in task_meta.frames]
        gt_frame_ids = range(gt_job["start_frame"], gt_job["stop_frame"] + 1)
        gt_frame_names = [task_frame_names[i] for i in gt_frame_ids]

        frame_step = parse_frame_step(task_meta.frame_filter)
        expected_frames = [
            (task_meta.start_frame + frame * frame_step, name)
            for frame, name in enumerate(task_frame_names)
            if frame in gt_frame_ids or name not in gt_frame_names
        ]

        with zipfile.ZipFile(dataset_file, "r") as archive:
            if dataset_format == "CVAT for images 1.1":
                annotations = archive.read("annotations.xml").decode()
                matches = re.findall(r'<image id="(\d+)" name="([^"]+)"', annotations, re.MULTILINE)
                assert sorted((int(match[0]), match[1]) for match in matches) == sorted(
                    expected_frames
                )
            elif dataset_format == "Datumaro 1.0":
                with archive.open("annotations/default.json", "r") as annotation_file:
                    annotations = json.load(annotation_file)

                assert sorted(
                    (int(item["attr"]["frame"]), item["id"]) for item in annotations["items"]
                ) == sorted((frame, os.path.splitext(name)[0]) for frame, name in expected_frames)
            else:
                assert False

    @parametrize("task, gt_job, annotation_jobs", [fixture_ref(fxt_task_with_honeypots)])
    @parametrize("method", ["gt_job_meta", "task_validation_layout"])
    def test_can_exclude_and_restore_gt_frames(
        self, admin_user, task, gt_job, annotation_jobs, method: str
    ):
        with make_api_client(admin_user) as api_client:
            task_meta, _ = api_client.tasks_api.retrieve_data_meta(task["id"])
            task_frames = [f.name for f in task_meta.frames]

            for deleted_gt_frames in [
                [v] for v in range(gt_job["start_frame"], gt_job["stop_frame"] + 1)[:2]
            ] + [[]]:
                if method == "gt_job_meta":
                    api_client.jobs_api.partial_update_data_meta(
                        gt_job["id"],
                        patched_job_data_meta_write_request=models.PatchedJobDataMetaWriteRequest(
                            deleted_frames=deleted_gt_frames
                        ),
                    )
                elif method == "task_validation_layout":
                    api_client.tasks_api.partial_update_validation_layout(
                        task["id"],
                        patched_task_validation_layout_write_request=(
                            models.PatchedTaskValidationLayoutWriteRequest(
                                disabled_frames=deleted_gt_frames
                            )
                        ),
                    )
                else:
                    assert False

                updated_validation_layout, _ = api_client.tasks_api.retrieve_validation_layout(
                    task["id"]
                )
                assert updated_validation_layout.disabled_frames == deleted_gt_frames

                updated_gt_job_meta, _ = api_client.jobs_api.retrieve_data_meta(gt_job["id"])
                assert updated_gt_job_meta.deleted_frames == deleted_gt_frames

                # the excluded GT frames must be excluded from all the jobs with the same frame
                deleted_frame_names = [task_frames[i] for i in deleted_gt_frames]
                updated_task_meta, _ = api_client.tasks_api.retrieve_data_meta(task["id"])
                assert (
                    sorted(i for i, f in enumerate(task_frames) if f in deleted_frame_names)
                    == updated_task_meta.deleted_frames
                )

                for j in annotation_jobs:
                    deleted_job_frames = [
                        i
                        for i in updated_task_meta.deleted_frames
                        if j["start_frame"] <= i <= j["stop_frame"]
                    ]

                    updated_job_meta, _ = api_client.jobs_api.retrieve_data_meta(j["id"])
                    assert deleted_job_frames == updated_job_meta.deleted_frames

    @parametrize("task, gt_job, annotation_jobs", [fixture_ref(fxt_task_with_honeypots)])
    def test_can_delete_honeypot_frames_by_changing_job_meta_in_annotation_job(
        self, admin_user, task, gt_job, annotation_jobs
    ):
        with make_api_client(admin_user) as api_client:
            task_meta, _ = api_client.tasks_api.retrieve_data_meta(task["id"])

            task_frame_names = [frame.name for frame in task_meta.frames]
            gt_frame_ids = range(gt_job["start_frame"], gt_job["stop_frame"] + 1)
            gt_frame_names = [task_frame_names[i] for i in gt_frame_ids]

            honeypot_frame_ids = [
                i for i, f in enumerate(task_meta.frames) if f.name in gt_frame_names
            ]
            deleted_honeypot_frame = honeypot_frame_ids[0]

            annotation_job_with_honeypot = next(
                j
                for j in annotation_jobs
                if j["start_frame"] <= deleted_honeypot_frame <= j["stop_frame"]
            )
            api_client.jobs_api.partial_update_data_meta(
                annotation_job_with_honeypot["id"],
                patched_job_data_meta_write_request=models.PatchedJobDataMetaWriteRequest(
                    deleted_frames=[deleted_honeypot_frame]
                ),
            )

            updated_gt_job_meta, _ = api_client.jobs_api.retrieve_data_meta(gt_job["id"])
            assert updated_gt_job_meta.deleted_frames == []  # must not be affected

            updated_task_meta, _ = api_client.tasks_api.retrieve_data_meta(task["id"])
            assert updated_task_meta.deleted_frames == [deleted_honeypot_frame]  # must be affected

    @parametrize("task, gt_job, annotation_jobs", [fixture_ref(fxt_task_with_honeypots)])
    def test_can_restore_gt_frames_via_task_meta_only_if_all_frames_are_restored(
        self, admin_user, task, gt_job, annotation_jobs
    ):
        assert gt_job["stop_frame"] - gt_job["start_frame"] + 1 >= 2

        with make_api_client(admin_user) as api_client:
            api_client.jobs_api.partial_update_data_meta(
                gt_job["id"],
                patched_job_data_meta_write_request=models.PatchedJobDataMetaWriteRequest(
                    deleted_frames=[gt_job["start_frame"]]
                ),
            )

            _, response = api_client.tasks_api.partial_update_data_meta(
                task["id"],
                patched_data_meta_write_request=models.PatchedDataMetaWriteRequest(
                    deleted_frames=[gt_job["start_frame"], gt_job["start_frame"] + 1]
                ),
                _parse_response=False,
                _check_status=False,
            )
            assert response.status == HTTPStatus.BAD_REQUEST
            assert b"GT frames can only be deleted" in response.data

            updated_task_meta, _ = api_client.tasks_api.partial_update_data_meta(
                task["id"],
                patched_data_meta_write_request=models.PatchedDataMetaWriteRequest(
                    deleted_frames=[]
                ),
            )
            assert updated_task_meta.deleted_frames == []

    @parametrize("task, gt_job, annotation_jobs", [fixture_ref(fxt_task_with_honeypots)])
    @parametrize("frame_selection_method", ["manual", "random_uniform"])
    def test_can_change_honeypot_frames_in_task(
        self, admin_user, task, gt_job, annotation_jobs, frame_selection_method: str
    ):
        assert gt_job["stop_frame"] - gt_job["start_frame"] + 1 >= 2

        with make_api_client(admin_user) as api_client:
            gt_frame_set = range(gt_job["start_frame"], gt_job["stop_frame"] + 1)
            old_validation_layout = json.loads(
                api_client.tasks_api.retrieve_validation_layout(task["id"])[1].data
            )

            api_client.tasks_api.partial_update_validation_layout(
                task["id"],
                patched_task_validation_layout_write_request=models.PatchedTaskValidationLayoutWriteRequest(
                    frame_selection_method="manual",
                    honeypot_real_frames=old_validation_layout["honeypot_count"]
                    * [gt_frame_set[0]],
                ),
            )

            params = {"frame_selection_method": frame_selection_method}

            if frame_selection_method == "manual":
                requested_honeypot_real_frames = [
                    gt_frame_set[(old_real_frame + 1) % len(gt_frame_set)]
                    for old_real_frame in old_validation_layout["honeypot_real_frames"]
                ]

                params["honeypot_real_frames"] = requested_honeypot_real_frames

            new_validation_layout = json.loads(
                api_client.tasks_api.partial_update_validation_layout(
                    task["id"],
                    patched_task_validation_layout_write_request=(
                        models.PatchedTaskValidationLayoutWriteRequest(**params)
                    ),
                )[1].data
            )

            new_honeypot_real_frames = new_validation_layout["honeypot_real_frames"]

            assert old_validation_layout["honeypot_count"] == len(new_honeypot_real_frames)
            assert all(f in gt_frame_set for f in new_honeypot_real_frames)

            if frame_selection_method == "manual":
                assert new_honeypot_real_frames == requested_honeypot_real_frames
            elif frame_selection_method == "random_uniform":
                # Test distribution
                validation_frame_counts = count_frame_uses(
                    new_honeypot_real_frames,
                    included_frames=new_validation_layout["validation_frames"],
                )
                assert max(validation_frame_counts.values()) <= 1 + min(
                    validation_frame_counts.values()
                )

            assert (
                DeepDiff(
                    old_validation_layout,
                    new_validation_layout,
                    exclude_regex_paths=[r"root\['honeypot_real_frames'\]\[\d+\]"],
                )
                == {}
            )

    @parametrize("task, gt_job, annotation_jobs", [fixture_ref(fxt_task_with_honeypots)])
    @parametrize("frame_selection_method", ["manual", "random_uniform"])
    def test_can_change_honeypot_frames_in_task_can_only_select_from_active_validation_frames(
        self, admin_user, task, gt_job, annotation_jobs, frame_selection_method: str
    ):
        assert gt_job["stop_frame"] - gt_job["start_frame"] + 1 >= 2

        with make_api_client(admin_user) as api_client:
            old_validation_layout = json.loads(
                api_client.tasks_api.retrieve_validation_layout(task["id"])[1].data
            )

            honeypots_per_job = old_validation_layout["frames_per_job_count"]

            gt_frame_set = range(gt_job["start_frame"], gt_job["stop_frame"] + 1)
            active_gt_set = gt_frame_set[:honeypots_per_job]

            api_client.tasks_api.partial_update_validation_layout(
                task["id"],
                patched_task_validation_layout_write_request=models.PatchedTaskValidationLayoutWriteRequest(
                    disabled_frames=[f for f in gt_frame_set if f not in active_gt_set],
                    frame_selection_method="manual",
                    honeypot_real_frames=old_validation_layout["honeypot_count"]
                    * [active_gt_set[0]],
                ),
            )

            params = {"frame_selection_method": frame_selection_method}

            if frame_selection_method == "manual":
                requested_honeypot_real_frames = [
                    active_gt_set[(old_real_frame + 1) % len(active_gt_set)]
                    for old_real_frame in old_validation_layout["honeypot_real_frames"]
                ]

                params["honeypot_real_frames"] = requested_honeypot_real_frames

                _, response = api_client.tasks_api.partial_update_validation_layout(
                    task["id"],
                    patched_task_validation_layout_write_request=(
                        models.PatchedTaskValidationLayoutWriteRequest(
                            frame_selection_method="manual",
                            honeypot_real_frames=[
                                next(f for f in gt_frame_set if f not in active_gt_set)
                            ]
                            * old_validation_layout["honeypot_count"],
                        )
                    ),
                    _parse_response=False,
                    _check_status=False,
                )
                assert response.status == HTTPStatus.BAD_REQUEST
                assert b"are disabled. Restore them" in response.data

            new_validation_layout = json.loads(
                api_client.tasks_api.partial_update_validation_layout(
                    task["id"],
                    patched_task_validation_layout_write_request=(
                        models.PatchedTaskValidationLayoutWriteRequest(**params)
                    ),
                )[1].data
            )

            new_honeypot_real_frames = new_validation_layout["honeypot_real_frames"]

            assert old_validation_layout["honeypot_count"] == len(new_honeypot_real_frames)
            assert all([f in active_gt_set for f in new_honeypot_real_frames])

            if frame_selection_method == "manual":
                assert new_honeypot_real_frames == requested_honeypot_real_frames
            else:
                assert all(
                    [
                        honeypots_per_job
                        == len(
                            set(
                                new_honeypot_real_frames[
                                    j * honeypots_per_job : (j + 1) * honeypots_per_job
                                ]
                            )
                        )
                        for j in range(len(annotation_jobs))
                    ]
                ), new_honeypot_real_frames

                # Test distribution
                validation_frame_counts = count_frame_uses(
                    new_honeypot_real_frames, included_frames=active_gt_set
                )
                assert max(validation_frame_counts.values()) <= 1 + min(
                    validation_frame_counts.values()
                )

    @parametrize("task, gt_job, annotation_jobs", [fixture_ref(fxt_task_with_honeypots)])
    @parametrize("frame_selection_method", ["manual", "random_uniform"])
    def test_can_restore_and_change_honeypot_frames_in_task_in_the_same_request(
        self, admin_user, task, gt_job, annotation_jobs, frame_selection_method: str
    ):
        assert gt_job["stop_frame"] - gt_job["start_frame"] + 1 >= 2

        with make_api_client(admin_user) as api_client:
            old_validation_layout = json.loads(
                api_client.tasks_api.retrieve_validation_layout(task["id"])[1].data
            )

            honeypots_per_job = old_validation_layout["frames_per_job_count"]

            gt_frame_set = range(gt_job["start_frame"], gt_job["stop_frame"] + 1)
            active_gt_set = gt_frame_set[:honeypots_per_job]

            api_client.tasks_api.partial_update_validation_layout(
                task["id"],
                patched_task_validation_layout_write_request=models.PatchedTaskValidationLayoutWriteRequest(
                    disabled_frames=[f for f in gt_frame_set if f not in active_gt_set],
                    frame_selection_method="manual",
                    honeypot_real_frames=old_validation_layout["honeypot_count"]
                    * [active_gt_set[0]],
                ),
            )

            active_gt_set = gt_frame_set

            params = {
                "frame_selection_method": frame_selection_method,
                "disabled_frames": [],  # restore all validation frames
            }

            if frame_selection_method == "manual":
                requested_honeypot_real_frames = [
                    active_gt_set[(old_real_frame + 1) % len(active_gt_set)]
                    for old_real_frame in old_validation_layout["honeypot_real_frames"]
                ]

                params["honeypot_real_frames"] = requested_honeypot_real_frames

            new_validation_layout = json.loads(
                api_client.tasks_api.partial_update_validation_layout(
                    task["id"],
                    patched_task_validation_layout_write_request=(
                        models.PatchedTaskValidationLayoutWriteRequest(**params)
                    ),
                )[1].data
            )

            new_honeypot_real_frames = new_validation_layout["honeypot_real_frames"]

            assert old_validation_layout["honeypot_count"] == len(new_honeypot_real_frames)
            assert sorted(new_validation_layout["disabled_frames"]) == sorted(
                params["disabled_frames"]
            )

            if frame_selection_method == "manual":
                assert new_honeypot_real_frames == requested_honeypot_real_frames
            else:
                assert all(
                    [
                        honeypots_per_job
                        == len(
                            set(
                                new_honeypot_real_frames[
                                    j * honeypots_per_job : (j + 1) * honeypots_per_job
                                ]
                            )
                        )
                    ]
                    for j in range(len(annotation_jobs))
                ), new_honeypot_real_frames

                # Test distribution
                validation_frame_counts = count_frame_uses(
                    new_honeypot_real_frames, included_frames=active_gt_set
                )
                assert max(validation_frame_counts.values()) <= 1 + min(
                    validation_frame_counts.values()
                )

    @parametrize("task, gt_job, annotation_jobs", [fixture_ref(fxt_task_with_honeypots)])
    @parametrize("frame_selection_method", ["manual", "random_uniform"])
    def test_can_change_honeypot_frames_in_annotation_jobs(
        self, admin_user, task, gt_job, annotation_jobs, frame_selection_method: str
    ):
        _MAX_RANDOM_ATTEMPTS = 20  # This test can have random outcomes, it's expected

        assert gt_job["stop_frame"] - gt_job["start_frame"] + 1 >= 2

        with make_api_client(admin_user) as api_client:
            gt_frame_set = range(gt_job["start_frame"], gt_job["stop_frame"] + 1)

            for annotation_job in annotation_jobs:
                old_validation_layout = json.loads(
                    api_client.jobs_api.retrieve_validation_layout(annotation_job["id"])[1].data
                )
                old_job_meta, _ = api_client.jobs_api.retrieve_data_meta(annotation_job["id"])

                params = {"frame_selection_method": frame_selection_method}

                if frame_selection_method == "manual":
                    requested_honeypot_real_frames = [
                        gt_frame_set[(gt_frame_set.index(old_real_frame) + 1) % len(gt_frame_set)]
                        for old_real_frame in old_validation_layout["honeypot_real_frames"]
                    ]

                    params["honeypot_real_frames"] = requested_honeypot_real_frames

                attempt = 0
                while attempt < _MAX_RANDOM_ATTEMPTS:
                    new_validation_layout = json.loads(
                        api_client.jobs_api.partial_update_validation_layout(
                            annotation_job["id"],
                            patched_job_validation_layout_write_request=(
                                models.PatchedJobValidationLayoutWriteRequest(**params)
                            ),
                        )[1].data
                    )

                    new_honeypot_real_frames = new_validation_layout["honeypot_real_frames"]

                    if (
                        frame_selection_method == "random_uniform"
                        and new_honeypot_real_frames
                        == old_validation_layout["honeypot_real_frames"]
                    ):
                        attempt += 1
                        # The test is fully random, it's possible to get no changes in the updated
                        # honeypots. Passing a random seed has little sense in this endpoint,
                        # so we retry several times in such a case instead.
                    else:
                        break

                if attempt >= _MAX_RANDOM_ATTEMPTS and frame_selection_method == "random_uniform":
                    # The situation is unlikely if everything works, so we consider it a fail
                    pytest.fail(f"too many attempts ({attempt}) with random honeypot updating")

                assert old_validation_layout["honeypot_count"] == len(new_honeypot_real_frames)
                assert all(f in gt_frame_set for f in new_honeypot_real_frames)

                if frame_selection_method == "manual":
                    assert new_honeypot_real_frames == requested_honeypot_real_frames

                assert (
                    DeepDiff(
                        old_validation_layout,
                        new_validation_layout,
                        exclude_regex_paths=[r"root\['honeypot_real_frames'\]\[\d+\]"],
                    )
                    == {}
                )

                new_job_meta, _ = api_client.jobs_api.retrieve_data_meta(annotation_job["id"])
                assert new_job_meta.chunks_updated_date > old_job_meta.chunks_updated_date


@pytest.mark.usefixtures("restore_db_per_function")
class TestWorkWithConsensusTasks:
    @pytest.mark.parametrize("task_id", [30])
    def test_replica_annotations_are_not_present_in_task_annotations(
        self, admin_user, jobs, annotations, task_id: int
    ):
        task_jobs = [j for j in jobs if j["task_id"] == task_id]
        consensus_jobs = [j for j in task_jobs if j["type"] == "consensus_replica"]

        # Ensure there are annotations in replicas
        assert any(
            len(annotations["job"][str(j["id"])]["tags"])
            + len(annotations["job"][str(j["id"])]["shapes"])
            + len(annotations["job"][str(j["id"])]["tracks"])
            for j in consensus_jobs
        )

        with make_api_client(admin_user) as api_client:
            for annotation_job in task_jobs:
                if annotation_job["type"] != "consensus_replica":
                    api_client.jobs_api.destroy_annotations(annotation_job["id"])

            updated_task_annotations, _ = api_client.tasks_api.retrieve_annotations(task_id)
            assert not updated_task_annotations.tags
            assert not updated_task_annotations.shapes
            assert not updated_task_annotations.tracks

            for consensus_job in consensus_jobs:
                job_annotations = annotations["job"][str(consensus_job["id"])]
                updated_job_annotations, _ = api_client.jobs_api.retrieve_annotations(
                    consensus_job["id"]
                )

                assert len(job_annotations["tags"]) == len(updated_job_annotations.tags)
                assert len(job_annotations["shapes"]) == len(updated_job_annotations.shapes)
                assert len(job_annotations["tracks"]) == len(updated_job_annotations.tracks)


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetTaskPreview:
    def _test_task_preview_200(self, username, task_id, **kwargs):
        with make_api_client(username) as api_client:
            (_, response) = api_client.tasks_api.retrieve_preview(task_id, **kwargs)

            assert response.status == HTTPStatus.OK
            (width, height) = Image.open(io.BytesIO(response.data)).size
            assert width > 0 and height > 0

    def _test_task_preview_403(self, username, task_id):
        with make_api_client(username) as api_client:
            (_, response) = api_client.tasks_api.retrieve_preview(
                task_id, _parse_response=False, _check_status=False
            )
            assert response.status == HTTPStatus.FORBIDDEN

    def _test_assigned_users_to_see_task_preview(self, tasks, users, is_task_staff, **kwargs):
        for task in tasks:
            staff_users = [user for user in users if is_task_staff(user["id"], task["id"])]
            assert len(staff_users)

            for user in staff_users:
                self._test_task_preview_200(user["username"], task["id"], **kwargs)

    def _test_assigned_users_cannot_see_task_preview(self, tasks, users, is_task_staff, **kwargs):
        for task in tasks:
            not_staff_users = [user for user in users if not is_task_staff(user["id"], task["id"])]
            assert len(not_staff_users)

            for user in not_staff_users:
                self._test_task_preview_403(user["username"], task["id"], **kwargs)

    @pytest.mark.parametrize("project_id, groups", [(1, "user")])
    def test_task_assigned_to_see_task_preview(
        self, project_id, groups, users, tasks, find_users, is_task_staff
    ):
        users = find_users(privilege=groups)
        tasks = list(filter(lambda x: x["project_id"] == project_id and x["assignee"], tasks))
        assert len(tasks)

        self._test_assigned_users_to_see_task_preview(tasks, users, is_task_staff)

    @pytest.mark.parametrize("org, project_id, role", [({"id": 2, "slug": "org2"}, 2, "worker")])
    def test_org_task_assigneed_to_see_task_preview(
        self, org, project_id, role, users, tasks, find_users, is_task_staff
    ):
        users = find_users(org=org["id"], role=role)
        tasks = list(filter(lambda x: x["project_id"] == project_id and x["assignee"], tasks))
        assert len(tasks)

        self._test_assigned_users_to_see_task_preview(tasks, users, is_task_staff)

    @pytest.mark.parametrize("project_id, groups", [(1, "user")])
    def test_task_unassigned_cannot_see_task_preview(
        self, project_id, groups, users, tasks, find_users, is_task_staff
    ):
        users = find_users(privilege=groups)
        tasks = list(filter(lambda x: x["project_id"] == project_id and x["assignee"], tasks))
        assert len(tasks)

        self._test_assigned_users_cannot_see_task_preview(tasks, users, is_task_staff)


@pytest.mark.usefixtures("restore_redis_ondisk_per_function")
@pytest.mark.usefixtures("restore_redis_ondisk_after_class")
class TestUnequalJobs:
    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_function, tmp_path: Path, admin_user: str):
        self.tmp_dir = tmp_path

        self.user = admin_user

        with make_sdk_client(self.user) as client:
            self.client = client

    @pytest.fixture
    def fxt_task_with_unequal_jobs(self):
        task_spec = {
            "name": f"test file-job mapping",
            "labels": [{"name": "car"}],
        }

        files = generate_image_files(7)
        filenames = [osp.basename(f.name) for f in files]
        for file_data in files:
            with open(self.tmp_dir / file_data.name, "wb") as f:
                f.write(file_data.getvalue())

        expected_segments = [
            filenames[0:1],
            filenames[1:5][::-1],  # a reversed fragment
            filenames[5:7],
        ]

        data_spec = {
            "job_file_mapping": expected_segments,
        }

        yield self.client.tasks.create_from_data(
            spec=task_spec,
            resource_type=ResourceType.LOCAL,
            resources=[self.tmp_dir / fn for fn in filenames],
            data_params=data_spec,
        )

    def test_can_export(self, fxt_task_with_unequal_jobs: Task):
        task = fxt_task_with_unequal_jobs

        filename = self.tmp_dir / f"task_{task.id}_coco.zip"
        task.export_dataset("COCO 1.0", filename)

        assert filename.is_file()
        assert filename.stat().st_size > 0

    def test_can_import_annotations(self, fxt_task_with_unequal_jobs: Task):
        task = fxt_task_with_unequal_jobs

        format_name = "COCO 1.0"
        filename = self.tmp_dir / f"task_{task.id}_coco.zip"
        task.export_dataset(format_name, filename)

        task.import_annotations(format_name, filename)

    def test_can_dump_backup(self, fxt_task_with_unequal_jobs: Task):
        task = fxt_task_with_unequal_jobs

        filename = self.tmp_dir / f"task_{task.id}_backup.zip"
        task.download_backup(filename)

        assert filename.is_file()
        assert filename.stat().st_size > 0

    def test_can_import_backup(self, fxt_task_with_unequal_jobs: Task):
        task = fxt_task_with_unequal_jobs

        filename = self.tmp_dir / f"task_{task.id}_backup.zip"
        task.download_backup(filename)

        restored_task = self.client.tasks.create_from_backup(filename)

        old_jobs = task.get_jobs()
        new_jobs = restored_task.get_jobs()
        assert len(old_jobs) == len(new_jobs)

        for old_job, new_job in zip(old_jobs, new_jobs):
            assert old_job.start_frame == new_job.start_frame
            assert old_job.stop_frame == new_job.stop_frame


@pytest.mark.usefixtures("restore_db_per_function")
class TestPatchTask:
    @pytest.mark.parametrize("task_id, project_id, user", [(19, 12, "admin1")])
    def test_move_task_to_project_with_attributes(self, task_id, project_id, user):
        response = get_method(user, f"tasks/{task_id}/annotations")
        assert response.status_code == HTTPStatus.OK
        annotations = response.json()

        response = patch_method(user, f"tasks/{task_id}", {"project_id": project_id})
        assert response.status_code == HTTPStatus.OK

        response = get_method(user, f"tasks/{task_id}")
        assert response.status_code == HTTPStatus.OK
        assert response.json().get("project_id") == project_id

        response = get_method(user, f"tasks/{task_id}/annotations")
        assert response.status_code == HTTPStatus.OK
        assert (
            DeepDiff(
                annotations,
                response.json(),
                ignore_order=True,
                exclude_regex_paths=[
                    r"root\['\w+'\]\[\d+\]\['label_id'\]",
                    r"root\['\w+'\]\[\d+\]\['attributes'\]\[\d+\]\['spec_id'\]",
                ],
            )
            == {}
        )

    @pytest.mark.parametrize("task_id, project_id, user", [(20, 13, "admin1")])
    def test_move_task_from_one_project_to_another_with_attributes(self, task_id, project_id, user):
        response = get_method(user, f"tasks/{task_id}/annotations")
        assert response.status_code == HTTPStatus.OK
        annotations = response.json()

        response = patch_method(user, f"tasks/{task_id}", {"project_id": project_id})
        assert response.status_code == HTTPStatus.OK

        response = get_method(user, f"tasks/{task_id}")
        assert response.status_code == HTTPStatus.OK
        assert response.json().get("project_id") == project_id

        response = get_method(user, f"tasks/{task_id}/annotations")
        assert response.status_code == HTTPStatus.OK
        assert compare_annotations(annotations, response.json()) == {}

    @pytest.mark.with_external_services
    @pytest.mark.parametrize(
        "storage_id",
        [
            1,  # public bucket
            2,  # private bucket
        ],
    )
    @pytest.mark.parametrize("field", ["source_storage", "target_storage"])
    def test_user_cannot_update_task_with_cloud_storage_without_access(
        self, storage_id, field, regular_lonely_user
    ):
        user = regular_lonely_user

        task_spec = {
            "name": f"Task with files from foreign cloud storage {storage_id}",
            "labels": [
                {
                    "name": "car",
                }
            ],
        }
        data_spec = {
            "image_quality": 75,
            "use_cache": True,
            "server_files": ["images/image_1.jpg"],
        }
        (task_id, _) = create_task(user, task_spec, data_spec)

        updated_fields = {
            field: {
                "location": "cloud_storage",
                "cloud_storage_id": storage_id,
            }
        }

        with make_api_client(user) as api_client:
            (_, response) = api_client.tasks_api.partial_update(
                task_id,
                patched_task_write_request=updated_fields,
                _parse_response=False,
                _check_status=False,
            )
        assert response.status == HTTPStatus.FORBIDDEN

    def test_malefactor_cannot_obtain_task_details_via_empty_partial_update_request(
        self, regular_lonely_user, tasks
    ):
        task = next(iter(tasks))

        with make_api_client(regular_lonely_user) as api_client:
            with pytest.raises(ForbiddenException):
                api_client.tasks_api.partial_update(task["id"])

    @pytest.mark.parametrize("has_old_assignee", [False, True])
    @pytest.mark.parametrize("new_assignee", [None, "same", "different"])
    def test_can_update_assignee_updated_date_on_assignee_updates(
        self, admin_user, tasks, users, has_old_assignee, new_assignee
    ):
        task = next(t for t in tasks if bool(t.get("assignee")) == has_old_assignee)

        old_assignee_id = (task.get("assignee") or {}).get("id")

        new_assignee_id = None
        if new_assignee == "same":
            new_assignee_id = old_assignee_id
        elif new_assignee == "different":
            new_assignee_id = next(u for u in users if u["id"] != old_assignee_id)["id"]

        with make_api_client(admin_user) as api_client:
            (updated_task, _) = api_client.tasks_api.partial_update(
                task["id"], patched_task_write_request={"assignee_id": new_assignee_id}
            )

            op = operator.eq if new_assignee_id == old_assignee_id else operator.ne

            if isinstance(updated_task.assignee_updated_date, datetime):
                assert op(
                    str(updated_task.assignee_updated_date.isoformat()).replace("+00:00", "Z"),
                    task["assignee_updated_date"],
                )
            else:
                assert op(updated_task.assignee_updated_date, task["assignee_updated_date"])

    @staticmethod
    def _test_patch_linked_storage(
        user: str, task_id: int, *, expected_status: HTTPStatus = HTTPStatus.OK
    ) -> None:
        with make_api_client(user) as api_client:
            for associated_storage in ("source_storage", "target_storage"):
                patch_data = {
                    associated_storage: {
                        "location": "local",
                    }
                }
                (_, response) = api_client.tasks_api.partial_update(
                    task_id,
                    patched_task_write_request=patch_data,
                    _check_status=False,
                    _parse_response=False,
                )
                assert response.status == expected_status, response.status

    @pytest.mark.parametrize(
        "role, is_allow",
        [
            ("owner", True),
            ("maintainer", True),
            ("supervisor", False),
            ("worker", False),
        ],
    )
    def test_update_task_linked_storage_by_org_roles(
        self,
        role: str,
        is_allow: bool,
        tasks,
        find_users,
    ):
        username, task_id = next(
            (
                (user["username"], task["id"])
                for user in find_users(role=role, exclude_privilege="admin")
                for task in tasks
                if task["organization"] == user["org"]
                and not task["project_id"]
                and task["owner"]["id"] != user["id"]
            )
        )

        self._test_patch_linked_storage(
            username,
            task_id,
            expected_status=HTTPStatus.OK if is_allow else HTTPStatus.FORBIDDEN,
        )

    @pytest.mark.parametrize("org", (True, False))
    @pytest.mark.parametrize(
        "is_task_owner, is_task_assignee, is_project_owner, is_project_assignee",
        [tuple(i == j for j in range(4)) for i in range(5)],
    )
    def test_update_task_linked_storage_by_assignee_or_owner(
        self,
        org: bool,
        is_task_owner: bool,
        is_task_assignee: bool,
        is_project_owner: bool,
        is_project_assignee: bool,
        tasks,
        find_users,
        projects,
    ):
        is_allow = is_task_owner or is_project_owner
        has_project = is_project_owner or is_project_assignee

        username: Optional[str] = None
        task_id: Optional[int] = None

        filtered_users = (
            (find_users(role="worker") + find_users(role="supervisor"))
            if org
            else find_users(org=None)
        )

        for task in tasks:
            if task_id is not None:
                break

            if (
                org
                and not task["organization"]
                or not org
                and task["organization"]
                or has_project
                and task["project_id"] is None
                or not has_project
                and task["project_id"]
            ):
                continue

            for user in filtered_users:
                if org and task["organization"] != user["org"]:
                    continue

                is_user_task_owner = task["owner"]["id"] == user["id"]
                is_user_task_assignee = (task["assignee"] or {}).get("id") == user["id"]
                project = projects[task["project_id"]] if task["project_id"] else None
                is_user_project_owner = (project or {}).get("owner", {}).get("id") == user["id"]
                is_user_project_assignee = ((project or {}).get("assignee") or {}).get(
                    "id"
                ) == user["id"]

                if (
                    is_task_owner
                    and is_user_task_owner
                    or is_task_assignee
                    and is_user_task_assignee
                    or is_project_owner
                    and is_user_project_owner
                    or is_project_assignee
                    and is_user_project_assignee
                    or (
                        not any(
                            [
                                is_task_owner,
                                is_task_assignee,
                                is_project_owner,
                                is_project_assignee,
                                is_user_task_owner,
                                is_user_task_assignee,
                                is_user_project_owner,
                                is_project_assignee,
                            ]
                        )
                    )
                ):
                    task_id = task["id"]
                    username = user["username"]
                    break

        assert task_id is not None

        self._test_patch_linked_storage(
            username,
            task_id,
            expected_status=HTTPStatus.OK if is_allow else HTTPStatus.FORBIDDEN,
        )


@pytest.mark.usefixtures("restore_db_per_function")
def test_can_report_correct_completed_jobs_count(tasks_wlc, jobs_wlc, admin_user):
    # Reproduces https://github.com/cvat-ai/cvat/issues/6098
    task = next(
        t
        for t in tasks_wlc
        if t["jobs"]["count"] > 1 and t["jobs"]["completed"] == 0 and t["labels"]["count"] > 1
    )
    task_jobs = [j for j in jobs_wlc if j["task_id"] == task["id"]]

    with make_api_client(admin_user) as api_client:
        api_client.jobs_api.partial_update(
            task_jobs[0]["id"],
            patched_job_write_request=dict(stage="acceptance", state="completed"),
        )

        task, _ = api_client.tasks_api.retrieve(task["id"])
        assert task.jobs.completed == 1


class TestImportTaskAnnotations:
    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_function, tmp_path: Path, admin_user: str):
        self.tmp_dir = tmp_path
        self.user = admin_user
        self.export_format = "CVAT for images 1.1"
        self.import_format = "CVAT 1.1"

        with make_sdk_client(self.user) as client:
            self.client = client

    def _check_annotations(self, task_id):
        with make_api_client(self.user) as api_client:
            (_, response) = api_client.tasks_api.retrieve_annotations(id=task_id)
            assert response.status == HTTPStatus.OK
            annotations = json.loads(response.data)["shapes"]
            assert len(annotations) > 0

    def _delete_annotations(self, task_id):
        with make_api_client(self.user) as api_client:
            (_, response) = api_client.tasks_api.destroy_annotations(id=task_id)
            assert response.status == HTTPStatus.NO_CONTENT

    @pytest.mark.skip("Fails sometimes, needs to be fixed")
    @pytest.mark.timeout(70)
    @pytest.mark.parametrize("successful_upload", [True, False])
    def test_can_import_annotations_after_previous_unclear_import(
        self, successful_upload: bool, tasks_with_shapes
    ):
        task_id = tasks_with_shapes[0]["id"]
        self._check_annotations(task_id)

        with NamedTemporaryFile() as f:
            filename = self.tmp_dir / f"task_{task_id}_{Path(f.name).name}_coco.zip"

        task = self.client.tasks.retrieve(task_id)
        task.export_dataset(self.export_format, filename, include_images=False)

        self._delete_annotations(task_id)

        params = {"format": self.import_format, "filename": filename.name}
        url = self.client.api_map.make_endpoint_url(
            self.client.api_client.tasks_api.create_annotations_endpoint.path
        ).format(id=task_id)
        uploader = Uploader(self.client)

        if successful_upload:
            # define time required to upload file with annotations
            start_time = time()
            task.import_annotations(self.import_format, filename)
            required_time = ceil(time() - start_time) * 2
            self._delete_annotations(task_id)

            response = uploader.upload_file(
                url, filename, meta=params, query_params=params, logger=self.client.logger.debug
            )
            rq_id = json.loads(response.data)["rq_id"]
            assert rq_id
        else:
            required_time = 60
            uploader._tus_start_upload(url, query_params=params)
            uploader._upload_file_data_with_tus(
                url,
                filename,
                meta=params,
                logger=self.client.logger.debug,
                pbar=NullProgressReporter(),
            )

        sleep(required_time)
        if successful_upload:
            self._check_annotations(task_id)
            self._delete_annotations(task_id)
        task.import_annotations(self.import_format, filename)
        self._check_annotations(task_id)

    @pytest.mark.skip("Fails sometimes, needs to be fixed")
    @pytest.mark.timeout(70)
    def test_check_import_cache_after_previous_interrupted_upload(self, tasks_with_shapes, request):
        task_id = tasks_with_shapes[0]["id"]
        with NamedTemporaryFile() as f:
            filename = self.tmp_dir / f"task_{task_id}_{Path(f.name).name}_coco.zip"
        task = self.client.tasks.retrieve(task_id)
        task.export_dataset(self.export_format, filename, include_images=False)

        params = {"format": self.import_format, "filename": filename.name}
        url = self.client.api_map.make_endpoint_url(
            self.client.api_client.tasks_api.create_annotations_endpoint.path
        ).format(id=task_id)

        uploader = Uploader(self.client)
        uploader._tus_start_upload(url, query_params=params)
        uploader._upload_file_data_with_tus(
            url,
            filename,
            meta=params,
            logger=self.client.logger.debug,
            pbar=NullProgressReporter(),
        )
        number_of_files = 1
        sleep(30)  # wait when the cleaning job from rq worker will be started
        command = ["/bin/bash", "-c", f"ls data/tasks/{task_id}/tmp | wc -l"]
        for _ in range(12):
            sleep(2)
            result, _ = container_exec_cvat(request, command)
            number_of_files = int(result)
            if not number_of_files:
                break
        assert not number_of_files

    def test_import_annotations_after_deleting_related_cloud_storage(
        self, admin_user: str, tasks_with_shapes
    ):
        related_field = "source_storage"

        task = next(
            t
            for t in tasks_with_shapes
            if t[related_field] and t[related_field]["location"] == "cloud_storage"
        )
        task_id = task["id"]
        cloud_storage_id = task["source_storage"]["cloud_storage_id"]

        # generate temporary destination
        with NamedTemporaryFile(dir=self.tmp_dir, suffix=f"task_{task_id}.zip") as f:
            file_path = Path(f.name)

        task = self.client.tasks.retrieve(task_id)
        self._check_annotations(task_id)

        with make_api_client(admin_user) as api_client:
            _, response = api_client.cloudstorages_api.destroy(cloud_storage_id)
            assert response.status == HTTPStatus.NO_CONTENT

        task = self.client.tasks.retrieve(task_id)
        assert not getattr(task, related_field)

        task.export_dataset(self.export_format, file_path, include_images=False)
        self._delete_annotations(task_id)
        task.import_annotations(self.import_format, file_path)
        self._check_annotations(task_id)

    @pytest.mark.parametrize("dimension", ["2d", "3d"])
    def test_can_import_datumaro_json(self, admin_user, tasks, dimension):
        task = next(
            t
            for t in tasks
            if t.get("size")
            if t["dimension"] == dimension and t.get("validation_mode") != "gt_pool"
        )

        with make_api_client(admin_user) as api_client:
            original_annotations = json.loads(
                api_client.tasks_api.retrieve_annotations(task["id"])[1].data
            )

            dataset_archive = io.BytesIO(
                export_dataset(
                    api_client.tasks_api,
                    api_version=2,
                    id=task["id"],
                    format=DATUMARO_FORMAT_FOR_DIMENSION[dimension],
                    save_images=False,
                )
            )

        with zipfile.ZipFile(dataset_archive) as zip_file:
            annotations = zip_file.read("annotations/default.json")

        with TemporaryDirectory() as tempdir:
            annotations_path = Path(tempdir) / "annotations.json"
            annotations_path.write_bytes(annotations)
            self.client.tasks.retrieve(task["id"]).import_annotations(
                DATUMARO_FORMAT_FOR_DIMENSION[dimension], annotations_path
            )

        with make_api_client(admin_user) as api_client:
            updated_annotations = json.loads(
                api_client.tasks_api.retrieve_annotations(task["id"])[1].data
            )

        assert compare_annotations(original_annotations, updated_annotations) == {}

    @pytest.mark.parametrize(
        "format_name",
        [
            "COCO 1.0",
            "COCO Keypoints 1.0",
            "CVAT 1.1",
            "LabelMe 3.0",
            "MOT 1.1",
            "MOTS PNG 1.0",
            "PASCAL VOC 1.1",
            "Segmentation mask 1.1",
            "YOLO 1.1",
            "WiderFace 1.0",
            "VGGFace2 1.0",
            "Market-1501 1.0",
            "Kitti Raw Format 1.0",
            "Sly Point Cloud Format 1.0",
            "KITTI 1.0",
            "LFW 1.0",
            "Cityscapes 1.0",
            "Open Images V6 1.0",
            "Datumaro 1.0",
            "Datumaro 3D 1.0",
            "Ultralytics YOLO Oriented Bounding Boxes 1.0",
            "Ultralytics YOLO Detection 1.0",
            "Ultralytics YOLO Pose 1.0",
            "Ultralytics YOLO Segmentation 1.0",
        ],
    )
    def test_check_import_error_on_wrong_file_structure(self, tasks_with_shapes, format_name):
        task_id = tasks_with_shapes[0]["id"]

        source_archive_path = self.tmp_dir / "incorrect_archive.zip"

        incorrect_files = ["incorrect_file1.txt", "incorrect_file2.txt"]
        for file in incorrect_files:
            with open(self.tmp_dir / file, "w") as f:
                f.write("Some text")

        zip_file = zipfile.ZipFile(source_archive_path, mode="a")
        for path in incorrect_files:
            zip_file.write(self.tmp_dir / path, path)
        task = self.client.tasks.retrieve(task_id)

        with pytest.raises(exceptions.ApiException) as capture:
            task.import_annotations(format_name, source_archive_path)

            assert b"Check [format docs]" in capture.value.body
            assert b"Dataset must contain a file:" in capture.value.body


@pytest.mark.usefixtures("restore_redis_inmem_per_function")
class TestImportWithComplexFilenames:
    @pytest.fixture(
        autouse=True,
        scope="class",
        # classmethod way may not work in some versions
        # https://github.com/cvat-ai/cvat/actions/runs/5336023573/jobs/9670573955?pr=6350
        name="TestImportWithComplexFilenames.setup_class",
    )
    @classmethod
    def setup_class(
        cls, restore_db_per_class, tmp_path_factory: pytest.TempPathFactory, admin_user: str
    ):
        cls.tmp_dir = tmp_path_factory.mktemp(cls.__class__.__name__)
        cls.user = admin_user
        cls.format_name = "PASCAL VOC 1.1"

        with make_sdk_client(cls.user) as client:
            cls.client = client

        cls._init_tasks()

    @classmethod
    def _create_task_with_annotations(cls, filenames: list[str]):
        images = generate_image_files(len(filenames), filenames=filenames)

        source_archive_path = cls.tmp_dir / "source_data.zip"
        with zipfile.ZipFile(source_archive_path, "w") as zip_file:
            for image in images:
                zip_file.writestr(image.name, image.getvalue())

        task = cls.client.tasks.create_from_data(
            {
                "name": "test_images_with_dots",
                "labels": [{"name": "cat"}, {"name": "dog"}],
            },
            resources=[source_archive_path],
        )

        labels = task.get_labels()
        task.set_annotations(
            models.LabeledDataRequest(
                shapes=[
                    models.LabeledShapeRequest(
                        frame=frame_id,
                        label_id=labels[0].id,
                        type="rectangle",
                        points=[1, 1, 2, 2],
                    )
                    for frame_id in range(len(filenames))
                ],
            )
        )

        return task

    @classmethod
    def _init_tasks(cls):
        cls.flat_filenames = [
            "filename0.jpg",
            "file.name1.jpg",
            "fi.le.na.me.2.jpg",
            ".filename3.jpg",
            "..filename..4.jpg",
            "..filename..5.png..jpg",
        ]

        cls.nested_filenames = [
            f"{prefix}/{fn}"
            for prefix, fn in zip(
                [
                    "ab/cd",
                    "ab/cd",
                    "ab",
                    "ab",
                    "cd/ef",
                    "cd/ef",
                    "cd",
                    "",
                ],
                cls.flat_filenames,
            )
        ]

        cls.data = {}
        for (kind, filenames), prefix in product(
            [("flat", cls.flat_filenames), ("nested", cls.nested_filenames)], ["", "pre/fix"]
        ):
            key = kind
            if prefix:
                key += "_prefixed"

            task = cls._create_task_with_annotations(
                [f"{prefix}/{fn}" if prefix else fn for fn in filenames]
            )

            dataset_file = cls.tmp_dir / f"{key}_dataset.zip"
            task.export_dataset(cls.format_name, dataset_file, include_images=False)

            cls.data[key] = (task, dataset_file)

    @pytest.mark.skip("Fails sometimes, needs to be fixed")
    @pytest.mark.parametrize(
        "task_kind, annotation_kind, expect_success",
        [
            ("flat", "flat", True),
            ("flat", "flat_prefixed", False),
            ("flat", "nested", False),
            ("flat", "nested_prefixed", False),
            ("flat_prefixed", "flat", True),  # allow this for better UX
            ("flat_prefixed", "flat_prefixed", True),
            ("flat_prefixed", "nested", False),
            ("flat_prefixed", "nested_prefixed", False),
            ("nested", "flat", False),
            ("nested", "flat_prefixed", False),
            ("nested", "nested", True),
            ("nested", "nested_prefixed", False),
            ("nested_prefixed", "flat", False),
            ("nested_prefixed", "flat_prefixed", False),
            ("nested_prefixed", "nested", True),  # allow this for better UX
            ("nested_prefixed", "nested_prefixed", True),
        ],
    )
    def test_import_annotations(self, task_kind, annotation_kind, expect_success):
        # Tests for regressions about https://github.com/cvat-ai/cvat/issues/6319
        #
        # X annotations must be importable to X prefixed cases
        # with and without dots in filenames.
        #
        # Nested structures can potentially be matched to flat ones and vise-versa,
        # but it's not supported now, as it may lead to some errors in matching.

        task: Task = self.data[task_kind][0]
        dataset_file = self.data[annotation_kind][1]

        if expect_success:
            task.import_annotations(self.format_name, dataset_file)

            assert set(s.frame for s in task.get_annotations().shapes) == set(
                range(len(self.flat_filenames))
            )
        else:
            with pytest.raises(exceptions.ApiException) as capture:
                task.import_annotations(self.format_name, dataset_file)

            assert b"Could not match item id" in capture.value.body

    def delete_annotation_and_import_annotations(
        self, task_id, annotations, format_name, dataset_file
    ):
        task = self.client.tasks.retrieve(task_id)
        labels = task.get_labels()
        sublabels = labels[0].sublabels

        # if the annotations shapes label_id does not exist, the put it in the task
        for shape in annotations["shapes"]:
            if "label_id" not in shape:
                shape["label_id"] = labels[0].id

        for track in annotations["tracks"]:
            if "label_id" not in track:
                track["label_id"] = labels[0].id
            for element_idx, element in enumerate(track["elements"]):
                if "label_id" not in element:
                    element["label_id"] = sublabels[element_idx].id

        response = put_method(
            "admin1", f"tasks/{task_id}/annotations", annotations, action="create"
        )
        assert response.status_code == 200, f"Cannot update task's annotations: {response.content}"

        task.export_dataset(format_name, dataset_file, include_images=False)

        # get the original annotations
        response = get_method("admin1", f"tasks/{task.id}/annotations")
        assert response.status_code == 200, f"Cannot get task's annotations: {response.content}"
        original_annotations = response.json()

        # import the annotations
        task.import_annotations(format_name, dataset_file)

        response = get_method("admin1", f"tasks/{task.id}/annotations")
        assert response.status_code == 200, f"Cannot get task's annotations: {response.content}"
        imported_annotations = response.json()

        return original_annotations, imported_annotations

    def compare_original_and_import_annotations(self, original_annotations, imported_annotations):
        assert compare_annotations(original_annotations, imported_annotations) == {}

    @pytest.mark.parametrize("format_name", ["Datumaro 1.0", "COCO 1.0", "PASCAL VOC 1.1"])
    def test_export_and_import_tracked_format_with_outside_true(self, format_name):
        task_id = 14
        dataset_file = self.tmp_dir / (format_name + "outside_true_source_data.zip")
        annotations = {
            "shapes": [],
            "tracks": [
                {
                    "frame": 0,
                    "group": 0,
                    "shapes": [
                        {
                            "type": "rectangle",
                            "frame": 0,
                            "points": [1.0, 2.0, 3.0, 2.0],
                            "keyframe": True,
                        },
                        {
                            "type": "rectangle",
                            "frame": 3,
                            "points": [1.0, 2.0, 3.0, 2.0],
                            "keyframe": True,
                            "outside": True,
                        },
                    ],
                    "elements": [],
                }
            ],
        }

        original_annotations, imported_annotations = self.delete_annotation_and_import_annotations(
            task_id, annotations, format_name, dataset_file
        )

        self.compare_original_and_import_annotations(original_annotations, imported_annotations)

        # check if frame 3 is imported correctly with outside = True
        assert imported_annotations["tracks"][0]["shapes"][1]["outside"]

    @pytest.mark.parametrize("format_name", ["Datumaro 1.0", "COCO 1.0", "PASCAL VOC 1.1"])
    def test_export_and_import_tracked_format_with_intermediate_keyframe(self, format_name):
        task_id = 14
        dataset_file = self.tmp_dir / (format_name + "intermediate_keyframe_source_data.zip")
        annotations = {
            "shapes": [],
            "tracks": [
                {
                    "frame": 0,
                    "group": 0,
                    "shapes": [
                        {
                            "type": "rectangle",
                            "frame": 0,
                            "points": [1.0, 2.0, 3.0, 2.0],
                            "keyframe": True,
                        },
                        {
                            "type": "rectangle",
                            "frame": 3,
                            "points": [1.0, 2.0, 3.0, 2.0],
                            "keyframe": True,
                        },
                    ],
                    "elements": [],
                }
            ],
        }

        original_annotations, imported_annotations = self.delete_annotation_and_import_annotations(
            task_id, annotations, format_name, dataset_file
        )

        self.compare_original_and_import_annotations(original_annotations, imported_annotations)

        # check that all the keyframe is imported correctly
        assert len(imported_annotations["tracks"][0]["shapes"]) == 2

    @pytest.mark.parametrize("format_name", ["Datumaro 1.0", "COCO 1.0", "PASCAL VOC 1.1"])
    def test_export_and_import_tracked_format_with_outside_without_keyframe(self, format_name):
        task_id = 14
        dataset_file = self.tmp_dir / (format_name + "outside_without_keyframe_source_data.zip")
        annotations = {
            "shapes": [],
            "tracks": [
                {
                    "frame": 0,
                    "group": 0,
                    "shapes": [
                        {
                            "type": "rectangle",
                            "frame": 0,
                            "points": [1.0, 2.0, 3.0, 2.0],
                            "keyframe": True,
                        },
                        {
                            "type": "rectangle",
                            "frame": 3,
                            "points": [1.0, 2.0, 3.0, 2.0],
                            "outside": True,
                        },
                    ],
                    "elements": [],
                }
            ],
        }

        original_annotations, imported_annotations = self.delete_annotation_and_import_annotations(
            task_id, annotations, format_name, dataset_file
        )

        self.compare_original_and_import_annotations(original_annotations, imported_annotations)

        # check that all the keyframe is imported correctly
        assert len(imported_annotations["tracks"][0]["shapes"]) == 2

        # check that frame 3 is imported correctly with outside = True
        assert imported_annotations["tracks"][0]["shapes"][1]["outside"]

    @pytest.mark.parametrize("format_name", ["Datumaro 1.0", "COCO 1.0", "PASCAL VOC 1.1"])
    def test_export_and_import_tracked_format_with_no_keyframe(self, format_name):
        task_id = 14
        dataset_file = self.tmp_dir / (format_name + "no_keyframe_source_data.zip")
        annotations = {
            "shapes": [],
            "tracks": [
                {
                    "frame": 0,
                    "group": 0,
                    "shapes": [
                        {
                            "type": "rectangle",
                            "frame": 0,
                            "points": [1.0, 2.0, 3.0, 2.0],
                        },
                    ],
                    "elements": [],
                }
            ],
        }

        original_annotations, imported_annotations = self.delete_annotation_and_import_annotations(
            task_id, annotations, format_name, dataset_file
        )

        self.compare_original_and_import_annotations(original_annotations, imported_annotations)

        # check if first frame is imported correctly with keyframe = True
        assert len(imported_annotations["tracks"][0]["shapes"]) == 1

    @pytest.mark.parametrize("format_name", ["Datumaro 1.0", "COCO 1.0", "PASCAL VOC 1.1"])
    def test_export_and_import_tracked_format_with_one_outside(self, format_name):
        task_id = 14
        dataset_file = self.tmp_dir / (format_name + "one_outside_source_data.zip")
        annotations = {
            "shapes": [],
            "tracks": [
                {
                    "frame": 0,
                    "group": 0,
                    "shapes": [
                        {
                            "type": "rectangle",
                            "frame": 3,
                            "points": [1.0, 2.0, 3.0, 2.0],
                            "outside": True,
                        },
                    ],
                    "elements": [],
                }
            ],
        }

        original_annotations, imported_annotations = self.delete_annotation_and_import_annotations(
            task_id, annotations, format_name, dataset_file
        )

        self.compare_original_and_import_annotations(original_annotations, imported_annotations)

        # only outside=True shape is imported, means there is no visible shape
        assert len(imported_annotations["tracks"]) == 0

    @pytest.mark.parametrize("format_name", ["Datumaro 1.0", "COCO 1.0", "PASCAL VOC 1.1"])
    def test_export_and_import_tracked_format_with_gap(self, format_name):
        task_id = 14
        dataset_file = self.tmp_dir / (format_name + "with_gap_source_data.zip")
        annotations = {
            "shapes": [],
            "tracks": [
                {
                    "frame": 0,
                    "group": 0,
                    "shapes": [
                        {
                            "type": "rectangle",
                            "frame": 0,
                            "points": [1.0, 2.0, 3.0, 2.0],
                            "keyframe": True,
                        },
                        {
                            "type": "rectangle",
                            "frame": 2,
                            "points": [1.0, 2.0, 3.0, 2.0],
                            "outside": True,
                        },
                        {
                            "type": "rectangle",
                            "frame": 4,
                            "points": [1.0, 2.0, 3.0, 2.0],
                            "keyframe": True,
                        },
                        {
                            "type": "rectangle",
                            "frame": 5,
                            "points": [1.0, 2.0, 3.0, 2.0],
                            "outside": True,
                        },
                        {
                            "type": "rectangle",
                            "frame": 6,
                            "points": [1.0, 2.0, 3.0, 2.0],
                            "keyframe": True,
                        },
                    ],
                    "elements": [],
                }
            ],
        }

        original_annotations, imported_annotations = self.delete_annotation_and_import_annotations(
            task_id, annotations, format_name, dataset_file
        )

        self.compare_original_and_import_annotations(original_annotations, imported_annotations)

        # check that all the keyframe is imported correctly
        assert len(imported_annotations["tracks"][0]["shapes"]) == 5

        outside_count = sum(
            1 for shape in imported_annotations["tracks"][0]["shapes"] if shape["outside"]
        )
        assert outside_count == 2, "Outside shapes are not imported correctly"

    def test_export_and_import_coco_keypoints_with_outside_true(self):
        task_id = 14
        format_name = "COCO Keypoints 1.0"
        dataset_file = self.tmp_dir / (format_name + "outside_true_source_data.zip")
        annotations = {
            "shapes": [],
            "tracks": [
                {
                    "frame": 0,
                    "group": 0,
                    "shapes": [
                        {"type": "skeleton", "frame": 0, "points": [], "keyframe": True},
                        {
                            "type": "skeleton",
                            "frame": 3,
                            "points": [],
                            "keyframe": True,
                            "outside": True,
                        },
                    ],
                    "elements": [
                        {
                            "frame": 0,
                            "group": 0,
                            "shapes": [
                                {
                                    "type": "points",
                                    "frame": 0,
                                    "points": [1.0, 2.0],
                                    "keyframe": True,
                                },
                                {
                                    "type": "points",
                                    "frame": 3,
                                    "points": [1.0, 2.0],
                                    "keyframe": True,
                                    "outside": True,
                                },
                            ],
                        },
                    ],
                }
            ],
        }

        original_annotations, imported_annotations = self.delete_annotation_and_import_annotations(
            task_id, annotations, format_name, dataset_file
        )

        self.compare_original_and_import_annotations(original_annotations, imported_annotations)

        # check if frame 3 is imported correctly with outside = True
        assert imported_annotations["tracks"][0]["shapes"][1]["outside"]

    def test_export_and_import_coco_keypoints_with_intermediate_keyframe(self):
        task_id = 14
        format_name = "COCO Keypoints 1.0"
        dataset_file = self.tmp_dir / (format_name + "intermediate_keyframe_source_data.zip")
        annotations = {
            "shapes": [],
            "tracks": [
                {
                    "frame": 0,
                    "group": 0,
                    "shapes": [
                        {"type": "skeleton", "frame": 0, "points": [], "keyframe": True},
                        {
                            "type": "skeleton",
                            "frame": 3,
                            "points": [],
                            "keyframe": True,
                        },
                    ],
                    "elements": [
                        {
                            "frame": 0,
                            "group": 0,
                            "shapes": [
                                {
                                    "type": "points",
                                    "frame": 0,
                                    "points": [1.0, 2.0],
                                    "keyframe": True,
                                },
                                {
                                    "type": "points",
                                    "frame": 3,
                                    "points": [1.0, 2.0],
                                    "keyframe": True,
                                },
                            ],
                        },
                    ],
                }
            ],
        }

        original_annotations, imported_annotations = self.delete_annotation_and_import_annotations(
            task_id, annotations, format_name, dataset_file
        )

        self.compare_original_and_import_annotations(original_annotations, imported_annotations)

        # check that all the keyframe is imported correctly
        assert len(imported_annotations["tracks"][0]["shapes"]) == 2

    def test_export_and_import_coco_keypoints_with_outside_without_keyframe(self):
        task_id = 14
        format_name = "COCO Keypoints 1.0"
        dataset_file = self.tmp_dir / (format_name + "outside_without_keyframe_source_data.zip")
        annotations = {
            "shapes": [],
            "tracks": [
                {
                    "frame": 0,
                    "group": 0,
                    "shapes": [
                        {"type": "skeleton", "frame": 0, "points": [], "keyframe": True},
                        {
                            "type": "skeleton",
                            "frame": 3,
                            "points": [],
                            "outside": True,
                        },
                    ],
                    "elements": [
                        {
                            "frame": 0,
                            "group": 0,
                            "shapes": [
                                {
                                    "type": "points",
                                    "frame": 0,
                                    "points": [1.0, 2.0],
                                    "keyframe": True,
                                },
                                {
                                    "type": "points",
                                    "frame": 3,
                                    "points": [1.0, 2.0],
                                    "outside": True,
                                },
                            ],
                        },
                    ],
                }
            ],
        }

        original_annotations, imported_annotations = self.delete_annotation_and_import_annotations(
            task_id, annotations, format_name, dataset_file
        )

        self.compare_original_and_import_annotations(original_annotations, imported_annotations)

        # check that all the keyframe is imported correctly
        assert len(imported_annotations["tracks"][0]["shapes"]) == 2

        # check that frame 3 is imported correctly with outside = True
        assert imported_annotations["tracks"][0]["shapes"][1]["outside"]

    def test_export_and_import_coco_keypoints_with_no_keyframe(self):
        task_id = 14
        format_name = "COCO Keypoints 1.0"
        dataset_file = self.tmp_dir / (format_name + "with_no_keyframe_source_data.zip")
        annotations = {
            "shapes": [],
            "tracks": [
                {
                    "frame": 0,
                    "group": 0,
                    "shapes": [
                        {"type": "skeleton", "frame": 0, "points": []},
                    ],
                    "elements": [
                        {
                            "frame": 0,
                            "group": 0,
                            "shapes": [
                                {
                                    "type": "points",
                                    "frame": 0,
                                    "points": [1.0, 2.0],
                                },
                            ],
                        },
                    ],
                }
            ],
        }

        original_annotations, imported_annotations = self.delete_annotation_and_import_annotations(
            task_id, annotations, format_name, dataset_file
        )

        self.compare_original_and_import_annotations(original_annotations, imported_annotations)

        # check if first frame is imported correctly with keyframe = True
        assert len(imported_annotations["tracks"][0]["shapes"]) == 1

    def test_export_and_import_coco_keypoints_with_one_outside(self):
        task_id = 14
        format_name = "COCO Keypoints 1.0"
        dataset_file = self.tmp_dir / (format_name + "with_one_outside_source_data.zip")
        annotations = {
            "shapes": [],
            "tracks": [
                {
                    "frame": 0,
                    "group": 0,
                    "shapes": [
                        {"type": "skeleton", "frame": 3, "points": [], "outside": True},
                    ],
                    "elements": [
                        {
                            "frame": 0,
                            "group": 0,
                            "shapes": [
                                {
                                    "type": "points",
                                    "frame": 3,
                                    "points": [1.0, 2.0],
                                    "outside": True,
                                },
                            ],
                        },
                    ],
                }
            ],
        }

        original_annotations, imported_annotations = self.delete_annotation_and_import_annotations(
            task_id, annotations, format_name, dataset_file
        )

        self.compare_original_and_import_annotations(original_annotations, imported_annotations)

        # only outside=True shape is imported, means there is no visible shape
        assert len(imported_annotations["tracks"]) == 0

    def test_export_and_import_coco_keypoints_with_gap(self):
        task_id = 14
        format_name = "COCO Keypoints 1.0"
        dataset_file = self.tmp_dir / (format_name + "with_gap_source_data.zip")
        annotations = {
            "shapes": [],
            "tracks": [
                {
                    "frame": 0,
                    "group": 0,
                    "shapes": [
                        {"type": "skeleton", "frame": 0, "points": [], "keyframe": True},
                        {"type": "skeleton", "frame": 2, "points": [], "outside": True},
                        {"type": "skeleton", "frame": 4, "points": [], "keyframe": True},
                        {"type": "skeleton", "frame": 5, "points": [], "outside": True},
                        {"type": "skeleton", "frame": 6, "points": [], "keyframe": True},
                    ],
                    "elements": [
                        {
                            "frame": 0,
                            "group": 0,
                            "shapes": [
                                {
                                    "type": "points",
                                    "frame": 0,
                                    "points": [1.0, 2.0],
                                    "keyframe": True,
                                },
                                {
                                    "type": "points",
                                    "frame": 2,
                                    "points": [1.0, 2.0],
                                    "outside": True,
                                },
                                {
                                    "type": "points",
                                    "frame": 4,
                                    "points": [1.0, 2.0],
                                    "keyframe": True,
                                },
                                {
                                    "type": "points",
                                    "frame": 5,
                                    "points": [1.0, 2.0],
                                    "outside": True,
                                },
                                {
                                    "type": "points",
                                    "frame": 6,
                                    "points": [1.0, 2.0],
                                    "keyframe": True,
                                },
                            ],
                        },
                    ],
                }
            ],
        }

        original_annotations, imported_annotations = self.delete_annotation_and_import_annotations(
            task_id, annotations, format_name, dataset_file
        )

        self.compare_original_and_import_annotations(original_annotations, imported_annotations)

        # check if all the keyframes are imported correctly
        assert len(imported_annotations["tracks"][0]["shapes"]) == 5

        outside_count = sum(
            1 for shape in imported_annotations["tracks"][0]["shapes"] if shape["outside"]
        )
        assert outside_count == 2, "Outside shapes are not imported correctly"

    def test_export_and_import_complex_coco_keypoints_annotations(self):
        task_id = 14
        format_name = "COCO Keypoints 1.0"
        dataset_file = self.tmp_dir / (format_name + "complex_annotations_source_data.zip")
        annotations = {
            "shapes": [],
            "tracks": [
                {
                    "frame": 0,
                    "group": 0,
                    "shapes": [
                        {"type": "skeleton", "outside": False, "frame": 0},
                        {"type": "skeleton", "outside": False, "frame": 1},
                        {"type": "skeleton", "outside": False, "frame": 2},
                        {"type": "skeleton", "outside": False, "frame": 4},
                        {"type": "skeleton", "outside": False, "frame": 5},
                    ],
                    "attributes": [],
                    "elements": [
                        {
                            "frame": 0,
                            "group": 0,
                            "shapes": [
                                {
                                    "type": "points",
                                    "outside": False,
                                    "points": [256.67, 719.25],
                                    "frame": 0,
                                },
                                {
                                    "type": "points",
                                    "outside": False,
                                    "points": [256.67, 719.25],
                                    "frame": 1,
                                },
                                {
                                    "type": "points",
                                    "outside": True,
                                    "points": [256.67, 719.25],
                                    "frame": 2,
                                },
                                {
                                    "type": "points",
                                    "outside": False,
                                    "points": [256.67, 719.25],
                                    "frame": 4,
                                },
                                {
                                    "type": "points",
                                    "outside": False,
                                    "points": [256.67, 719.25],
                                    "frame": 5,
                                },
                            ],
                        },
                        {
                            "frame": 0,
                            "group": 0,
                            "shapes": [
                                {
                                    "type": "points",
                                    "outside": False,
                                    "points": [318.25, 842.06],
                                    "frame": 0,
                                },
                                {
                                    "type": "points",
                                    "outside": True,
                                    "points": [318.25, 842.06],
                                    "frame": 1,
                                },
                                {
                                    "type": "points",
                                    "outside": False,
                                    "points": [318.25, 842.06],
                                    "frame": 2,
                                },
                                {
                                    "type": "points",
                                    "outside": True,
                                    "points": [318.25, 842.06],
                                    "frame": 4,
                                },
                            ],
                        },
                        {
                            "frame": 0,
                            "group": 0,
                            "shapes": [
                                {
                                    "type": "points",
                                    "outside": False,
                                    "points": [199.2, 798.71],
                                    "frame": 0,
                                },
                                {
                                    "type": "points",
                                    "outside": False,
                                    "points": [199.2, 798.71],
                                    "frame": 1,
                                },
                                {
                                    "type": "points",
                                    "outside": True,
                                    "points": [199.2, 798.71],
                                    "frame": 2,
                                },
                                {
                                    "type": "points",
                                    "outside": False,
                                    "points": [199.2, 798.71],
                                    "frame": 4,
                                },
                                {
                                    "type": "points",
                                    "outside": True,
                                    "points": [199.2, 798.71],
                                    "frame": 5,
                                },
                            ],
                        },
                    ],
                },
                {
                    "frame": 0,
                    "group": 0,
                    "shapes": [
                        {"type": "skeleton", "outside": False, "frame": 0},
                        {"type": "skeleton", "outside": True, "frame": 1},
                        {"type": "skeleton", "outside": False, "frame": 3},
                        {"type": "skeleton", "outside": False, "frame": 4},
                        {"type": "skeleton", "outside": False, "frame": 5},
                    ],
                    "attributes": [],
                    "elements": [
                        {
                            "frame": 0,
                            "group": 0,
                            "shapes": [
                                {
                                    "type": "points",
                                    "outside": False,
                                    "points": [416.16, 244.31],
                                    "frame": 0,
                                },
                                {
                                    "type": "points",
                                    "outside": True,
                                    "points": [416.16, 244.31],
                                    "frame": 1,
                                },
                                {
                                    "type": "points",
                                    "outside": False,
                                    "points": [416.16, 244.31],
                                    "frame": 3,
                                },
                                {
                                    "type": "points",
                                    "outside": False,
                                    "points": [416.16, 244.31],
                                    "frame": 4,
                                },
                                {
                                    "type": "points",
                                    "outside": False,
                                    "points": [416.16, 244.31],
                                    "frame": 5,
                                },
                            ],
                        },
                        {
                            "frame": 0,
                            "group": 0,
                            "shapes": [
                                {
                                    "type": "points",
                                    "outside": False,
                                    "points": [486.17, 379.65],
                                    "frame": 0,
                                },
                                {
                                    "type": "points",
                                    "outside": True,
                                    "points": [486.17, 379.65],
                                    "frame": 1,
                                },
                                {
                                    "type": "points",
                                    "outside": True,
                                    "points": [486.17, 379.65],
                                    "frame": 3,
                                },
                                {
                                    "type": "points",
                                    "outside": False,
                                    "points": [486.17, 379.65],
                                    "frame": 4,
                                },
                                {
                                    "type": "points",
                                    "outside": False,
                                    "points": [486.17, 379.65],
                                    "frame": 5,
                                },
                            ],
                        },
                        {
                            "frame": 0,
                            "group": 0,
                            "shapes": [
                                {
                                    "type": "points",
                                    "outside": False,
                                    "points": [350.83, 331.88],
                                    "frame": 0,
                                },
                                {
                                    "type": "points",
                                    "outside": True,
                                    "points": [350.83, 331.88],
                                    "frame": 1,
                                },
                                {
                                    "type": "points",
                                    "outside": True,
                                    "points": [350.83, 331.88],
                                    "frame": 3,
                                },
                                {
                                    "type": "points",
                                    "outside": False,
                                    "points": [350.83, 331.88],
                                    "frame": 5,
                                },
                            ],
                        },
                    ],
                },
            ],
        }

        original_annotations, imported_annotations = self.delete_annotation_and_import_annotations(
            task_id, annotations, format_name, dataset_file
        )

        self.compare_original_and_import_annotations(original_annotations, imported_annotations)

        def check_element_outside_count(track_idx, element_idx, expected_count):
            outside_count = sum(
                1
                for shape in imported_annotations["tracks"][0]["elements"][element_idx]["shapes"]
                if shape["outside"]
            )
            assert (
                outside_count == expected_count
            ), f"Outside shapes for track[{track_idx}]element[{element_idx}] are not imported correctly"

        # check track[0] elements outside count
        check_element_outside_count(0, 0, 1)
        check_element_outside_count(0, 1, 2)
        check_element_outside_count(0, 2, 2)

        # check track[1] elements outside count
        check_element_outside_count(1, 0, 1)
        check_element_outside_count(1, 1, 2)
        check_element_outside_count(1, 2, 2)


@pytest.mark.usefixtures("restore_db_per_class")
@pytest.mark.usefixtures("restore_redis_ondisk_per_function")
@pytest.mark.usefixtures("restore_redis_ondisk_after_class")
@pytest.mark.usefixtures("restore_redis_inmem_per_function")
class TestPatchExportFrames(_TestTasksBase):
    @fixture(scope="class")
    @parametrize("media_type", [_SourceDataType.images, _SourceDataType.video])
    @parametrize("step", [5])
    @parametrize("frame_count", [20])
    @parametrize("start_frame", [None, 3])
    def fxt_uploaded_media_task(
        self,
        request: pytest.FixtureRequest,
        media_type: _SourceDataType,
        step: int,
        frame_count: int,
        start_frame: Optional[int],
    ) -> Generator[tuple[_TaskSpec, Task, str], None, None]:
        args = dict(request=request, frame_count=frame_count, step=step, start_frame=start_frame)

        if media_type == _SourceDataType.images:
            (spec, task_id) = next(self._uploaded_images_task_fxt_base(**args))
        else:
            (spec, task_id) = next(self._uploaded_video_task_fxt_base(**args))

        with make_sdk_client(self._USERNAME) as client:
            task = client.tasks.retrieve(task_id)

            yield (spec, task, f"CVAT for {media_type.value} 1.1")

    @pytest.mark.usefixtures("restore_redis_ondisk_per_function")
    @parametrize("spec, task, format_name", [fixture_ref(fxt_uploaded_media_task)])
    def test_export_with_non_default_frame_step(
        self, tmp_path: Path, spec: _TaskSpec, task: Task, format_name: str
    ):

        dataset_file = tmp_path / "dataset.zip"
        task.export_dataset(format_name, dataset_file, include_images=True)

        def get_img_index(zinfo: zipfile.ZipInfo) -> int:
            name = PurePosixPath(zinfo.filename)
            if name.suffix.lower() not in (".png", ".jpg", ".jpeg"):
                return -1
            return int(name.stem.rsplit("_", maxsplit=1)[-1])

        # get frames and sort them
        with zipfile.ZipFile(dataset_file) as dataset:
            frames = np.array(
                [png_idx for png_idx in map(get_img_index, dataset.filelist) if png_idx != -1]
            )
            frames.sort()

        task_meta = task.get_meta()
        (src_start_frame, src_stop_frame, src_frame_step) = (
            task_meta["start_frame"],
            task_meta["stop_frame"],
            spec.frame_step,
        )
        src_end_frame = calc_end_frame(src_start_frame, src_stop_frame, src_frame_step)
        assert len(frames) == spec.size == task_meta["size"], "Some frames were lost"
        assert np.all(
            frames == np.arange(src_start_frame, src_end_frame, src_frame_step)
        ), "Some frames are wrong"
