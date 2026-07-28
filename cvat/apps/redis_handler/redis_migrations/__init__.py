# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from abc import ABCMeta, abstractmethod

from attrs import define, field, validators
from redis import Redis


@define
class BaseMigration(metaclass=ABCMeta):
    name: str = field(validator=[validators.instance_of(str)])
    app_label: str = field(validator=[validators.instance_of(str)])
    connection: Redis = field(validator=[validators.instance_of(Redis)], kw_only=True)

    @abstractmethod
    def run(self) -> None: ...
