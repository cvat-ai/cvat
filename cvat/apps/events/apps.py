# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig


class EventsConfig(AppConfig):
    name = 'cvat.apps.events'

    def ready(self):
        from . import signals  # pylint: disable=unused-import
