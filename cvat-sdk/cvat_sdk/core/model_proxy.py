# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import json
from abc import ABC
from typing import TYPE_CHECKING, Any, Generic, List, Literal, Type, TypeVar, Union, overload

from cvat_sdk.api_client.model_utils import IModelData, ModelNormal
from cvat_sdk.core.helpers import get_paginated_collection

if TYPE_CHECKING:
    from cvat_sdk.core.client import Client

IModel = TypeVar("IModel", bound=IModelData)
ModelType = TypeVar("ModelType", bound=ModelNormal)
ApiType = TypeVar("ApiType")


class ModelProxy(ABC, Generic[IModel, ModelType, ApiType]):
    _client: Client
    _model: ModelType

    @property
    def _api_member_name(self) -> str:
        ...

    @property
    def _model_id_field(self) -> str:
        return "id"

    def __init__(self, client: Client, model: ModelType) -> None:
        self.__dict__["_client"] = client
        self.__dict__["_model"] = model

    @classmethod
    def get_api(cls, client: Client) -> ApiType:
        return getattr(client.api, cls._api_member_name)

    @property
    def api(self) -> ApiType:
        return self.get_api(self._client)

    def __getattr__(self, __name: str) -> Any:
        return self._model[__name]

    def __setattr__(self, __name: str, __value: Any) -> None:
        if __name in self.__dict__:
            self.__dict__[__name] = __value
        else:
            self._model[__name] = __value

    def sync(self):
        """Pulls server state and commits local model changes"""
        raise NotImplementedError

    def update(self, **kwargs):
        """Updates multiple fields at once"""
        for k, v in kwargs.items():
            setattr(self._model, k, v)

    def __str__(self) -> str:
        return str(self._model)


### CRUD mixins

_MixinHostT = TypeVar("_MixinHostT", bound=ModelProxy)


class ModelCreateMixin:
    @classmethod
    def create(cls: Type[_MixinHostT], client: Client, spec: IModel, **kwargs) -> _MixinHostT:
        """
        Creates a new object on the server and returns corresponding local object
        """

        (model, _) = cls.get_api(client).create(spec, **kwargs)
        return cls(client, model)


class ModelRetrieveMixin:
    @classmethod
    def retrieve(cls: Type[_MixinHostT], client: Client, obj_id: int, **kwargs) -> _MixinHostT:
        """
        Retrieves an object from server by ID
        """

        (model, _) = cls.get_api(client).retrieve(obj_id, **kwargs)
        return cls(client, model)

    def fetch(self: _MixinHostT, **kwargs) -> None:
        """
        Updates current object from server
        """

        # TODO: implement revision checking
        self._model = self.retrieve(
            self._client, getattr(self, self._model_id_field), **kwargs
        )._model


class ModelListMixin:
    @overload
    @classmethod
    def list(
        cls: Type[_MixinHostT], client: Client, *, return_json: Literal[False] = False, **kwargs
    ) -> List[_MixinHostT]:
        ...

    @overload
    @classmethod
    def list(
        cls: Type[_MixinHostT], client: Client, *, return_json: Literal[True] = False, **kwargs
    ) -> List[Any]:
        ...

    @classmethod
    def list(
        cls: Type[_MixinHostT], client: Client, *, return_json: bool = False, **kwargs
    ) -> List[Union[_MixinHostT, Any]]:
        """
        Retrieves all objects from the server and returns them in basic or JSON format.
        """

        results = get_paginated_collection(
            endpoint=cls.get_api(client).list_endpoint, return_json=return_json, **kwargs
        )

        if return_json:
            return json.dumps(results)
        return [cls(client, model) for model in results]


class ModelUpdateMixin(ABC):
    @property
    def _model_partial_update_arg(self) -> str:
        ...

    def commit(self: _MixinHostT, **kwargs) -> None:
        """
        Commits local model changes to the server
        """

        # TODO: implement revision checking

        self.api.partial_update(
            getattr(self, self._model_id_field),
            **{self._model_partial_update_arg: self._model.to_dict()},
            **kwargs,
        )


class ModelDeleteMixin:
    def remove(self: _MixinHostT, **kwargs) -> None:
        """
        Removes current object on the server
        """

        self.api.destroy(getattr(self, self._model_id_field), **kwargs)


### Composite usability mixins


class ModelCrudMixin(
    ModelListMixin, ModelCreateMixin, ModelRetrieveMixin, ModelUpdateMixin, ModelDeleteMixin
):
    """
    Provides CRUD operations for a ModelProxy
    """
