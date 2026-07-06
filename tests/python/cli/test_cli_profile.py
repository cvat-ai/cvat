# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


import pytest
from cvat_sdk.core.auth import AuthStore, ProfileEntry

from .util import run_cli


@pytest.fixture
def store_path(tmp_path, monkeypatch):
    from cvat_cli.__main__ import logger

    logger.handlers.clear()
    path = tmp_path / "cvat" / "auth.json"
    monkeypatch.setattr("cvat_sdk.core.auth.get_auth_store_path", lambda: path)
    yield path
    logger.handlers.clear()


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

    def test_default_server_rejects_empty_value(self, store_path):
        run_cli(self, "config", "default-server", "", expected_code=1)
        assert AuthStore(path=store_path).get_default_server() is None


class TestProfileList:
    def test_list_marks_default(self, store_path, capsys):
        _seed(store_path, "mycvat", "https://app.cvat.ai", "t1", default=True)
        _seed(store_path, "staging", "https://staging.example.com", "t2")

        run_cli(self, "profile", "list")
        out = capsys.readouterr().out
        assert "mycvat" in out and "https://app.cvat.ai" in out and "(default)" in out
        assert "staging" in out and "https://staging.example.com" in out
        default_lines = [ln for ln in out.splitlines() if "(default)" in ln]
        assert len(default_lines) == 1 and "mycvat" in default_lines[0]

    def test_list_quiet_prints_names_only(self, store_path, capsys):
        _seed(store_path, "mycvat", "https://app.cvat.ai", "t1", default=True)
        run_cli(self, "profile", "list", "--quiet")
        assert capsys.readouterr().out.strip() == "mycvat"

    def test_list_empty_prints_nothing(self, store_path, capsys):
        run_cli(self, "profile", "list")
        assert capsys.readouterr().out == ""


class TestProfileDefault:
    def test_print_set_unset(self, store_path, capsys):
        _seed(store_path, "mycvat", "https://app.cvat.ai", "t1", default=True)
        _seed(store_path, "staging", "https://staging.example.com", "t2")

        run_cli(self, "profile", "default")
        assert capsys.readouterr().out.strip() == "mycvat"

        run_cli(self, "profile", "default", "staging")
        assert AuthStore(path=store_path).get_default_profile()[0] == "staging"

        run_cli(self, "profile", "default", "--unset")
        assert AuthStore(path=store_path).get_default_profile() is None

    def test_set_unknown_profile_errors(self, store_path):
        _seed(store_path, "mycvat", "https://app.cvat.ai", "t1", default=True)
        run_cli(self, "profile", "default", "ghost", expected_code=1)
        assert AuthStore(path=store_path).get_default_profile()[0] == "mycvat"

    def test_name_and_unset_conflict(self, store_path):
        _seed(store_path, "mycvat", "https://app.cvat.ai", "t1", default=True)
        run_cli(self, "profile", "default", "mycvat", "--unset", expected_code=1)

    def test_print_no_default_errors(self, store_path):
        run_cli(self, "profile", "default", expected_code=1)
