# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
from http import HTTPStatus
import json
from .utils.config import get_method, ASSETS_DIR
from deepdiff import DeepDiff

def compare_organizations(org_id, response):
    assert response.status_code == HTTPStatus.OK
    with open(os.path.join(ASSETS_DIR, 'organizations.json')) as f:
        org = next(filter(lambda org: org['id'] == org_id, json.load(f)))
    DeepDiff(org, response.json())

def test_admin1_get_organization_id_1():
    response = get_method('admin1', 'organizations/1')
    assert response.status_code == HTTPStatus.OK

def test_user1_get_organization_id_1():
    response = get_method('user1', 'organizations/1')
    assert response.status_code == HTTPStatus.OK

