# Copyright (C) 2022 Intel Corporation
# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import json
import os
import os.path as osp
import zipfile
from copy import deepcopy
from functools import partial
from http import HTTPStatus
from itertools import chain, product
from math import ceil
from pathlib import Path
from tempfile import NamedTemporaryFile, TemporaryDirectory
from time import sleep, time
from typing import Any, List, Optional, Tuple

import pytest
from cvat_sdk import Client, Config, exceptions
from cvat_sdk.api_client import models
from cvat_sdk.api_client.api_client import ApiClient, ApiException, Endpoint
from cvat_sdk.core.helpers import get_paginated_collection
from cvat_sdk.core.progress import NullProgressReporter
from cvat_sdk.core.proxies.tasks import ResourceType, Task
from cvat_sdk.core.uploading import Uploader
from deepdiff import DeepDiff
from PIL import Image

import shared.utils.s3 as s3
from shared.fixtures.init import docker_exec_cvat, kube_exec_cvat
from shared.utils.config import (
    BASE_URL,
    USER_PASS,
    delete_method,
    get_method,
    make_api_client,
    patch_method,
    post_method,
    put_method,
)
from shared.utils.helpers import (
    generate_image_file,
    generate_image_files,
    generate_manifest,
    generate_video_file,
)

from .utils import (
    CollectionSimpleFilterTestBase,
    compare_annotations,
    create_task,
    export_dataset,
    wait_until_task_is_created,
)


def get_cloud_storage_content(username: str, cloud_storage_id: int, manifest: Optional[str] = None):
    with make_api_client(username) as api_client:
        kwargs = {"manifest_path": manifest} if manifest else {}

        (data, _) = api_client.cloudstorages_api.retrieve_content_v2(cloud_storage_id, **kwargs)
        return [f"{f['name']}{'/' if str(f['type']) == 'DIR' else ''}" for f in data["content"]]


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
            ("business", False, False),
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
            "name",
            "owner",
            "status",
            "assignee",
            "subset",
            "mode",
            "dimension",
            "project_id",
            "tracker_link",
        ),
    )
    def test_can_use_simple_filter_for_object_list(self, field):
        return super().test_can_use_simple_filter_for_object_list(field)


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
            ("business", False, False),
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
            ("business", True, True),
            ("business", False, False),
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
        tasks_by_org,
        request_data,
    ):
        users = find_users(role=role, org=org)
        tasks = tasks_by_org[org]
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
class TestGetTaskDataset:
    def _test_export_task(self, username: str, tid: int, **kwargs):
        with make_api_client(username) as api_client:
            return export_dataset(api_client.tasks_api.retrieve_dataset_endpoint, id=tid, **kwargs)

    def test_can_export_task_dataset(self, admin_user, tasks_with_shapes):
        task = tasks_with_shapes[0]
        response = self._test_export_task(admin_user, task["id"])
        assert response.data

    @pytest.mark.parametrize("tid", [21])
    @pytest.mark.parametrize(
        "format_name", ["CVAT for images 1.1", "CVAT for video 1.1", "COCO Keypoints 1.0"]
    )
    def test_can_export_task_with_several_jobs(self, admin_user, tid, format_name):
        response = self._test_export_task(admin_user, tid, format=format_name)
        assert response.data

    @pytest.mark.parametrize("tid", [8])
    def test_can_export_task_to_coco_format(self, admin_user, tid):
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

        # check that we can export task
        response = self._test_export_task(admin_user, tid, format="COCO Keypoints 1.0")
        assert response.status == HTTPStatus.OK

        # check that server saved track annotations correctly
        response = get_method(admin_user, f"tasks/{tid}/annotations")
        assert response.status_code == HTTPStatus.OK

        annotations = response.json()
        assert annotations["tracks"][0]["frame"] == 0
        assert annotations["tracks"][0]["shapes"][0]["frame"] == 0
        assert annotations["tracks"][0]["elements"][0]["shapes"][0]["frame"] == 0

    @pytest.mark.usefixtures("restore_db_per_function")
    def test_can_download_task_with_special_chars_in_name(self, admin_user):
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

        response = self._test_export_task(admin_user, task_id)
        assert response.status == HTTPStatus.OK
        assert zipfile.is_zipfile(io.BytesIO(response.data))

    def test_export_dataset_after_deleting_related_cloud_storage(self, admin_user, tasks):
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

            response = export_dataset(api_client.tasks_api.retrieve_dataset_endpoint, id=task["id"])
            assert response.data


