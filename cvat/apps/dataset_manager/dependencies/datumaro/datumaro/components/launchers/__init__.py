
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

items = [
]

try:
    from datumaro.components.launchers.openvino import OpenVinoLauncher
    items.append(('openvino', OpenVinoLauncher))
except ImportError:
    pass
