# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

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


def read_token_file(path: Path) -> tuple[str, str | None, str | None]:
    """Read a PAT from a plain-text token file or a JSON envelope."""
    if not path.is_file():
        raise ValueError("path must be a regular file")

    text = path.read_text(encoding="utf-8")
    try:
        doc = json.loads(text)
    except json.JSONDecodeError:
        return text.strip(), None, None

    if not isinstance(doc, dict):
        return text.strip(), None, None

    token = doc.get("token")
    if not isinstance(token, str):
        raise ValueError("JSON envelope field 'token' must be a string")

    server = doc.get("server")
    if server is not None and not isinstance(server, str):
        raise ValueError("JSON envelope field 'server' must be a string")

    name = doc.get("name")
    if name is not None and not isinstance(name, str):
        raise ValueError("JSON envelope field 'name' must be a string")

    return token, server, name
