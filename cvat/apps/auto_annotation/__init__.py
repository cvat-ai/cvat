
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from cvat.settings.base import JS_3RDPARTY

JS_3RDPARTY['dashboard'] = JS_3RDPARTY.get('dashboard', []) + ['auto_annotation/js/auto_annotation.js']
