# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os

path_prefix = os.path.join('cvat', 'apps', 'annotation')
BUILTIN_FORMATS = (
    os.path.join(path_prefix, 'cvat.py'),
    os.path.join(path_prefix,'pascal_voc.py'),
    os.path.join(path_prefix,'yolo.py'),
)
