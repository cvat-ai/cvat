# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import pytest
from cvat_sdk import Client

from shared.utils.config import BASE_URL


@pytest.fixture
def fxt_client(fxt_logger):
    logger, _ = fxt_logger

    client = Client(BASE_URL, logger=logger)
    api_client = client.api
    for k in api_client.configuration.logger:
        api_client.configuration.logger[k] = logger
    client.config.status_check_period = 0.01

    with client:
        yield client
