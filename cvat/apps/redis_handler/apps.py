# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


from contextlib import suppress
from typing import cast

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


SELECTOR_TO_QUEUE = LayeredKeyDict()
QUEUE_TO_PARSED_JOB_ID_CLS = {}

REQUEST_ID_SUBCLASSES = set()


def initialize_mappings():
    from cvat.apps.redis_handler.rq import RequestId

    def init_subclasses(cur_cls: type[RequestId] = RequestId):
        for subclass in cur_cls.__subclasses__():
            REQUEST_ID_SUBCLASSES.add(subclass)
            init_subclasses(subclass)

    for queue_name, queue_conf in settings.RQ_QUEUES.items():
        if path_to_parsed_job_id_cls := queue_conf.get("PARSED_JOB_ID_CLASS"):
            parsed_job_id_cls = import_string(path_to_parsed_job_id_cls)

            if not issubclass(parsed_job_id_cls, RequestId):
                raise ImproperlyConfigured(
                    f"The {path_to_parsed_job_id_cls!r} must be inherited from the RequestId class"
                )

            for queue_selector in parsed_job_id_cls.QUEUE_SELECTORS:
                if not isinstance(queue_selector, (tuple, str)):
                    raise ImproperlyConfigured("Wrong queue selector, must be either tuple or str")
                SELECTOR_TO_QUEUE[queue_selector] = queue_name

            QUEUE_TO_PARSED_JOB_ID_CLS[queue_name] = parsed_job_id_cls

    init_subclasses()
    # check that each subclass that has QUEUE_SELECTORS can be used to determine the queue
    for subclass in REQUEST_ID_SUBCLASSES:
        subclass = cast(RequestId, subclass)
        if subclass.LEGACY_FORMAT_PATTERNS and not subclass.QUEUE_SELECTORS:
            raise ImproperlyConfigured(
                f"Subclass {subclass.__name__} has LEGACY_FORMAT_PATTERNS - QUEUE_SELECTORS must be defined"
            )

        if subclass.QUEUE_SELECTORS:
            for queue_selector in subclass.QUEUE_SELECTORS:
                if not SELECTOR_TO_QUEUE.get(queue_selector):
                    raise ImproperlyConfigured(
                        f"Queue selector {queue_selector!r} for the class {subclass.__name__!r} is missed in the queue configuration"
                    )


class RedisHandlerConfig(AppConfig):
    name = "cvat.apps.redis_handler"

    def ready(self) -> None:
        from cvat.apps.iam.permissions import load_app_iam_rules

        load_app_iam_rules(self)
        initialize_mappings()
