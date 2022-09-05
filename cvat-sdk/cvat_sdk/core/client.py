# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


from __future__ import annotations

import logging
import urllib.parse
from time import sleep
from typing import Any, Dict, Optional, Sequence, Tuple

import attrs
import urllib3

from cvat_sdk.api_client import ApiClient, Configuration, models
from cvat_sdk.core.helpers import expect_status
from cvat_sdk.core.proxies.cloudstorages import CloudStoragesRepo
from cvat_sdk.core.proxies.issues import CommentsRepo, IssuesRepo
from cvat_sdk.core.proxies.jobs import JobsRepo
from cvat_sdk.core.proxies.model_proxy import Repo
from cvat_sdk.core.proxies.projects import ProjectsRepo
from cvat_sdk.core.proxies.tasks import TasksRepo
from cvat_sdk.core.proxies.users import UsersRepo


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
        self.api_map = CVAT_API_V2(url)
        self.api = ApiClient(Configuration(host=url))
        self.logger = logger or logging.getLogger(__name__)
        self.config = config or Config()

        self._repos: Dict[str, Repo] = {}

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

    def _has_credentials(self):
        return (
            ("sessionid" in self.api.cookies)
            or ("csrftoken" in self.api.cookies)
            or (self.api.get_common_headers().get("Authorization", ""))
        )

    def logout(self):
        if self._has_credentials():
            self.api.auth_api.create_logout()

    def wait_for_completion(
        self: Client,
        url: str,
        *,
        success_status: int,
        status_check_period: Optional[int] = None,
        query_params: Optional[Dict[str, Any]] = None,
        post_params: Optional[Dict[str, Any]] = None,
        method: str = "POST",
        positive_statuses: Optional[Sequence[int]] = None,
    ) -> urllib3.HTTPResponse:
        if status_check_period is None:
            status_check_period = self.config.status_check_period

        positive_statuses = set(positive_statuses) | {success_status}

        while True:
            sleep(status_check_period)

            response = self.api.rest_client.request(
                method=method,
                url=url,
                headers=self.api.get_common_headers(),
                query_params=query_params,
                post_params=post_params,
            )

            self.logger.debug("STATUS %s", response.status)
            expect_status(positive_statuses, response)
            if response.status == success_status:
                break

        return response

    def _get_repo(self, key: str) -> Repo:
        _repo_map = {
            "tasks": TasksRepo,
            "projects": ProjectsRepo,
            "jobs": JobsRepo,
            "users": UsersRepo,
            "issues": IssuesRepo,
            "comments": CommentsRepo,
            "cloud_storages": CloudStoragesRepo,
        }

        repo = self._repos.get(key, None)
        if repo is None:
            repo = _repo_map[key](self)
            self._repos[key] = repo
        return repo

    @property
    def tasks(self) -> TasksRepo:
        return self._get_repo("tasks")

    @property
    def projects(self) -> ProjectsRepo:
        return self._get_repo("projects")

    @property
    def jobs(self) -> JobsRepo:
        return self._get_repo("jobs")

    @property
    def users(self) -> UsersRepo:
        return self._get_repo("users")

    @property
    def issues(self) -> IssuesRepo:
        return self._get_repo("issues")

    @property
    def comments(self) -> CommentsRepo:
        return self._get_repo("comments")

    @property
    def cloud_storages(self) -> CloudStoragesRepo:
        return self._get_repo("cloud_storages")


class CVAT_API_V2:
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
