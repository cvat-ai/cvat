# Copyright (C) 2019-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import mimetypes


_SCRIPT_DIR = os.path.realpath(os.path.dirname(__file__))
MEDIA_MIMETYPES_FILES = [
    os.path.join(_SCRIPT_DIR, "media.mimetypes"),
]
mimetypes.init(files=MEDIA_MIMETYPES_FILES)
