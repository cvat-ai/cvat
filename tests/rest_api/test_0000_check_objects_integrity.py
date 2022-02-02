# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import glob
import requests
import json
from deepdiff import DeepDiff
from .utils import config

def test_check_objects_integrity():
    with requests.Session() as session:
        session.auth = ('admin1', config.USER_PASS)

        for filename in glob.glob(os.path.join(config.ASSETS_DIR, '*.json')):
            with open(filename) as f:
                endpoint = os.path.basename(filename).rsplit('.')[0]
                response = session.get(config.get_api_url(endpoint, page_size='all'))
                json_objs = json.load(f)
                resp_objs = response.json()

                assert DeepDiff(json_objs, resp_objs, ignore_order=True,
                    exclude_regex_paths="root\['results'\]\[\d+\]\['last_login'\]") == {}
