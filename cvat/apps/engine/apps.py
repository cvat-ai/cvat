# Copyright (C) 2018-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig


class EngineConfig(AppConfig):
    name = 'cvat.apps.engine'

    def ready(self):
        from django.conf import settings

        from . import default_settings

        for key in dir(default_settings):
            if key.isupper() and not hasattr(settings, key):
                setattr(settings, key, getattr(default_settings, key))

        # Required to define signals in application
        import cvat.apps.engine.signals

        # Required in order to silent "unused-import" in pyflake
        assert cvat.apps.engine.signals

        from cvat.apps.iam.permissions import load_app_permissions
        load_app_permissions(self)
