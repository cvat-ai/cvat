# Copyright (C) 2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from http import HTTPStatus
import pytest

from .utils.config import get_method, post_method


class TestGetProjects:
    def _find_by_owner(self, projects, users, is_project_staff, is_org_member, is_owner, has_membership):
        for p in projects:
            for u in users:
                if is_owner and not has_membership:
                    if is_project_staff(u['id'], p['id']):
                        return u['username'], p['id'], None
                if has_membership and not is_owner:
                    if p['organization'] is not None:
                        if is_org_member(u['id'], p['organization']):
                            return u['username'], p['id'], p['organization']
                if is_owner and has_membership:
                    if is_project_staff(u['id'], p['id']):
                        if is_org_member(u['id'], p['organization']):
                            return u['username'], p['id'], p['organization']
                if not is_owner and not has_membership:
                    if not is_project_staff(u['id'], p['id']) and not is_org_member(u['id'], p['organization']):
                        return u['username'], p['id'], None

    def _find_project_by_user_org(self, user, projects, is_project_staff_flag, is_project_staff):
        if is_project_staff_flag:
            for p in projects:
                if is_project_staff(user['id'], p['id']):
                    return p['id']
        else:
            for p in projects:
                if not is_project_staff(user['id'], p['id']):
                    return p['id']


    def _test_response_200(self, username, project_id, **kwargs):
        response = get_method(username, f'projects/{project_id}', **kwargs)
        assert response.status_code == HTTPStatus.OK
        project = response.json()
        assert project_id == project['id']

    def _test_response_403(self, username, project_id, **kwargs):
        response = get_method(username, f'projects/{project_id}')
        assert response.status_code == HTTPStatus.FORBIDDEN

    # [sandbox] Admin can see any project even he has no ownerships for this project (GET /projects/{id}).
    def test_project_admin_accessibility(self, projects, find_users, is_project_staff, is_org_member, **kwargs):
        admins = find_users(privilege='admin')

        admin_project = self._find_by_owner(projects, admins, is_project_staff, is_org_member, False, False)
        assert admin_project is not None
        self._test_response_200(*admin_project[:2])

    # [sandbox] Project owner or project assignee can see project (GET /projects/{id}).
    def test_project_owner_accessibility(self, projects):

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
    def test_user_cannot_see_project(self, projects, find_users, is_project_staff, is_org_member):
        non_admins = find_users(exclude_privilege='admin')

        user_not_in_project = self._find_by_owner(projects, non_admins, is_project_staff, is_org_member, False, False)
        self._test_response_403(*user_not_in_project[:2])

    # [organization] (Organization context) Member of organization that has role supervisor or worker
    # [organization] cannot see project if this member it’s not project owner
    # or project assignee (GET /projects/{id}).
    @pytest.mark.parametrize('role', ('supervisor', 'worker'))
    def test_if_supervisor_or_worker_cannot_see_project(self, projects, is_project_staff, is_org_member, find_users,
                                                        role, **kwargs):
        non_admins = find_users(role=role, exclude_privilege='admin')
        assert non_admins is not None

        project_id = self._find_project_by_user_org(non_admins[0], projects, False, is_project_staff)
        assert project_id is not None

        self._test_response_403(non_admins[0]['username'], project_id, **kwargs)


    # [organization] (Organization context) Member of organization that has role  maintainer or owner
    # [organization]  can see any project even he has not any ownerships for this project
    # or project assignee (GET /projects/{id}).
    @pytest.mark.parametrize('role', ('maintainer', 'owner'))
    def test_if_maintainer_or_owner_can_see_project(self, find_users, projects, is_project_staff, role):

        non_admins = find_users(role=role, exclude_privilege='admin')
        assert non_admins is not None

        project_id = self._find_project_by_user_org(non_admins[0], projects, False, is_project_staff)
        assert project_id is not None

        self._test_response_200(non_admins[0]['username'], project_id, org_id=non_admins[0]['org'])

    # [organization] (Organization context) Member of organization that has role supervisor or worker can see
    # project if this member it’s project owner or project assignee (GET /projects/{id})
    @pytest.mark.parametrize('role', ('supervisor', 'worker'))
    def test_if_org_member_supervisor_or_worker_can_see_project(self, projects, find_users, is_project_staff,role):
        non_admins = find_users(role=role, exclude_privilege='admin')
        assert len(non_admins)

        for u in non_admins:
            project_id = self._find_project_by_user_org(u, projects, True, is_project_staff)
            if project_id:
                user_in_project = u
                break

        assert project_id is not None

        self._test_response_200(user_in_project['username'], project_id, org_id=user_in_project['org'])


