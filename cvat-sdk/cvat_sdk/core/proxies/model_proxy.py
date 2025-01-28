# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import json
from abc import ABC
from collections.abc import Sequence
from copy import deepcopy
from pathlib import Path
from typing import (
    TYPE_CHECKING,
    Any,
    Callable,
    Generic,
    Literal,
    Optional,
    TypeVar,
    Union,
    overload,
)

from typing_extensions import Self

from cvat_sdk.api_client import exceptions
from cvat_sdk.api_client.model_utils import IModelData, ModelNormal, to_json
from cvat_sdk.core.downloading import Downloader
from cvat_sdk.core.helpers import get_paginated_collection
from cvat_sdk.core.progress import ProgressReporter
from cvat_sdk.core.proxies.types import Location

if TYPE_CHECKING:
    from _typeshed import StrPath

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

    _entity_type: type[Entity[ModelType, ApiType]]


### Utilities


def build_model_bases(
    mt: type[ModelType], at: type[ApiType], *, api_member_name: Optional[str] = None
) -> tuple[type[Entity[ModelType, ApiType]], type[Repo[ModelType, ApiType]]]:
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
    def create(self: Repo, spec: Union[dict[str, Any], IModel]) -> _EntityT:
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
    def list(self: Repo, *, return_json: Literal[False] = False) -> list[_EntityT]: ...

    @overload
    def list(self: Repo, *, return_json: Literal[True] = False) -> list[Any]: ...

    def list(self: Repo, *, return_json: bool = False) -> list[Union[_EntityT, Any]]:
        """
        Retrieves all objects from the server and returns them in basic or JSON format.
        """

        results = get_paginated_collection(endpoint=self.api.list_endpoint, return_json=return_json)

        if return_json:
            return json.dumps(results)
        return [self._entity_type(self._client, model) for model in results]


class ModelBatchDeleteMixin(Repo):
    def remove_by_ids(self, ids: Sequence[int], /) -> None:
        """
        Delete a list of objects from the server, ignoring those which don't exist.
        """
        type_name = self._entity_type.__name__

        for object_id in ids:
            (_, response) = self.api.destroy(object_id, _check_status=False)

            if 200 <= response.status <= 299:
                self._client.logger.info(f"{type_name} #{object_id} deleted")
            elif response.status == 404:
                self._client.logger.info(f"{type_name} #{object_id} not found")
            else:
                self._client.logger.error(
                    f"Failed to delete {type_name} #{object_id}: "
                    f"{response.msg} (status {response.status})"
                )


#### Entity mixins


class ModelUpdateMixin(ABC, Generic[IModel]):
    @property
    def _model_partial_update_arg(self: Entity) -> str: ...

    def _export_update_fields(
        self: Entity, overrides: Optional[Union[dict[str, Any], IModel]] = None
    ) -> dict[str, Any]:
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

    def update(self: Entity, values: Union[dict[str, Any], IModel]) -> Self:
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


class _ExportMixin(Generic[_EntityT]):
    def export(
        self,
        endpoint: Callable,
        filename: StrPath,
        *,
        pbar: Optional[ProgressReporter] = None,
        status_check_period: Optional[int] = None,
        location: Optional[Location] = None,
        cloud_storage_id: Optional[int] = None,
        **query_params,
    ) -> None:
        query_params = {
            **query_params,
            **({"location": location} if location else {}),
        }

        if location == Location.CLOUD_STORAGE:
            if not cloud_storage_id:
                raise ValueError(
                    f"Cloud storage ID must be specified when {location!r} location is used"
                )

            query_params["cloud_storage_id"] = cloud_storage_id

        local_downloading = (
            location == Location.LOCAL
            or not location
            and (not self.target_storage or self.target_storage.location.value == Location.LOCAL)
        )

        if not local_downloading:
            query_params["filename"] = str(filename)

        downloader = Downloader(self._client)
        export_request = downloader.prepare_file(
            endpoint,
            url_params={"id": self.id},
            query_params=query_params,
            status_check_period=status_check_period,
        )

        result_url = export_request.result_url

        if (
            location == Location.LOCAL
            and not result_url
            or location == Location.CLOUD_STORAGE
            and result_url
        ):
            raise exceptions.ServiceException(500, "Server handled export parameters incorrectly")
        elif not location and (
            (not self.target_storage or self.target_storage.location.value == Location.LOCAL)
            and not result_url
            or (
                self.target_storage
                and self.target_storage.location.value == Location.CLOUD_STORAGE
                and result_url
            )
        ):
            # SDK should not raise an exception here, because most likely
            # a SDK model was outdated while export finished successfully
            self._client.logger.warn(
                f"{self.__class__.__name__.title()} was outdated. "
                f"Use .fetch() method to obtain {self.__class__.__name__.lower()!r} actual version"
            )

        if result_url:
            downloader.download_file(result_url, output_path=Path(filename), pbar=pbar)


