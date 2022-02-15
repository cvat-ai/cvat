# Copyright (C) 2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from http import HTTPStatus
from deepdiff import DeepDiff

from .utils.config import get_method, patch_method, post_method

class TestGetTasks:
    _ADMIN = 'admin1'
    _SAND_PROJ_ID = 1
    _SAND_TASK_ID = 3
    _SAND_PROJ_OWNER = 'business1'
    _SAND_PROJ_NOT_OWNER = 'business2'
    _ORG = 'org2'
    _ORG_PROJ_ID = 2
    _ORG_TASK_ID = 4
    _ORG_SUPERVISOR = 'user3'
    _ORG_MAINTAINER = 'business2'

    def _assign_user_to_proj(self, user, project_id, **kwargs):
        response = patch_method(self._ADMIN, f'projects/{project_id}', { 'assignee_id': user['id'] }, **kwargs)
        assert response.status_code == HTTPStatus.OK

    def _assign_user_to_task(self, user, task_id, **kwargs):
        response = patch_method(self._ADMIN, f'tasks/{task_id}', { 'assignee_id': user['id'] }, **kwargs)
        assert response.status_code == HTTPStatus.OK

    def _test_can_see_project_tasks(self, user, project_id, data, exclude_paths = '', **kwargs):
        response = get_method(user, f'projects/{project_id}/tasks', **kwargs)
        response_data = response.json()

        assert response.status_code == HTTPStatus.OK
        assert DeepDiff(data, response_data['results'], ignore_order=True, exclude_paths=exclude_paths) == {}

    def _test_cannot_see_project_tasks(self, user, project_id, **kwargs):
        response = get_method(user, f'projects/{project_id}/tasks', **kwargs)
        assert response.status_code == HTTPStatus.FORBIDDEN

    # [sandbox] admin can see task data in project even he has no ownerships in this project
    def test_admin_can_see_project_tasks(self, tasks):
        filtered_tasks = list(filter(lambda x: x['project_id'] == self._SAND_PROJ_ID, tasks))
        self._test_can_see_project_tasks(self._ADMIN, self._SAND_PROJ_ID, filtered_tasks)

    # [sandbox] business cannot see task data in project if he has no ownerships in this project
    def test_business_cannot_see_project_tasks(self):
        self._test_cannot_see_project_tasks(self._SAND_PROJ_NOT_OWNER, self._SAND_PROJ_ID)

    # [sandbox] user that has one of these ownerships: [Owner, Project:owner, Assignee, Project:assignee] can see task data
    def test_entitled_user_can_see_project_tasks(self, users, tasks):
        user1 = list(filter(lambda x: x['username'] == 'user1', users))[0]
        user2 = list(filter(lambda x: x['username'] == 'user2', users))[0]
        self._assign_user_to_proj(user1, self._SAND_PROJ_ID)
        self._assign_user_to_task(user2, self._SAND_TASK_ID)
        filtered = list(filter(lambda x: x['project_id'] == self._SAND_PROJ_ID, tasks))
        exclude_paths = [f"root[{i}]['assignee']" for i in range(len(filtered))]
        exclude_paths.extend([f"root[{i}]['updated_date']" for i in range(len(filtered))])

        self._test_can_see_project_tasks(self._SAND_PROJ_OWNER, self._SAND_PROJ_ID, filtered, exclude_paths)
        self._test_can_see_project_tasks(user1['username'], self._SAND_PROJ_ID, filtered, exclude_paths)

        # check user2 is able to see a task that was assigned to him
        response = get_method(user2['username'], f'tasks')
        response_data = response.json()
        assert response.status_code == HTTPStatus.OK
        assert any(task['id'] == self._SAND_TASK_ID for task in response_data['results'])

    # [organization] maintainer can see task data even if he has no ownerships in corresponding Project, Task
    def test_organization_maintainer_can_see_project_tasks(self, tasks):
        filtered_tasks = list(filter(lambda x: x['project_id'] == self._ORG_PROJ_ID, tasks))
        self._test_can_see_project_tasks(self._ORG_MAINTAINER, self._ORG_PROJ_ID, filtered_tasks, org=self._ORG)

    # [organization] supervisor cannot see task data if he has no ownerships in corresponding Project, Task
    def test_organization_supervisor_cannot_see_project_tasks(self):
        self._test_cannot_see_project_tasks(self._ORG_SUPERVISOR, self._ORG_PROJ_ID, org=self._ORG)

    # [organization] worker (as role) that has one of these ownerships: [Owner, Project:owner, Assignee, Project:assignee], can see task data
    def test_organization_entitled_worker_can_see_project_tasks(self, users, tasks):
        # Worker can't create tasks/projects, so we only check assignee
        worker2 = list(filter(lambda x: x['username'] == 'worker2', users))[0]
        worker3 = list(filter(lambda x: x['username'] == 'worker3', users))[0]
        self._assign_user_to_proj(worker2, self._ORG_PROJ_ID, org=self._ORG)
        self._assign_user_to_task(worker3, self._ORG_TASK_ID, org=self._ORG)
        filtered = list(filter(lambda x: x['project_id'] == self._ORG_PROJ_ID, tasks))
        exclude_paths = [f"root[{i}]['assignee']" for i in range(len(filtered))]
        exclude_paths.extend([f"root[{i}]['updated_date']" for i in range(len(filtered))])

        self._test_can_see_project_tasks('worker2', self._ORG_PROJ_ID, filtered, exclude_paths)

        # check worker3 is able to see a task that was assigned to him
        response = get_method(worker3['username'], f'tasks')
        response_data = response.json()
        assert response.status_code == HTTPStatus.OK
        assert any(task['id'] == self._ORG_TASK_ID for task in response_data['results'])


