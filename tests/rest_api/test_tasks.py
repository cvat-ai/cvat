# Copyright (C) 2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from http import HTTPStatus
import pytest
from .utils.config import get_method

class TestGetData:
    _USERNAME = 'user1'

    @pytest.mark.parametrize('content_type, task_id', [
        ('image/png',                1),
        ('image/png',                5),
        ('image/x.point-cloud-data', 6),
    ])
    def test_frame_content_type(self, content_type, task_id):
        response = get_method(self._USERNAME, f'tasks/{task_id}/data', type='frame', quality='original', number=0)
        assert response.status_code == HTTPStatus.OK
        assert response.headers['Content-Type'] == content_type
