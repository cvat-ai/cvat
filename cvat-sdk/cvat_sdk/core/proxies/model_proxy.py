# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import json
from abc import ABC
from copy import deepcopy
from typing import (
    TYPE_CHECKING,
    Any,
    Dict,
    Generic,
    List,
    Literal,
    Optional,
    Tuple,
    Type,
    TypeVar,
    Union,
    overload,
)

from typing_extensions import Self

from cvat_sdk.api_client.model_utils import IModelData, ModelNormal, to_json
from cvat_sdk.core.helpers import get_paginated_collection

if TYPE_CHECKING:
    from cvat_sdk.core.client import Client

IModel = TypeVar("IModel", bound=IModelData)
ModelType = TypeVar("ModelType", bound=ModelNormal)
ApiType = TypeVar("ApiType")


class ModelProxy(ABC, Generic[ModelType, ApiType]):
    _client: Client

    @property
    def _api_member_name(self) -> str: ...

    def __init__(self, client: Client) -> None:
        self.__dict__["_client"] = client

    @classmethod
    def get_api(cls, client: Client) -> ApiType:
        return getattr(client.api_client, cls._api_member_name)

    @property
    def api(self) -> ApiType:
        return self.get_api(self._client)


class Entity(ModelProxy[ModelType, ApiType]):
    """
    Represents a single object. Implements related operations and provides read access
    to data members.
    """

    _model: ModelType

    def __init__(self, client: Client, model: ModelType) -> None:
        super().__init__(client)
        self.__dict__["_model"] = model

    @property
    def _model_id_field(self) -> str:
        return "id"

    def __getattr__(self, __name: str) -> Any:
        # NOTE: be aware of potential problems with throwing AttributeError from @property
        # in derived classes!
        # https://medium.com/@ceshine/python-debugging-pitfall-mixed-use-of-property-and-getattr-f89e0ede13f1
        return self._model[__name]

    def __str__(self) -> str:
        return str(self._model)

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__}: id={getattr(self, self._model_id_field)}>"


class Repo(ModelProxy[ModelType, ApiType]):
    """
    Represents a collection of corresponding Entity objects.
    Implements group and management operations for entities.
    """

    _entity_type: Type[Entity[ModelType, ApiType]]


### Utilities


def build_model_bases(
    mt: Type[ModelType], at: Type[ApiType], *, api_member_name: Optional[str] = None
) -> Tuple[Type[Entity[ModelType, ApiType]], Type[Repo[ModelType, ApiType]]]:
    """
    Helps to remove code duplication in declarations of derived classes
    """

    class _EntityBase(Entity[ModelType, ApiType]):
        if api_member_name:
            _api_member_name = api_member_name

    class _RepoBase(Repo[ModelType, ApiType]):
        if api_member_name:
            _api_member_name = api_member_name

    return _EntityBase, _RepoBase


### CRUD mixins

_EntityT = TypeVar("_EntityT", bound=Entity)

#### Repo mixins


class ModelCreateMixin(Generic[_EntityT, IModel]):
    def create(self: Repo, spec: Union[Dict[str, Any], IModel]) -> _EntityT:
        """
        Creates a new object on the server and returns the corresponding local object
        """

        (model, _) = self.api.create(spec)
        return self._entity_type(self._client, model)


class ModelRetrieveMixin(Generic[_EntityT]):
    def retrieve(self: Repo, obj_id: int) -> _EntityT:
        """
        Retrieves an object from the server by ID
        """

        (model, _) = self.api.retrieve(id=obj_id)
        return self._entity_type(self._client, model)


class ModelListMixin(Generic[_EntityT]):
    @overload
    def list(self: Repo, *, return_json: Literal[False] = False) -> List[_EntityT]: ...

    @overload
    def list(self: Repo, *, return_json: Literal[True] = False) -> List[Any]: ...

    def list(self: Repo, *, return_json: bool = False) -> List[Union[_EntityT, Any]]:
        """
        Retrieves all objects from the server and returns them in basic or JSON format.
        """

        results = get_paginated_collection(endpoint=self.api.list_endpoint, return_json=return_json)

        if return_json:
            return json.dumps(results)
        return [self._entity_type(self._client, model) for model in results]


#### Entity mixins


class ModelUpdateMixin(ABC, Generic[IModel]):
    @property
    def _model_partial_update_arg(self: Entity) -> str: ...

    def _export_update_fields(
        self: Entity, overrides: Optional[Union[Dict[str, Any], IModel]] = None
    ) -> Dict[str, Any]:
        # TODO: support field conversion and assignment updating
        # fields = to_json(self._model)

        if isinstance(overrides, ModelNormal):
            overrides = to_json(overrides)
        fields = deepcopy(overrides)

        return fields

    def fetch(self: Entity) -> Self:
        """
        Updates the current object from the server
        """

        # TODO: implement revision checking
        (self._model, _) = self.api.retrieve(id=getattr(self, self._model_id_field))
        return self

    def update(self: Entity, values: Union[Dict[str, Any], IModel]) -> Self:
        """
        Commits model changes to the server

        The local object is updated from the server after this operation.
        """

        # TODO: implement revision checking
        self.api.partial_update(
            id=getattr(self, self._model_id_field),
            **{self._model_partial_update_arg: self._export_update_fields(values)},
        )

        # TODO: use the response model, once input and output models are same
        return self.fetch()


class ModelDeleteMixin:
    def remove(self: Entity) -> None:
        """
        Removes current object on the server
        """

        self.api.destroy(id=getattr(self, self._model_id_field))
