# SPDX-License-Identifier: MIT

from django.apps import AppConfig


class TestConfig(AppConfig):
    name = "cvat.apps.test"
    verbose_name = "Annotation analytics"

    def ready(self) -> None:
        from . import signals  # noqa: F401 (connects the signal handlers)
