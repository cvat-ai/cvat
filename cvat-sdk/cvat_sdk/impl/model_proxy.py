# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, Any

from cvat_sdk.model_utils import ModelNormal

if TYPE_CHECKING:
    from cvat_sdk.impl.client import Client


class ModelProxy(ABC):
    _client: Client
    _model: ModelNormal

    def __init__(self, client: Client, model: ModelNormal) -> None:
        self.__dict__["_client"] = client
        self.__dict__["_model"] = model

    def __getattr__(self, __name: str) -> Any:
        return self._model[__name]

    def __setattr__(self, __name: str, __value: Any) -> None:
        if __name in self.__dict__:
            self.__dict__[__name] = __value
        else:
            self._model[__name] = __value

    @abstractmethod
    def fetch(self, force: bool = False):
        """Fetches model data from the server"""
        ...

    @abstractmethod
    def commit(self, force: bool = False):
        """Commits local changes to the server"""
        ...

    def sync(self):
        """Pulls server state and commits local model changes"""
        raise NotImplementedError

    def update(self, **kwargs):
        """Updates multiple fields at once"""
        for k, v in kwargs.items():
            setattr(self._model, k, v)

    def __str__(self) -> str:
        return str(self._model)
