# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
from http import HTTPStatus
import requests
import json
from .utils import config
from deepdiff import DeepDiff

def compare_organizations(org_id, response):
    assert response.status_code == HTTPStatus.OK
    with open(os.path.join(config.ASSETS_DIR, 'organizations.json')) as f:
        org = next(filter(lambda org: org['id'] == org_id, json.load(f)))
    DeepDiff(org, response.json())

def test_admin1_get_organization_id_1():
    response = requests.get(config.get_api_url('organizations/1'), auth=('admin1', config.USER_PASS))
    compare_organizations(1, response)

def test_user1_get_organization_id_1():
    response = requests.get(config.get_api_url('organizations/1'), auth=('user1', config.USER_PASS))
    compare_organizations(1, response)

