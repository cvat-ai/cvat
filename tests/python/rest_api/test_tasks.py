# Copyright (C) 2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
from copy import deepcopy
from http import HTTPStatus
from time import sleep

import pytest
from cvat_sdk.api_client import apis, models
from cvat_sdk.core.helpers import get_paginated_collection
from deepdiff import DeepDiff

from shared.utils.config import get_method, make_api_client, patch_method
from shared.utils.helpers import generate_image_files

from .utils import export_dataset


def get_cloud_storage_content(username, cloud_storage_id, manifest):
    with make_api_client(username) as api_client:
        (data, _) = api_client.cloudstorages_api.retrieve_content(
            cloud_storage_id, manifest_path=manifest
        )
        return data


@pytest.mark.usefixtures("dontchangedb")
class TestGetTasks:
    def _test_task_list_200(self, user, project_id, data, exclude_paths="", **kwargs):
        with make_api_client(user) as api_client:
            results = get_paginated_collection(
                api_client.projects_api.list_tasks_endpoint,
                return_json=True,
                id=project_id,
                **kwargs,
            )
            assert DeepDiff(data, results, ignore_order=True, exclude_paths=exclude_paths) == {}

    def _test_task_list_403(self, user, project_id, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.projects_api.list_tasks(
                project_id, **kwargs, _parse_response=False, _check_status=False
            )
            assert response.status == HTTPStatus.FORBIDDEN

    def _test_users_to_see_task_list(
        self, project_id, tasks, users, is_staff, is_allow, is_project_staff, **kwargs
    ):
        if is_staff:
            users = [user for user in users if is_project_staff(user["id"], project_id)]
        else:
            users = [user for user in users if not is_project_staff(user["id"], project_id)]
        assert len(users)

        for user in users:
            if is_allow:
                self._test_task_list_200(user["username"], project_id, tasks, **kwargs)
            else:
                self._test_task_list_403(user["username"], project_id, **kwargs)

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


@pytest.mark.usefixtures("changedb")
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


@pytest.mark.usefixtures("dontchangedb")
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


@pytest.mark.usefixtures("changedb")
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
        username, tid = find_task_staff_user(filtered_tasks, users, task_staff)

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
        username, tid = find_task_staff_user(tasks, users, task_staff, [14])

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


@pytest.mark.usefixtures("dontchangedb")
class TestGetTaskDataset:
    def _test_export_task(self, username, tid, **kwargs):
        with make_api_client(username) as api_client:
            return export_dataset(api_client.tasks_api.retrieve_dataset_endpoint, id=tid, **kwargs)

    def test_can_export_task_dataset(self, admin_user, tasks_with_shapes):
        task = tasks_with_shapes[0]
        response = self._test_export_task(admin_user, task["id"], format="CVAT for images 1.1")
        assert response.data


@pytest.mark.usefixtures("changedb")
@pytest.mark.usefixtures("restore_cvat_data")
class TestPostTaskData:
    _USERNAME = "admin1"

    @staticmethod
    def _wait_until_task_is_created(api: apis.TasksApi, task_id: int) -> models.RqStatus:
        for _ in range(100):
            (status, _) = api.retrieve_status(task_id)
            if status.state.value in ["Finished", "Failed"]:
                return status
            sleep(1)
        raise Exception("Cannot create task")

    def _test_create_task(self, username, spec, data, content_type, **kwargs):
        with make_api_client(username) as api_client:
            (task, response) = api_client.tasks_api.create(spec, **kwargs)
            assert response.status == HTTPStatus.CREATED

            (_, response) = api_client.tasks_api.create_data(
                task.id, data_request=deepcopy(data), _content_type=content_type, **kwargs
            )
            assert response.status == HTTPStatus.ACCEPTED

            status = self._wait_until_task_is_created(api_client.tasks_api, task.id)
            assert status.state.value == "Finished"

        return task.id

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

        task_id = self._test_create_task(
            self._USERNAME, task_spec, task_data, content_type="multipart/form-data"
        )

        # check task size
        with make_api_client(self._USERNAME) as api_client:
            (task, _) = api_client.tasks_api.retrieve(task_id)
            assert task.size == 4

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

        task_id = self._test_create_task(
            self._USERNAME, spec, task_data, content_type="multipart/form-data"
        )

        response = get_method(self._USERNAME, f"tasks/{task_id}")
        label_ids = {}
        for label in response.json()["labels"]:
            label_ids.setdefault(label["type"], []).append(label["id"])

        job_id = response.json()["segments"][0]["jobs"][0]["id"]
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
            "storage": "cloud_storage",
            "cloud_storage_id": cloud_storage_id,
            "server_files": cloud_storage_content,
        }

        self._test_create_task(
            self._USERNAME, task_spec, data_spec, content_type="application/json", org=org
        )
