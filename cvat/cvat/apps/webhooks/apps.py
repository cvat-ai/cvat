# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig


class WebhooksConfig(AppConfig):
    name = "cvat.apps.webhooks"

    def ready(self):
        from cvat.apps.iam.permissions import load_app_iam_rules

        load_app_iam_rules(self)

        from . import signals  # pylint: disable=unused-import
