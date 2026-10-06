# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig


class TestConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "cvat.apps.test"
    label = "test"
    verbose_name = "Annotation analytics (assessment)"
