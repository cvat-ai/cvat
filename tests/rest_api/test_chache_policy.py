# Copyright (C) 2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from http import HTTPStatus
import re
from .utils.config import server_get

class TestCachePolicy:

    @staticmethod
    def _get_js_bundle_url(response):
        match = re.search(r'<script type="text/javascript" src="(/assets/cvat-ui.\w+.min.js)"></script>', response)
        if match:
            return match.group(1)

    def _test_cache_policy_enabled(self, response):
        assert response.status_code == HTTPStatus.OK
        assert 'public' in response.headers['Cache-Control'] and 'max-age' in response.headers['Cache-Control']

    def _test_cache_policy_disabled(self, response):
        assert response.status_code == HTTPStatus.OK
        assert 'no-cache' in response.headers['Cache-Control']

    def test_index_not_cached(self, find_users):
        user = find_users(privilege='user')[0]['username']
        index_page_response = server_get(user, '/')

        self._test_cache_policy_disabled(index_page_response)

    def test_asset_cached(self, find_users):
        user = find_users(privilege='user')[0]['username']
        index_page_response = server_get(user, '/')
        js_asset_url = self._get_js_bundle_url(index_page_response.content.decode('utf-8'))
        js_asset_response = server_get(user, js_asset_url)

        self._test_cache_policy_enabled(js_asset_response)
