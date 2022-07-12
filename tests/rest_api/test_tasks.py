# Copyright (C) 2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from copy import deepcopy
from http import HTTPStatus
from io import BytesIO
from time import sleep

import pytest
from deepdiff import DeepDiff
from PIL import Image

from .utils.config import (get_method, patch_method, post_files_method,
                           post_method)


def generate_image_file(filename, size=(50, 50)):
    f = BytesIO()
    image = Image.new('RGB', size=size)
    image.save(f, 'jpeg')
    f.name = filename
    f.seek(0)

    return f

def generate_image_files(count):
    images = []
    for i in range(count):
        image = generate_image_file(f'{i}.jpeg')
        images.append(image)

    return images


@pytest.mark.usefixtures('dontchangedb')
class TestGetTasks:
    def _test_task_list_200(self, user, project_id, data, exclude_paths = '', **kwargs):
        response = get_method(user, f'projects/{project_id}/tasks', **kwargs)
        response_data = response.json()
        assert response.status_code == HTTPStatus.OK
        assert DeepDiff(data, response_data['results'], ignore_order=True, exclude_paths=exclude_paths) == {}

    def _test_task_list_403(self, user, project_id, **kwargs):
        response = get_method(user, f'projects/{project_id}/tasks', **kwargs)
        assert response.status_code == HTTPStatus.FORBIDDEN

    def _test_users_to_see_task_list(self, project_id, tasks, users, is_staff, is_allow, is_project_staff, **kwargs):
        if is_staff:
            users = [user for user in users if is_project_staff(user['id'], project_id) ]
        else:
            users = [user for user in users if not is_project_staff(user['id'], project_id)]
        assert len(users)

        for user in users:
            if is_allow:
                self._test_task_list_200(user['username'], project_id, tasks, **kwargs)
            else:
                self._test_task_list_403(user['username'], project_id, **kwargs)

    def _test_assigned_users_to_see_task_data(self, tasks, users, is_task_staff, **kwargs):
        for task in tasks:
            staff_users = [user for user in users if is_task_staff(user['id'], task['id'])]
            assert len(staff_users)
            for user in staff_users:
                response = get_method(user['username'], f'tasks', **kwargs)
                response_data = response.json()
                assert response.status_code == HTTPStatus.OK
                assert any(_task['id'] == task['id'] for _task in response_data['results'])

    @pytest.mark.parametrize('project_id', [1])
    @pytest.mark.parametrize('groups, is_staff, is_allow', [
        ('admin', False, True),
        ('business', False, False),
    ])
    def test_project_tasks_visibility(self, project_id, groups, users, tasks, is_staff, is_allow, find_users, is_project_staff):
        users = find_users(privilege=groups)
        tasks = list(filter(lambda x: x['project_id'] == project_id, tasks))
        assert len(tasks)

        self._test_users_to_see_task_list(project_id, tasks, users, is_staff, is_allow, is_project_staff)

    @pytest.mark.parametrize('project_id, groups', [(1, 'user')])
    def test_task_assigned_to_see_task(self, project_id, groups, users, tasks, find_users, is_task_staff):
        users = find_users(privilege=groups)
        tasks = list(filter(lambda x: x['project_id'] == project_id and x['assignee'], tasks))
        assert len(tasks)

        self._test_assigned_users_to_see_task_data(tasks, users, is_task_staff)

    @pytest.mark.parametrize('org, project_id', [({'id': 2, 'slug': 'org2'}, 2)])
    @pytest.mark.parametrize('role, is_staff, is_allow', [
        ('maintainer', False, True),
        ('supervisor', False, False),
    ])
    def test_org_project_tasks_visibility(self, org, project_id, role, is_staff, is_allow, tasks, is_task_staff, is_project_staff, find_users):
        users = find_users(org=org['id'], role=role)
        tasks = list(filter(lambda x: x['project_id'] == project_id, tasks))
        assert len(tasks)

        self._test_users_to_see_task_list(project_id, tasks, users, is_staff, is_allow, is_project_staff, org=org['slug'])

    @pytest.mark.parametrize('org, project_id, role', [
        ({'id': 2, 'slug': 'org2'}, 2, 'worker')
    ])
    def test_org_task_assigneed_to_see_task(self, org, project_id, role, users, tasks, find_users, is_task_staff):
        users = find_users(org=org['id'], role=role)
        tasks = list(filter(lambda x: x['project_id'] == project_id and x['assignee'], tasks))
        assert len(tasks)

        self._test_assigned_users_to_see_task_data(tasks, users, is_task_staff, org=org['slug'])


