# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import ClassVar

from cvat.apps.redis_handler.rq import RequestId


class ConsensusRequestId(RequestId):
    ACTION_DEFAULT_VALUE: ClassVar[str] = "merge"
    ACTION_ALLOWED_VALUES: ClassVar[tuple[str]] = (ACTION_DEFAULT_VALUE,)

    QUEUE_SELECTORS: ClassVar[tuple[str]] = ACTION_ALLOWED_VALUES
