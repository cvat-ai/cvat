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
            "client_files": generate_image_files(3),
        }

        task_id, _ = create_task(self._USERNAME, task_spec, task_data)
        return task_id

    def test_check_rq_job_dependencies_after_creating_tasks_in_parallel(self, request):
        if not request.session.config.getoption("--adjusted-server-conf"):
            pytest.skip("Server is not configured with ONE_RUNNING_JOB_IN_QUEUE_PER_USER setting")
        RQ_JOB_TEMPLATE = "create:task.id{}"
        with ThreadPool(5) as pool:
            task_ids = pool.map(self._create_task, range(10))

        # Check for each task that it has 0 or 1 dependency.
        # Several tasks should not depend on one task.
        queue = Queue("import", connection=Redis(port=9379))
        rq_job_ids = [RQ_JOB_TEMPLATE.format(task_id) for task_id in task_ids]
        rq_jobs = queue.job_class.fetch_many(rq_job_ids, connection=queue.connection)

        for rq_job in rq_jobs:
            assert len(rq_job.dependency_ids) <= 1, "Several tasks should not depend on one task"

        assert any(
            [rq_job.dependency_ids for rq_job in rq_jobs]
        ), "At least one task should depend on another"
