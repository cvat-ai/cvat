# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from datetime import datetime, timezone

from cvat_sdk import Client


def popattr(obj, name):
    value = getattr(obj, name)
    delattr(obj, name)
    return value


def get_current_time_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def fetch_current_access_token_name(client: Client) -> str:
    access_token, _ = client.api_client.auth_api.retrieve_access_tokens_self()
    return access_token.name
