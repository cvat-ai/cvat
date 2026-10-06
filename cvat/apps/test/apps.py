# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig


class TestConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "cvat.apps.test"
    label = "test"

    def ready(self):
        try:
            import cvat.apps.test.signals  # noqa: F401
        except Exception:
            pass
