# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

from http import HTTPStatus
from deepdiff import DeepDiff
import pytest
from .utils.config import post_method

class TestCreateInvitations:
    def _test_post_invitation_201(self, user, data, invitee, **kwargs):
        response = post_method(user, 'invitations', data, **kwargs)

        assert response.status_code == HTTPStatus.CREATED
        assert data['role'] == response.json()['role']
        assert invitee['id'] == response.json()['user']['id']
        assert kwargs['org_id'] == response.json()['organization']

    def _test_post_invitation_403(self, user, data, **kwargs):
        response = post_method(user, 'invitations', data, **kwargs)
        assert response.status_code == HTTPStatus.FORBIDDEN

    @staticmethod
    def get_non_member_user(memberships, users):
        organization_users = set(m['user']['id'] for m in memberships if m['user'] != None)
        non_member_user = [u for u in users if u['id'] not in organization_users][-1]

        return non_member_user

    @staticmethod
    def get_member(role, memberships, org_id):
        member = [m['user'] for m in memberships if m['role'] == role and
            m['organization'] == org_id and m['user'] != None][0]

        return member

    @pytest.mark.parametrize('org_id', [1, 2])
    @pytest.mark.parametrize('org_role', ['worker', 'supervisor', 'maintainer', 'owner'])
    def test_create_invitation(self, organizations, memberships, users,
        org_id, org_role):
        member = self.get_member(org_role, memberships, org_id)
        non_member_user = self.get_non_member_user(memberships, users)

        if org_role in ['worker', 'supervisor']:
            for invitee_role in ['worker', 'supervisor', 'maintainer', 'owner']:
                self._test_post_invitation_403(member['username'], {
                    'role': invitee_role,
                    'email': non_member_user['email']
                }, org_id=org_id)
        else:
            for invitee_role in ['worker', 'supervisor']:
                self._test_post_invitation_201(member['username'], {
                    'role': invitee_role,
                    'email': non_member_user['email']
                }, non_member_user, org_id=org_id)

            # only the owner can invite a maintainer
            if org_role == 'owner':
                self._test_post_invitation_201(member['username'], {
                    'role': 'maintainer',
                    'email': non_member_user['email']
                }, non_member_user, org_id=org_id)
            else:
                self._test_post_invitation_403(member['username'], {
                    'role': 'maintainer',
                    'email': non_member_user['email']
                }, org_id=org_id)

            # nobody can invite an owner
            self._test_post_invitation_403(member['username'], {
                'role': 'owner',
                'email': non_member_user['email']
            }, org_id=org_id)
