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


class ModelProxy(ABC, Generic[ModelType, ApiType]):
    _client: Client

    @property
    def _api_member_name(self) -> str:
        ...

    @property
    def _model_id_field(self) -> str:
        return "id"

    def __init__(self, client: Client) -> None:
        self.__dict__["_client"] = client

    @classmethod
    def get_api(cls, client: Client) -> ApiType:
        return getattr(client.api, cls._api_member_name)

    @property
    def api(self) -> ApiType:
        return self.get_api(self._client)


class Entity(ModelProxy[ModelType, ApiType]):
    _model: ModelType

    def __init__(self, client: Client, model: ModelType) -> None:
        super().__init__(client)
        self.__dict__["_model"] = model

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


class Repo(ModelProxy[ModelType, ApiType]):
    _entity_type: Type[Entity]


### CRUD mixins

_EntityT = TypeVar("_EntityT", bound=Entity)

#### Repo mixins


class ModelCreateMixin(Generic[_EntityT]):
    def create(self: Repo, spec: IModel, **kwargs) -> _EntityT:
        """
        Creates a new object on the server and returns corresponding local object
        """

        (model, _) = self.api.create(spec, **kwargs)
        return self._entity_type(self._client, model)


class ModelRetrieveMixin(Generic[_EntityT]):
    def retrieve(self: Repo, obj_id: int, **kwargs) -> _EntityT:
        """
        Retrieves an object from server by ID
        """

        (model, _) = self.api.retrieve(obj_id, **kwargs)
        return self._entity_type(self._client, model)


class ModelListMixin(Generic[_EntityT]):
    @overload
    def list(self: Repo, *, return_json: Literal[False] = False, **kwargs) -> List[_EntityT]:
        ...

    @overload
    def list(self: Repo, *, return_json: Literal[True] = False, **kwargs) -> List[Any]:
        ...

    def list(self: Repo, *, return_json: bool = False, **kwargs) -> List[Union[_EntityT, Any]]:
        """
        Retrieves all objects from the server and returns them in basic or JSON format.
        """

        results = get_paginated_collection(
            endpoint=self.api.list_endpoint, return_json=return_json, **kwargs
        )

        if return_json:
            return json.dumps(results)
        return [self._entity_type(self._client, model) for model in results]


#### Entity mixins


class ModelUpdateMixin(ABC):
    @property
    def _model_partial_update_arg(self) -> str:
        ...

    def fetch(self: Entity, **kwargs) -> None:
        """
        Updates current object from server
        """

        # TODO: implement revision checking
        (self._model, _) = self.api.retrieve(getattr(self, self._model_id_field), **kwargs)

    def commit(self: Entity, **kwargs) -> None:
        """
        Commits local model changes to the server
        """

        # TODO: implement revision checking

        (self._model, _) = self.api.partial_update(
            getattr(self, self._model_id_field),
            **{self._model_partial_update_arg: self._model.to_dict()},
            **kwargs,
        )


class ModelDeleteMixin:
    def remove(self: Entity, **kwargs) -> None:
        """
        Removes current object on the server
        """

        self.api.destroy(getattr(self, self._model_id_field), **kwargs)
