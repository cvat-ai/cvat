# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

from http import HTTPStatus
from deepdiff import DeepDiff
import pytest
from .utils.config import get_method, patch_method

def get_job_staff(job, tasks, projects):
    job_staff = []
    job_staff.append(job['assignee'])
    tid = job['task_id']
    job_staff.append(tasks[tid]['owner'])
    job_staff.append(tasks[tid]['assignee'])

    pid = job['project_id']
    if pid:
        job_staff.append(projects[pid]['owner'])
        job_staff.append(projects[pid]['assignee'])
    job_staff = set(u['id'] for u in job_staff if u is not None)

    return job_staff

def filter_jobs(jobs, tasks, org):
    if org is None:
        kwargs = {}
        jobs = jobs.raw
    elif org == '':
        kwargs = {'org': ''}
        jobs = [job for job in jobs
            if tasks[job['task_id']]['organization'] is None]
    else:
        kwargs = {'org_id': org}
        jobs = [job for job in jobs
            if tasks[job['task_id']]['organization'] == org]

    return jobs, kwargs

class TestGetJobs:
    def _test_get_job_200(self, user, jid, data, **kwargs):
        response = get_method(user, f'jobs/{jid}', **kwargs)

        assert response.status_code == HTTPStatus.OK
        assert DeepDiff(data, response.json()) == {}

    def _test_get_job_403(self, user, jid, **kwargs):
        response = get_method(user, f'jobs/{jid}', **kwargs)
        assert response.status_code == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize('org', [None, '', 1, 2])
    def test_admin_get_job(self, jobs, tasks, org):
        jobs, kwargs = filter_jobs(jobs, tasks, org)

        # keep only the reasonable amount of jobs
        for job in jobs[:8]:
            self._test_get_job_200('admin2', job['id'], job, **kwargs)

    @pytest.mark.parametrize('org_id', ['', None, 1, 2])
    @pytest.mark.parametrize('groups', [['business'], ['user'], ['worker'], []])
    def test_non_admin_get_job(self, org_id, groups, users, jobs, tasks, projects,
        org_staff):
        # keep the reasonable amount of users and jobs
        users = [u for u in users if u['groups'] == groups][:4]
        jobs, kwargs = filter_jobs(jobs, tasks, org_id)
        org_staff = org_staff(org_id)

        for job in jobs[:8]:
            job_staff = get_job_staff(job, tasks, projects)

            # check if the specific user in job_staff to see the job
            for user in users:
                if user['id'] in job_staff | org_staff:
                    self._test_get_job_200(user['username'], job['id'], job, **kwargs)
                else:
                    self._test_get_job_403(user['username'], job['id'], **kwargs)

class TestListJobs:
    def _test_list_jobs_200(self, user, data, **kwargs):
        response = get_method(user, 'jobs', **kwargs, page_size=all)

        assert response.status_code == HTTPStatus.OK
        assert DeepDiff(data, response.json()['results']) == {}

    def _test_list_jobs_403(self, user, **kwargs):
        response = get_method(user, 'jobs', **kwargs)
        assert response.status_code == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize('org', [None, '', 1, 2])
    def test_admin_list_jobs(self, jobs, tasks, org):
        jobs, kwargs = filter_jobs(jobs, tasks, org)
        self._test_list_jobs_200('admin1', jobs, **kwargs)

    @pytest.mark.parametrize('org_id', ['', None, 1, 2])
    @pytest.mark.parametrize('groups', [['business'], ['user'], ['worker'], []])
    def test_non_admin_list_jobs(self, org_id, groups, users, jobs, tasks,
            projects, org_staff, is_org_member):
        users = [u for u in users if u['groups'] == groups][:2]
        jobs, kwargs = filter_jobs(jobs, tasks, org_id)
        org_staff = org_staff(org_id)

        for user in users:
            user_jobs = []
            for job in jobs:
                job_staff = get_job_staff(job, tasks, projects)
                if user['id'] in job_staff | org_staff:
                    user_jobs.append(job)
            if is_org_member(user['id'], org_id):
                self._test_list_jobs_200(user['username'], user_jobs, **kwargs)
            else:
                self._test_list_jobs_403(user['username'], **kwargs)

