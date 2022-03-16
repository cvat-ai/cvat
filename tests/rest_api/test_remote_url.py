# Copyright (C) 2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from time import sleep
from http import HTTPStatus
from .utils.config import get_method, post_method


def _post_task_remote_data(username, task_id, resources):
    data = {
        'remote_files': resources,
        'image_quality': 30,
    }

    return post_method(username, f'tasks/{task_id}/data', data)

def _wait_until_task_is_created(username, task_id):
    url = f'tasks/{task_id}/status'

    while True:
        response = get_method(username, url)
        response_json = response.json()
        if response_json['state'] == 'Finished' or response_json['state'] == 'Failed':
            return response
        sleep(1)


class TestGetAnalytics:
    task_id = 12
    def _test_can_create(self, user, task_id, resources):
        response = _post_task_remote_data(user, task_id, resources)
        assert response.status_code == HTTPStatus.ACCEPTED

        response = _wait_until_task_is_created(user, task_id)
        response_json = response.json()
        assert response_json['state'] == 'Finished'

    def _test_cannot_create(self, user, task_id, resources):
        response = _post_task_remote_data(user, task_id, resources)
        assert response.status_code == HTTPStatus.ACCEPTED

        response = _wait_until_task_is_created(user, task_id)
        response_json = response.json()
        assert response_json['state'] == 'Failed'

    def test_cannot_create(self, find_users):
        user = find_users(privilege='admin')[0]['username']
        remote_resources = ['http://localhost/favicon.ico']

        self._test_cannot_create(user, self.task_id, remote_resources)

    def test_can_create(self, find_users):
        user = find_users(privilege='admin')[0]['username']
        remote_resources = ['https://openvinotoolkit.github.io/cvat/favicons/favicon-32x32.png']

        self._test_can_create(user, self.task_id, remote_resources)
