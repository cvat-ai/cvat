# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


from __future__ import annotations

import json
import logging
import os.path as osp
import urllib.parse
from time import sleep
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union

import attrs

from cvat_sdk.api_client import ApiClient, ApiException, ApiValueError, Configuration, models
from cvat_sdk.core.git import create_git_repo
from cvat_sdk.core.helpers import get_paginated_collection
from cvat_sdk.core.progress import ProgressReporter
from cvat_sdk.core.tasks import TaskProxy
from cvat_sdk.core.types import ResourceType
from cvat_sdk.core.uploading import Uploader
from cvat_sdk.core.utils import assert_status


@attrs.define
class Config:
    status_check_period: float = 5
    """In seconds"""


class Client:
    """
    Manages session and configuration.
    """

    # TODO: Locates resources and APIs.

    def __init__(
        self, url: str, *, logger: Optional[logging.Logger] = None, config: Optional[Config] = None
    ):
        # TODO: use requests instead of urllib3 in ApiClient
        # TODO: try to autodetect schema
        self._api_map = _CVAT_API_V2(url)
        self.api = ApiClient(Configuration(host=url))
        self.logger = logger or logging.getLogger(__name__)
        self.config = config or Config()

    def __enter__(self):
        self.api.__enter__()
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return self.api.__exit__(exc_type, exc_value, traceback)

    def close(self):
        return self.__exit__(None, None, None)

    def login(self, credentials: Tuple[str, str]):
        (auth, _) = self.api.auth_api.create_login(
            models.LoginRequest(username=credentials[0], password=credentials[1])
        )

        assert "sessionid" in self.api.cookies
        assert "csrftoken" in self.api.cookies
        self.api.set_default_header("Authorization", "Token " + auth.key)

    def create_task(
        self,
        spec: models.ITaskWriteRequest,
        resource_type: ResourceType,
        resources: Sequence[str],
        *,
        data_params: Optional[Dict[str, Any]] = None,
        annotation_path: str = "",
        annotation_format: str = "CVAT XML 1.1",
        status_check_period: int = None,
        dataset_repository_url: str = "",
        use_lfs: bool = False,
        pbar: Optional[ProgressReporter] = None,
    ) -> TaskProxy:
        """
        Create a new task with the given name and labels JSON and
        add the files to it.

        Returns: id of the created task
        """
        if status_check_period is None:
            status_check_period = self.config.status_check_period

        if getattr(spec, "project_id", None) and getattr(spec, "labels", None):
            raise ApiValueError(
                "Can't set labels to a task inside a project. "
                "Tasks inside a project use project's labels.",
                ["labels"],
            )
        (task, _) = self.api.tasks_api.create(spec)
        self.logger.info("Created task ID: %s NAME: %s", task.id, task.name)

        task = TaskProxy(self, task)
        task.upload_data(resource_type, resources, pbar=pbar, params=data_params)

        self.logger.info("Awaiting for task %s creation...", task.id)
        status = None
        while status != models.RqStatusStateEnum.allowed_values[("value",)]["FINISHED"]:
            sleep(status_check_period)
            (status, _) = self.api.tasks_api.retrieve_status(task.id)

            self.logger.info(
                "Task %s creation status=%s, message=%s",
                task.id,
                status.state.value,
                status.message,
            )

            if status.state.value == models.RqStatusStateEnum.allowed_values[("value",)]["FAILED"]:
                raise ApiException(status=status.state.value, reason=status.message)

            status = status.state.value

        if annotation_path:
            task.import_annotations(annotation_format, annotation_path, pbar=pbar)

        if dataset_repository_url:
            create_git_repo(
                self,
                task_id=task.id,
                repo_url=dataset_repository_url,
                status_check_period=status_check_period,
                use_lfs=use_lfs,
            )

        task.fetch()

        return task

    def list_tasks(
        self, *, return_json: bool = False, **kwargs
    ) -> Union[List[TaskProxy], List[Dict[str, Any]]]:
        """List all tasks in either basic or JSON format."""

        results = get_paginated_collection(
            endpoint=self.api.tasks_api.list_endpoint, return_json=return_json, **kwargs
        )

        if return_json:
            return json.dumps(results)

        return [TaskProxy(self, v) for v in results]

    def retrieve_task(self, task_id: int) -> TaskProxy:
        (task, _) = self.api.tasks_api.retrieve(task_id)
        return TaskProxy(self, task)

    def delete_tasks(self, task_ids: Sequence[int]):
        """
        Delete a list of tasks, ignoring those which don't exist.
        """

        for task_id in task_ids:
            (_, response) = self.api.tasks_api.destroy(task_id, _check_status=False)
            if 200 <= response.status <= 299:
                self.logger.info(f"Task ID {task_id} deleted")
            elif response.status == 404:
                self.logger.info(f"Task ID {task_id} not found")
            else:
                self.logger.warning(
                    f"Failed to delete task ID {task_id}: "
                    f"{response.msg} (status {response.status})"
                )

    def create_task_from_backup(
        self,
        filename: str,
        *,
        status_check_period: int = None,
        pbar: Optional[ProgressReporter] = None,
    ) -> TaskProxy:
        """
        Import a task from a backup file
        """
        if status_check_period is None:
            status_check_period = self.config.status_check_period

        params = {"filename": osp.basename(filename)}
        url = self._api_map.make_endpoint_url(self.api.tasks_api.create_backup_endpoint.path)
        uploader = Uploader(self)
        response = uploader.upload_file(
            url, filename, meta=params, query_params=params, pbar=pbar, logger=self.logger.debug
        )

        rq_id = json.loads(response.data)["rq_id"]

        # check task status
        while True:
            sleep(status_check_period)

            response = self.api.rest_client.POST(
                url, post_params={"rq_id": rq_id}, headers=self.api.get_common_headers()
            )
            if response.status == 201:
                break
            assert_status(202, response)

        task_id = json.loads(response.data)["id"]
        self.logger.info(f"Task has been imported sucessfully. Task ID: {task_id}")

        return self.retrieve_task(task_id)


class _CVAT_API_V2:
    """Build parameterized API URLs"""

    def __init__(self, host, https=False):
        if host.startswith("https://"):
            https = True
        if host.startswith("http://") or host.startswith("https://"):
            host = host.replace("http://", "")
            host = host.replace("https://", "")
        scheme = "https" if https else "http"
        self.host = "{}://{}".format(scheme, host)
        self.base = self.host + "/api/"
        self.git = f"{scheme}://{host}/git/repository/"

    def git_create(self, task_id):
        return self.git + f"create/{task_id}"

    def git_check(self, rq_id):
        return self.git + f"check/{rq_id}"

    def make_endpoint_url(
        self,
        path: str,
        *,
        psub: Optional[Sequence[Any]] = None,
        kwsub: Optional[Dict[str, Any]] = None,
        query_params: Optional[Dict[str, Any]] = None,
    ) -> str:
        url = self.host + path
        if psub or kwsub:
            url = url.format(*(psub or []), **(kwsub or {}))
        if query_params:
            url += "?" + urllib.parse.urlencode(query_params)
        return url


def make_client(
    host: str, *, port: int = 8080, credentials: Optional[Tuple[int, int]] = None
) -> Client:
    client = Client(url=f"{host}:{port}")
    if credentials is not None:
        client.login(credentials)
    return client
