# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from multiprocessing.pool import ThreadPool

import pytest
from redis import Redis
from rq import Queue

from shared.utils.helpers import generate_image_files

from .utils import create_task


@pytest.mark.usefixtures("restore_db_per_function")
@pytest.mark.usefixtures("restore_cvat_data")
@pytest.mark.usefixtures("restore_redis_db_per_function")
class TestRqJobDependencies:
    _USERNAME = "admin1"

    def _create_task(self, idx: int) -> int:
        task_spec = {
            "name": f"Test task {idx}",
            "labels": [
                {
                    "name": "car",
                }
            ],
        }

        task_data = {
            "image_quality": 75,
            "client_files": generate_image_files(300),
        }

        task_id, _ = create_task(self._USERNAME, task_spec, task_data)
        return task_id

    def test_check_rq_job_dependencies_after_creating_tasks_in_parallel(self, pytestconfig):
        if not pytestconfig.getoption("--one-user-active-rq-job"):
            pytest.skip("Server is not configured with ONE_RUNNING_JOB_IN_QUEUE_PER_USER setting")

        threads_number, number_of_tasks = 5, 10

        with ThreadPool(threads_number) as pool:
            task_ids = pool.map(self._create_task, range(number_of_tasks))

        RQ_JOB_TEMPLATE = "create:task.id{}"

        # Check for each task that it has 0 or 1 dependency.
        # Several tasks should not depend on one task.
        queue = Queue("import", connection=Redis(port=9379))
        rq_job_ids = [RQ_JOB_TEMPLATE.format(task_id) for task_id in task_ids]
        rq_jobs = queue.job_class.fetch_many(rq_job_ids, connection=queue.connection)

        assert sum([1 for rq_job in rq_jobs if rq_job.dependency_ids]) > min(
            threads_number, number_of_tasks
        ), "Most of the created tasks should depend on other"

        sorted_rq_jobs = sorted(rq_jobs, key=lambda x: x.started_at)

        for idx, rq_job in enumerate(sorted_rq_jobs):
            assert len(rq_job.dependency_ids) <= 1, "Several tasks should not depend on one task"
            if not (len(sorted_rq_jobs) - 1 == idx):
                assert rq_job.ended_at < sorted_rq_jobs[idx + 1].started_at
