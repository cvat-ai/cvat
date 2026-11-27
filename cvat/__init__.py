# Copyright (C) 2018-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from cvat.utils.version import get_main_version, get_version

VERSION = (2, 84, 1, "alpha", 0)

__version__ = get_version(VERSION)

# Omit the subversion suffixes after the patch component to simplify the repository maintenance.
# Public CVAT releases never use subversions.
API_VERSION = get_main_version(VERSION)
