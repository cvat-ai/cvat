
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig
from django.db.models.signals import post_save

class EngineConfig(AppConfig):
    name = 'cvat.apps.engine'

    def ready(self):
        from .signals import update_task_status

        # FIXME: the signal isn't called (why?)
        post_save.connect(update_task_status, sender='cvat.apps.engine.Job',
            dispatch_uid="update_task_status")
