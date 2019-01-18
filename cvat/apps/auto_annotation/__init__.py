
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from cvat.settings.base import JS_3RDPARTY, CSS_3RDPARTY

JS_3RDPARTY['dashboard'] = JS_3RDPARTY.get('dashboard', []) + ['auto_annotation/js/dashboardPlugin.js']

CSS_3RDPARTY['dashboard'] = CSS_3RDPARTY.get('dashboard', []) + ['auto_annotation/stylesheet.css']
