# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from http import HTTPStatus

import pytest

from shared.utils.config import get_method, patch_method, post_method


class TestCreateInvitations:
    ROLES = ["worker", "supervisor", "maintainer", "owner"]

    @classmethod
    def _increase_limits(cls, org_id, admin_user):
        response = get_method(admin_user, "limitations", org_id=org_id)
        response.raise_for_status()

        limitation = response.json()[0]
        response = patch_method(
            admin_user, f"limitations/{limitation['id']}", data={"memberships": 100}, org_id=org_id
        )
        response.raise_for_status()

    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_function, organizations, memberships, admin_user):
        self.org_id = 2
        self.owner = self.get_member("owner", memberships, self.org_id)
        self._increase_limits(self.org_id, admin_user)

    def _test_post_invitation_201(self, user, data, invitee, **kwargs):
        response = post_method(user, "invitations", data, **kwargs)

        assert response.status_code == HTTPStatus.CREATED, response.content
        assert data["role"] == response.json()["role"]
        assert invitee["id"] == response.json()["user"]["id"]
        assert kwargs["org_id"] == response.json()["organization"]

    def _test_post_invitation_403(self, user, data, **kwargs):
        response = post_method(user, "invitations", data, **kwargs)
        assert response.status_code == HTTPStatus.FORBIDDEN, response.content
        assert response.json() == {"detail": "not authorized"}  # check for the correct reason

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