@pytest.mark.usefixtures("restore_db_per_function")
@pytest.mark.usefixtures("restore_cvat_data")
@pytest.mark.usefixtures("restore_redis_ondisk_per_function")
class TestPostTaskData:
    _USERNAME = "admin1"

    def _test_cannot_create_task(self, username, spec, data, **kwargs):
        with make_api_client(username) as api_client:
            (task, response) = api_client.tasks_api.create(spec, **kwargs)
            assert response.status == HTTPStatus.CREATED

            (_, response) = api_client.tasks_api.create_data(
                task.id, data_request=deepcopy(data), _content_type="application/json", **kwargs
            )
            assert response.status == HTTPStatus.ACCEPTED

            status = wait_until_task_is_created(api_client.tasks_api, task.id)
            assert status.state.value == "Failed"

        return status

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
        server_files: List[str],
        use_cache: bool = True,
        sorting_method: str = "lexicographical",
        server_files_exclude: Optional[List[str]] = None,
        org: Optional[str] = None,
        filenames: Optional[List[str]] = None,
    ) -> Tuple[int, Any]:
        s3_client = s3.make_client()
        images = generate_image_files(
            3, **({"prefixes": ["img_"] * 3} if not filenames else {"filenames": filenames})
        )

        for image in images:
            for i in range(2):
                image.seek(0)
                s3_client.create_file(
                    data=image,
                    bucket=cloud_storage["resource"],
                    filename=f"test/sub_{i}/{image.name}",
                )
                request.addfinalizer(
                    partial(
                        s3_client.remove_file,
                        bucket=cloud_storage["resource"],
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
                        bucket=cloud_storage["resource"],
                        filename="test/manifest.jsonl",
                    )
                    request.addfinalizer(
                        partial(
                            s3_client.remove_file,
                            bucket=cloud_storage["resource"],
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
        }

        data_spec = {
            "image_quality": 75,
            "use_cache": use_cache,
            "cloud_storage_id": cloud_storage["id"],
            "server_files": (
                server_files if not use_manifest else server_files + ["test/manifest.jsonl"]
            ),
            "sorting_method": sorting_method,
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
        server_files: List[str],
        server_files_exclude: Optional[List[str]],
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
        server_files: List[str],
        expected_result: List[str],
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
            status = self._test_cannot_create_task(self._USERNAME, task_spec, data_spec)
            assert "No media data found" in status.message

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
        filenames: List[str],
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
            jobs: List[models.JobRead] = get_paginated_collection(
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
        server_files: List[str],
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


@pytest.mark.usefixtures("restore_db_per_function")
class TestPatchTaskLabel:
    def _get_task_labels(self, pid, user, **kwargs) -> List[models.Label]:
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
@pytest.mark.usefixtures("restore_cvat_data")
@pytest.mark.usefixtures("restore_redis_ondisk_per_function")
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

        s3_client = s3.make_client()
        bucket_name = cloud_storages[cloud_storage_id]["resource"]

        image = s3_client.download_fileobj(bucket_name, image_name)
        s3_client.remove_file(bucket_name, image_name)
        request.addfinalizer(
            partial(s3_client.create_file, bucket=bucket_name, filename=image_name, data=image)
        )

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


class TestTaskBackups:
    def _make_client(self) -> Client:
        return Client(BASE_URL, config=Config(status_check_period=0.01))

    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_function, restore_cvat_data, tmp_path: Path, admin_user: str):
        self.tmp_dir = tmp_path

        self.client = self._make_client()
        self.user = admin_user

        with self.client:
            self.client.login((self.user, USER_PASS))

    @pytest.mark.parametrize("mode", ["annotation", "interpolation"])
    def test_can_export_backup(self, tasks, mode):
        task_id = next(t for t in tasks if t["mode"] == mode)["id"]
        task = self.client.tasks.retrieve(task_id)

        filename = self.tmp_dir / f"task_{task.id}_backup.zip"
        task.download_backup(filename)

        assert filename.is_file()
        assert filename.stat().st_size > 0

    def test_cannot_export_backup_for_task_without_data(self, tasks):
        task_id = next(t for t in tasks if t["jobs"]["count"] == 0)["id"]
        task = self.client.tasks.retrieve(task_id)

        filename = self.tmp_dir / f"task_{task.id}_backup.zip"

        with pytest.raises(ApiException) as exc:
            task.download_backup(filename)

            assert exc.status == HTTPStatus.BAD_REQUEST
            assert "Backup of a task without data is not allowed" == exc.body.encode()

    @pytest.mark.parametrize("mode", ["annotation", "interpolation"])
    def test_can_import_backup(self, tasks, mode):
        task_json = next(t for t in tasks if t["mode"] == mode)
        self._test_can_restore_backup_task(task_json["id"])

    @pytest.mark.parametrize("mode", ["annotation", "interpolation"])
    def test_can_import_backup_for_task_in_nondefault_state(self, tasks, mode):
        # Reproduces the problem with empty 'mode' in a restored task,
        # described in the reproduction steps https://github.com/cvat-ai/cvat/issues/5668

        task_json = next(t for t in tasks if t["mode"] == mode and t["jobs"]["count"])

        task = self.client.tasks.retrieve(task_json["id"])
        jobs = task.get_jobs()
        for j in jobs:
            j.update({"stage": "validation"})

        self._test_can_restore_backup_task(task_json["id"])

    def _test_can_restore_backup_task(self, task_id: int):
        task = self.client.tasks.retrieve(task_id)
        (_, response) = self.client.api_client.tasks_api.retrieve(task_id)
        task_json = json.loads(response.data)

        filename = self.tmp_dir / f"task_{task.id}_backup.zip"
        task.download_backup(filename)

        restored_task = self.client.tasks.create_from_backup(filename)

        old_jobs = task.get_jobs()
        new_jobs = restored_task.get_jobs()
        assert len(old_jobs) == len(new_jobs)

        for old_job, new_job in zip(old_jobs, new_jobs):
            assert old_job.status == new_job.status
            assert old_job.start_frame == new_job.start_frame
            assert old_job.stop_frame == new_job.stop_frame

        (_, response) = self.client.api_client.tasks_api.retrieve(restored_task.id)
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
                    # depends on the actual job configuration,
                    # unlike to what is obtained from the regular task creation,
                    # where the requested number is recorded
                    r"root\['overlap'\]",
                ],
            )
            == {}
        )


