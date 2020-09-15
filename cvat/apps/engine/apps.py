# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig


class EngineConfig(AppConfig):
    name = 'cvat.apps.engine'

    def ready(self):
        # Required to define signals in application
        import cvat.apps.engine.signals
