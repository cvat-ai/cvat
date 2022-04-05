# Copyright (C) 2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from http import HTTPStatus
from itertools import groupby, product
import pytest

from .utils.config import get_method, post_method


class TestGetProjects:
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

    def _test_response_403(self, username, project_id):
        response = get_method(username, f'projects/{project_id}')
        assert response.status_code == HTTPStatus.FORBIDDEN

    # Admin can see any project even he has no ownerships for this project.
    def test_project_admin_accessibility(self, projects, find_users, is_project_staff, org_staff):
        users = find_users(privilege='admin')

        user, project = next(
            (user, project)
            for user, project in product(users, projects)
            if not is_project_staff(user['id'], project['organization'])
            and user['id'] not in org_staff(project['organization'])
        )
        self._test_response_200(user['username'], project['id'])

    # Project owner or project assignee can see project.
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

    def test_user_cannot_see_project(self, projects, find_users, is_project_staff, org_staff):
        users = find_users(exclude_privilege='admin')

        user, project = next(
            (user, project)
            for user, project in product(users, projects)
            if not is_project_staff(user['id'], project['organization'])
            and user['id'] not in org_staff(project['organization'])
        )
        self._test_response_403(user['username'], project['id'])

    # Member of organization that has role supervisor or worker cannot see
    # project if this member not in [project:owner, project:assignee]
    @pytest.mark.parametrize('role', ('supervisor', 'worker'))
    def test_if_supervisor_or_worker_cannot_see_project(self, projects, is_project_staff,
            find_users, role):
        non_admins = find_users(role=role, exclude_privilege='admin')
        assert non_admins is not None

        project_id = self._find_project_by_user_org(non_admins[0], projects, False, is_project_staff)
        assert project_id is not None

        self._test_response_403(non_admins[0]['username'], project_id)

    # Member of organization that has role maintainer or owner can see any
    # project even this member not in [project:owner, project:assignee]
    @pytest.mark.parametrize('role', ('maintainer', 'owner'))
    def test_if_maintainer_or_owner_can_see_project(self, find_users, projects, is_project_staff, role):
        non_admins = find_users(role=role, exclude_privilege='admin')
        assert non_admins is not None

        project_id = self._find_project_by_user_org(non_admins[0], projects, False, is_project_staff)
        assert project_id is not None

        self._test_response_200(non_admins[0]['username'], project_id, org_id=non_admins[0]['org'])

    # Member of organization that has role supervisor or worker can see
    # project if this member in [project:owner, project:assignee]
    @pytest.mark.parametrize('role', ('supervisor', 'worker'))
    def test_if_org_member_supervisor_or_worker_can_see_project(self, projects,
            find_users, is_project_staff, role):
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

    def test_if_worker_cannot_create_project(self, find_users):
        workers = find_users(privilege='worker')
        assert len(workers)

        username = workers[0]['username']
        spec = {
            'name': f'test {username} tries to create a project'
        }
        self._test_create_project_403(username, spec)

    @pytest.mark.parametrize('privilege', ('admin', 'business', 'user'))
    def test_is_user_can_create_project(self, find_users, privilege):
        privileged_users = find_users(privilege=privilege)
        assert len(privileged_users)

        username = privileged_users[0]['username']
        spec = {
            'name': f'test {username} tries to create a project'
        }
        self._test_create_project_201(username, spec)

    def test_if_user_cannot_have_more_than_3_projects(self, projects, find_users):
        users = find_users(privilege='user')

        user_id, user_projects = next(
            (user_id, len(list(projects)))
            for user_id, projects in groupby(projects, lambda a: a['owner']['id'])
            if len(list(projects)) < 3
        )
        user = users[user_id]

        for i in range(1, 4 - user_projects):
            spec = {
                'name': f'test: {user["username"]} tries to create a project number {user_projects + i}'
            }
            self._test_create_project_201(user['username'], spec)

        spec = {
                'name': f'test {user["username"]} tries to create more than 3 projects'
            }
        self._test_create_project_403(user['username'], spec)

    @pytest.mark.parametrize('privilege', ('admin', 'business'))
    def test_if_user_can_have_more_than_3_projects(self, find_users, privilege):
        privileged_users = find_users(privilege=privilege)
        assert len(privileged_users)

        user = privileged_users[0]

        for i in range(1, 5):
            spec = {
                'name': f'test: {user["username"]} with privilege {privilege} tries to create a project number {i}'
            }
            self._test_create_project_201(user['username'], spec)

    def test_if_org_worker_cannot_crate_project(self, find_users):
        workers = find_users(role='worker')

        worker = next(u for u in workers if u['org'])

        spec = {
            'name': f'test: worker {worker["username"]} creating a project for his organization',
        }
        self._test_create_project_403(worker['username'], spec, org_id=worker['org'])

    @pytest.mark.parametrize('role', ('supervisor', 'maintainer', 'owner'))
    def test_if_org_role_can_crate_project(self, find_users, role):
        privileged_users = find_users(role=role)
        assert len(privileged_users)

        user = next(u for u in privileged_users if u['org'])

        spec = {
            'name': f'test: worker {user["username"]} creating a project for his organization',
        }
        self._test_create_project_201(user['username'], spec, org_id=user['org'])