class TestPostTasks:
    _ADMIN = 'admin1'
    _SAND_PROJ_ID = 1
    _SAND_PROJ_OWNER = 'business1'
    _SAND_PROJ_NOT_OWNER = 'business2'
    _ORG = 'org2'
    _ORG_PROJ_ID = 2
    _ORG_SUPERVISOR_NOT_OWNER = 'user3'
    _ORG_WORKER_NO_OWNERSHIP = 'worker3'

    def _assign_user_to_proj(self, user, project_id, **kwargs):
        response = patch_method(self._ADMIN, f'projects/{project_id}', { 'assignee_id': user['id'] }, **kwargs)
        assert response.status_code == HTTPStatus.OK

    def _test_can_create_task_in_project(self, user, spec, **kwargs):
        response = post_method(user, '/tasks', spec, **kwargs)
        print(response.content)
        assert response.status_code == HTTPStatus.CREATED

    def _test_cannot_create_task_in_project(self, user, spec, **kwargs):
        response = post_method(user, '/tasks', spec, **kwargs)
        assert response.status_code == HTTPStatus.FORBIDDEN

    # [sandbox] admin can create task in project even he has no ownerships in this project
    def test_admin_can_create_task_in_project(self):
        spec = {
            'name': 'test admin to create a task within a project',
            'project_id': self._SAND_PROJ_ID,
        }
        self._test_can_create_task_in_project(self._ADMIN, spec)

    # [sandbox] business cannot create task in project if he has no ownerships in this project
    def test_business_cannot_create_task_in_project_without_ownership(self):
        spec = {
            'name': 'test business cannot create task without ownership',
            'project_id': self._SAND_PROJ_ID,
        }
        self._test_cannot_create_task_in_project(self._SAND_PROJ_NOT_OWNER, spec)

    # [sandbox] user that has one of these ownerships: [Project:owner, Project:assignee] and has less than 10 task can create task in project
    def test_entitled_user_can_create_tasks_in_project(self, users):
        spec = {
            'name': 'test entitled user can create tasks in project',
            'project_id': self._SAND_PROJ_ID,
        }
        self._test_can_create_task_in_project(self._SAND_PROJ_OWNER, spec)

        user1 = list(filter(lambda x: x['username'] == 'user1', users))[0]

        self._test_cannot_create_task_in_project(user1['username'], spec)
        self._assign_user_to_proj(user1, self._SAND_PROJ_ID)
        self._test_can_create_task_in_project(user1['username'], spec)

    # [organization] supervisor can create task in project even he has no ownerships in this project
    # TODO: SUPERVISOR DOES NOT SEE CREATED PROJECTS AND CANNOT CREATE TASKS

    # def test_supervisor_can_create_task_in_project_without_ownership(self, users):
    #     spec = {
    #         'name': 'test supervisor can create task in project',
    #         'project_id': self._ORG_PROJ_ID,
    #     }
    #     self._test_can_create_task_in_project(self._ORG_SUPERVISOR_NOT_OWNER, spec, org=self._ORG)

    # [organization] worker cannot create task in project even he has no ownerships in this project
    def test_worker_cannot_create_task_in_project_without_ownership(self):
        spec = {
            'name': 'test worker cannot create task in project without ownership',
            'project_id': self._ORG_PROJ_ID,
        }
        self._test_cannot_create_task_in_project(self._ORG_WORKER_NO_OWNERSHIP, spec, org=self._ORG)

    # [organization] worker (as role) that has one of these ownerships: [Project:owner, Project:assignee] can create task in project
    # TODO: A WORKER, ASSIGNED TO A PROJECT STILL CANNOT CREATE TASKS IN THE PROJECT
    # def test_worker_with_ownership_can_create_tasks_in_project(self, users):
    #     spec = {
    #         'name': 'test worker with ownerships can create task in project',
    #         'project_id': self._ORG_PROJ_ID,
    #     }

    #     worker3 = list(filter(lambda x: x['username'] == 'worker3', users))[0]

    #     self._test_cannot_create_task_in_project(worker3['username'], spec, org=self._ORG)
    #     self._assign_user_to_proj(worker3, self._ORG_PROJ_ID, org=self._ORG)
    #     self._test_can_create_task_in_project(worker3['username'], spec, org=self._ORG)

#!Q@W#E$R