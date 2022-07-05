# Copyright (C) 2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework.renderers import JSONRenderer

class CVATAPIRenderer(JSONRenderer):
    media_type = 'application/vnd.cvat+json'
