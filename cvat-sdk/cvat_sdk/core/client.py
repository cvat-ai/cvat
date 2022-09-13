# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


from __future__ import annotations

import logging
import urllib.parse
from contextlib import suppress
from time import sleep
from typing import Any, Dict, Optional, Sequence, Tuple

import attrs
import urllib3
import urllib3.exceptions

from cvat_sdk.api_client import ApiClient, Configuration, models
from cvat_sdk.core.exceptions import InvalidHostException
from cvat_sdk.core.helpers import expect_status
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

    def __init__(
        self, url: str, *, logger: Optional[logging.Logger] = None, config: Optional[Config] = None
    ):
        url = self._validate_and_prepare_url(url)
        self.api_map = CVAT_API_V2(url)
        self.api_client = ApiClient(Configuration(host=self.api_map.host))
        self.logger = logger or logging.getLogger(__name__)
        self.config = config or Config()

        self._repos: Dict[str, Repo] = {}

    ALLOWED_SCHEMAS = ("https", "http")

    @classmethod
    def _validate_and_prepare_url(cls, url: str) -> str:
        url_parts = url.split("://", maxsplit=1)
        if len(url_parts) == 2:
            schema, base_url = url_parts
        else:
            schema = ""
            base_url = url

        if schema and schema not in cls.ALLOWED_SCHEMAS:
            raise InvalidHostException(
                f"Invalid url schema '{schema}', expected "
                f"one of <none>, {', '.join(cls.ALLOWED_SCHEMAS)}"
            )

        if not schema:
            schema = cls._detect_schema(base_url)
            url = f"{schema}://{base_url}"

        return url

    @classmethod
    def _detect_schema(cls, base_url: str) -> str:
        for schema in cls.ALLOWED_SCHEMAS:
            with ApiClient(Configuration(host=f"{schema}://{base_url}")) as api_client:
                with suppress(urllib3.exceptions.RequestError):
                    (_, response) = api_client.schema_api.retrieve(
                        _request_timeout=5, _parse_response=False, _check_status=False
                    )

                    if response.status == 401:
                        return schema

        raise InvalidHostException(
            "Failed to detect host schema automatically, please check "
            "the server url and try to specify schema explicitly"
        )

    def __enter__(self):
        self.api_client.__enter__()
        return self

    def __exit__(self, exc_type, exc_value, traceback) -> None:
        return self.api_client.__exit__(exc_type, exc_value, traceback)

    def close(self) -> None:
        return self.__exit__(None, None, None)

    def login(self, credentials: Tuple[str, str]) -> None:
        (auth, _) = self.api_client.auth_api.create_login(
            models.LoginRequest(username=credentials[0], password=credentials[1])
        )

        assert "sessionid" in self.api_client.cookies
        assert "csrftoken" in self.api_client.cookies
        self.api_client.set_default_header("Authorization", "Token " + auth.key)

    def has_credentials(self) -> bool:
        return (
            ("sessionid" in self.api_client.cookies)
            or ("csrftoken" in self.api_client.cookies)
            or bool(self.api_client.get_common_headers().get("Authorization", ""))
        )

    def logout(self) -> None:
        if self.has_credentials():
            self.api_client.auth_api.create_logout()
            self.api_client.cookies.pop("sessionid", None)
            self.api_client.cookies.pop("csrftoken", None)
            self.api_client.default_headers.pop("Authorization", None)

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

            response = self.api_client.rest_client.request(
                method=method,
                url=url,
                headers=self.api_client.get_common_headers(),
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


class CVAT_API_V2:
    """Build parameterized API URLs"""

    def __init__(self, host: str):
        self.host = host
        self.base = self.host + "/api/"
        self.git = self.host + "/git/repository/"

    def git_create(self, task_id: int) -> str:
        return self.git + f"create/{task_id}"

    def git_check(self, rq_id: int) -> str:
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
    host: str, *, port: Optional[int] = None, credentials: Optional[Tuple[int, int]] = None
) -> Client:
    url = host
    if port:
        url = f"{url}:{port}"

    client = Client(url=url)
    if credentials is not None:
        client.login(credentials)
    return client
