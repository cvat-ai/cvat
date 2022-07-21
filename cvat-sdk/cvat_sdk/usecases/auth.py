# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from typing import Tuple

from cvat_sdk import models
from cvat_sdk.usecases.client import CvatClient


def login(client: CvatClient, credentials: Tuple[str, str]):
    (auth, _) = client.api.auth_api.create_login(
        models.LoginRequest(username=credentials[0], password=credentials[1])
    )

    assert "sessionid" in client.api.cookies
    assert "csrftoken" in client.api.cookies
    client.api.set_default_header("Authorization", "Token " + auth.key)
