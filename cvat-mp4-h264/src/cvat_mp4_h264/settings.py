# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os

OPENH264_LIBRARY_ENV_VAR = "CVAT_OPENH264_LIBRARY"


def get_openh264_library_path() -> str | None:
    """Return the OpenH264 library path configured in the environment, read on every call."""

    return os.getenv(OPENH264_LIBRARY_ENV_VAR) or None