@pytest.mark.usefixtures("restore_db_per_function")
class TestWorkWithGtJobs:
    def test_normal_and_gt_job_annotations_are_not_merged(
        self, tmp_path, admin_user, tasks, jobs, annotations
    ):
        gt_job = next(j for j in jobs if j["type"] == "ground_truth")
        task = tasks[gt_job["task_id"]]
        task_jobs = [j for j in jobs if j["task_id"] == task["id"]]

        gt_job_source_annotations = annotations["job"][str(gt_job["id"])]
        assert (
            gt_job_source_annotations["tags"]
            or gt_job_source_annotations["shapes"]
            or gt_job_source_annotations["tracks"]
        )

        with Client(BASE_URL) as client:
            client.config.status_check_period = 0.01
            client.login((admin_user, USER_PASS))

            for j in task_jobs:
                if j["type"] != "ground_truth":
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

    def test_can_backup_task_with_gt_jobs(self, tmp_path, admin_user, tasks, jobs, annotations):
        gt_job = next(
            j
            for j in jobs
            if j["type"] == "ground_truth" and tasks[j["task_id"]]["jobs"]["count"] == 2
        )
        task = tasks[gt_job["task_id"]]
        annotation_job = next(
            j for j in jobs if j["task_id"] == task["id"] and j["type"] == "annotation"
        )

        gt_job_source_annotations = annotations["job"][str(gt_job["id"])]
        assert (
            gt_job_source_annotations["tags"]
            or gt_job_source_annotations["shapes"]
            or gt_job_source_annotations["tracks"]
        )

        annotation_job_source_annotations = annotations["job"][str(annotation_job["id"])]

        with Client(BASE_URL) as client:
            client.config.status_check_period = 0.01
            client.login((admin_user, USER_PASS))

            backup_file: Path = tmp_path / "dataset.zip"
            client.tasks.retrieve(task["id"]).download_backup(backup_file)

            new_task = client.tasks.create_from_backup(backup_file)
            updated_job_annotations = {
                j.type: json.loads(j.api.retrieve_annotations(j.id)[1].data)
                for j in new_task.get_jobs()
            }

        for job_type, source_annotations in {
            gt_job["type"]: gt_job_source_annotations,
            annotation_job["type"]: annotation_job_source_annotations,
        }.items():
            assert (
                DeepDiff(
                    source_annotations,
                    updated_job_annotations[job_type],
                    ignore_order=True,
                    exclude_regex_paths=[
                        r"root(\['\w+'\]\[\d+\])+\['id'\]",
                        r"root(\['\w+'\]\[\d+\])+\['label_id'\]",
                        r"root(\['\w+'\]\[\d+\])+\['attributes'\]\[\d+\]\['spec_id'\]",
                    ],
                )
                == {}
            )


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


