# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig


class EventsConfig(AppConfig):
    name = "cvat.apps.analytics_report"

    def ready(self):
        from cvat.apps.iam.permissions import load_app_permissions

        load_app_permissions(self)