@pytest.mark.usefixtures('changedb')
class TestPostTasks:
    def _test_create_task_201(self, user, spec, **kwargs):
        response = post_method(user, '/tasks', spec, **kwargs)
        assert response.status_code == HTTPStatus.CREATED

    def _test_create_task_403(self, user, spec, **kwargs):
        response = post_method(user, '/tasks', spec, **kwargs)
        assert response.status_code == HTTPStatus.FORBIDDEN

    def _test_users_to_create_task_in_project(self, project_id, users, is_staff, is_allow, is_project_staff, **kwargs):
        if is_staff:
            users = [user for user in users if is_project_staff(user['id'], project_id) ]
        else:
            users = [user for user in users if not is_project_staff(user['id'], project_id)]
        assert len(users)

        for user in users:
            username = user['username']
            spec = {
                'name': f'test {username} to create a task within a project',
                'project_id': project_id,
            }

            if is_allow:
                self._test_create_task_201(username, spec, **kwargs)
            else:
                self._test_create_task_403(username, spec, **kwargs)

    @pytest.mark.parametrize('project_id', [1])
    @pytest.mark.parametrize('groups, is_staff, is_allow', [
        ('admin', False, True),
        ('business', False, False),
        ('user', True, True),
    ])
    def test_users_to_create_task_in_project(self, project_id, groups, is_staff, is_allow, is_project_staff, find_users):
        users = find_users(privilege=groups)
        self._test_users_to_create_task_in_project(project_id, users, is_staff, is_allow, is_project_staff)

    @pytest.mark.parametrize('org, project_id', [({'id': 2, 'slug': 'org2'}, 2)])
    @pytest.mark.parametrize('role, is_staff, is_allow', [
        ('worker', False, False),
    ])
    def test_worker_cannot_create_task_in_project_without_ownership(self, org, project_id, role, is_staff, is_allow, is_project_staff, find_users):
        users = find_users(org=org['id'], role=role)
        self._test_users_to_create_task_in_project(project_id, users, is_staff, is_allow, is_project_staff, org=org['slug'])

@pytest.mark.usefixtures('dontchangedb')
class TestGetData:
    _USERNAME = 'user1'

    @pytest.mark.parametrize('content_type, task_id', [
        ('image/png',                8),
        ('image/png',                5),
        ('image/x.point-cloud-data', 6),
    ])
    def test_frame_content_type(self, content_type, task_id):
        response = get_method(self._USERNAME, f'tasks/{task_id}/data', type='frame', quality='original', number=0)
        assert response.status_code == HTTPStatus.OK
        assert response.headers['Content-Type'] == content_type

