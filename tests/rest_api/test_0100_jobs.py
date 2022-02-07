# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

from http import HTTPStatus
from deepdiff import DeepDiff
import pytest
from .utils.config import get_method
from .conftest import tasks as get_tasks

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
    def _test_list_jobs_200(self, user, data, **kwargs):
        response = get_method(user, 'jobs', **kwargs, page_size=all)

        assert response.status_code == HTTPStatus.OK
        assert DeepDiff(data, response.json()['results']) == {}

    def _test_list_jobs_403(self, user, **kwargs):
        response = get_method(user, 'jobs', **kwargs)
        assert response.status_code == HTTPStatus.FORBIDDEN

    def _test_get_job_200(self, user, jid, data, **kwargs):
        response = get_method(user, f'jobs/{jid}', **kwargs)

        assert response.status_code == HTTPStatus.OK
        assert DeepDiff(data, response.json()) == {}

    def _test_get_job_403(self, user, jid, **kwargs):
        response = get_method(user, f'jobs/{jid}', **kwargs)
        assert response.status_code == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize('org', [None, '', 1, 2])
    def test_admin_list_jobs(self, jobs, tasks, org):
        jobs, kwargs = filter_jobs(jobs, tasks, org)
        self._test_list_jobs_200('admin1', jobs, **kwargs)

    @pytest.mark.parametrize('org', [None, '', 1, 2])
    def test_admin_get_job(self, jobs, tasks, org):
        jobs, kwargs = filter_jobs(jobs, tasks, org)

        # keep only the reasonable amount of jobs
        for job in jobs[:8]:
            self._test_get_job_200('admin2', job['id'], job, **kwargs)

    @pytest.mark.parametrize('org', ['', None])
    @pytest.mark.parametrize('groups', [['business'], ['user'], ['worker'], []])
    def test_non_admin_get_job(self, org, groups, users, jobs, tasks, projects):
        # keep the reasonable amount of users and jobs
        users = [u for u in users if u['groups'] == groups][:2]
        jobs, kwargs = filter_jobs(jobs, tasks, org)

        for job in jobs[:8]:
            job_staff = get_job_staff(job, tasks, projects)

            # check if the specific user in job_staff to see the job
            for user in users:
                if user['id'] in job_staff:
                    self._test_get_job_200(user['username'], job['id'], job, **kwargs)
                else:
                    self._test_get_job_403(user['username'], job['id'], **kwargs)

    @pytest.mark.parametrize('org', ['', None])
    @pytest.mark.parametrize('groups', [['business'], ['user'], ['worker'], []])
    def test_non_admin_list_jobs(self, org, groups, users, jobs, tasks, projects):
        # keep the reasonable amount of users and jobs
        users = [u for u in users if u['groups'] == groups][:2]
        jobs, kwargs = filter_jobs(jobs, tasks, org)

        for user in users:
            user_jobs = []
            for job in jobs:
                job_staff = get_job_staff(job, tasks, projects)
                if user['id'] in job_staff:
                    user_jobs.append(job)

            self._test_list_jobs_200(user['username'], user_jobs, **kwargs)
