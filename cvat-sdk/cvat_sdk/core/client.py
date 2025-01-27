# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


from __future__ import annotations

import logging
import urllib.parse
from collections.abc import Generator, Sequence
from contextlib import contextmanager, suppress
from pathlib import Path
from time import sleep
from typing import Any, Optional, TypeVar

import attrs
import packaging.specifiers as specifiers
import packaging.version as pv
import platformdirs
import urllib3
import urllib3.exceptions

from cvat_sdk.api_client import ApiClient, Configuration, exceptions, models
from cvat_sdk.core.exceptions import IncompatibleVersionException, InvalidHostException
from cvat_sdk.core.proxies.issues import CommentsRepo, IssuesRepo
from cvat_sdk.core.proxies.jobs import JobsRepo
from cvat_sdk.core.proxies.model_proxy import Repo
from cvat_sdk.core.proxies.organizations import OrganizationsRepo
from cvat_sdk.core.proxies.projects import ProjectsRepo
from cvat_sdk.core.proxies.tasks import TasksRepo
from cvat_sdk.core.proxies.users import UsersRepo
from cvat_sdk.version import VERSION

_DEFAULT_CACHE_DIR = platformdirs.user_cache_path("cvat-sdk", "CVAT.ai")

_RepoType = TypeVar("_RepoType", bound=Repo)


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

    cache_dir: Path = attrs.field(converter=Path, default=_DEFAULT_CACHE_DIR)
    """Directory in which to store cached server data"""


_VERSION_OBJ = pv.Version(VERSION)


class Client:
    """
    Provides session management, implements authentication operations
    and simplifies access to server APIs.
    """

    SUPPORTED_SERVER_VERSIONS = (
        pv.Version(f"{_VERSION_OBJ.epoch}!{_VERSION_OBJ.major}.{_VERSION_OBJ.minor}"),
        pv.Version(f"{_VERSION_OBJ.epoch}!{_VERSION_OBJ.major}.{_VERSION_OBJ.minor+1}"),
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

        self._repos: dict[str, Repo] = {}
        """A cache for created Repository instances"""

    _ORG_SLUG_HEADER = "X-Organization"

    @property
    def organization_slug(self) -> Optional[str]:
        """
        If this is set to a slug for an organization,
        all requests will be made in the context of that organization.

        If it's set to an empty string, requests will be made in the context
        of the user's personal workspace.

        If set to None (the default), no organization context will be used.
        """
        return self.api_client.default_headers.get(self._ORG_SLUG_HEADER)

    @organization_slug.setter
    def organization_slug(self, org_slug: Optional[str]):
        if org_slug is None:
            self.api_client.default_headers.pop(self._ORG_SLUG_HEADER, None)
        else:
            self.api_client.default_headers[self._ORG_SLUG_HEADER] = org_slug

    @contextmanager
    def organization_context(self, slug: str) -> Generator[None, None, None]:
        prev_slug = self.organization_slug
        self.organization_slug = slug
        try:
            yield
        finally:
            self.organization_slug = prev_slug

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

    def login(self, credentials: tuple[str, str]) -> None:
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
        rq_id: str,
        *,
        status_check_period: Optional[int] = None,
    ) -> tuple[models.Request, urllib3.HTTPResponse]:
        if status_check_period is None:
            status_check_period = self.config.status_check_period

        while True:
            sleep(status_check_period)

            request, response = self.api_client.requests_api.retrieve(rq_id)

            if request.status.value == models.RequestStatus.allowed_values[("value",)]["FINISHED"]:
                break
            elif request.status.value == models.RequestStatus.allowed_values[("value",)]["FAILED"]:
                raise exceptions.ApiException(
                    status=request.status, reason=request.message, http_resp=response
                )

        return request, response

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

        if not any(
            self._is_version_compatible(server_version, supported_version)
            for supported_version in self.SUPPORTED_SERVER_VERSIONS
        ):
            msg = (
                "Server version '%s' is not compatible with SDK version '%s'. "
                "Some SDK functions may not work properly with this server. "
                "You can continue using this SDK, or you can "
                "try to update with 'pip install cvat-sdk'."
            ) % (server_version, pv.Version(VERSION))
            self.logger.warning(msg)
            if fail_if_unsupported:
                raise IncompatibleVersionException(msg)

    def _is_version_compatible(self, current: pv.Version, target: pv.Version) -> bool:
        # Check for (major, minor) compatibility.
        # Micro releases and fixes do not affect API compatibility in general.
        epoch = f"{target.epoch}!" if target.epoch else ""  # 1.0 ~= 0!1.0 is false
        return current in specifiers.Specifier(
            f"~= {epoch}{target.major}.{target.minor}.{target.micro}"
        )

    def get_server_version(self) -> pv.Version:
        (about, _) = self.api_client.server_api.retrieve_about()
        return pv.Version(about.version)

    def _get_repo(self, repo_type: _RepoType) -> _RepoType:
        repo = self._repos.get(repo_type, None)
        if repo is None:
            repo = repo_type(self)
            self._repos[repo_type] = repo
        return repo

    @property
    def tasks(self) -> TasksRepo:
        return self._get_repo(TasksRepo)

    @property
    def projects(self) -> ProjectsRepo:
        return self._get_repo(ProjectsRepo)

    @property
    def jobs(self) -> JobsRepo:
        return self._get_repo(JobsRepo)

    @property
    def users(self) -> UsersRepo:
        return self._get_repo(UsersRepo)

    @property
    def organizations(self) -> OrganizationsRepo:
        return self._get_repo(OrganizationsRepo)

    @property
    def issues(self) -> IssuesRepo:
        return self._get_repo(IssuesRepo)

    @property
    def comments(self) -> CommentsRepo:
        return self._get_repo(CommentsRepo)


class CVAT_API_V2:
    """Build parameterized API URLs"""

    def __init__(self, host: str):
        self.host = host.rstrip("/")
        self.base = self.host + "/api/"

    def make_endpoint_url(
        self,
        path: str,
        *,
        psub: Optional[Sequence[Any]] = None,
        kwsub: Optional[dict[str, Any]] = None,
        query_params: Optional[dict[str, Any]] = None,
    ) -> str:
        url = self.host + path
        if psub or kwsub:
            url = url.format(*(psub or []), **(kwsub or {}))
        if query_params:
            url += "?" + urllib.parse.urlencode(query_params)
        return url


def make_client(
    host: str, *, port: Optional[int] = None, credentials: Optional[tuple[str, str]] = None
) -> Client:
    url = host.rstrip("/")
    if port:
        url = f"{url}:{port}"

    client = Client(url=url)
    if credentials is not None:
        client.login(credentials)
    return client
