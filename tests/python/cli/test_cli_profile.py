# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


import pytest
from cvat_sdk.core.auth import AuthStore

from .util import run_cli


@pytest.fixture
def store_path(tmp_path, monkeypatch):
    from cvat_cli.__main__ import logger

    original_handlers = logger.handlers.copy()
    original_level = logger.level
    logger.handlers.clear()
    path = tmp_path / "cvat" / "auth.json"
    monkeypatch.setattr("cvat_sdk.core.auth.get_auth_store_path", lambda: path)
    yield path
    logger.handlers[:] = original_handlers
    logger.setLevel(original_level)


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
