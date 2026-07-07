# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from datetime import datetime, timezone

from cvat_sdk import Client
from cvat_sdk.core.client import AccessTokenCredentials, Config

# Dedicated alias so tests can monkeypatch ``Client`` for the network-touching
# path without breaking pure URL normalization.
_NormalizerClient = Client


def popattr(obj, name):
    value = getattr(obj, name)
    delattr(obj, name)
    return value


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize_server(raw: str) -> str:
    """Normalize a server URL using Client's rules without connecting.

    Uses a dedicated alias so tests can monkeypatch ``Client`` for the
    network-touching path without breaking pure URL normalization.
    """
    return _NormalizerClient.__new__(_NormalizerClient)._validate_and_prepare_url(raw)


def _fetch_name_from_server(server: str, token: str, *, insecure: bool) -> str:
    with Client(
        url=server, config=Config(verify_ssl=not insecure), check_server_version=False
    ) as client:
        client.login(AccessTokenCredentials(token))
        info, _ = client.api_client.auth_api.retrieve_access_tokens_self()
        return info.name
