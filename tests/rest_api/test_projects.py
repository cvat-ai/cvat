# Copyright (C) 2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
from http import HTTPStatus
from itertools import groupby, product

from time import sleep

import pytest
from copy import deepcopy
from deepdiff import DeepDiff

from cvat_sdk.models import DatasetFileRequest, ProjectWriteRequest

from .utils.config import get_method, patch_method, make_api_client


@pytest.mark.usefixtures('dontchangedb')
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
        with make_api_client(username) as api_client:
            (project, response) = api_client.projects_api.retrieve(project_id, **kwargs)
            assert response.status == HTTPStatus.OK
            assert project_id == project.id

    def _test_response_403(self, username, project_id):
        with make_api_client(username) as api_client:
            (_, response) = api_client.projects_api.retrieve(project_id,
                _parse_response=False, _check_status=False)
            assert response.status == HTTPStatus.FORBIDDEN

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

class TestGetProjectBackup:
    def _test_can_get_project_backup(self, username, pid, **kwargs):
        for _ in range(30):
            response = get_method(username, f"projects/{pid}/backup", **kwargs)
            response.raise_for_status()
            if response.status_code == HTTPStatus.CREATED:
                break
            sleep(1)
        response = get_method(username, f"projects/{pid}/backup", action="download", **kwargs)
        assert response.status_code == HTTPStatus.OK

    def _test_cannot_get_project_backup(self, username, pid, **kwargs):
        response = get_method(username, f"projects/{pid}/backup", **kwargs)
        assert response.status_code == HTTPStatus.FORBIDDEN

    def test_admin_can_get_project_backup(self, projects):
        project = list(projects)[0]
        self._test_can_get_project_backup('admin1', project['id'])

    # User that not in [project:owner, project:assignee] cannot get project backup.
    def test_user_cannot_get_project_backup(self, find_users, projects, is_project_staff):
        users = find_users(exclude_privilege='admin')

        user, project = next(
            (user, project)
            for user, project in product(users, projects)
            if not is_project_staff(user['id'], project['id'])
        )

        self._test_cannot_get_project_backup(user['username'], project['id'])

    # Org worker that not in [project:owner, project:assignee] cannot get project backup.
    def test_org_worker_cannot_get_project_backup(self, find_users, projects, is_project_staff, is_org_member):
        users = find_users(role='worker', exclude_privilege='admin')

        user, project = next(
            (user, project)
            for user, project in product(users, projects)
            if not is_project_staff(user['id'], project['id']) and is_org_member(user['id'], project['organization'])
        )

        self._test_cannot_get_project_backup(user['username'], project['id'], org_id=project['organization'])

    # Org worker that in [project:owner, project:assignee] can get project backup.
    def test_org_worker_can_get_project_backup(self, find_users, projects, is_project_staff, is_org_member):
        users = find_users(role='worker', exclude_privilege='admin')

        user, project = next(
            (user, project)
            for user, project in product(users, projects)
            if is_project_staff(user['id'], project['id']) and is_org_member(user['id'], project['organization'])
        )

        self._test_can_get_project_backup(user['username'], project['id'], org_id=project['organization'])

    # Org supervisor that in [project:owner, project:assignee] can get project backup.
    def test_org_supervisor_can_get_project_backup(self, find_users, projects, is_project_staff, is_org_member):
        users = find_users(role='supervisor', exclude_privilege='admin')

        user, project = next(
            (user, project)
            for user, project in product(users, projects)
            if is_project_staff(user['id'], project['id']) and is_org_member(user['id'], project['organization'])
        )

        self._test_can_get_project_backup(user['username'], project['id'], org_id=project['organization'])

    # Org supervisor that not in [project:owner, project:assignee] cannot get project backup.
    def test_org_supervisor_cannot_get_project_backup(self, find_users, projects, is_project_staff, is_org_member):
        users = find_users(role='supervisor', exclude_privilege='admin')

        user, project = next(
            (user, project)
            for user, project in product(users, projects)
            if not is_project_staff(user['id'], project['id']) and is_org_member(user['id'], project['organization'])
        )

        self._test_cannot_get_project_backup(user['username'], project['id'], org_id=project['organization'])

    # Org maintainer that not in [project:owner, project:assignee] can get project backup.
    def test_org_maintainer_can_get_project_backup(self, find_users, projects, is_project_staff, is_org_member):
        users = find_users(role='maintainer', exclude_privilege='admin')

        user, project = next(
            (user, project)
            for user, project in product(users, projects)
            if not is_project_staff(user['id'], project['id']) and is_org_member(user['id'], project['organization'])
        )

        self._test_can_get_project_backup(user['username'], project['id'], org_id=project['organization'])

    # Org owner that not in [project:owner, project:assignee] can get project backup.
    def test_org_owner_can_get_project_backup(self, find_users, projects, is_project_staff, is_org_member):
        users = find_users(role='owner', exclude_privilege='admin')

        user, project = next(
            (user, project)
            for user, project in product(users, projects)
            if not is_project_staff(user['id'], project['id']) and is_org_member(user['id'], project['organization'])
        )

        self._test_can_get_project_backup(user['username'], project['id'], org_id=project['organization'])

