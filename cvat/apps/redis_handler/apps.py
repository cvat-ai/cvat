# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


from django.apps import AppConfig


class RedisHandlerConfig(AppConfig):
    name = "cvat.apps.redis_handler"

    def ready(self) -> None:
        from cvat.apps.iam.permissions import load_app_permissions

        load_app_permissions(self)