class TestGetAnnotations:
    def _test_get_job_annotations_200(self, user, jid, data, **kwargs):
        response = get_method(user, f'jobs/{jid}/annotations', **kwargs)

        response_data = response.json()
        response_data['shapes'] = sorted(response_data['shapes'], key=lambda a: a['id'])

        assert response.status_code == HTTPStatus.OK
        assert DeepDiff(data, response_data,
            exclude_paths="root['version']") == {}

    def _test_get_job_annotations_403(self, user, jid, **kwargs):
        response = get_method(user, f'jobs/{jid}/annotations', **kwargs)
        assert response.status_code == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize('org', [''])
    @pytest.mark.parametrize('groups, job_staff, is_allow', [
        (['admin'],    True, True), (['admin'],    False, True),
        (['business'], True, True), (['business'], False, False),
        (['worker'],   True, True), (['worker'],   False, False),
        (['user'],     True, True), (['user'],     False, False)
    ])
    def test_user_get_job_annotations(self, org, groups, job_staff,
            is_allow, users, jobs, tasks, annotations, find_job_staff_user):
        users = [u for u in users if u['groups'] == groups]
        jobs, kwargs = filter_jobs(jobs, tasks, org)
        username, job_id = find_job_staff_user(jobs, users, job_staff)

        if is_allow:
            self._test_get_job_annotations_200(username,
                job_id, annotations['job'][str(job_id)], **kwargs)
        else:
            self._test_get_job_annotations_403(username, job_id, **kwargs)

    @pytest.mark.parametrize('org', [2])
    @pytest.mark.parametrize('role, job_staff, is_allow', [
        ('owner',      True, True), ('owner',      False,  True),
        ('maintainer', True, True), ('maintainer', False,  True),
        ('supervisor', True, True), ('supervisor', False, False),
        ('worker',     True, True), ('worker',     False, False),
    ])
    def test_member_get_job_annotations(self, org, role, job_staff, is_allow,
            jobs, tasks, find_job_staff_user, annotations, find_users):
        users = find_users(org=org, role=role)
        jobs, kwargs = filter_jobs(jobs, tasks, org)
        username, jid = find_job_staff_user(jobs, users, job_staff)

        if is_allow:
            data = annotations['job'][str(jid)]
            data['shapes']  = sorted(data['shapes'], key=lambda a: a['id'])
            self._test_get_job_annotations_200(username, jid, data, **kwargs)
        else:
            self._test_get_job_annotations_403(username, jid, **kwargs)

    @pytest.mark.parametrize('org', [1])
    @pytest.mark.parametrize('privilege, is_allow', [
        ('admin', True), ('business', False), ('worker', False), ('user', False)
    ])
    def test_non_member_get_job_annotations(self, org, privilege, is_allow,
            jobs, tasks, find_job_staff_user, annotations, find_users):
        users = find_users(privilege=privilege, exclude_org=org)
        jobs, kwargs = filter_jobs(jobs, tasks, org)
        username, job_id = find_job_staff_user(jobs, users, False)

        kwargs = {'org_id': org}
        if is_allow:
            self._test_get_job_annotations_200(username,
                job_id, annotations['job'][str(job_id)], **kwargs)
        else:
            self._test_get_job_annotations_403(username, job_id, **kwargs)

