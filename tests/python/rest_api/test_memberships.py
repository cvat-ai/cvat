# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from http import HTTPStatus
from typing import ClassVar, List

import pytest
from cvat_sdk.api_client.api_client import ApiClient, Endpoint
from deepdiff import DeepDiff

from shared.utils.config import get_method, make_api_client, patch_method

from .utils import CollectionSimpleFilterTestBase


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetMemberships:
    def _test_can_see_memberships(self, user, data, **kwargs):
        response = get_method(user, "memberships", **kwargs)

        assert response.status_code == HTTPStatus.OK
        assert DeepDiff(data, response.json()["results"]) == {}

    def _test_cannot_see_memberships(self, user, **kwargs):
        response = get_method(user, "memberships", **kwargs)

        assert response.status_code == HTTPStatus.FORBIDDEN

    def test_admin_can_see_all_memberships(self, memberships):
        self._test_can_see_memberships("admin2", memberships.raw, page_size="all")

    @pytest.mark.parametrize("field_value, query_value", [(1, 1), (None, "")])
    def test_can_filter_by_org_id(self, field_value, query_value, memberships):
        memberships = filter(lambda m: m["organization"] == field_value, memberships)
        self._test_can_see_memberships(
            "admin2", list(memberships), page_size="all", org_id=query_value
        )

    def test_non_admin_can_see_only_self_memberships(self, memberships):
        non_admins = ["business1", "user1", "dummy1", "worker2"]
        for username in non_admins:
            data = [obj for obj in memberships if obj["user"]["username"] == username]
            self._test_can_see_memberships(username, data)

    def test_all_members_can_see_other_members_membership(self, memberships):
        data = [obj for obj in memberships if obj["organization"] == 1]
        for membership in data:
            self._test_can_see_memberships(membership["user"]["username"], data, org_id=1)

    def test_non_members_cannot_see_members_membership(self):
        non_org1_users = ["user2", "worker3"]
        for user in non_org1_users:
            self._test_cannot_see_memberships(user, org_id=1)


class TestMembershipsListFilters(CollectionSimpleFilterTestBase):
    field_lookups = {
        "user": ["user", "username"],
    }

    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_class, admin_user, memberships):
        self.user = admin_user
        self.samples = memberships

    def _get_endpoint(self, api_client: ApiClient) -> Endpoint:
        return api_client.memberships_api.list_endpoint

    @pytest.mark.parametrize(
        "field",
        ("role", "user"),
    )
    def test_can_use_simple_filter_for_object_list(self, field):
        return super().test_can_use_simple_filter_for_object_list(field)


@pytest.mark.usefixtures("restore_db_per_function")
class TestPatchMemberships:
    _ORG: ClassVar[int] = 1
    ROLES: ClassVar[List[str]] = ["worker", "supervisor", "maintainer", "owner"]

    def _test_can_change_membership(self, user, membership_id, new_role):
        response = patch_method(
            user, f"memberships/{membership_id}", {"role": new_role}, org_id=self._ORG
        )

        assert response.status_code == HTTPStatus.OK
        assert response.json()["role"] == new_role

    def _test_cannot_change_membership(self, user, membership_id, new_role):
        response = patch_method(
            user, f"memberships/{membership_id}", {"role": new_role}, org_id=self._ORG
        )

        assert response.status_code == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize(
        "who, whom, new_role, is_allow",
        [
            ("worker", "worker", "supervisor", False),
            ("worker", "supervisor", "worker", False),
            ("worker", "maintainer", "worker", False),
            ("worker", "owner", "worker", False),
            ("supervisor", "worker", "supervisor", False),
            ("supervisor", "supervisor", "worker", False),
            ("supervisor", "maintainer", "supervisor", False),
            ("supervisor", "owner", "worker", False),
            ("maintainer", "maintainer", "worker", False),
            ("maintainer", "owner", "worker", False),
            ("maintainer", "supervisor", "worker", True),
            ("maintainer", "worker", "supervisor", True),
            ("owner", "maintainer", "worker", True),
            ("owner", "supervisor", "worker", True),
            ("owner", "worker", "supervisor", True),
        ],
    )
    def test_user_can_change_role_of_member(self, who, whom, new_role, is_allow, find_users):
        user = find_users(org=self._ORG, role=who)[0]["username"]
        membership_id = find_users(org=self._ORG, role=whom, exclude_username=user)[0][
            "membership_id"
        ]

        if is_allow:
            self._test_can_change_membership(user, membership_id, new_role)
        else:
            self._test_cannot_change_membership(user, membership_id, new_role)

    @pytest.mark.parametrize(
        "who",
        ROLES,
    )
    def test_user_cannot_change_self_role(self, who: str, find_users):
        user = find_users(org=self._ORG, role=who)[0]
        self._test_cannot_change_membership(
            user["username"], user["membership_id"], self.ROLES[abs(self.ROLES.index(who) - 1)]
        )


@pytest.mark.usefixtures("restore_db_per_function")
class TestDeleteMemberships:
    _ORG: ClassVar[int] = 1

    def _test_delete_membership(
        self,
        who: str,
        membership_id: int,
        is_allow: bool,
    ) -> None:
        expected_status = HTTPStatus.NO_CONTENT if is_allow else HTTPStatus.FORBIDDEN

        with make_api_client(who) as api_client:
            (_, response) = api_client.memberships_api.destroy(membership_id, _check_status=False)
            assert response.status == expected_status

    @pytest.mark.parametrize(
        "who, is_allow",
        [
            ("worker", True),
            ("supervisor", True),
            ("maintainer", True),
            ("owner", False),
        ],
    )
    def test_member_can_leave_organization(self, who, is_allow, find_users):
        user = find_users(role=who, org=self._ORG)[0]

        self._test_delete_membership(user["username"], user["membership_id"], is_allow)

    @pytest.mark.parametrize(
        "who, whom, is_allow",
        [
            ("worker", "worker", False),
            ("worker", "supervisor", False),
            ("worker", "maintainer", False),
            ("worker", "owner", False),
            ("supervisor", "worker", False),
            ("supervisor", "supervisor", False),
            ("supervisor", "maintainer", False),
            ("supervisor", "owner", False),
            ("maintainer", "worker", True),
            ("maintainer", "supervisor", True),
            ("maintainer", "maintainer", False),
            ("maintainer", "owner", False),
            ("owner", "worker", True),
            ("owner", "supervisor", True),
            ("owner", "maintainer", True),
        ],
    )
    def test_member_can_exclude_another_member(
        self,
        who: str,
        whom: str,
        is_allow: bool,
        find_users,
    ):
        user = find_users(role=who, org=self._ORG)[0]["username"]
        membership_id = find_users(role=whom, org=self._ORG, exclude_username=user)[0][
            "membership_id"
        ]
        self._test_delete_membership(user, membership_id, is_allow)
