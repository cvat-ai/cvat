# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


import json

import pytest
from cvat_sdk.core.auth import AuthStore, ProfileEntry

from .util import TestCliBase, run_cli


@pytest.fixture
def store_path(tmp_path, monkeypatch):
    from cvat_cli.__main__ import logger

    original_handlers = logger.handlers.copy()
    original_level = logger.level
    logger.handlers.clear()
    try:
        path = tmp_path / "cvat" / "auth.json"
        monkeypatch.setattr("cvat_sdk.core.auth.get_auth_store_path", lambda: path)
        yield path
    finally:
        logger.handlers[:] = original_handlers
        logger.setLevel(original_level)


def _seed(path, name, server, token, *, default=False):
    AuthStore(path=path).put_profile(
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

    def test_list_names_only_prints_names_only(self, store_path, capsys):
        _seed(store_path, "mycvat", "https://app.cvat.ai", "t1", default=True)
        run_cli(self, "profile", "list", "--names-only")
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

    def test_set_unknown_profile_errors(self, store_path, capsys):
        _seed(store_path, "mycvat", "https://app.cvat.ai", "t1", default=True)
        run_cli(self, "profile", "default", "ghost", expected_code=1)
        assert "Unknown profile 'ghost'. Run 'cvat-cli profile list'." in capsys.readouterr().err
        assert AuthStore(path=store_path).get_default_profile()[0] == "mycvat"

    def test_name_and_unset_conflict(self, store_path, capsys):
        _seed(store_path, "mycvat", "https://app.cvat.ai", "t1", default=True)
        run_cli(self, "profile", "default", "mycvat", "--unset", expected_code=1)
        assert "Cannot combine a profile name with '--unset'." in capsys.readouterr().err

    def test_print_no_default_errors(self, store_path, capsys):
        run_cli(self, "profile", "default", expected_code=1)
        assert "No default profile is set." in capsys.readouterr().err


class TestProfileDelete:
    def test_delete_removes_and_clears_default(self, store_path, capsys):
        _seed(store_path, "staging", "https://staging.example.com", "t2", default=True)
        run_cli(self, "profile", "delete", "staging")
        assert "staging" in capsys.readouterr().out
        store = AuthStore(path=store_path)
        assert store.get_profile("staging") is None
        assert store.get_default_profile() is None

    def test_delete_leaves_others_and_default_when_not_default(self, store_path):
        _seed(store_path, "mycvat", "https://app.cvat.ai", "t1", default=True)
        _seed(store_path, "staging", "https://staging.example.com", "t2")
        run_cli(self, "profile", "delete", "staging")
        store = AuthStore(path=store_path)
        assert store.get_profile("staging") is None
        assert store.get_default_profile()[0] == "mycvat"

    def test_delete_unknown_errors(self, store_path):
        run_cli(self, "profile", "delete", "ghost", expected_code=1)


class TestProfileCreate:
    def test_create_with_explicit_name_and_token(self, store_path, capsys):
        run_cli(
            self,
            "--server-host",
            "https://app.cvat.ai",
            "profile",
            "create",
            "--name",
            "mycvat",
            "pat-token",
            "--set-default",
        )
        store = AuthStore(path=store_path)
        entry = store.get_profile("mycvat")
        assert entry.server == "https://app.cvat.ai"
        assert entry.token == "pat-token"
        assert store.get_default_profile()[0] == "mycvat"
        assert "mycvat" in capsys.readouterr().out

    def test_create_prompts_for_token_without_echo(self, store_path, monkeypatch):
        monkeypatch.setattr("getpass.getpass", lambda *a, **k: "prompted-pat")
        run_cli(
            self,
            "--server-host",
            "https://app.cvat.ai",
            "profile",
            "create",
            "--name",
            "p",
        )
        assert AuthStore(path=store_path).get_profile("p").token == "prompted-pat"

    def test_create_existing_requires_force(self, store_path):
        _seed(store_path, "p", "https://app.cvat.ai", "old")
        run_cli(
            self,
            "--server-host",
            "https://app.cvat.ai",
            "profile",
            "create",
            "--name",
            "p",
            "new",
            expected_code=1,
        )
        run_cli(
            self,
            "--server-host",
            "https://app.cvat.ai",
            "profile",
            "create",
            "--name",
            "p",
            "new",
            "--force",
        )
        assert AuthStore(path=store_path).get_profile("p").token == "new"

    def test_create_rejects_server_url_with_port_and_server_port(self, store_path):
        run_cli(
            self,
            "--server-host",
            "https://app.cvat.ai:8080",
            "--server-port",
            "8081",
            "profile",
            "create",
            "--name",
            "p",
            "pat-token",
            expected_code=1,
        )
        assert AuthStore(path=store_path).get_profile("p") is None

    def test_create_appends_server_port_to_default_server(self, store_path):
        run_cli(
            self,
            "--server-port",
            "8080",
            "profile",
            "create",
            "--name",
            "p",
            "pat-token",
        )
        assert AuthStore(path=store_path).get_profile("p").server == "http://localhost:8080"

    def test_create_resolves_name_from_server(self, store_path, monkeypatch):
        class _Resp:
            name = "server-side-name"

        class _AuthApi:
            def retrieve_access_tokens_self(self):
                return _Resp(), None

        class _Configuration:
            host = "https://app.cvat.ai"

        class _ApiClient:
            configuration = _Configuration()
            auth_api = _AuthApi()

        class _FakeClient:
            def __init__(self, *a, **k):
                self.api_client = _ApiClient()

            def login(self, *a, **k):
                pass

            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

        monkeypatch.setattr("getpass.getpass", lambda *a, **k: "tok-xyz")
        monkeypatch.setattr("cvat_cli._internal.commands_profile.Client", _FakeClient)
        run_cli(self, "--server-host", "https://app.cvat.ai", "profile", "create")
        assert AuthStore(path=store_path).get_profile("server-side-name").token == "tok-xyz"

    def test_create_rejects_empty_token(self, store_path, monkeypatch):
        monkeypatch.setattr("getpass.getpass", lambda *a, **k: "")
        run_cli(
            self,
            "--server-host",
            "https://app.cvat.ai",
            "profile",
            "create",
            "--name",
            "p",
            expected_code=1,
        )
        assert AuthStore(path=store_path).get_profile("p") is None


class TestProfileCreateFromFile:
    def test_plain_token_file(self, store_path, tmp_path):
        f = tmp_path / "pat.txt"
        f.write_text("  raw-token\n")
        run_cli(
            self,
            "--server-host",
            "https://app.cvat.ai",
            "profile",
            "create",
            "--name",
            "release-bot",
            "--file",
            str(f),
        )
        assert AuthStore(path=store_path).get_profile("release-bot").token == "raw-token"

    def test_json_envelope_zero_args(self, store_path, tmp_path):
        f = tmp_path / "cvat-token.json"
        f.write_text(
            json.dumps(
                {
                    "version": 1,
                    "server": "https://app.cvat.ai",
                    "name": "my-laptop",
                    "token": "envelope-pat",
                }
            )
        )
        run_cli(self, "profile", "create", "--file", str(f))
        entry = AuthStore(path=store_path).get_profile("my-laptop")
        assert entry.server == "https://app.cvat.ai"
        assert entry.token == "envelope-pat"

    def test_explicit_name_overrides_envelope(self, store_path, tmp_path):
        f = tmp_path / "t.json"
        f.write_text(
            json.dumps(
                {
                    "version": 1,
                    "server": "https://app.cvat.ai",
                    "name": "env-name",
                    "token": "p",
                }
            )
        )
        run_cli(self, "profile", "create", "--name", "explicit", "--file", str(f))
        store = AuthStore(path=store_path)
        assert store.get_profile("explicit") is not None
        assert store.get_profile("env-name") is None

    def test_explicit_server_overrides_envelope(self, store_path, tmp_path):
        f = tmp_path / "t.json"
        f.write_text(
            json.dumps(
                {
                    "version": 1,
                    "server": "https://envelope.example.com",
                    "name": "n",
                    "token": "p",
                }
            )
        )
        run_cli(
            self,
            "--server-host",
            "https://explicit.example.com",
            "profile",
            "create",
            "--file",
            str(f),
        )
        entry = AuthStore(path=store_path).get_profile("n")
        assert entry.server == "https://explicit.example.com"

    def test_token_argument_conflicts_with_file(self, store_path, tmp_path, capsys):
        f = tmp_path / "pat.txt"
        f.write_text("file-token")
        run_cli(
            self,
            "--server-host",
            "https://app.cvat.ai",
            "profile",
            "create",
            "--name",
            "p",
            "argument-token",
            "--file",
            str(f),
            expected_code=1,
        )
        assert "Cannot combine a PAT argument with '--file'." in capsys.readouterr().err
        assert AuthStore(path=store_path).get_profile("p") is None

    def test_rejects_non_file_path(self, store_path, tmp_path, capsys):
        run_cli(
            self,
            "profile",
            "create",
            "--name",
            "p",
            "--file",
            str(tmp_path),
            expected_code=1,
        )
        assert "path must be a regular file" in capsys.readouterr().err
        assert AuthStore(path=store_path).get_profile("p") is None

    def test_rejects_missing_file(self, store_path, tmp_path, capsys):
        run_cli(
            self,
            "profile",
            "create",
            "--name",
            "p",
            "--file",
            str(tmp_path / "missing.txt"),
            expected_code=1,
        )
        assert "path must be a regular file" in capsys.readouterr().err
        assert AuthStore(path=store_path).get_profile("p") is None

    @pytest.mark.parametrize(
        ("envelope", "error_message"),
        [
            ({}, "JSON envelope field 'token' must be a string"),
            ({"token": 1}, "JSON envelope field 'token' must be a string"),
            ({"token": "p", "server": 1}, "JSON envelope field 'server' must be a string"),
            ({"token": "p", "name": ["p"]}, "JSON envelope field 'name' must be a string"),
        ],
    )
    def test_rejects_invalid_json_envelope(
        self, store_path, tmp_path, capsys, envelope, error_message
    ):
        f = tmp_path / "invalid.json"
        f.write_text(json.dumps(envelope))
        run_cli(
            self,
            "profile",
            "create",
            "--name",
            "p",
            "--file",
            str(f),
            expected_code=1,
        )
        assert error_message in capsys.readouterr().err
        assert AuthStore(path=store_path).get_profile("p") is None


class TestProfileSelection:
    def test_profile_conflicts_with_server_host(self, capsys):
        run_cli(
            self,
            "--profile",
            "it",
            "--server-host",
            "https://example.com",
            "task",
            "ls",
            expected_code=1,
        )
        assert "--profile is mutually exclusive with --server-host/--server-port/--auth." in (
            capsys.readouterr().err
        )


class TestProfileSelectionE2E(TestCliBase):
    @pytest.fixture(autouse=True)
    def _isolate_store(self, tmp_path, monkeypatch):
        monkeypatch.setattr(
            "cvat_sdk.core.auth.get_auth_store_path",
            lambda: tmp_path / "cvat" / "auth.json",
        )

    def test_profile_supplies_host_and_credential(self, access_tokens):
        token = next(t for t in access_tokens)["private_key"]
        AuthStore().put_profile(
            "it",
            ProfileEntry(
                server=f"{self.host}:{self.port}",
                token=token,
                created_date="2026-01-01T00:00:00+00:00",
            ),
        )
        # No --server-host, no --auth: the profile supplies both.
        run_cli(self, "--profile", "it", "task", "ls")
