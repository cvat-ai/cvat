# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import glob
import requests
import json
from . import config

def filter_results(data, keys):
    for d in data['results']:
        list(d.pop(k) for k in keys if k in d)

def test_check_objects_integrity():
    with requests.Session() as session:
        session.auth = ('admin1', config.USER_PASS)

        for filename in glob.glob(os.path.join(config.ASSETS_DIR, '*.json')):
            with open(filename) as f:
                endpoint = os.path.basename(filename).rsplit('.')[0]
                response = session.get(f'http://localhost:8080/api/v1/{endpoint}')
                json_objs = json.load(f)
                resp_objs = response.json()

                if endpoint == 'users':
                    filter_results(json_objs, ['last_login'])
                    filter_results(resp_objs, ['last_login'])

                assert json.dumps(json_objs, sort_keys=True, indent=4) == json.dumps(
                    resp_objs, sort_keys=True, indent=4)
