# Copyright (C) 2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from http import HTTPStatus
from time import sleep

import pytest

from shared.utils.config import get_method, post_method


def _post_task_remote_data(username, task_id, resources):
    data = {
        "remote_files": resources,
        "image_quality": 30,
    }

    return post_method(username, f"tasks/{task_id}/data", data)


def _wait_until_task_is_created(username, task_id):
    url = f"tasks/{task_id}/status"

    for _ in range(100):
        response = get_method(username, url)
        response_json = response.json()
        if response_json["state"] == "Finished" or response_json["state"] == "Failed":
            return response
        sleep(1)
    raise Exception("Cannot create task")


@pytest.mark.usefixtures("restore_db_per_function")
class TestCreateFromRemote:
    task_id = 12

    def _test_can_create(self, user, task_id, resources):
        response = _post_task_remote_data(user, task_id, resources)
        assert response.status_code == HTTPStatus.ACCEPTED

        response = _wait_until_task_is_created(user, task_id)
        response_json = response.json()
        assert response_json["state"] == "Finished"

    def _test_cannot_create(self, user, task_id, resources):
        response = _post_task_remote_data(user, task_id, resources)
        assert response.status_code == HTTPStatus.ACCEPTED

        response = _wait_until_task_is_created(user, task_id)
        response_json = response.json()
        assert response_json["state"] == "Failed"

    def test_cannot_create(self, find_users):
        user = find_users(privilege="admin")[0]["username"]
        remote_resources = ["http://localhost/favicon.ico"]

        self._test_cannot_create(user, self.task_id, remote_resources)

    def test_can_create(self, find_users):
        user = find_users(privilege="admin")[0]["username"]
        remote_resources = ["https://docs.cvat.ai/favicons/favicon-32x32.png"]

        self._test_can_create(user, self.task_id, remote_resources)
