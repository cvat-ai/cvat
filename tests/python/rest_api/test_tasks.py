# Copyright (C) 2022 Intel Corporation
# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import json
import os.path as osp
import subprocess
from copy import deepcopy
from functools import partial
from http import HTTPStatus
from itertools import chain, product
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import List

import pytest
from cvat_sdk import Client, Config, exceptions
from cvat_sdk.api_client import models
from cvat_sdk.api_client.api_client import ApiClient, Endpoint
from cvat_sdk.core.helpers import get_paginated_collection
from cvat_sdk.core.proxies.tasks import ResourceType, Task
from deepdiff import DeepDiff
from PIL import Image

import shared.utils.s3 as s3
from shared.fixtures.init import get_server_image_tag
from shared.utils.config import (
    BASE_URL,
    USER_PASS,
    get_method,
    make_api_client,
    patch_method,
    post_method,
)
from shared.utils.helpers import generate_image_files

from .utils import (
    CollectionSimpleFilterTestBase,
    _test_create_task,
    export_dataset,
    wait_until_task_is_created,
)


def get_cloud_storage_content(username, cloud_storage_id, manifest):
    with make_api_client(username) as api_client:
        (data, _) = api_client.cloudstorages_api.retrieve_content(
            cloud_storage_id, manifest_path=manifest
        )
        return data


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

    def _test_create_task_403(self, user, spec, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.tasks_api.create(
                spec, **kwargs, _parse_response=False, _check_status=False
            )
            assert response.status == HTTPStatus.FORBIDDEN

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

    def test_can_create_task_with_skeleton(self):
        username = "admin1"

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
            assert DeepDiff(data, json.loads(response.data), exclude_paths="root['version']") == {}
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
                org=org,
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
                org_id=org,
                action="update",
                patched_labeled_data_request=deepcopy(data),
                _parse_response=False,
                _check_status=False,
            )

        self._test_check_response(is_allow, response, data)


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetTaskDataset:
    def _test_export_task(self, username, tid, **kwargs):
        with make_api_client(username) as api_client:
            return export_dataset(api_client.tasks_api.retrieve_dataset_endpoint, id=tid, **kwargs)

    def test_can_export_task_dataset(self, admin_user, tasks_with_shapes):
        task = tasks_with_shapes[0]
        response = self._test_export_task(admin_user, task["id"], format="CVAT for images 1.1")
        assert response.data

    @pytest.mark.parametrize("tid", [21])
    @pytest.mark.parametrize(
        "format_name", ["CVAT for images 1.1", "CVAT for video 1.1", "COCO Keypoints 1.0"]
    )
    def test_can_export_task_with_several_jobs(self, admin_user, tid, format_name):
        response = self._test_export_task(admin_user, tid, format=format_name)
        assert response.data


