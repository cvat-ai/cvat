# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json

import pytest
from cvat_sdk.core.auth import AuthStore, ProfileEntry

from .util import run_cli


@pytest.fixture
def store_path(tmp_path, monkeypatch):
    path = tmp_path / "cvat" / "auth.json"
    monkeypatch.setattr("cvat_sdk.core.auth.get_auth_store_path", lambda: path)
    return path


def _seed(path, name, server, token, *, default=False):
    AuthStore(path=path).add_profile(
        name,
        ProfileEntry(server=server, token=token, created_date="2026-01-01T00:00:00+00:00"),
        set_default=default,
    )


class TestConfigCommands:
    def test_default_server_set_print_unset(self, store_path, capsys):
        run_cli(self, "config", "default-server", "https://app.cvat.ai")
        assert AuthStore(path=store_path).get_default_server() == "https://app.cvat.ai"

        capsys.readouterr()
        run_cli(self, "config", "default-server")
        assert "https://app.cvat.ai" in capsys.readouterr().out

        run_cli(self, "config", "default-server", "--unset")
        assert AuthStore(path=store_path).get_default_server() is None
