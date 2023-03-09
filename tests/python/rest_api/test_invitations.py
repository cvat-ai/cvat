# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from http import HTTPStatus

import pytest
from cvat_sdk.api_client.api_client import ApiClient, Endpoint

from shared.utils.config import post_method

from .utils import CollectionSimpleFilterTestBase


class TestCreateInvitations:
    ROLES = ["worker", "supervisor", "maintainer", "owner"]

    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_function, organizations, memberships, admin_user):
        self.org_id = 2
        self.owner = self.get_member("owner", memberships, self.org_id)

    def _test_post_invitation_201(self, user, data, invitee, **kwargs):
        response = post_method(user, "invitations", data, **kwargs)

        assert response.status_code == HTTPStatus.CREATED, response.content
        assert data["role"] == response.json()["role"]
        assert invitee["id"] == response.json()["user"]["id"]
        assert kwargs["org_id"] == response.json()["organization"]

    def _test_post_invitation_403(self, user, data, **kwargs):
        response = post_method(user, "invitations", data, **kwargs)
        assert response.status_code == HTTPStatus.FORBIDDEN, response.content
        assert "You do not have permission" in str(response.content)

    @staticmethod
    def get_non_member_users(memberships, users):
        organization_users = set(m["user"]["id"] for m in memberships if m["user"] is not None)
        non_member_users = [u for u in users if u["id"] not in organization_users]

        return non_member_users

    @staticmethod
    def get_member(role, memberships, org_id):
        member = [
            m["user"]
            for m in memberships
            if m["role"] == role and m["organization"] == org_id and m["user"] is not None
        ][0]

        return member

    @pytest.mark.parametrize("org_role", ROLES)
    @pytest.mark.parametrize("invitee_role", ROLES)
    def test_create_invitation(self, organizations, memberships, users, org_role, invitee_role):
        org_id = self.org_id
        inviter_user = self.get_member(org_role, memberships, org_id)
        invitee_user = self.get_non_member_users(memberships, users)[0]

        if org_role in ["worker", "supervisor"]:
            self._test_post_invitation_403(
                inviter_user["username"],
                {"role": invitee_role, "email": invitee_user["email"]},
                org_id=org_id,
            )

        elif invitee_role in ["worker", "supervisor"]:
            self._test_post_invitation_201(
                inviter_user["username"],
                {"role": invitee_role, "email": invitee_user["email"]},
                invitee_user,
                org_id=org_id,
            )

        elif invitee_role == "maintainer":
            if org_role == "owner":
                # only the owner can invite a maintainer
                self._test_post_invitation_201(
                    inviter_user["username"],
                    {"role": invitee_role, "email": invitee_user["email"]},
                    invitee_user,
                    org_id=org_id,
                )
            else:
                self._test_post_invitation_403(
                    inviter_user["username"],
                    {"role": invitee_role, "email": invitee_user["email"]},
                    org_id=org_id,
                )

        elif invitee_role == "owner":
            # nobody can invite an owner
            self._test_post_invitation_403(
                inviter_user["username"],
                {"role": invitee_role, "email": invitee_user["email"]},
                org_id=org_id,
            )

        else:
            assert False, "Unknown role"


class TestInvitationsListFilters(CollectionSimpleFilterTestBase):
    field_lookups = {
        "owner": ["owner", "username"],
    }

    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_class, admin_user, invitations):
        self.user = admin_user
        self.samples = invitations

    def _get_endpoint(self, api_client: ApiClient) -> Endpoint:
        return api_client.invitations_api.list_endpoint

    @pytest.mark.parametrize(
        "field",
        ("owner",),
    )
    def test_can_use_simple_filter_for_object_list(self, field):
        return super().test_can_use_simple_filter_for_object_list(field)
