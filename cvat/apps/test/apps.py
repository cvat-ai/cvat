# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig


class TestConfig(AppConfig):
    name = "cvat.apps.test"
    label = "analytics_test"

    def ready(self) -> None:
        # Connect signals to detect annotation changes
        from . import signals  # noqa: F401