class TestPatchJobAnnotations:
    _ORG = 2

    def _test_check_respone(self, is_allow, response, data=None):
        if is_allow:
            assert response.status_code == HTTPStatus.OK
            assert DeepDiff(data, response.json(),
                exclude_paths="root['version']") == {}
        else:
            assert response.status_code == HTTPStatus.FORBIDDEN

    @pytest.fixture(scope='class')
    def request_data(self, annotations):
        def get_data(jid):
            data = annotations['job'][str(jid)].copy()
            data['shapes'][0].update({'points': [2.0, 3.0, 4.0, 5.0, 6.0, 7.0]})
            data['version'] += 1
            return data
        return get_data

    @pytest.mark.parametrize('org', [2])
    @pytest.mark.parametrize('role, job_staff, is_allow', [
        ('maintainer', False, True),  ('owner',  False, True),
        ('supervisor', False, False), ('worker', False, False),
        ('maintainer', True, True), ('owner',  True, True),
        ('supervisor', True, True), ('worker', True, True)
    ])
    def test_member_update_job_annotations(self, org, role, job_staff, is_allow,
            find_job_staff_user, find_users, request_data, jobs_by_org, filter_jobs_with_shapes):
        users = find_users(role=role, org=org)
        jobs = jobs_by_org[org]
        filtered_jobs = filter_jobs_with_shapes(jobs)
        username, jid = find_job_staff_user(filtered_jobs, users, job_staff)

        data = request_data(jid)
        response = patch_method(username, f'jobs/{jid}/annotations',
            data, org_id=org, action='update')

        self._test_check_respone(is_allow, response, data)


    @pytest.mark.parametrize('org', [2])
    @pytest.mark.parametrize('privilege, is_allow', [
        ('admin', True), ('business', False), ('worker', False), ('user', False)
    ])
    def test_non_member_update_job_annotations(self, org, privilege, is_allow,
            find_job_staff_user, find_users, request_data, jobs_by_org, filter_jobs_with_shapes):
        users = find_users(privilege=privilege, exclude_org=org)
        jobs = jobs_by_org[org]
        filtered_jobs = filter_jobs_with_shapes(jobs)
        username, jid = find_job_staff_user(filtered_jobs, users, False)

        data = request_data(jid)
        response = patch_method(username, f'jobs/{jid}/annotations', data,
            org_id=org, action='update')

        self._test_check_respone(is_allow, response, data)

    @pytest.mark.parametrize('org', [''])
    @pytest.mark.parametrize('privilege, job_staff, is_allow', [
        ('admin',    True, True), ('admin',    False, True),
        ('business', True, True), ('business', False, False),
        ('worker',   True, True), ('worker',   False, False),
        ('user',     True, True), ('user',     False, False)
    ])
    def test_user_update_job_annotations(self, org, privilege, job_staff, is_allow,
            find_job_staff_user, find_users, request_data, jobs_by_org, filter_jobs_with_shapes):
        users = find_users(privilege=privilege)
        jobs = jobs_by_org[org]
        filtered_jobs = filter_jobs_with_shapes(jobs)
        username, jid = find_job_staff_user(filtered_jobs, users, job_staff)

        data = request_data(jid)
        response = patch_method(username, f'jobs/{jid}/annotations', data,
            org_id=org, action='update')

        self._test_check_respone(is_allow, response, data)

class TestPatchJob:
    _ORG = 2

    @pytest.fixture(scope='class')
    def find_task_staff_user(self, is_task_staff):
        def find(jobs, users, is_staff):
            for job in jobs:
                for user in users:
                    if is_staff == is_task_staff(user['id'], job['task_id']):
                        return user, job['id']
            return None, None
        return find

    @pytest.fixture(scope='class')
    def expected_data(self, jobs, users):
        keys = ['url', 'id', 'username', 'first_name', 'last_name']
        def find(job_id, assignee_id):
            data = jobs[job_id].copy()
            data['assignee'] = dict(filter(lambda a: a[0] in keys,
                users[assignee_id].items()))
            return data
        return find

    @pytest.fixture(scope='class')
    def new_assignee(self, jobs, tasks, assignee_id, org_staff):
        def find_new_assignee(jid, user_id):
            members = org_staff(tasks[jobs[jid]['task_id']]['organization'])
            members -= {assignee_id(jobs[jid]), user_id}
            return members.pop()
        return find_new_assignee

    @pytest.mark.parametrize('org', [2])
    @pytest.mark.parametrize('role, task_staff, is_allow', [
        ('maintainer', False, True),  ('owner',  False, True),
        ('supervisor', False, False), ('worker', False, False),
        ('maintainer', True, True),   ('owner',  True, True),
        ('supervisor', True, True),   ('worker', True, True)
    ])
    def test_member_update_job_assignee(self, org, role, task_staff, is_allow,
            find_task_staff_user, find_users, jobs_by_org, new_assignee, expected_data):
        users, jobs = find_users(role=role, org=org), jobs_by_org[org]
        user, jid = find_task_staff_user(jobs, users, task_staff)

        assignee = new_assignee(jid, user['id'])
        response = patch_method(user['username'], f'jobs/{jid}',
            {'assignee': assignee}, org_id=self._ORG)

        if is_allow:
            assert response.status_code == HTTPStatus.OK
            assert DeepDiff(expected_data(jid, assignee), response.json()) == {}
        else:
            assert response.status_code == HTTPStatus.FORBIDDEN
