# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
from http import HTTPStatus
import requests
import json
from .utils import config
from deepdiff import DeepDiff


def test_non_admin_cannot_see_others():
    for username in ['dummy1', 'worker1', 'user1', 'business1']:
        response = requests.get(config.get_api_url('users'), auth=(username, config.USER_PASS))
        assert response.status_code == HTTPStatus.OK
        assert response.json()['count'] == 1

def test_admin_can_see_all_others():
    response = requests.get(config.get_api_url('users'), auth=('admin2', config.USER_PASS))
    assert response.status_code == HTTPStatus.OK
    with open(os.path.join(config.ASSETS_DIR, 'users.json')) as f:
        data = json.load(f)
        assert response.json()['count'] == data['count']

def test_everybody_can_see_self():
    with open(os.path.join(config.ASSETS_DIR, 'users.json')) as f:
        data = json.load(f)['results']
        users = {user['username']:user for user in data}

    for username in ['dummy1', 'worker1', 'user1', 'business1', 'admin1']:
        response = requests.get(config.get_api_url('users/self'), auth=(username, config.USER_PASS))
        assert response.status_code == HTTPStatus.OK
        assert DeepDiff(users[username], response.json(), ignore_order=True,
            exclude_paths="root['last_login']") == {}
