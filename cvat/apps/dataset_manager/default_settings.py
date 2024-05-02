# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os

DATASET_CACHE_TTL = int(os.getenv("CVAT_DATASET_CACHE_TTL", 60 * 60 * 10))
"Base lifetime for cached exported datasets, in seconds"
