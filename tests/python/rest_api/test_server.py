# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


from http import HTTPStatus

import pytest

from shared.utils.config import make_api_client


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetServer:
    def test_can_retrieve_about_unauthenticated(self):
        with make_api_client(user=None, password=None) as api_client:
            (data, response) = api_client.server_api.retrieve_about()

            assert response.status == HTTPStatus.OK
            assert data.version

    def test_can_retrieve_formats(self, admin_user: str):
        with make_api_client(admin_user) as api_client:
            (data, response) = api_client.server_api.retrieve_annotation_formats()

            assert response.status == HTTPStatus.OK
            assert len(data.importers) != 0
            assert len(data.exporters) != 0


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetSchema:
    def test_can_get_schema_unauthenticated(self):
        with make_api_client(user=None, password=None) as api_client:
            (data, response) = api_client.schema_api.retrieve()

            assert response.status == HTTPStatus.OK
            assert data
