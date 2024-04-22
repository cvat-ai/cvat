# Copyright (C) 2022 CVAT.ai Corporation
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
