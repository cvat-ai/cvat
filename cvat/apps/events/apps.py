# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig


class EventsConfig(AppConfig):
    name = "cvat.apps.events"

    def ready(self):
        from cvat.apps.iam.permissions import load_app_iam_rules

        load_app_iam_rules(self)

        from . import signals  # pylint: disable=unused-import
