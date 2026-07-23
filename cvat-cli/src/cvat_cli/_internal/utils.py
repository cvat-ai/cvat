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
    text = path.read_text(encoding="utf-8")
    try:
        doc = json.loads(text)
    except json.JSONDecodeError:
        return text.strip(), None, None

    if not isinstance(doc, dict) or "token" not in doc:
        return text.strip(), None, None
    return doc["token"], doc.get("server"), doc.get("name")
