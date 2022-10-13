# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import typing
from http import HTTPStatus

import pytest
from cvat_sdk.core.helpers import get_paginated_collection
from deepdiff import DeepDiff

from shared.utils.config import make_api_client


@pytest.mark.usefixtures("dontchangedb")
class TestGetUsers:
    def _case_self_id(self, api_client, **kwargs):
        (_, response) = api_client.users_api.retrieve_self(
            **kwargs, _parse_response=False
        )
        return response

    def _case_none_id(self, api_client, **kwargs):
        return get_paginated_collection(
            api_client.users_api.list_endpoint, return_json=True, **kwargs
        )

    def _case_other_id(self, api_client, id_, **kwargs):
        (_, response) = api_client.users_api.retrieve(
            id_, **kwargs, _parse_response=False
        )
        return response

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
            if id_ == "self":
                response = self._case_self_id(api_client, **kwargs)
                assert response.status == HTTPStatus.OK
                response_data = json.loads(response.data)
            elif id_ is None:
                response_data = self._case_none_id(api_client, **kwargs)
            else:
                response = self._case_other_id(api_client, id_, **kwargs)
                assert response.status == HTTPStatus.OK
                response_data = json.loads(response.data)
        assert (
            DeepDiff(
                data, response_data, ignore_order=True, exclude_paths=exclude_paths
            )
            == {}
        )

    def _test_cannot_see(
        self,
        user,
        id_: typing.Union[typing.Literal["self"], int, None] = None,
        **kwargs,
    ):
        with make_api_client(user) as api_client:
            if id_ == "self":
                return self._case_self_id(api_client, **kwargs, _check_status=False)
            elif id_ is None:
                (_, response) = api_client.users_api.list(
                    **kwargs, _parse_response=False, _check_status=False
                )
            else:
                return self._case_other_id(
                    api_client, id_, **kwargs, _check_status=False
                )
            assert response.status == HTTPStatus.FORBIDDEN

    def _test_get_user_info(self, user):
        response = self._case_self_id(make_api_client(user))
        response_data = json.loads(response.data)
        assert (response_data["username"] == str(user)) & (
            len(response_data.keys()) == 12
        )
        print(response_data)

    def test_admin_can_see_all_others(self, users):
        exclude_paths = [f"root[{i}]['last_login']" for i in range(len(users))]
        self._test_can_see("admin2", users.raw, exclude_paths=exclude_paths)

    def test_everybody_can_see_self(self, users_by_name):
        for user, data in users_by_name.items():
            self._test_can_see(
                user, data, id_="self", exclude_paths="root['last_login']"
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

    def test_every_user_gets_his_info(self, users):
        for user in users:
            self._test_get_user_info(user["username"])
