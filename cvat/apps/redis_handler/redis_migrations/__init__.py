# Copyright (C) 2025 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from abc import ABCMeta, abstractmethod

from attrs import define, field, validators


@define
class BaseMigration(metaclass=ABCMeta):
    name: str = field(validator=[validators.instance_of(str)])
    app_label: str = field(validator=[validators.instance_of(str)])

    @staticmethod
    @abstractmethod
    def run() -> None: ...
