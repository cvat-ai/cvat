# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import logging

import pytest
from rest_api.utils.config import BASE_URL

from cvat_sdk import Client


@pytest.fixture
def fxt_stdout(capsys):
    class IoProxy(io.IOBase):
        def __init__(self, capsys):
            self.capsys = capsys

        def getvalue(self) -> str:
            capture = self.capsys.readouterr()
            return capture.out

    yield IoProxy(capsys)


@pytest.fixture
def fxt_logger():
    logger_stream = io.StringIO()
    logger = logging.Logger("test", level=logging.INFO)
    logger.propagate = False
    logger.addHandler(logging.StreamHandler(logger_stream))
    yield logger, logger_stream


@pytest.fixture
def fxt_client(fxt_logger):
    try:
        logger, _ = fxt_logger

        client = Client(BASE_URL, logger=logger)
        api_client = client.api
        for k in api_client.configuration.logger:
            api_client.configuration.logger[k] = logger
        client.config.status_check_period = 0.01

        yield client
    finally:
        client.close()
