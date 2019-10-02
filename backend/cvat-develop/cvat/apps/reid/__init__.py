# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from cvat.settings.base import JS_3RDPARTY

default_app_config = 'cvat.apps.reid.apps.ReidConfig'

JS_3RDPARTY['engine'] = JS_3RDPARTY.get('engine', []) + ['reid/js/enginePlugin.js']