class TestPostProjects:

    def _test_create_project_201(self, user, spec, **kwargs):
        response = post_method(user, '/projects', spec, **kwargs)
        assert response.status_code == HTTPStatus.CREATED

    def _test_create_project_403(self, user, spec, **kwargs):
        response = post_method(user, '/projects', spec, **kwargs)
        assert response.status_code == HTTPStatus.FORBIDDEN

    # User with worker privilege cannot create a project (POST /projects/)
    def test_if_worker_cannot_create_project(self, find_users, **kwargs):
        workers = find_users(privilege='worker')
        assert len(workers)

        username = workers[0]['username']
        spec = {
            'name': f'test {username} tries to create a project'
        }
        self._test_create_project_403(username, spec, **kwargs)

    # User with admin, business or user privilege can create a project (POST /projects/)
    @pytest.mark.parametrize('privilege', ('admin', 'business', 'user'))
    def test_is_user_can_create_project(self, find_users, privilege, **kwargs):
        privileged_users = find_users(privilege=privilege)
        assert len(privileged_users)

        username = privileged_users[0]['username']
        spec = {
            'name': f'test {username} tries to create a project'
        }
        self._test_create_project_201(username, spec, **kwargs)

    # User with user privilege cannot have more than three projects (POST /projects/).
    def test_if_user_cannot_have_more_than_3_projects(self, projects, find_users,  **kwargs):
        user_users = find_users(privilege='user')
        assert len(user_users)

        user = user_users[0]
        user_projects = 0
        for p in projects:
            if user['id'] == p['owner']['id']:
                user_projects += 1

        assert user_projects <= 3

        for i in range(1, 4 - user_projects):
            spec = {
                'name': f'test: {user["username"]} tries to create a project number {user_projects + i}'
            }
            self._test_create_project_201(user['username'], spec, **kwargs)

        spec = {
                'name': f'test {user["username"]} tries to create more than 3 projects'
            }
        self._test_create_project_403(user['username'], spec, **kwargs)

    # User with admin or business role can have more than three projects (POST /projects).
    @pytest.mark.parametrize('privilege', ('admin', 'business'))
    def test_if_user_can_have_more_than_3_projects(self, find_users, privilege, **kwargs):
        privileged_users = find_users(privilege=privilege)
        assert len(privileged_users)

        user = privileged_users[0]

        for i in range(1, 5):
            spec = {
                'name': f'test: {user["username"]} with privilege {privilege} tries to create a project number {i}'
            }
            self._test_create_project_201(user['username'], spec, **kwargs)

    # [organization]  Member of organization that has role worker cannot create a project
    # (POST /projects/)
    def test_if_org_worker_cannot_crate_project(self, find_users, **kwargs):
        workers = find_users(role='worker')

        for w in workers:
            if w['org']:
                worker = w
                break

        spec = {
            'name': f'test: worker {worker["username"]} creating a project for his organization',
            'organization_id': worker['org'],
        }
        self._test_create_project_403(worker['username'], spec, org_id=worker['org'])

    # [organization]  Member of organization that has role supervisor, maintainer or owner can create a project
    # (POST /projects/)
    @pytest.mark.parametrize('role', ('supervisor', 'maintainer', 'owner'))
    def test_if_org_role_can_crate_project(self, find_users, role, **kwargs):
        privileged_users = find_users(role=role)
        assert len(privileged_users)

        for u in privileged_users:
            if u['org']:
                user = u
                break

        spec = {
            'name': f'test: worker {user["username"]} creating a project for his organization',
            'organization_id': user['org'],
        }
        self._test_create_project_201(user['username'], spec, org_id=user['org'])
