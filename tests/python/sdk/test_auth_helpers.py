# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from cvat_sdk.core.auth import (
    CVAT_ACCESS_TOKEN_ENV_VAR,
    default_auth_factory,
    get_auth_factory,
)
from cvat_sdk.core.client import AccessTokenCredentials, PasswordCredentials


def test_get_auth_factory_parses_user_pass():
    cred = get_auth_factory("alice:secret")("https://app.cvat.ai")
    assert isinstance(cred, PasswordCredentials)
    assert cred.user == "alice"
    assert cred.password == "secret"


def test_default_auth_factory_reads_env_token(monkeypatch):
    monkeypatch.setenv(CVAT_ACCESS_TOKEN_ENV_VAR, "pat-123")
    cred = default_auth_factory()("https://app.cvat.ai")
    assert isinstance(cred, AccessTokenCredentials)
    assert cred.token == "pat-123"


def test_common_reexports_for_backward_compat():
    from cvat_cli._internal import common

    assert common.CVAT_ACCESS_TOKEN_ENV_VAR == CVAT_ACCESS_TOKEN_ENV_VAR
    assert common.get_auth_factory is get_auth_factory