@pytest.mark.usefixtures('changedb')
class TestPatchTaskAnnotations:
    def _test_check_response(self, is_allow, response, data=None):
        if is_allow:
            assert response.status_code == HTTPStatus.OK
            assert DeepDiff(data, response.json(),
                exclude_paths="root['version']") == {}
        else:
            assert response.status_code == HTTPStatus.FORBIDDEN

    @pytest.fixture(scope='class')
    def request_data(self, annotations):
        def get_data(tid):
            data = deepcopy(annotations['task'][str(tid)])
            data['shapes'][0].update({'points': [2.0, 3.0, 4.0, 5.0, 6.0, 7.0]})
            data['version'] += 1
            return data
        return get_data

    @pytest.mark.parametrize('org', [''])
    @pytest.mark.parametrize('privilege, task_staff, is_allow', [
        ('admin',    True, True), ('admin',    False, True),
        ('business', True, True), ('business', False, False),
        ('worker',   True, True), ('worker',   False, False),
        ('user',     True, True), ('user',     False, False)
    ])
    def test_user_update_task_annotations(self, org, privilege, task_staff, is_allow,
            find_task_staff_user, find_users, request_data, tasks_by_org, filter_tasks_with_shapes):
        users = find_users(privilege=privilege)
        tasks = tasks_by_org[org]
        filtered_tasks = filter_tasks_with_shapes(tasks)
        username, tid = find_task_staff_user(filtered_tasks, users, task_staff)

        data = request_data(tid)
        response = patch_method(username, f'tasks/{tid}/annotations', data,
            org_id=org, action='update')

        self._test_check_response(is_allow, response, data)

    @pytest.mark.parametrize('org', [2])
    @pytest.mark.parametrize('role, task_staff, is_allow', [
        ('maintainer', False, True),  ('owner',  False, True),
        ('supervisor', False, False), ('worker', False, False),
        ('maintainer', True, True),   ('owner',  True, True),
        ('supervisor', True, True),   ('worker', True, True)
    ])
    def test_member_update_task_annotation(self, org, role, task_staff, is_allow,
            find_task_staff_user, find_users, tasks_by_org, request_data):
        users = find_users(role=role, org=org)
        tasks = tasks_by_org[org]
        username, tid = find_task_staff_user(tasks, users, task_staff)

        data = request_data(tid)
        response = patch_method(username, f'tasks/{tid}/annotations', data,
            org_id=org, action='update')

        self._test_check_response(is_allow, response, data)

@pytest.mark.usefixtures('dontchangedb')
class TestGetTaskDataset:
    def _test_export_project(self, username, tid, **kwargs):
        response = get_method(username, f'tasks/{tid}/dataset', **kwargs)
        assert response.status_code == HTTPStatus.ACCEPTED

        response = get_method(username, f'tasks/{tid}/dataset', **kwargs)
        assert response.status_code == HTTPStatus.CREATED

        response = get_method(username, f'tasks/{tid}/dataset', action='download', **kwargs)
        assert response.status_code == HTTPStatus.OK

    def test_admin_can_export_task_dataset(self, tasks_with_shapes):
        task = tasks_with_shapes[0]
        self._test_export_project('admin1', task['id'], format='CVAT for images 1.1')

@pytest.mark.usefixtures("changedb")
class TestPostTaskData:
    @staticmethod
    def _wait_until_task_is_created(username, task_id):
        url = f'tasks/{task_id}/status'

        while True:
            response = get_method(username, url)
            response_json = response.json()
            if response_json['state'] == 'Finished' or response_json['state'] == 'Failed':
                return response
            sleep(1)

    def _test_create_task(self, username, spec, data, files):
        response = post_method(username, '/tasks', spec)
        assert response.status_code == HTTPStatus.CREATED
        task_id = response.json()['id']

        response = post_files_method(username, f'/tasks/{task_id}/data', data, files)
        assert response.status_code == HTTPStatus.ACCEPTED

        response = self._wait_until_task_is_created(username, task_id)
        response_json = response.json()
        assert response_json['state'] == 'Finished'

        return task_id

    def test_can_create_task_with_defined_start_and_stop_frames(self):
        username = 'admin1'
        task_spec = {
            'name': f'test {username} to create a task with defined start and stop frames',
            "labels": [{
                "name": "car",
                "color": "#ff00ff"
            }],
        }

        task_data = {
            'image_quality': 75,
            'start_frame': 2,
            'stop_frame': 5
        }
        task_files = {
            f'client_files[{i}]': image for i, image in enumerate(generate_image_files(7))
        }

        task_id = self._test_create_task(username, task_spec, task_data, task_files)

        # check task size
        response = get_method(username, f'tasks/{task_id}')
        response_json = response.json()
        assert response_json['size'] == 4
