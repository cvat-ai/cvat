# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


from __future__ import annotations

import logging
import os.path as osp
import urllib.parse
from time import sleep
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union

from cvat_sdk import ApiClient, ApiException, ApiValueError, Configuration, models
from cvat_sdk.impl.git import create_git_repo
from cvat_sdk.impl.helpers import get_paginated_collection
from cvat_sdk.impl.progress import ProgressReporter
from cvat_sdk.impl.tasks import TaskProxy
from cvat_sdk.impl.types import ResourceType
from cvat_sdk.impl.utils import assert_status


class CvatClient:
    """
    Manages session and configuration.
    """

    # TODO: Locates resources and APIs.

    def __init__(self, url: str, *, logger: Optional[logging.Logger] = None):
        # TODO: use requests instead of urllib3 in ApiClient
        # TODO: try to autodetect schema
        self._api_map = _CVAT_API_V2(url)
        self.api = ApiClient(Configuration(host=url))
        self.logger = logger or logging.getLogger(__name__)

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
        status_check_period: int = 5,
        dataset_repository_url: str = "",
        use_lfs: bool = False,
        pbar: Optional[ProgressReporter] = None,
    ) -> TaskProxy:
        """
        Create a new task with the given name and labels JSON and
        add the files to it.

        Returns: id of the created task
        """

        if getattr(spec, "project_id", None) and getattr(spec, "labels", None):
            raise ApiValueError(
                "Can't set labels to a task inside a project. "
                "Tasks inside a project use project's labels.",
                ["labels"],
            )
        (task, _) = self.api.tasks_api.create(spec)
        self.logger.debug("Created task ID: %s NAME: %s", task.id, task.name)

        task = TaskProxy(self, task)
        task.upload_data(resource_type, resources, pbar=pbar, params=data_params)

        self.logger.debug("Awaiting for task %s creation...", task.id)
        status = None
        while status != models.RqStatusStateEnum.allowed_values[("value",)]["FINISHED"]:
            sleep(status_check_period)
            (status, _) = self.api.tasks_api.retrieve_status(task.id)

            self.logger.debug(
                "Task %s creation status=%s, message=%s",
                task.id,
                status.state.value,
                status.message,
            )

            if status == models.RqStatusStateEnum.allowed_values[("value",)]["FAILED"]:
                raise ApiException(status=status.state.value, reason=status.message)

            status = status.state.value

        if annotation_path:
            task.upload_annotations(annotation_format, annotation_path, pbar=pbar)

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
    ) -> Union[List[models.TaskRead], List[Dict[str, Any]]]:
        """List all tasks in either basic or JSON format."""

        return get_paginated_collection(
            endpoint=self.api.tasks_api.list_endpoint, return_json=return_json, **kwargs
        )

    def delete_tasks(self, task_ids: Sequence[int]):
        """
        Delete a list of tasks, ignoring those which don't exist.
        """

        for task_id in task_ids:
            (_, response) = self.api.tasks_api.destroy(task_id, _check_status=False)
            if 200 <= response.status <= 299:
                self.logger.debug(f"Task ID {task_id} deleted")
            elif response.status == 404:
                self.logger.debug(f"Task ID {task_id} not found")
            else:
                self.logger.debug(
                    f"Failed to delete task ID {task_id}: "
                    f"{response.msg} (status {response.status})"
                )

    def create_task_from_backup(self, filename, *, status_check_period=5, pbar=None) -> None:
        """Import a task from a backup file"""

        url = self.api.tasks_backup()
        params = {"filename": osp.basename(filename)}

        if pbar is None:
            pbar = self._make_pbar("Uploading...")

        response = self._upload_file_with_tus(
            url, filename, params=params, pbar=pbar, logger=self.logger.debug
        )
        response_json = response.json()
        rq_id = response_json["rq_id"]

        # check task status
        while True:
            sleep(status_check_period)

            response = self.session.post(url, data={"rq_id": rq_id})
            if response.status_code == 201:
                break
            assert_status(202, response)

        task_id = response.json()["id"]
        self.logger.info(f"Task has been imported sucessfully. Task ID: {task_id}")


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
            url += urllib.parse.urlencode({**query_params, "action": "download"})
        return url