class TestUnequalJobs:
    def _make_client(self) -> Client:
        return Client(BASE_URL, config=Config(status_check_period=0.01))

    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_function, tmp_path: Path, admin_user: str):
        self.tmp_dir = tmp_path

        self.client = self._make_client()
        self.user = admin_user

        with self.client:
            self.client.login((self.user, USER_PASS))

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

        return self.client.tasks.create_from_data(
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
    def _make_client(self) -> Client:
        return Client(BASE_URL, config=Config(status_check_period=0.01))

    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_function, tmp_path: Path, admin_user: str):
        self.tmp_dir = tmp_path
        self.client = self._make_client()
        self.user = admin_user
        self.export_format = "CVAT for images 1.1"
        self.import_format = "CVAT 1.1"

        with self.client:
            self.client.login((self.user, USER_PASS))

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
        platform = request.config.getoption("--platform")
        assert platform in ("kube", "local")
        func = docker_exec_cvat if platform == "local" else kube_exec_cvat
        for _ in range(12):
            sleep(2)
            result, _ = func(command)
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


class TestImportWithComplexFilenames:
    @staticmethod
    def _make_client() -> Client:
        return Client(BASE_URL, config=Config(status_check_period=0.01))

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
        cls.client = cls._make_client()
        cls.user = admin_user
        cls.format_name = "PASCAL VOC 1.1"

        with cls.client:
            cls.client.login((cls.user, USER_PASS))

        cls._init_tasks()

    @classmethod
    def _create_task_with_annotations(cls, filenames: List[str]):
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
        assert (
            DeepDiff(
                original_annotations,
                imported_annotations,
                ignore_order=True,
                exclude_regex_paths=[
                    r"root(\['\w+'\]\[\d+\])+\['id'\]",
                    r"root(\['\w+'\]\[\d+\])+\['label_id'\]",
                    r"root(\['\w+'\]\[\d+\])+\['attributes'\]\[\d+\]\['spec_id'\]",
                ],
            )
            == {}
        )

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
