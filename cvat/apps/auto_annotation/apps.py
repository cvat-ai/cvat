
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig


class AutoAnnotationConfig(AppConfig):
    name = "cvat.apps.auto_annotation"

    def ready(self):
        from .permissions import setup_permissions

        setup_permissions()
