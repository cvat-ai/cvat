# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os

ROOT_DIR = os.path.dirname(__file__)
ASSETS_DIR = os.path.join(ROOT_DIR, '..', 'assets')
# Suppress the warning from Bandit about hardcoded passwords
USER_PASS = '!Q@W#E$R' # nosec
BASE_URL = 'http://localhost:8080/api/v1/'

def get_api_url(endpoint, **kwargs):
    return BASE_URL + endpoint + '?' + '&'.join([f'{k}={v}' for k,v in kwargs.items()])