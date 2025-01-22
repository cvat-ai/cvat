# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import logging

import pytest


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
def fxt_test_name(request: pytest.FixtureRequest):
    name = request.node.name
    if request.fixturename:
        name += f"[{request.fixturename}]"

    yield name
