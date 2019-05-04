
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig

class EngineConfig(AppConfig):
    name = 'cvat.apps.engine'

    def ready(self):
        from django.db.models.signals import post_save
        from .signals import update_task_status

        post_save.connect(update_task_status, sender='engine.Job',
            dispatch_uid="update_task_status")
