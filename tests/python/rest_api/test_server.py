# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


from http import HTTPStatus
from typing import Any

import pytest

from shared.utils.config import get_method, make_api_client, put_method


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetServer:
    def test_can_retrieve_about_unauthenticated(self):
        with make_api_client(user=None, password=None) as api_client:
            data, response = api_client.server_api.retrieve_about()

            assert response.status == HTTPStatus.OK
            assert data.version

    def test_can_retrieve_formats(self, admin_user: str):
        with make_api_client(admin_user) as api_client:
            data, response = api_client.server_api.retrieve_annotation_formats()

            assert response.status == HTTPStatus.OK
            assert len(data.importers) != 0
            assert len(data.exporters) != 0

    def test_method_not_allowed_for_existing_route(self, admin_user: str):
        response = put_method(admin_user, "server/annotation/formats", data=None)
        assert response.status_code == HTTPStatus.METHOD_NOT_ALLOWED


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetSchema:
    def test_can_get_schema_unauthenticated(self):
        with make_api_client(user=None, password=None) as api_client:
            data, response = api_client.schema_api.retrieve()

            assert response.status == HTTPStatus.OK
            assert data


@pytest.mark.usefixtures("restore_db_per_class")
class TestPageSize:
    def test_default_page_size(self, admin_user: str):
        response = get_method(admin_user, "quality/conflicts")
        assert response.status_code == HTTPStatus.OK
        assert len(response.json()["results"]) == 10

    @pytest.mark.parametrize(
        "page_size, expected_page_size",
        [
            (50, 50),
            (100, 100),
            (1000, 100),
        ],
    )
    def test_page_size(self, admin_user: str, page_size: int, expected_page_size: int):
        response = get_method(admin_user, "quality/conflicts", page_size=page_size)
        assert response.status_code == HTTPStatus.OK
        assert len(response.json()["results"]) == expected_page_size

    @pytest.mark.parametrize("page_size", [0, -1, "abc", "all", "1.5", ""])
    def test_invalid_page_size_is_rejected(self, admin_user: str, page_size: Any):
        response = get_method(admin_user, "quality/conflicts", page_size=page_size)
        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert "page_size" in response.json()
