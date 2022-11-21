# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig


class WebhooksConfig(AppConfig):
    name = "cvat.apps.webhooks"

    def ready(self):
        from . import signals  # pylint: disable=unused-import
