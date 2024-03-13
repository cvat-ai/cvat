# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


import os
from concurrent.futures import ThreadPoolExecutor
from functools import partial
from http import HTTPStatus

import pytest

import shared.utils.s3 as s3
from shared.utils.config import make_api_client
from shared.utils.helpers import generate_image_file

from .utils import create_task


@pytest.mark.usefixtures("restore_db_per_function")
@pytest.mark.usefixtures("restore_cvat_data")
@pytest.mark.usefixtures("restore_redis_inmem_per_function")
class TestRQQueueWorking:
    _USER_1 = "admin1"
    _USER_2 = "admin2"

    @pytest.mark.with_external_services
    @pytest.mark.timeout(60)
    @pytest.mark.skipif(
        os.getenv("ONE_RUNNING_JOB_IN_QUEUE_PER_USER", "false").lower() not in {"true", "yes", "1"},
        reason="The server is not configured to enable limit 1 user 1 task at a time",
    )
    @pytest.mark.parametrize("cloud_storage_id", [2])
    def test_user_cannot_clog_import_queue_with_his_tasks(
        self, cloud_storage_id: int, cloud_storages, request
    ):
        def _create_task(idx: int, username: str) -> int:
            task_spec = {
                "name": f"Test task {idx}",
                "labels": [
                    {
                        "name": "car",
                    }
                ],
            }

            task_data = {
                "image_quality": 90,
                "server_files": ["dataset/"],
                "cloud_storage_id": cloud_storage_id,
                "use_cache": False,
            }

            task_id, _ = create_task(username, task_spec, task_data)
            return task_id

        s3_client = s3.make_client()
        cs_name = cloud_storages[cloud_storage_id]["resource"]
        dataset_size = 100

        img_content = generate_image_file(size=(1920, 1080)).getvalue()

        for i in range(dataset_size):
            filename = f"dataset/image_{i}.jpeg"
            s3_client.create_file(bucket=cs_name, filename=filename, data=img_content)
            request.addfinalizer(
                partial(
                    s3_client.remove_file,
                    bucket=cs_name,
                    filename=filename,
                )
            )

        number_of_tasks = 4
        users = [self._USER_1] * (number_of_tasks - 1)
        users.append(self._USER_2)

        futures, task_ids = [], []

        with ThreadPoolExecutor(max_workers=number_of_tasks) as executor:
            for idx, user in enumerate(users):
                futures.append(executor.submit(_create_task, idx, user))

            for future in futures:
                task_ids.append(future.result())

        tasks = []

        for idx, task_id in enumerate(task_ids):
            with make_api_client(users[idx]) as api_client:
                (task, response) = api_client.tasks_api.retrieve(task_id)
            assert response.status == HTTPStatus.OK
            tasks.append(task)

        sorted_tasks = sorted(tasks, key=lambda x: x.updated_date)
        assert self._USER_2 in [t.owner.username for t in sorted_tasks[:2]]
