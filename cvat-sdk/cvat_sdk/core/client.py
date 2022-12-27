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
import packaging.version as pv
import urllib3
import urllib3.exceptions

from cvat_sdk.api_client import ApiClient, Configuration, exceptions, models
from cvat_sdk.core.exceptions import IncompatibleVersionException, InvalidHostException
from cvat_sdk.core.helpers import expect_status
from cvat_sdk.core.proxies.issues import CommentsRepo, IssuesRepo
from cvat_sdk.core.proxies.jobs import JobsRepo
from cvat_sdk.core.proxies.model_proxy import Repo
from cvat_sdk.core.proxies.projects import ProjectsRepo
from cvat_sdk.core.proxies.tasks import TasksRepo
from cvat_sdk.core.proxies.users import UsersRepo
from cvat_sdk.version import VERSION


@attrs.define
class Config:
    """
    Allows to tweak behavior of Client instances.
    """

    status_check_period: float = 5
    """Operation status check period, in seconds"""

    allow_unsupported_server: bool = True
    """Allow to use SDK with an unsupported server version. If disabled, raise an exception"""

    verify_ssl: Optional[bool] = None
    """Whether to verify host SSL certificate or not"""


class Client:
    """
    Provides session management, implements authentication operations
    and simplifies access to server APIs.
    """

    SUPPORTED_SERVER_VERSIONS = (
        pv.Version("2.0"),
        pv.Version("2.1"),
        pv.Version("2.2"),
        pv.Version("2.3"),
        pv.Version("2.4"),
    )

    def __init__(
        self,
        url: str,
        *,
        logger: Optional[logging.Logger] = None,
        config: Optional[Config] = None,
        check_server_version: bool = True,
    ) -> None:
        url = self._validate_and_prepare_url(url)

        self.logger = logger or logging.getLogger(__name__)
        """The root logger"""

        self.config = config or Config()
        """Configuration for this object"""

        self.api_map = CVAT_API_V2(url)
        """Handles server API URL interaction logic"""

        self.api_client = ApiClient(
            Configuration(host=self.api_map.host, verify_ssl=self.config.verify_ssl)
        )
        """Provides low-level access to the CVAT server"""

        if check_server_version:
            self.check_server_version()

        self._repos: Dict[str, Repo] = {}
        """A cache for created Repository instances"""

    ALLOWED_SCHEMAS = ("https", "http")

    @classmethod
    def _validate_and_prepare_url(cls, url: str) -> str:
        url_parts = url.split("://", maxsplit=1)
        if len(url_parts) == 2:
            schema, base_url = url_parts
        else:
            schema = ""
            base_url = url

        base_url = base_url.rstrip("/")

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
                    (_, response) = api_client.server_api.retrieve_about(
                        _request_timeout=5, _parse_response=False, _check_status=False
                    )

                    if response.status in [200, 401]:
                        # Server versions prior to 2.3.0 respond with unauthorized
                        # 2.3.0 allows unauthorized access
                        return schema

        raise InvalidHostException(
            "Failed to detect host schema automatically, please check "
            "the server url and try to specify 'https://' or 'http://' explicitly"
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
            models.LoginSerializerExRequest(username=credentials[0], password=credentials[1])
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

    def check_server_version(self, fail_if_unsupported: Optional[bool] = None) -> None:
        if fail_if_unsupported is None:
            fail_if_unsupported = not self.config.allow_unsupported_server

        try:
            server_version = self.get_server_version()
        except exceptions.ApiException as e:
            msg = (
                "Failed to retrieve server API version: %s. "
                "Some SDK functions may not work properly with this server."
            ) % (e,)
            self.logger.warning(msg)
            if fail_if_unsupported:
                raise IncompatibleVersionException(msg)
            return

        sdk_version = pv.Version(VERSION)

        # We only check base version match. Micro releases and fixes do not affect
        # API compatibility in general.
        if all(
            server_version.base_version != sv.base_version for sv in self.SUPPORTED_SERVER_VERSIONS
        ):
            msg = (
                "Server version '%s' is not compatible with SDK version '%s'. "
                "Some SDK functions may not work properly with this server. "
                "You can continue using this SDK, or you can "
                "try to update with 'pip install cvat-sdk'."
            ) % (server_version, sdk_version)
            self.logger.warning(msg)
            if fail_if_unsupported:
                raise IncompatibleVersionException(msg)

    def get_server_version(self) -> pv.Version:
        # TODO: allow to use this endpoint unauthorized
        (about, _) = self.api_client.server_api.retrieve_about()
        return pv.Version(about.version)

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
        self.host = host.rstrip("/")
        self.base = self.host + "/api/"
        self.git = self.host + "/git/repository/"

    def git_create(self, task_id: int) -> str:
        return self.git + f"create/{task_id}"

    def git_check(self, rq_id: int) -> str:
        return self.git + f"check/{rq_id}"

    def git_get(self, task_id: int) -> str:
        return self.git + f"get/{task_id}"

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
    url = host.rstrip("/")
    if port:
        url = f"{url}:{port}"

    client = Client(url=url)
    if credentials is not None:
        client.login(credentials)
    return client
