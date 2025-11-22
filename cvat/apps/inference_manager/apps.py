# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig


class InferenceManagerConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'cvat.apps.inference_manager'
    verbose_name = 'Inference Service Manager'

    def ready(self):
        from . import signals  # noqa: F401
