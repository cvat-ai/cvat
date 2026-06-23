# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from pathlib import Path

import platformdirs

from cvat_sdk.core.auth import DEFAULT_SERVER, ProfileEntry, get_auth_store_path


def test_profile_entry_holds_fields():
    entry = ProfileEntry(
        server="https://app.cvat.ai", token="tok", created_date="2026-01-01T00:00:00+00:00"
    )
    assert entry.server == "https://app.cvat.ai"
    assert entry.token == "tok"
    assert entry.created_date == "2026-01-01T00:00:00+00:00"


def test_default_server_is_app_cvat_ai():
    assert DEFAULT_SERVER == "https://app.cvat.ai"


def test_auth_store_path_matches_platformdirs():
    expected = platformdirs.user_config_path("cvat-sdk", "CVAT.ai") / "auth.json"
    assert get_auth_store_path() == expected
    assert isinstance(get_auth_store_path(), Path)
