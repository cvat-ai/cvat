# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import uuid

import pytest
import redis
from rq import Queue

from shared.utils import config


def _redis_connection() -> redis.Redis:
    return redis.Redis(
        host=config.REDIS_INMEM_HOST,
        port=config.REDIS_INMEM_PORT,
        db=0,
        password=config.REDIS_INMEM_PASSWORD,
    )


@pytest.fixture
def queue() -> Queue:
    name = f"test_threadpool_{uuid.uuid4().hex[:8]}"
    return Queue(name, connection=_redis_connection())
