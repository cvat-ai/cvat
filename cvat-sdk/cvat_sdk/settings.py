# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""The environment variables the SDK reads."""

import os

# Holds a Personal Access Token to authenticate with.
CVAT_ACCESS_TOKEN_ENV_VAR = "CVAT_ACCESS_TOKEN"  # nosec - a variable name declaration

# Holds the path of the OpenH264 shared library.
OPENH264_LIBRARY_ENV_VAR = "CVAT_OPENH264_LIBRARY"


def get_openh264_library_path() -> str | None:
    """Return the OpenH264 library path configured in the environment, read on every call."""

    return os.getenv(OPENH264_LIBRARY_ENV_VAR) or None