@pytest.mark.usefixtures("restore_db_per_function")
@pytest.mark.usefixtures("restore_cvat_data")
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

        task_id, _ = _test_create_task(
            self._USERNAME, task_spec, task_data, content_type="multipart/form-data"
        )

        # check task size
        with make_api_client(self._USERNAME) as api_client:
            (task, _) = api_client.tasks_api.retrieve(task_id)
            assert task.size == 4

    def test_can_create_task_with_sorting_method(self):
        task_spec = {
            "name": f"test {self._USERNAME} to create a task with a custom sorting method",
            "labels": [
                {
                    "name": "car",
                    "color": "#ff00ff",
                    "attributes": [],
                }
            ],
        }

        image_files = generate_image_files(15)

        task_data = {
            "client_files": image_files[5:] + image_files[:5],  # perturb the order
            "image_quality": 70,
            "sorting_method": "natural",
        }

        # Besides testing that the sorting method is applied, this also checks for
        # regressions of <https://github.com/opencv/cvat/issues/4962>.
        task_id, _ = _test_create_task(
            self._USERNAME, task_spec, task_data, content_type="multipart/form-data"
        )

        # check that the frames were sorted again
        with make_api_client(self._USERNAME) as api_client:
            data_meta, _ = api_client.tasks_api.retrieve_data_meta(task_id)

            # generate_image_files produces files that are already naturally sorted
            for image_file, frame in zip(image_files, data_meta.frames):
                assert image_file.name == frame.name

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

        task_id, _ = _test_create_task(
            self._USERNAME, spec, task_data, content_type="multipart/form-data"
        )

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
        "cloud_storage_id, manifest, use_bucket_content, org",
        [
            (1, "manifest.jsonl", False, ""),  # public bucket
            (2, "sub/manifest.jsonl", True, "org2"),  # private bucket
        ],
    )
    def test_create_task_with_cloud_storage_files(
        self, cloud_storage_id, manifest, use_bucket_content, org
    ):
        if use_bucket_content:
            cloud_storage_content = get_cloud_storage_content(
                self._USERNAME, cloud_storage_id, manifest
            )
        else:
            cloud_storage_content = ["image_case_65_1.png", "image_case_65_2.png"]
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
            "use_cache": True,
            "cloud_storage_id": cloud_storage_id,
            "server_files": cloud_storage_content,
        }

        _test_create_task(
            self._USERNAME, task_spec, data_spec, content_type="application/json", org=org
        )

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
            _test_create_task(user, task_spec, data_spec, content_type="application/json")

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
        ],
    )
    @pytest.mark.parametrize("org", [""])
    def test_create_task_with_file_pattern(
        self,
        cloud_storage_id,
        manifest,
        filename_pattern,
        sub_dir,
        task_size,
        org,
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

        with TemporaryDirectory() as tmp_dir:
            for image in images:
                with open(osp.join(tmp_dir, image.name), "wb") as f:
                    f.write(image.getvalue())

            command = [
                "docker",
                "run",
                "--rm",
                "-u",
                "root:root",
                "-v",
                f"{tmp_dir}:/local",
                "--entrypoint",
                "python3",
                get_server_image_tag(),
                "utils/dataset_manifest/create.py",
                "--output-dir",
                "/local",
                "/local",
            ]
            subprocess.check_output(command)

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
            "server_files": [f"test/sub/{manifest}" if sub_dir else manifest],
            "filename_pattern": filename_pattern,
        }

        if task_size:
            task_id, _ = _test_create_task(
                self._USERNAME, task_spec, data_spec, content_type="application/json", org=org
            )

            with make_api_client(self._USERNAME) as api_client:
                (task, response) = api_client.tasks_api.retrieve(task_id, org=org)
                assert response.status == HTTPStatus.OK
                assert task.size == task_size
        else:
            status = self._test_cannot_create_task(self._USERNAME, task_spec, data_spec)
            assert "No media data found" in status.message

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

        task_id, _ = _test_create_task(
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
        response = post_method(self._USERNAME, "/tasks", task_spec)
        assert response.status_code == HTTPStatus.BAD_REQUEST

        response = get_method(self._USERNAME, "/tasks")
        assert response.status_code == HTTPStatus.OK

    def test_cannot_create_task_with_same_skeleton_sublabels(self):
        task_spec = {
            "name": "test cannot create task with same skeleton sublabels",
            "labels": [
                {"name": "s1", "type": "skeleton", "sublabels": [{"name": "1"}, {"name": "1"}]}
            ],
        }
        response = post_method(self._USERNAME, "/tasks", task_spec)
        assert response.status_code == HTTPStatus.BAD_REQUEST

        response = get_method(self._USERNAME, "/tasks")
        assert response.status_code == HTTPStatus.OK


@pytest.mark.usefixtures("restore_db_per_function")
class TestPatchTaskLabel:
    def _get_task_labels(self, pid, user, **kwargs) -> List[models.Label]:
        kwargs.setdefault("return_json", True)
        with make_api_client(user) as api_client:
            return get_paginated_collection(
                api_client.labels_api.list_endpoint, task_id=pid, **kwargs
            )

    def test_can_delete_label(self, tasks, labels, admin_user):
        task = [t for t in tasks if t["project_id"] is None and t["labels"]["count"] > 0][0]
        label = deepcopy([l for l in labels if l.get("task_id") == task["id"]][0])
        label_payload = {"id": label["id"], "deleted": True}

        response = patch_method(admin_user, f'/tasks/{task["id"]}', {"labels": [label_payload]})
        assert response.status_code == HTTPStatus.OK, response.content
        assert response.json()["labels"]["count"] == task["labels"]["count"] - 1

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

        response = patch_method(admin_user, f'/tasks/{task["id"]}', {"labels": [label_payload]})
        assert response.status_code == HTTPStatus.OK
        assert response.json()["labels"]["count"] == task["labels"]["count"] - 1

        resulting_labels = self._get_task_labels(task["id"], admin_user)
        assert DeepDiff(resulting_labels, task_labels, ignore_order=True) == {}

    def test_can_rename_label(self, tasks, labels, admin_user):
        task = [t for t in tasks if t["project_id"] is None and t["labels"]["count"] > 0][0]
        task_labels = deepcopy([l for l in labels if l.get("task_id") == task["id"]])
        task_labels[0].update({"name": "new name"})

        response = patch_method(admin_user, f'/tasks/{task["id"]}', {"labels": [task_labels[0]]})
        assert response.status_code == HTTPStatus.OK

        resulting_labels = self._get_task_labels(task["id"], admin_user)
        assert DeepDiff(resulting_labels, task_labels, ignore_order=True) == {}

    def test_cannot_rename_label_to_duplicate_name(self, tasks, labels, admin_user):
        task = [t for t in tasks if t["project_id"] is None and t["labels"]["count"] > 1][0]
        task_labels = deepcopy([l for l in labels if l.get("task_id") == task["id"]])
        task_labels[0].update({"name": task_labels[1]["name"]})

        label_payload = {"id": task_labels[0]["id"], "name": task_labels[0]["name"]}

        response = patch_method(admin_user, f'/tasks/{task["id"]}', {"labels": [label_payload]})
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

        response = patch_method(admin_user, f'/tasks/{task["id"]}', {"labels": [new_label]})
        assert response.status_code == HTTPStatus.NOT_FOUND
        assert f"Not found label with id #{new_label['id']} to change" in response.text

    def test_admin_can_add_label(self, tasks, admin_user):
        task = [t for t in tasks if t["project_id"] is None][0]
        new_label = {"name": "new name"}

        response = patch_method(admin_user, f'/tasks/{task["id"]}', {"labels": [new_label]})
        assert response.status_code == HTTPStatus.OK
        assert response.json()["labels"]["count"] == task["labels"]["count"] + 1

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
        response = patch_method(
            user["username"],
            f'/tasks/{task["id"]}',
            {"labels": [new_label]},
            org_id=task["organization"],
        )
        assert response.status_code == HTTPStatus.OK
        assert response.json()["labels"]["count"] == task["labels"]["count"] + 1

    @pytest.mark.parametrize("role", ["supervisor", "worker"])
    def test_non_task_staff_org_members_cannot_add_label(
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
            and is_org_member(user["id"], task["organization"])
        )

        new_label = {"name": "new name"}
        response = patch_method(
            user["username"],
            f'/tasks/{task["id"]}',
            {"labels": [new_label]},
            org_id=task["organization"],
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

        new_label = {"name": "new name"}
        response = patch_method(
            user["username"],
            f'/tasks/{task["id"]}',
            {"labels": [new_label]},
            org_id=task["organization"],
        )
        assert response.status_code == HTTPStatus.OK
        assert response.json()["labels"]["count"] == task["labels"]["count"] + 1

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

        response = patch_method(admin_user, f'/tasks/{task["id"]}', {"labels": [new_skeleton]})
        assert response.status_code == HTTPStatus.OK
        assert response.json()["labels"]["count"] == task["labels"]["count"] + 1


@pytest.mark.usefixtures("restore_db_per_function")
@pytest.mark.usefixtures("restore_cvat_data")
class TestWorkWithTask:
    _USERNAME = "admin1"

    @pytest.mark.with_external_services
    @pytest.mark.parametrize(
        "cloud_storage_id, manifest, org",
        [(1, "manifest.jsonl", "")],  # public bucket
    )
    def test_work_with_task_containing_non_stable_cloud_storage_files(
        self, cloud_storage_id, manifest, org, cloud_storages, request
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

        task_id, _ = _test_create_task(
            self._USERNAME, task_spec, data_spec, content_type="application/json", org=org
        )

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

        self._test_assigned_users_to_see_task_preview(tasks, users, is_task_staff, org=org["slug"])

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
        (task_id, _) = _test_create_task(
            user, task_spec, data_spec, content_type="application/json"
        )

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
def test_can_report_correct_completed_jobs_count(tasks, jobs, admin_user):
    # Reproduces https://github.com/opencv/cvat/issues/6098
    task = next(
        t
        for t in tasks
        if t["jobs"]["count"] > 1 and t["jobs"]["completed"] == 0 and t["labels"]["count"] > 1
    )
    task_jobs = [j for j in jobs if j["task_id"] == task["id"]]

    with make_api_client(admin_user) as api_client:
        api_client.jobs_api.partial_update(
            task_jobs[0]["id"],
            patched_job_write_request=dict(stage="acceptance", state="completed"),
        )

        task, _ = api_client.tasks_api.retrieve(task["id"])
        assert task.jobs.completed == 1
