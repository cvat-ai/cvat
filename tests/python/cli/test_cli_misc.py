# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import os
from datetime import timedelta
from io import BytesIO

import packaging.version as pv
import pytest
from cvat_cli._internal.agent import _Event, _NewReconnectionDelay, _parse_event_stream
from cvat_sdk import Client
from cvat_sdk.api_client import models
from cvat_sdk.core.proxies.tasks import ResourceType

from .util import TestCliBase, generate_images, https_reverse_proxy, run_cli


class TestCliMisc(TestCliBase):
    def test_can_warn_on_mismatching_server_version(self, monkeypatch, caplog):
        def mocked_version(_):
            return pv.Version("0")

        # We don't actually run a separate process in the tests here, so it works
        monkeypatch.setattr(Client, "get_server_version", mocked_version)

        self.run_cli("task", "ls")

        assert "Server version '0' is not compatible with SDK version" in caplog.text

    @pytest.mark.parametrize("verify", [True, False])
    def test_can_control_ssl_verification_with_arg(self, verify: bool):
        with https_reverse_proxy() as proxy_url:
            if verify:
                insecure_args = []
            else:
                insecure_args = ["--insecure"]

            run_cli(
                self,
                f"--auth={self.user}:{self.password}",
                f"--server-host={proxy_url}",
                *insecure_args,
                "task",
                "ls",
                expected_code=1 if verify else 0,
            )
            stdout = self.stdout.getvalue()

        if not verify:
            for line in stdout.splitlines():
                int(line)

    def test_can_control_organization_context(self):
        org = "cli-test-org"
        self.client.organizations.create(models.OrganizationWriteRequest(org))

        files = generate_images(self.tmp_path, 1)

        stdout = self.run_cli(
            "task",
            "create",
            "personal_task",
            ResourceType.LOCAL.name,
            *map(os.fspath, files),
            "--labels=" + json.dumps([{"name": "person"}]),
            "--completion_verification_period=0.01",
            organization="",
        )

        personal_task_id = int(stdout.split()[-1])

        stdout = self.run_cli(
            "task",
            "create",
            "org_task",
            ResourceType.LOCAL.name,
            *map(os.fspath, files),
            "--labels=" + json.dumps([{"name": "person"}]),
            "--completion_verification_period=0.01",
            organization=org,
        )

        org_task_id = int(stdout.split()[-1])

        personal_task_ids = list(map(int, self.run_cli("task", "ls", organization="").split()))
        assert personal_task_id in personal_task_ids
        assert org_task_id not in personal_task_ids

        org_task_ids = list(map(int, self.run_cli("task", "ls", organization=org).split()))
        assert personal_task_id not in org_task_ids
        assert org_task_id in org_task_ids

        all_task_ids = list(map(int, self.run_cli("task", "ls").split()))
        assert personal_task_id in all_task_ids
        assert org_task_id in all_task_ids


@pytest.mark.parametrize(
    ["lines", "messages"],
    [
        # empty
        ([], []),
        ([""], [_Event("", "")]),
        # event only
        (["event: test", ""], [_Event("test", "")]),
        (["event: foo", "event: bar", ""], [_Event("bar", "")]),
        # data only
        (["data: test", ""], [_Event("", "test")]),
        (["data: foo", "data: bar", ""], [_Event("", "foo\nbar")]),
        # event and data
        (["event: test", "data: foo", "data: bar", ""], [_Event("test", "foo\nbar")]),
        (["data: foo", "event: test", "data: bar", ""], [_Event("test", "foo\nbar")]),
        (["data: foo", "data: bar", "event: test", ""], [_Event("test", "foo\nbar")]),
        # fields without values
        (["event: test", "event", ""], [_Event("", "")]),
        (["data: test", "data", ""], [_Event("", "test\n")]),
        # incomplete event
        (["event: test", "data: foo"], []),
        # multiple events
        (
            ["event: test1", "data: foo", "", "event: test2", "data: bar", ""],
            [_Event("test1", "foo"), _Event("test2", "bar")],
        ),
        # comments
        ([":"], []),
        ([":1", "event: test", ":2", "data: foo", ":3", ""], [_Event("test", "foo")]),
        # retry
        (["retry: 1234"], [_NewReconnectionDelay(timedelta(milliseconds=1234))]),
        (["retry", "retry:", "retry: a"], []),
        # no space
        (["event:test", "data:foo", ""], [_Event("test", "foo")]),
        # two spaces
        (["event:  test", "data:  foo", ""], [_Event(" test", " foo")]),
        # carriage return
        (["event: test\r", "data: foo\r", "\r"], [_Event("test", "foo")]),
    ],
)
def test_parse_event_stream(lines, messages):
    stream = BytesIO(b"".join(line.encode() + b"\n" for line in lines))
    assert list(_parse_event_stream(stream)) == messages
