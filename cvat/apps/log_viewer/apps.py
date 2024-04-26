# Copyright (C) 2023-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig


class LogViewerConfig(AppConfig):
    name = 'cvat.apps.log_viewer'

    def ready(self) -> None:
        from cvat.apps.iam.permissions import load_app_permissions
        load_app_permissions(self)
