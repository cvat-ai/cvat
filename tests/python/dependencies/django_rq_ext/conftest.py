# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
import uuid

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cvat.settings.testing")

import django  # noqa: E402

django.setup()

import pytest  # noqa: E402
import redis  # noqa: E402
from django.conf import settings  # noqa: E402
from rq import Queue  # noqa: E402


def _redis_connection() -> redis.Redis:
    cfg = settings.REDIS_INMEM_SETTINGS
    return redis.Redis(
        host=cfg["HOST"],
        port=cfg["PORT"],
        db=cfg["DB"],
        password=cfg["PASSWORD"] or None,
    )


@pytest.fixture
def queue() -> Queue:
    name = f"test_threadpool_{uuid.uuid4().hex[:8]}"
    return Queue(name, connection=_redis_connection())
