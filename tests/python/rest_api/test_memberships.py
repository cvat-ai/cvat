# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from http import HTTPStatus

import pytest
from cvat_sdk.api_client.api_client import ApiClient, Endpoint
from cvat_sdk.api_client.model.membership_read import MembershipRead
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
    _ORG = 2

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
            ("supervisor", "worker", "supervisor", False),
            ("supervisor", "maintainer", "supervisor", False),
            ("worker", "supervisor", "worker", False),
            ("worker", "maintainer", "worker", False),
            ("maintainer", "maintainer", "worker", False),
            ("maintainer", "supervisor", "worker", True),
            ("maintainer", "worker", "supervisor", True),
            ("owner", "maintainer", "worker", True),
            ("owner", "supervisor", "worker", True),
            ("owner", "worker", "supervisor", True),
        ],
    )
    def test_user_can_change_role_of_member(self, who, whom, new_role, is_allow, find_users):
        user = find_users(org=self._ORG, role=who)[0]["username"]
        membership_id = find_users(org=self._ORG, role=whom)[1]["membership_id"]

        if is_allow:
            self._test_can_change_membership(user, membership_id, new_role)
        else:
            self._test_cannot_change_membership(user, membership_id, new_role)


@pytest.mark.usefixtures("restore_db_per_function")
class TestDeleteMemberships:
    _ORG = 1

    def _get_user_membership(self, user: str, api_client: ApiClient) -> MembershipRead:
        (memberships, _) = api_client.memberships_api.list(user=user, org_id=self._ORG)
        assert 1 == memberships["count"]
        return memberships["results"][0]

    def _test_delete_membership(
        self,
        active_user: str,
        user_to_be_deleted: str,
        is_allow: bool,
    ) -> None:
        expected_status = HTTPStatus.NO_CONTENT if is_allow else HTTPStatus.FORBIDDEN

        with make_api_client(active_user) as api_client:
            membership = self._get_user_membership(user_to_be_deleted, api_client)
            (_, response) = api_client.memberships_api.destroy(membership.id, _check_status=False)
            assert response.status == expected_status

    @pytest.mark.parametrize(
        "role, is_allow",
        [
            ("worker", True),
            ("supervisor", True),
            ("maintainer", True),
            ("owner", False),
        ],
    )
    def test_member_can_leave_organization(self, role, is_allow, find_users):
        user = find_users(role=role, org=self._ORG)[0]["username"]

        self._test_delete_membership(user, user, is_allow)

    @pytest.mark.parametrize(
        "active_role, desired_role, is_allow",
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
    def test_member_can_exclude_another_organization_member(
        self,
        active_role: str,
        desired_role: str,
        is_allow: bool,
        find_users,
    ):
        active_user = find_users(role=active_role, org=self._ORG)[0]["username"]
        desired_user = find_users(role=desired_role, org=self._ORG, exclude_username=active_user)[
            0
        ]["username"]
        self._test_delete_membership(active_user, desired_user, is_allow)