class ExportDatasetMixin(_ExportMixin):
    def export_dataset(
        self,
        format_name: str,
        filename: StrPath,
        *,
        pbar: Optional[ProgressReporter] = None,
        status_check_period: Optional[int] = None,
        include_images: bool = True,
        location: Optional[Location] = None,
        cloud_storage_id: Optional[int] = None,
    ) -> None:
        """
        Export a dataset in the specified format (e.g. 'YOLO 1.1').
        By default, a result file will be downloaded based on the default configuration.
        To force file downloading, pass `location=Location.LOCAL`.
        To save a file to a specific cloud storage, use the `location` and `cloud_storage_id` arguments.

        Args:
            filename (StrPath): A path to which a file will be downloaded
            status_check_period (int, optional): Sleep interval in seconds between status checks.
                Defaults to None, which means the `Config.status_check_period` is used.
            pbar (Optional[ProgressReporter], optional): Can be used to show a progress when downloading file locally.
                Defaults to None.
            location (Optional[Location], optional): Location to which a file will be uploaded.
                Can be Location.LOCAL or Location.CLOUD_STORAGE. Defaults to None.
            cloud_storage_id (Optional[int], optional): ID of cloud storage to which a file should be uploaded. Defaults to None.

        Raises:
            ValueError: When location is Location.CLOUD_STORAGE but no cloud_storage_id is passed
        """

        self.export(
            self.api.create_dataset_export_endpoint,
            filename,
            pbar=pbar,
            status_check_period=status_check_period,
            location=location,
            cloud_storage_id=cloud_storage_id,
            format=format_name,
            save_images=include_images,
        )

        self._client.logger.info(
            f"Dataset for {self.__class__.__name__.lower()} {self.id} has been downloaded to {filename}"
        )


class DownloadBackupMixin(_ExportMixin):
    def download_backup(
        self,
        filename: StrPath,
        *,
        status_check_period: int = None,
        pbar: Optional[ProgressReporter] = None,
        location: Optional[str] = None,
        cloud_storage_id: Optional[int] = None,
    ) -> None:
        """
        Create a resource backup and download it locally or upload to a cloud storage.
        By default, a result file will be downloaded based on the default configuration.
        To force file downloading, pass `location=Location.LOCAL`.
        To save a file to a specific cloud storage, use the `location` and `cloud_storage_id` arguments.

        Args:
            filename (StrPath): A path to which a file will be downloaded
            status_check_period (int, optional): Sleep interval in seconds between status checks.
                Defaults to None, which means the `Config.status_check_period` is used.
            pbar (Optional[ProgressReporter], optional): Can be used to show a progress when downloading file locally.
                Defaults to None.
            location (Optional[Location], optional): Location to which a file will be uploaded.
                Can be Location.LOCAL or Location.CLOUD_STORAGE. Defaults to None.
            cloud_storage_id (Optional[int], optional): ID of cloud storage to which a file should be uploaded. Defaults to None.

        Raises:
            ValueError: When location is Location.CLOUD_STORAGE but no cloud_storage_id is passed
        """

        self.export(
            self.api.create_backup_export_endpoint,
            filename,
            pbar=pbar,
            status_check_period=status_check_period,
            location=location,
            cloud_storage_id=cloud_storage_id,
        )

        self._client.logger.info(
            f"Backup for {self.__class__.__name__.lower()} {self.id} has been downloaded to {filename}"
        )
