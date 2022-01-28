# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

from email import header
import os
import requests

ROOT_DIR = os.path.dirname(__file__)
ASSETS_DIR = os.path.join(ROOT_DIR, '..', 'assets')
# Suppress the warning from Bandit about hardcoded passwords
USER_PASS = '!Q@W#E$R' # nosec
BASE_URL = 'http://localhost:8080/api/v1/'

def get_api_url(endpoint, **kwargs):
    return BASE_URL + endpoint + '?' + '&'.join([f'{k}={v}' for k,v in kwargs.items()])

def get_method(username, endpoint, **kwargs):
    return requests.get(get_api_url(endpoint, **kwargs), auth=(username, USER_PASS))

def patch_method(username, endpoint, data, **kwargs):
    response = requests.patch(get_api_url(endpoint, **kwargs), json=data, auth=(username, USER_PASS))
    return response