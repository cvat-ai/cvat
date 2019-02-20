
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig

class DashboardConfig(AppConfig):
    name = 'cvat.apps.dashboard'

    def ready(self):
        # plugin registration
        pass