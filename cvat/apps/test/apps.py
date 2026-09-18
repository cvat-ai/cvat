# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig


class TestConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "cvat.apps.test"
    verbose_name = "Analytics"

    def ready(self):
        from . import signals  # noqa: F401 pylint: disable=unused-import
