# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Start coverage in every Python process launched by a backend container."""

import coverage

coverage.process_startup()
