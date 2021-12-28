# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import json
import os.path as osp
from http import HTTPStatus

import pytest
from deepdiff import DeepDiff

from .utils.config import ASSETS_DIR, get_method

@pytest.fixture(scope='module')
def users():
    with open(osp.join(ASSETS_DIR, 'users.json')) as f:
        return json.load(f)

def test_non_admin_cannot_see_others():
    for username in ['business1', 'dummy1', 'user1', 'worker1']:
        response = get_method(username, 'users')

        assert response.status_code == HTTPStatus.OK
        assert response.json()['count'] == 1

def test_non_members_cannot_see_list_of_members():
    response = get_method('user2', 'users', org='org1')
    assert response.status_code == HTTPStatus.FORBIDDEN

def test_admin_can_see_all_others(users):
    response = get_method('admin2', 'users')

    assert response.status_code == HTTPStatus.OK
    assert response.json()['count'] == users['count']

def test_everybody_can_see_self(users):
    users = {user['username']: user for user in users['results']}

    for username in ['admin1', 'business1', 'dummy1', 'user1', 'worker1']:
        response = get_method(username, 'users/self')

        assert response.status_code == HTTPStatus.OK
        assert DeepDiff(users[username], response.json(), ignore_order=True,
            exclude_paths="root['last_login']") == {}

def test_all_members_can_see_list_of_members(users):
    available_fields = ['url', 'id', 'username', 'first_name', 'last_name']
    org1_members = ['business1', 'user1', 'worker1', 'worker2']
    users = [dict(filter(lambda row: row[0] in available_fields, user.items()))
        for user in users['results'] if user['username'] in org1_members]

    for username in org1_members:
        response = get_method(username, 'users', org='org1')

        assert response.status_code == HTTPStatus.OK
        assert DeepDiff(users, response.json()['results'], ignore_order=True) == {}
