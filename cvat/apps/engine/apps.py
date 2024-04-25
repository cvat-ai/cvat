# Copyright (C) 2018-2022 Intel Corporation
# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig


class EngineConfig(AppConfig):
    name = 'cvat.apps.engine'

    def ready(self):
        # Required to define signals in application
        import cvat.apps.engine.signals
        # Required in order to silent "unused-import" in pyflake
        assert cvat.apps.engine.signals

        from cvat.apps.iam.permissions import load_app_permissions
        load_app_permissions(self)
