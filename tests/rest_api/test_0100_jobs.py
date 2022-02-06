# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

from http import HTTPStatus
from deepdiff import DeepDiff
import pytest
from .utils.config import get_method
from .conftest import tasks as get_tasks

class TestGetJobs:
    def _test_can_see_jobs(self, user, data, **kwargs):
        response = get_method(user, 'jobs', **kwargs, page_size=all)

        assert response.status_code == HTTPStatus.OK
        assert DeepDiff(data, response.json()['results']) == {}

    def _test_cannot_see_jobs(self, user, **kwargs):
        response = get_method(user, 'jobs', **kwargs)

        assert response.status_code == HTTPStatus.FORBIDDEN

    def test_admin_can_see_jobs_all(self, jobs):
        self._test_can_see_jobs('admin2', jobs.raw)

    def test_admin_can_see_jobs_no_org(self, jobs, tasks):
        jobs_no_org = [job for job in jobs
            if tasks[job['task_id']]['organization'] is None]
        self._test_can_see_jobs('admin1', jobs_no_org, org='')

    @pytest.mark.parametrize('org', [1, 2])
    def test_admin_can_see_jobs_org(self, jobs, tasks, org):
        jobs_org = [job for job in jobs
            if tasks[job['task_id']]['organization'] == org]
        self._test_can_see_jobs('admin1', jobs_org, org_id=org)
