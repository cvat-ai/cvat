# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
from contextlib import ExitStack
from logging import Logger
from typing import List, Tuple

import packaging.version as pv
import pytest
from cvat_sdk import Client, models
from cvat_sdk.core.client import Config, make_client
from cvat_sdk.core.exceptions import IncompatibleVersionException, InvalidHostException
from cvat_sdk.exceptions import ApiException

from shared.utils.config import BASE_URL, USER_PASS


class TestClientUsecases:
    @pytest.fixture(autouse=True)
    def setup(
        self,
        restore_db_per_function,  # force fixture call order to allow DB setup
        fxt_logger: Tuple[Logger, io.StringIO],
        fxt_client: Client,
        fxt_stdout: io.StringIO,
        admin_user: str,
    ):
        _, self.logger_stream = fxt_logger
        self.client = fxt_client
        self.stdout = fxt_stdout
        self.user = admin_user

        yield

    def test_can_login_with_basic_auth(self):
        self.client.login((self.user, USER_PASS))

        assert self.client.has_credentials()

    def test_can_fail_to_login_with_basic_auth(self):
        with pytest.raises(ApiException):
            self.client.login((self.user, USER_PASS + "123"))

    def test_can_logout(self):
        self.client.login((self.user, USER_PASS))

        self.client.logout()

        assert not self.client.has_credentials()

    def test_can_get_server_version(self):
        self.client.login((self.user, USER_PASS))

        version = self.client.get_server_version()

        assert (version.major, version.minor) >= (2, 0)


def test_can_strip_trailing_slash_in_hostname_in_make_client(admin_user: str):
    host, port = BASE_URL.split("://", maxsplit=1)[1].rsplit(":", maxsplit=1)

    with make_client(host=host + "/", port=port, credentials=(admin_user, USER_PASS)) as client:
        assert client.api_map.host == BASE_URL


def test_can_strip_trailing_slash_in_hostname_in_client_ctor(admin_user: str):
    with Client(url=BASE_URL + "/") as client:
        client.login((admin_user, USER_PASS))
        assert client.api_map.host == BASE_URL


def test_can_detect_server_schema_if_not_provided():
    host, port = BASE_URL.split("://", maxsplit=1)[1].rsplit(":", maxsplit=1)
    client = make_client(host=host, port=int(port))
    assert client.api_map.host == "http://" + host + ":" + port


def test_can_fail_to_detect_server_schema_if_not_provided():
    host, port = BASE_URL.split("://", maxsplit=1)[1].rsplit(":", maxsplit=1)
    with pytest.raises(InvalidHostException) as capture:
        make_client(host=host, port=int(port) + 1)

    assert capture.match(r"Failed to detect host schema automatically")


def test_can_reject_invalid_server_schema():
    host, port = BASE_URL.split("://", maxsplit=1)[1].rsplit(":", maxsplit=1)
    with pytest.raises(InvalidHostException) as capture:
        make_client(host="ftp://" + host, port=int(port) + 1)

    assert capture.match(r"Invalid url schema 'ftp'")


@pytest.mark.parametrize("raise_exception", (True, False))
def test_can_warn_on_mismatching_server_version(
    fxt_logger: Tuple[Logger, io.StringIO], monkeypatch, raise_exception: bool
):
    logger, logger_stream = fxt_logger

    def mocked_version(_):
        return pv.Version("0")

    monkeypatch.setattr(Client, "get_server_version", mocked_version)

    config = Config()

    with ExitStack() as es:
        if raise_exception:
            config.allow_unsupported_server = False
            es.enter_context(pytest.raises(IncompatibleVersionException))

        Client(url=BASE_URL, logger=logger, config=config)

    assert "Server version '0' is not compatible with SDK version" in logger_stream.getvalue()


@pytest.mark.parametrize("do_check", (True, False))
def test_can_check_server_version_in_ctor(
    fxt_logger: Tuple[Logger, io.StringIO], monkeypatch, do_check: bool
):
    logger, logger_stream = fxt_logger

    def mocked_version(_):
        return pv.Version("0")

    monkeypatch.setattr(Client, "get_server_version", mocked_version)

    config = Config()
    config.allow_unsupported_server = False

    with ExitStack() as es:
        if do_check:
            es.enter_context(pytest.raises(IncompatibleVersionException))

        Client(url=BASE_URL, logger=logger, config=config, check_server_version=do_check)

    assert (
        "Server version '0' is not compatible with SDK version" in logger_stream.getvalue()
    ) == do_check


def test_can_check_server_version_in_method(fxt_logger: Tuple[Logger, io.StringIO], monkeypatch):
    logger, logger_stream = fxt_logger

    def mocked_version(_):
        return pv.Version("0")

    monkeypatch.setattr(Client, "get_server_version", mocked_version)

    config = Config()
    config.allow_unsupported_server = False
    client = Client(url=BASE_URL, logger=logger, config=config, check_server_version=False)

    with client, pytest.raises(IncompatibleVersionException):
        client.check_server_version()

    assert "Server version '0' is not compatible with SDK version" in logger_stream.getvalue()


