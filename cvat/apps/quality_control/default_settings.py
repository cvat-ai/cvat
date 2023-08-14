# Copyright (C) 2023 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os

QUALITY_CHECK_JOB_DELAY = int(os.getenv("CVAT_QUALITY_CHECK_JOB_DELAY", 15 * 60))
"The delay before the next task quality check job is queued, in seconds"

PROJECT_QUALITY_CHECK_JOB_DELAY = int(os.getenv("CVAT_PROJECT_QUALITY_CHECK_JOB_DELAY", 5 * 60))
"The delay before the next project quality check job is queued, in seconds"
