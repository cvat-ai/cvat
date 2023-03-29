# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import pytest
from cvat_sdk.api_client import models
from cvat_sdk.api_client.api_client import ApiClient, Configuration

from shared.utils.config import BASE_URL, USER_PASS


@pytest.fixture
def regular_lonely_user(restore_db_per_function):
    username = "newuser"
    email = "123@456.com"
    with ApiClient(Configuration(host=BASE_URL)) as api_client:
        api_client.auth_api.create_register(
            models.RegisterSerializerExRequest(
                username=username, password1=USER_PASS, password2=USER_PASS, email=email
            )
        )

    yield username
