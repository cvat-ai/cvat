# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import typing
from http import HTTPStatus

import pytest
from cvat_sdk.api_client.api_client import ApiClient, Endpoint
from cvat_sdk.core.helpers import get_paginated_collection
from deepdiff import DeepDiff

from shared.utils.config import make_api_client

from .utils import CollectionSimpleFilterTestBase


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetUsers:
    def _test_can_see(
        self,
        user,
        data,
        id_: typing.Union[typing.Literal["self"], int, None] = None,
        *,
        exclude_paths="",
        **kwargs,
    ):
        with make_api_client(user) as api_client:
            # TODO: refactor into several functions
            if id_ == "self":
                (_, response) = api_client.users_api.retrieve_self(**kwargs, _parse_response=False)
                assert response.status == HTTPStatus.OK
                response_data = json.loads(response.data)
            elif id_ is None:
                response_data = get_paginated_collection(
                    api_client.users_api.list_endpoint, return_json=True, **kwargs
                )
            else:
                (_, response) = api_client.users_api.retrieve(id_, **kwargs, _parse_response=False)
                assert response.status == HTTPStatus.OK
                response_data = json.loads(response.data)

        assert DeepDiff(data, response_data, ignore_order=True, exclude_paths=exclude_paths) == {}

    def _test_cannot_see(
        self, user, id_: typing.Union[typing.Literal["self"], int, None] = None, **kwargs
    ):
        with make_api_client(user) as api_client:
            # TODO: refactor into several functions
            if id_ == "self":
                (_, response) = api_client.users_api.retrieve_self(
                    **kwargs, _parse_response=False, _check_status=False
                )
            elif id_ is None:
                (_, response) = api_client.users_api.list(
                    **kwargs, _parse_response=False, _check_status=False
                )
            else:
                (_, response) = api_client.users_api.retrieve(
                    id_, **kwargs, _parse_response=False, _check_status=False
                )
            assert response.status == HTTPStatus.FORBIDDEN

    def test_admin_can_see_all_others(self, users):
        exclude_paths = [f"root[{i}]['last_login']" for i in range(len(users))]
        self._test_can_see("admin2", users.raw, exclude_paths=exclude_paths)

    def test_everybody_can_see_self(self, users_by_name):
        for user, data in users_by_name.items():
            self._test_can_see(
                user, data, id_="self", exclude_paths=["root['last_login']", "root['key']"]
            )

    def test_non_members_cannot_see_list_of_members(self):
        self._test_cannot_see("user2", org="org1")

    def test_non_admin_cannot_see_others(self, users):
        non_admins = (v for v in users if not v["is_superuser"])
        user = next(non_admins)["username"]
        user_id = next(non_admins)["id"]

        self._test_cannot_see(user, id_=user_id)

    def test_all_members_can_see_list_of_members(self, find_users, users):
        org_members = [user["username"] for user in find_users(org=1)]
        available_fields = ["url", "id", "username", "first_name", "last_name"]

        data = [
            dict(filter(lambda row: row[0] in available_fields, user.items()))
            for user in users
            if user["username"] in org_members
        ]

        for member in org_members:
            self._test_can_see(member, data, org="org1")


class TestUsersListFilters(CollectionSimpleFilterTestBase):
    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_class, admin_user, users):
        self.user = admin_user
        self.samples = users

    def _get_endpoint(self, api_client: ApiClient) -> Endpoint:
        return api_client.users_api.list_endpoint

    @pytest.mark.parametrize(
        "field",
        ("is_active", "username"),
    )
    def test_can_use_simple_filter_for_object_list(self, field):
        return super()._test_can_use_simple_filter_for_object_list(field)
