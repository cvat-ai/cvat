# Copyright (C) 2023 Intel Corporation
# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig


class QualityControlConfig(AppConfig):
    name = "cvat.apps.quality_control"

    def ready(self) -> None:
        from django.conf import settings

        from . import default_settings

        for key in dir(default_settings):
            if key.isupper() and not hasattr(settings, key):
                setattr(settings, key, getattr(default_settings, key))

        from cvat.apps.iam.permissions import load_app_permissions

        load_app_permissions(self)

        # Required to define signals in the application
        from . import signals  # pylint: disable=unused-import
