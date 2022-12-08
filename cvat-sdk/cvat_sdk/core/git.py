# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import json
from time import sleep
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from cvat_sdk.core.client import Client


def create_git_repo(
    client: Client,
    *,
    task_id: int,
    repo_url: str,
    status_check_period: int = None,
    use_lfs: bool = True,
):
    if status_check_period is None:
        status_check_period = client.config.status_check_period

    common_headers = client.api_client.get_common_headers()

    response = client.api_client.rest_client.POST(
        client.api_map.git_create(task_id),
        post_params={"path": repo_url, "lfs": use_lfs, "tid": task_id},
        headers=common_headers,
    )
    response_json = json.loads(response.data)
    rq_id = response_json["rq_id"]
    client.logger.info(f"Create RQ ID: {rq_id}")

    client.logger.debug("Awaiting a dataset repository to be created for the task %s...", task_id)
    check_url = client.api_map.git_check(rq_id)
    status = None
    while status != "finished":
        sleep(status_check_period)
        response = client.api_client.rest_client.GET(check_url, headers=common_headers)
        response_json = json.loads(response.data)
        status = response_json["status"]
        if status == "failed" or status == "unknown":
            client.logger.error(
                "Dataset repository creation request for task %s failed" "with status %s.",
                task_id,
                status,
            )
            break

        client.logger.debug(
            "Awaiting a dataset repository to be created for the task %s. Response status: %s",
            task_id,
            status,
        )

    client.logger.debug("Dataset repository creation completed with status: %s.", status)
