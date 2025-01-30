# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from abc import ABCMeta, abstractmethod
from typing import ClassVar

from attrs import define, field, validators
from django.conf import settings
from redis import Redis


@define
class BaseMigration(metaclass=ABCMeta):
    CONNECTION: ClassVar[Redis] = Redis(
        host=settings.REDIS_INMEM_SETTINGS["HOST"],
        port=settings.REDIS_INMEM_SETTINGS["PORT"],
        db=settings.REDIS_INMEM_SETTINGS["DB"],
        password=settings.REDIS_INMEM_SETTINGS["PASSWORD"],
    )
    name: str = field(validator=[validators.instance_of(str)])
    app_label: str = field(validator=[validators.instance_of(str)])

    @classmethod
    @abstractmethod
    def run(cls) -> None: ...
