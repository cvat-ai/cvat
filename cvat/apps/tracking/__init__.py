
# Copyright (C) 2018-2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from cvat.settings.base import JS_3RDPARTY

# default_app_config = 'cvat.apps.tracking.apps.TrackingConfig'

JS_3RDPARTY['engine'] = JS_3RDPARTY.get('engine', []) + ['tracking/js/enginePlugin.js']
