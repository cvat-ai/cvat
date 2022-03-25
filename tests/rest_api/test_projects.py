# Copyright (C) 2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from http import HTTPStatus
import pytest

from .utils.config import get_method, post_method, patch_method


class TestGetProjects:
    def _find_by_owner(self, projects, users, is_project_staff, is_org_member, is_owner, has_membership):
        for p in projects:
            for u in users:
                if is_owner and not has_membership:
                    if is_project_staff(u['id'], p['id']):
                        return u['username'], p['id']
                if has_membership and not is_owner:
                    if p['organization'] is not None:
                        if is_org_member(u['id'], p['organization']):
                            return u['username'], p['id']
                if is_owner and has_membership:
                    if is_project_staff(u['id'], p['id']):
                        if is_org_member(u['id'], p['organization']):
                            return u['username'], p['id']
                if not is_owner and not has_membership:
                    if not is_project_staff(u['id'], p['id']) and not is_org_member(u['id'], p['organization']):
                        return u['username'], p['id']

    def _test_response_200(self, username, project_id, **kwargs):
        response = get_method(username, f'projects/{project_id}', **kwargs)
        assert response.status_code == HTTPStatus.OK
        project = response.json()
        assert project_id == project['id']

    def _test_response_403(self, username, project_id):
        response = get_method(username, f'projects/{project_id}')
        assert response.status_code == HTTPStatus.FORBIDDEN

    # [sandbox] Admin can see any project even he has no ownerships for this project (GET /projects/{id}).
    def test_project_admin_accessibility(self, users, projects, find_users, is_project_staff, is_org_member):
        admins = find_users(privilege='admin')

        admin_project = self._find_by_owner(projects, admins, is_project_staff, is_org_member, False, False)
        assert admin_project is not None
        self._test_response_200(*admin_project)

    # [sandbox] Project owner or project assignee can see project (GET /projects/{id}).
    def test_project_owner_accessibility(self, users, projects, find_users, is_project_staff):

        for p in projects:
            if p['owner'] is not None:
                project_with_owner = p
            if p['assignee'] is not None:
                project_with_assignee = p

        assert project_with_owner is not None
        assert project_with_assignee is not None

        self._test_response_200(project_with_owner['owner']['username'], project_with_owner['id'])
        self._test_response_200(project_with_assignee['assignee']['username'], project_with_assignee['id'])

    # [sandbox] Non-admin user cannot see project if this user is not project owner or project assignee
    # [sandbox] (GET /projects/{id}).
    def test_user_cannot_see_project(self, users, projects, find_users, is_project_staff, is_org_member):
        non_admins = find_users(exclude_privilege='admin')

        user_not_in_project = self._find_by_owner(projects, non_admins, is_project_staff, is_org_member, False, False)
        self._test_response_403(*user_not_in_project)

    # [organization] (Organization context) Member of organization that has role supervisor or worker
    # [organization] cannot see project if this member it’s not project owner
    # or project assignee (GET /projects/{id}).
    @pytest.mark.parametrize('role', ('supervisor', 'worker'))
    def test_if_supervisor_or_worker_cannot_see_project(self, users, projects, find_users, is_project_staff, is_org_member, role):
        non_admins = find_users(role=role, exclude_privilege='admin')
        assert non_admins is not None

        user_in_project = self._find_by_owner(projects, non_admins, is_project_staff, is_org_member, False, True)
        self._test_response_403(*user_in_project)

    # [organization] (Organization context) Member of organization that has role  maintainer or owner
    # [organization]  can see any project even he has not any ownerships for this project
    # or project assignee (GET /projects/{id}).
    @pytest.mark.parametrize('role', ('maintainer', 'owner'))
    def test_if_maintainer_or_owner_can_see_project(self, users, projects, find_users, is_project_staff,
                                                        is_org_member, role):
        non_admins = find_users(role=role, exclude_privilege='admin')
        assert non_admins is not None

        user_not_in_project = self._find_by_owner(projects, non_admins, is_project_staff, is_org_member, False, True)
        assert user_not_in_project is not None

        self._test_response_200(*user_not_in_project, org_id=org_id)

    # [organization] (Organization context) Member of organization that has role supervisor or worker can see
    # project if this member it’s project owner or project assignee (GET /projects/{id})
    @pytest.mark.parametrize('role', ('supervisor', 'worker'))
    def test_if_org_member_supervisor_or_worker_can_see_project(self, users, projects, find_users, is_project_staff,
                                                                is_org_member, role):
        non_admins = find_users(role=role, exclude_privilege='admin')
        assert non_admins is not None

        user_in_project = self._find_by_owner(projects, non_admins, is_project_staff, is_org_member, True, True)
        assert user_in_project is not None

        self._test_response_200(*user_in_project)
