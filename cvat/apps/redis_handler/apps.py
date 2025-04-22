# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


from contextlib import suppress

from django.apps import AppConfig
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.utils.module_loading import import_string


class LayeredKeyDict(dict):
    def __getitem__(self, key: str | tuple) -> str:
        if isinstance(key, tuple) and (len(key) == 3):  # action, target, subresource
            with suppress(KeyError):
                return self.__getitem__(key[0])
            return self.__getitem__((key[0], key[2]))  # (action, subresource)
        return super().__getitem__(key)


ACTION_TO_QUEUE = LayeredKeyDict()
QUEUE_TO_PARSED_JOB_ID_CLS = {}


def initialize_mappings():
    from cvat.apps.redis_handler.rq import RequestId

    for queue_name, queue_conf in settings.RQ_QUEUES.items():
        if path_to_parsed_job_id_cls := queue_conf.get("PARSED_JOB_ID_CLASS"):
            parsed_job_id_cls = import_string(path_to_parsed_job_id_cls)

            if not issubclass(parsed_job_id_cls, RequestId):
                raise ImproperlyConfigured(
                    f"The {path_to_parsed_job_id_cls!r} must be inherited from the RequestId class"
                )

            for queue_selector in parsed_job_id_cls.QUEUE_SELECTORS:
                ACTION_TO_QUEUE[queue_selector] = queue_name

            QUEUE_TO_PARSED_JOB_ID_CLS[queue_name] = parsed_job_id_cls


class RedisHandlerConfig(AppConfig):
    name = "cvat.apps.redis_handler"

    def ready(self) -> None:
        from cvat.apps.iam.permissions import load_app_permissions

        load_app_permissions(self)
        initialize_mappings()