@pytest.mark.usefixtures('changedb')
class TestPostProjects:
    def _test_create_project_201(self, user, spec, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.projects_api.create(ProjectWriteRequest(**spec), **kwargs)
            assert response.status == HTTPStatus.CREATED

    def _test_create_project_403(self, user, spec, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.projects_api.create(ProjectWriteRequest(**spec), **kwargs,
                _parse_response=False, _check_status=False)
        assert response.status == HTTPStatus.FORBIDDEN

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
    def test_if_org_role_can_create_project(self, find_users, role):
        privileged_users = find_users(role=role)
        assert len(privileged_users)

        user = next(u for u in privileged_users if u['org'])

        spec = {
            'name': f'test: worker {user["username"]} creating a project for his organization',
        }
        self._test_create_project_201(user['username'], spec, org_id=user['org'])

@pytest.mark.usefixtures("changedb")
@pytest.mark.usefixtures("restore_cvat_data")
class TestImportExportDatasetProject:
    def _test_export_project(self, username, project_id, format_name):
        with make_api_client(username) as api_client:
            while True:
                (_, response) = api_client.projects_api.retrieve_dataset(id=project_id,
                    format=format_name)
                if response.status == HTTPStatus.CREATED:
                    break

            (_, response) = api_client.projects_api.retrieve_dataset(id=project_id,
                    format=format_name, action='download')
            assert response.status == HTTPStatus.OK

        return response

    def _test_import_project(self, username, project_id, format_name, data):
        with make_api_client(username) as api_client:
            (_, response) = api_client.projects_api.create_dataset(id=project_id,
                format=format_name, dataset_file_request=DatasetFileRequest(**data),
                _content_type="multipart/form-data")
            assert response.status == HTTPStatus.ACCEPTED

            while True:
                # TODO: Request schema doesn't describe this capability.
                # It's better be refactored to a separate endpoint to get request status
                response = get_method(username, f'projects/{project_id}/dataset',
                    action='import_status')
                response.raise_for_status()
                if response.status_code == HTTPStatus.CREATED:
                        break

    def test_can_import_dataset_in_org(self):
        username = 'admin1'
        project_id = 4

        response = self._test_export_project(username, project_id, 'CVAT for images 1.1')

        tmp_file = io.BytesIO(response.data)
        tmp_file.name = 'dataset.zip'

        import_data = {
            'dataset_file': tmp_file,
        }

        self._test_import_project(username, project_id, 'CVAT 1.1', import_data)

@pytest.mark.usefixtures('changedb')
class TestPatchProjectLabel:
    def test_admin_can_delete_label(self, projects):
        project = deepcopy(list(projects)[0])
        labels = project['labels'][0]
        labels.update({'deleted': True})
        response = patch_method('admin1', f'/projects/{project["id"]}', {'labels': [labels]})
        assert response.status_code == HTTPStatus.OK
        assert len(response.json()['labels']) == len(project['labels']) - 1

    def test_admin_can_rename_label(self, projects):
        project = deepcopy(list(projects)[0])
        labels = project['labels'][0]
        labels.update({'name': 'new name'})
        response = patch_method('admin1', f'/projects/{project["id"]}', {'labels': [labels]})
        assert response.status_code == HTTPStatus.OK
        assert DeepDiff(response.json()['labels'], project['labels'], ignore_order=True) == {}

    def test_admin_can_add_label(self, projects):
        project = list(projects)[0]
        labels = {'name': 'new name'}
        response = patch_method('admin1', f'/projects/{project["id"]}', {'labels': [labels]})
        assert response.status_code == HTTPStatus.OK
        assert len(response.json()['labels']) == len(project['labels']) + 1

    # Org maintainer can add label even he is not in [project:owner, project:assignee]
    def test_org_maintainer_can_add_label(self, find_users, projects, is_project_staff, is_org_member):
        users = find_users(role='maintainer', exclude_privilege='admin')

        user, project = next(
            (user, project)
            for user, project in product(users, projects)
            if not is_project_staff(user['id'], project['id']) and is_org_member(user['id'], project['organization'])
        )

        labels = {'name': 'new name'}
        response = patch_method(user['username'], f'/projects/{project["id"]}', {'labels': [labels]}, org_id=project['organization'])
        assert response.status_code == HTTPStatus.OK
        assert len(response.json()['labels']) == len(project['labels']) + 1

    # Org supervisor cannot add label
    def test_org_supervisor_can_add_label(self, find_users, projects, is_project_staff, is_org_member):
        users = find_users(role='supervisor', exclude_privilege='admin')

        user, project = next(
            (user, project)
            for user, project in product(users, projects)
            if not is_project_staff(user['id'], project['id']) and is_org_member(user['id'], project['organization'])
        )

        labels = {'name': 'new name'}
        response = patch_method(user['username'], f'/projects/{project["id"]}', {'labels': [labels]}, org_id=project['organization'])
        assert response.status_code == HTTPStatus.FORBIDDEN

    # Org worker cannot add label
    def test_org_worker_cannot_add_label(self, find_users, projects, is_project_staff, is_org_member):
        users = find_users(role='worker', exclude_privilege='admin')

        user, project = next(
            (user, project)
            for user, project in product(users, projects)
            if not is_project_staff(user['id'], project['id']) and is_org_member(user['id'], project['organization'])
        )

        labels = {'name': 'new name'}
        response = patch_method(user['username'], f'/projects/{project["id"]}', {'labels': [labels]}, org_id=project['organization'])
        assert response.status_code == HTTPStatus.FORBIDDEN

    # Org worker that in [project:owner, project:assignee] can add label
    def test_org_worker_can_add_label(self, find_users, projects, is_project_staff, is_org_member):
        users = find_users(role='worker', exclude_privilege='admin')

        user, project = next(
            (user, project)
            for user, project in product(users, projects)
            if is_project_staff(user['id'], project['id']) and is_org_member(user['id'], project['organization'])
        )

        labels = {'name': 'new name'}
        response = patch_method(user['username'], f'/projects/{project["id"]}', {'labels': [labels]}, org_id=project['organization'])
        assert response.status_code == HTTPStatus.OK
        assert len(response.json()['labels']) == len(project['labels']) + 1

    # Org owner can add label even he is not in [project:owner, project:assignee]
    def test_org_owner_can_add_label(self, find_users, projects, is_project_staff, is_org_member):
        users = find_users(role='owner', exclude_privilege='admin')

        user, project = next(
            (user, project)
            for user, project in product(users, projects)
            if not is_project_staff(user['id'], project['id']) and is_org_member(user['id'], project['organization'])
        )

        labels = {'name': 'new name'}
        response = patch_method(user['username'], f'/projects/{project["id"]}', {'labels': [labels]}, org_id=project['organization'])
        assert response.status_code == HTTPStatus.OK
        assert len(response.json()['labels']) == len(project['labels']) + 1
