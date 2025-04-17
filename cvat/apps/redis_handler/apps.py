# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


from contextlib import suppress

from django.apps import AppConfig
from django.conf import settings


class LayeredKeyDict(dict):
    def __getitem__(self, key: str | tuple) -> str:
        if isinstance(key, tuple) and (len(key) == 3):  # action, target, subresource
            with suppress(KeyError):
                return self.__getitem__(key[0])
            return self.__getitem__((key[0], key[2]))  # (action, subresource)
        return super().__getitem__(key)


MAPPING = LayeredKeyDict()


def initialize_mapping():
    for queue_name, queue_conf in settings.RQ_QUEUES.items():
        if supported_actions := queue_conf.get("SUPPORTED_ACTIONS"):
            for action in supported_actions:
                if isinstance(action, str):
                    MAPPING[action] = queue_name
                    continue

                assert isinstance(action, tuple)
                MAPPING[action] = queue_name


class RedisHandlerConfig(AppConfig):
    name = "cvat.apps.redis_handler"

    def ready(self) -> None:
        from cvat.apps.iam.permissions import load_app_permissions

        load_app_permissions(self)
        initialize_mapping()
