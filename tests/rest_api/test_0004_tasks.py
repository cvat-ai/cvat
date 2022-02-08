# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

from http import HTTPStatus
from deepdiff import DeepDiff

from .utils.config import get_method, patch_method

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

    def _assign_user_to_proj(self, user, projId, **kwargs):
        response = patch_method(self._ADMIN, f'projects/{projId}', { 'assignee_id': user['id'] }, **kwargs)
        assert response.status_code == HTTPStatus.OK

    def _assign_user_to_task(self, user, taskId, **kwargs):
        response = patch_method(self._ADMIN, f'tasks/{taskId}', { 'assignee_id': user['id'] }, **kwargs)
        assert response.status_code == HTTPStatus.OK

    def _test_can_see_project_tasks(self, user, data, exclude_paths = '', **kwargs):
        response = get_method(user, f'projects/{self._SAND_PROJ_ID}/tasks', **kwargs)
        response_data = response.json()

        assert response.status_code == HTTPStatus.OK
        assert DeepDiff(data, response_data['results'], ignore_order=True, exclude_paths=exclude_paths) == {}

    def _test_cannot_see_project_tasks(self, user, projectId, **kwargs):
        response = get_method(user, f'projects/{projectId}/tasks', **kwargs)
        assert response.status_code == HTTPStatus.FORBIDDEN

    # [sandbox] admin can see task data in project even he has no ownerships in this project
    def test_admin_can_see_project_tasks(self, tasks):
        filtered_tasks = list(filter(lambda x: x['project_id'] == self._SAND_PROJ_ID, tasks))
        self._test_can_see_project_tasks(self._ADMIN, filtered_tasks)

    # [sandbox] business cannot see task data in project if he has no ownerships in this project
    def test_business_cannot_see_project_tasks(self):
        self._test_cannot_see_project_tasks(self._SAND_PROJ_NOT_OWNER, self._SAND_PROJ_ID)

    # [sandbox] user that has one of these ownerships: [Owner, Project:owner, Assignee, Project:assignee] can see task data
    def test_entitled_user_can_see_project_tasks(self, users, tasks):
        user1 = list(filter(lambda x: x['username'] == 'user1', users))[0]
        user2 = list(filter(lambda x: x['username'] == 'user2', users))[0]
        self._assign_user_to_proj(user1, self._SAND_PROJ_ID)
        self._assign_user_to_task(user2, self._SAND_TASK_ID)
        exclude_paths = [f"root[{i}]['assignee']" for i in range(len(tasks))]
        exclude_paths.extend([f"root[{i}]['updated_date']" for i in range(len(tasks))])
        filtered = list(filter(lambda x: x['project_id'] == self._SAND_PROJ_ID, tasks))

        self._test_can_see_project_tasks(self._SAND_PROJ_OWNER, filtered, exclude_paths)
        self._test_can_see_project_tasks(user1['username'], filtered, exclude_paths)

        # check user2 is able to see a task they was assigned to
        response = get_method(user2['username'], f'tasks')
        response_data = response.json()
        assert response.status_code == HTTPStatus.OK
        assert any(task['id'] == self._SAND_TASK_ID for task in response_data['results'])

    # [organization] maintainer can see task data even if he has no ownerships in corresponding Project, Task
    def test_organization_maintainer_can_see_project_tasks(self):
        # TODO: worker 1 creates a project, a task
        # TODO: check maintainer to see them
        pass

    # [organization] supervisor cannot see task data if he has no ownerships in corresponding Project, Task
    def test_organization_supervisor_cannot_see_project_tasks(self):
        self._test_cannot_see_project_tasks(self._ORG_SUPERVISOR, self._ORG_PROJ_ID)

    # [organization] worker (as role) that has one of these ownerships: [Owner, Project:owner, Assignee, Project:assignee], can see task data
    def test_organization_entitled_worker_can_see_project_tasks(self):
        # TODO: worker 1 creates a project, a task
        # TODO: worker 1 assigns worker 2 to the task, the project
        # TODO: check permissions
        pass
