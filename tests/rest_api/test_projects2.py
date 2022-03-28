# Copyright (C) 2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from http import HTTPStatus
import pytest

from .utils.config import get_method, post_method, patch_method


class TestPostProjects:

    def _test_create_project_201(self, user, spec, **kwargs):
        response = post_method(user, '/projects', spec, **kwargs)
        assert response.status_code == HTTPStatus.CREATED

    def _test_create_project_403(self, user, spec, **kwargs):
        response = post_method(user, '/projects', spec, **kwargs)
        assert response.status_code == HTTPStatus.FORBIDDEN

    # User with worker privilege cannot create a project (POST /projects/)
    def test_if_worker_cannot_create_project(self, users, find_users, **kwargs):
        workers = find_users(privilege='worker')
        assert len(workers)

        username = workers[0]['username']
        spec = {
            'name': f'test {username} tries to create a project'
        }
        self._test_create_project_403(username, spec, **kwargs)

    # User with admin, business or user privilege can create a project (POST /projects/)
    @pytest.mark.parametrize('privilege', ('admin', 'business', 'user'))
    def test_is_user_can_create_project(self, users, find_users, privilege, **kwargs):
        privileged_users = find_users(privilege=privilege)
        assert len(privileged_users)

        username = privileged_users[0]['username']
        spec = {
            'name': f'test {username} tries to create a project'
        }
        self._test_create_project_201(username, spec, **kwargs)

    # User with user privilege cannot have more than three projects (POST /projects/).
    def test_if_user_cannot_have_more_than_3_projects(self, users, projects, find_users,  **kwargs):
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
    def test_if_user_can_have_more_than_3_projects(self, users, projects, find_users, privilege, **kwargs):
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
    @pytest.mark.parametrize('org, project_id', [({'id': 2, 'slug': 'org2'}, 2)])
    def test_if_org_worker_cannot_crate_project(self, users, find_users, org, project_id, **kwargs):
        workers = find_users(org=org['id'], role='worker')
        assert len(workers)

        worker = workers[0]

        spec = {
            'name': f'test: worker {worker["username"]} creating a project for his organization',
            'organization_id': org['id'],
            'org': org['slug']
        }
        self._test_create_project_403(worker['username'], spec, org_id=org['id'])

    # [organization]  Member of organization that has role supervisor, maintainer or owner can create a project
    # (POST /projects/)
    @pytest.mark.parametrize('org, project_id', [({'id': 2, 'slug': 'org2'}, 2)])
    @pytest.mark.parametrize('role', ('supervisor', 'maintainer', 'owner'))
    def test_if_org_role_can_crate_project(self, users, find_users, org, project_id, role, **kwargs):
        privileged_users = find_users(org=org['id'], role=role)
        assert len(privileged_users)

        user = privileged_users[0]

        spec = {
            'name': f'test: worker {user["username"]} creating a project for his organization',
            'organization_id': org['id'],
            'org': org['slug']
        }
        self._test_create_project_201(user['username'], spec, org_id=org['id'])
