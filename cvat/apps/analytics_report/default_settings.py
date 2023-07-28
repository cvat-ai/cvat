# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os

ANALYTICS_CHECK_JOB_DELAY = int(os.getenv("CVAT_ANALYTICS_CHECK_JOB_DELAY", 15 * 60))
"The delay before the next analytics check job is queued, in seconds"
