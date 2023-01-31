# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig


class LogViewerConfig(AppConfig):
    name = 'cvat.apps.logs'

    def ready(self):
        from . import signals  # pylint: disable=unused-import
