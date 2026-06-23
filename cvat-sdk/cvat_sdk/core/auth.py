# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from pathlib import Path

import attrs
import platformdirs

DEFAULT_SERVER = "https://app.cvat.ai"

_APP_NAME = "cvat-sdk"
_APP_AUTHOR = "CVAT.ai"
_STORE_VERSION = 1


@attrs.frozen
class ProfileEntry:
    """A self-contained saved profile: a server host bundled with a PAT."""

    server: str
    """Normalized scheme://host[:port]."""

    token: str
    """A Personal Access Token (PAT)."""

    created_date: str
    """ISO-8601 UTC timestamp of when the profile was saved."""


def get_auth_store_path() -> Path:
    """Return the path to the persistent auth.json store."""
    return platformdirs.user_config_path(_APP_NAME, _APP_AUTHOR) / "auth.json"
