# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import os

SEND_WEBHOOK_TASK_RETRIES: list[int] = json.loads(
    os.getenv(
        "CVAT_SEND_WEBHOOK_TASK_RETRIES",
        "[5, 300, 1800, 10800, 86400, 86400, 86400, 86400]",
    )
)
"""
Per-attempt delay (seconds) between broker-level retries of webhook delivery.
The length of the list is the maximum retry count; each element is the wait
before the corresponding retry.
"""