@pytest.mark.parametrize(
    "server_version, supported_versions, expect_supported",
    [
        # Currently, it is ~=, as defined in https://peps.python.org/pep-0440/
        ("3.2", ["2.0"], False),
        ("2", ["2.1"], False),
        ("2.1", ["2.1"], True),
        ("2.1a", ["2.1"], False),
        ("2.1.post1", ["2.1"], True),
        ("2.1", ["2.1.pre1"], True),
        ("2.1.1", ["2.1"], True),
        ("2.2", ["2.1"], False),
        ("2.2", ["2.1.0", "2.3"], False),
        ("2.2", ["2.1", "2.2", "2.3"], True),
        ("2.2.post1", ["2.1", "2.2", "2.3"], True),
        ("2.2.pre1", ["2.1", "2.2", "2.3"], False),
        ("2.2", ["2.3"], False),
        ("2.1.0.dev123", ["2.1.post2"], False),
        ("1!1.3", ["2.1"], False),
        ("1!1.3.1", ["2.1", "1!1.3"], True),
        ("1!1.1.dev12", ["1!1.1"], False),
    ],
)
def test_can_check_server_version_compatibility(
    fxt_logger: Tuple[Logger, io.StringIO],
    monkeypatch: pytest.MonkeyPatch,
    server_version: str,
    supported_versions: List[str],
    expect_supported: bool,
):
    logger, _ = fxt_logger

    monkeypatch.setattr(Client, "get_server_version", lambda _: pv.Version(server_version))
    monkeypatch.setattr(
        Client, "SUPPORTED_SERVER_VERSIONS", [pv.Version(v) for v in supported_versions]
    )
    config = Config(allow_unsupported_server=False)

    with ExitStack() as es:
        if not expect_supported:
            es.enter_context(pytest.raises(IncompatibleVersionException))

        Client(url=BASE_URL, logger=logger, config=config, check_server_version=True)


@pytest.mark.parametrize("verify", [True, False])
def test_can_control_ssl_verification_with_config(verify: bool):
    config = Config(verify_ssl=verify)

    client = Client(BASE_URL, config=config)

    assert client.api_client.configuration.verify_ssl == verify


def test_organization_contexts(admin_user: str):
    with make_client(BASE_URL, credentials=(admin_user, USER_PASS)) as client:
        assert client.organization_slug is None

        org = client.organizations.create(models.OrganizationWriteRequest(slug="testorg"))

        # create a project in the personal workspace
        client.organization_slug = ""
        personal_project = client.projects.create(models.ProjectWriteRequest(name="Personal"))
        assert personal_project.organization is None

        # create a project in the organization
        client.organization_slug = org.slug
        org_project = client.projects.create(models.ProjectWriteRequest(name="Org"))
        assert org_project.organization == org.id

        # both projects should be visible with no context
        client.organization_slug = None
        client.projects.retrieve(personal_project.id)
        client.projects.retrieve(org_project.id)

        # retrieve personal and org projects by id
        client.organization_slug = ""
        client.projects.retrieve(personal_project.id)
        client.projects.retrieve(org_project.id)

        # org context doesn't make sense for detailed request
        client.organization_slug = org.slug
        client.projects.retrieve(org_project.id)
        client.projects.retrieve(personal_project.id)


@pytest.mark.usefixtures("restore_db_per_function")
def test_organization_filtering(regular_lonely_user: str, fxt_image_file):
    with make_client(BASE_URL, credentials=(regular_lonely_user, USER_PASS)) as client:
        org = client.organizations.create(models.OrganizationWriteRequest(slug="testorg"))

        # create a project and task in sandbox
        client.organization_slug = None
        client.projects.create(models.ProjectWriteRequest(name="personal_project"))
        client.tasks.create_from_data(
            spec={"name": "personal_task", "labels": [{"name": "a"}]}, resources=[fxt_image_file]
        )

        # create a project and task in the organization
        client.organization_slug = org.slug
        client.projects.create(models.ProjectWriteRequest(name="org_project"))
        client.tasks.create_from_data(
            spec={"name": "org_task", "labels": [{"name": "a"}]}, resources=[fxt_image_file]
        )

        # return only non-org objects if org parameter is empty
        client.organization_slug = ""
        projects, tasks, jobs = client.projects.list(), client.tasks.list(), client.jobs.list()

        assert len(projects) == len(tasks) == len(jobs) == 1
        assert projects[0].organization == tasks[0].organization == jobs[0].organization == None

        # return all objects if org parameter wasn't presented
        client.organization_slug = None
        projects, tasks, jobs = client.projects.list(), client.tasks.list(), client.jobs.list()

        assert len(projects) == len(tasks) == len(jobs) == 2
        assert {None, org.id} == set([a.organization for a in (*projects, *tasks, *jobs)])

        # return only org objects if org parameter is presented and not empty
        client.organization_slug = org.slug
        projects, tasks, jobs = client.projects.list(), client.tasks.list(), client.jobs.list()

        assert len(projects) == len(tasks) == len(jobs) == 1
        assert projects[0].organization == tasks[0].organization == jobs[0].organization == org.id


def test_organization_context_manager():
    client = Client(BASE_URL)

    client.organization_slug = "abc"

    with client.organization_context("def"):
        assert client.organization_slug == "def"

    assert client.organization_slug == "abc"
