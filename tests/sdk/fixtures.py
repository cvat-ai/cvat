import io
import logging
from contextlib import redirect_stdout

import pytest
from cvat_sdk.impl import CvatClient
from rest_api.utils.config import BASE_URL


@pytest.fixture()
def mock_stdout():
    try:
        _stdout_handler = redirect_stdout(io.StringIO())
        mock_stdout = _stdout_handler.__enter__()
        yield mock_stdout
    finally:
        _stdout_handler.__exit__(None, None, None)


@pytest.fixture()
def cvat_client():
    try:
        logger_stream = io.StringIO()
        logger = logging.Logger("test", level=logging.INFO)
        logger.propagate = False
        logger.addHandler(logging.StreamHandler(logger_stream))

        client = CvatClient(BASE_URL, logger=logger)
        api_client = client.api
        for k in api_client.configuration.logger:
            api_client.configuration.logger[k] = logger

        yield client
    finally:
        client.close()
