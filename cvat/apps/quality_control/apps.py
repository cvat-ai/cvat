# Copyright (C) 2023 Intel Corporation
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

        # Required to define signals in the application
        from . import signals  # pylint: disable=unused-import
