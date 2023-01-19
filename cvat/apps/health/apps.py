# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig
from django.conf import settings

from health_check.plugins import plugin_dir

class HealthConfig(AppConfig):
    name = 'cvat.apps.health'

    def ready(self):
        from .backends import OPAHealthCheck, CustomCacheBackend
        plugin_dir.register(OPAHealthCheck)

        for backend in settings.CACHES:
            plugin_dir.register(CustomCacheBackend, backend=backend)
