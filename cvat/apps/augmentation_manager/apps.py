# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig


class AugmentationManagerConfig(AppConfig):
    name = 'cvat.apps.augmentation_manager'
    verbose_name = 'Augmentation Manager'

    def ready(self):
        from . import signals  # noqa: F401
