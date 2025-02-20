# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import base64
import json
import shutil
from abc import ABCMeta, abstractmethod
from collections.abc import Mapping
from enum import Enum, auto
from pathlib import Path
from typing import Any, Callable, TypeVar, Union, cast

from attrs import define

import cvat_sdk.models as models
from cvat_sdk.api_client.model_utils import OpenApiModel, to_json
from cvat_sdk.core.client import Client
from cvat_sdk.core.proxies.projects import Project
from cvat_sdk.core.proxies.tasks import Task
from cvat_sdk.core.utils import atomic_writer


class UpdatePolicy(Enum):
    """
    Defines policies for when the local cache is updated from the CVAT server.
    """

    IF_MISSING_OR_STALE = auto()
    """
    Update the cache whenever cached data is missing or the server has a newer version.
    """

    NEVER = auto()
    """
    Never update the cache. If an operation requires data that is not cached,
    it will fail.

    No network access will be performed if this policy is used.
    """


_CacheObject = dict[str, Any]


class _CacheObjectModel(metaclass=ABCMeta):
    @abstractmethod
    def dump(self) -> _CacheObject: ...

    @classmethod
    @abstractmethod
    def load(cls, obj: _CacheObject): ...


_ModelType = TypeVar("_ModelType", bound=Union[OpenApiModel, _CacheObjectModel])


class CacheManager(metaclass=ABCMeta):
    def __init__(self, client: Client) -> None:
        self._client = client
        self._logger = client.logger

        self._server_dir = client.config.cache_dir / f"servers/{self.server_dir_name}"

    @property
    def server_dir_name(self) -> str:
        # Base64-encode the name to avoid FS-unsafe characters (like slashes)
        return base64.urlsafe_b64encode(self._client.api_map.host.encode()).rstrip(b"=").decode()

    def task_dir(self, task_id: int) -> Path:
        return self._server_dir / f"tasks/{task_id}"

    def task_json_path(self, task_id: int) -> Path:
        return self.task_dir(task_id) / "task.json"

    def chunk_dir(self, task_id: int) -> Path:
        return self.task_dir(task_id) / "chunks"

    def project_dir(self, project_id: int) -> Path:
        return self._server_dir / f"projects/{project_id}"

    def project_json_path(self, project_id: int) -> Path:
        return self.project_dir(project_id) / "project.json"

    def _load_object(self, path: Path) -> _CacheObject:
        with open(path, "rb") as f:
            return json.load(f)

    def _save_object(self, path: Path, obj: _CacheObject) -> None:
        with atomic_writer(path, "w", encoding="UTF-8") as f:
            json.dump(obj, f, indent=4)
            print(file=f)  # add final newline

    def _deserialize_model(self, obj: _CacheObject, model_type: _ModelType) -> _ModelType:
        if issubclass(model_type, OpenApiModel):
            return cast(OpenApiModel, model_type)._new_from_openapi_data(**obj)
        elif issubclass(model_type, _CacheObjectModel):
            return cast(_CacheObjectModel, model_type).load(obj)
        else:
            raise NotImplementedError("Unexpected model type")

    def _serialize_model(self, model: _ModelType) -> _CacheObject:
        if isinstance(model, OpenApiModel):
            return to_json(model)
        elif isinstance(model, _CacheObjectModel):
            return model.dump()
        else:
            raise NotImplementedError("Unexpected model type")

    def load_model(self, path: Path, model_type: type[_ModelType]) -> _ModelType:
        return self._deserialize_model(self._load_object(path), model_type)

    def save_model(self, path: Path, model: _ModelType) -> None:
        return self._save_object(path, self._serialize_model(model))

    @abstractmethod
    def retrieve_task(self, task_id: int) -> Task: ...

    @abstractmethod
    def ensure_task_model(
        self,
        task_id: int,
        filename: str,
        model_type: type[_ModelType],
        downloader: Callable[[], _ModelType],
        model_description: str,
    ) -> _ModelType: ...

    @abstractmethod
    def ensure_chunk(self, task: Task, chunk_index: int) -> None: ...

    @abstractmethod
    def retrieve_project(self, project_id: int) -> Project: ...


class _CacheManagerOnline(CacheManager):
    def retrieve_task(self, task_id: int) -> Task:
        self._logger.info(f"Fetching task {task_id}...")
        task = self._client.tasks.retrieve(task_id)

        self._initialize_task_dir(task)
        return task

    def _initialize_task_dir(self, task: Task) -> None:
        task_dir = self.task_dir(task.id)
        task_json_path = self.task_json_path(task.id)

        try:
            saved_task = self.load_model(task_json_path, _OfflineTaskModel)
        except Exception:
            self._logger.info(f"Task {task.id} is not yet cached or the cache is corrupted")

            # If the cache was corrupted, the directory might already be there; clear it.
            if task_dir.exists():
                shutil.rmtree(task_dir)
        else:
            if saved_task.api_model.updated_date < task.updated_date:
                self._logger.info(
                    f"Task {task.id} has been updated on the server since it was cached; purging the cache"
                )
                shutil.rmtree(task_dir)

        task_dir.mkdir(exist_ok=True, parents=True)
        self.save_model(task_json_path, _OfflineTaskModel.from_entity(task))

    def ensure_task_model(
        self,
        task_id: int,
        filename: str,
        model_type: type[_ModelType],
        downloader: Callable[[], _ModelType],
        model_description: str,
    ) -> _ModelType:
        path = self.task_dir(task_id) / filename

        try:
            model = self.load_model(path, model_type)
            self._logger.info(f"Loaded {model_description} from cache")
            return model
        except FileNotFoundError:
            pass
        except Exception:
            self._logger.warning(f"Failed to load {model_description} from cache", exc_info=True)

        self._logger.info(f"Downloading {model_description}...")
        model = downloader()
        self._logger.info(f"Downloaded {model_description}")

        self.save_model(path, model)

        return model

    def ensure_chunk(self, task: Task, chunk_index: int) -> None:
        chunk_path = self.chunk_dir(task.id) / f"{chunk_index}.zip"
        if chunk_path.exists():
            return  # already downloaded previously

        self._logger.info(f"Downloading chunk #{chunk_index}...")

        with atomic_writer(chunk_path, "wb") as chunk_file:
            task.download_chunk(chunk_index, chunk_file, quality="original")

    def retrieve_project(self, project_id: int) -> Project:
        self._logger.info(f"Fetching project {project_id}...")
        project = self._client.projects.retrieve(project_id)

        project_dir = self.project_dir(project_id)
        project_dir.mkdir(parents=True, exist_ok=True)
        project_json_path = self.project_json_path(project_id)

        # There are currently no files cached alongside project.json,
        # so we don't need to check if we need to purge them.

        self.save_model(project_json_path, _OfflineProjectModel.from_entity(project))

        return project


class _CacheManagerOffline(CacheManager):
    def retrieve_task(self, task_id: int) -> Task:
        self._logger.info(f"Retrieving task {task_id} from cache...")
        cached_model = self.load_model(self.task_json_path(task_id), _OfflineTaskModel)
        return _OfflineTaskProxy(self._client, cached_model, cache_manager=self)

    def ensure_task_model(
        self,
        task_id: int,
        filename: str,
        model_type: type[_ModelType],
        downloader: Callable[[], _ModelType],
        model_description: str,
    ) -> _ModelType:
        self._logger.info(f"Loading {model_description} from cache...")
        return self.load_model(self.task_dir(task_id) / filename, model_type)

    def ensure_chunk(self, task: Task, chunk_index: int) -> None:
        chunk_path = self.chunk_dir(task.id) / f"{chunk_index}.zip"

        if not chunk_path.exists():
            raise FileNotFoundError(f"Chunk {chunk_index} of task {task.id} is not cached")

    def retrieve_project(self, project_id: int) -> Project:
        self._logger.info(f"Retrieving project {project_id} from cache...")
        cached_model = self.load_model(self.project_json_path(project_id), _OfflineProjectModel)
        return _OfflineProjectProxy(self._client, cached_model, cache_manager=self)


@define
class _OfflineTaskModel(_CacheObjectModel):
    api_model: models.ITaskRead
    labels: list[models.ILabel]

    def dump(self) -> _CacheObject:
        return {
            "model": to_json(self.api_model),
            "labels": to_json(self.labels),
        }

    @classmethod
    def load(cls, obj: _CacheObject):
        return cls(
            api_model=models.TaskRead._from_openapi_data(**obj["model"]),
            labels=[models.Label._from_openapi_data(**label) for label in obj["labels"]],
        )

    @classmethod
    def from_entity(cls, entity: Task):
        return cls(
            api_model=entity._model,
            labels=entity.get_labels(),
        )


class _OfflineTaskProxy(Task):
    def __init__(
        self, client: Client, cached_model: _OfflineTaskModel, *, cache_manager: CacheManager
    ) -> None:
        super().__init__(client, cached_model.api_model)
        self._offline_model = cached_model
        self._cache_manager = cache_manager

    def get_labels(self) -> list[models.ILabel]:
        return self._offline_model.labels


@define
class _OfflineProjectModel(_CacheObjectModel):
    api_model: models.IProjectRead
    task_ids: list[int]
    labels: list[models.ILabel]

    def dump(self) -> _CacheObject:
        return {
            "model": to_json(self.api_model),
            "tasks": self.task_ids,
            "labels": to_json(self.labels),
        }

    @classmethod
    def load(cls, obj: _CacheObject):
        return cls(
            api_model=models.ProjectRead._from_openapi_data(**obj["model"]),
            task_ids=obj["tasks"],
            labels=[models.Label._from_openapi_data(**label) for label in obj["labels"]],
        )

    @classmethod
    def from_entity(cls, entity: Project):
        return cls(
            api_model=entity._model,
            task_ids=[t.id for t in entity.get_tasks()],
            labels=entity.get_labels(),
        )


class _OfflineProjectProxy(Project):
    def __init__(
        self, client: Client, cached_model: _OfflineProjectModel, *, cache_manager: CacheManager
    ) -> None:
        super().__init__(client, cached_model.api_model)
        self._offline_model = cached_model
        self._cache_manager = cache_manager

    def get_tasks(self) -> list[Task]:
        return [self._cache_manager.retrieve_task(t) for t in self._offline_model.task_ids]

    def get_labels(self) -> list[models.ILabel]:
        return self._offline_model.labels


_CACHE_MANAGER_CLASSES: Mapping[UpdatePolicy, type[CacheManager]] = {
    UpdatePolicy.IF_MISSING_OR_STALE: _CacheManagerOnline,
    UpdatePolicy.NEVER: _CacheManagerOffline,
}


def make_cache_manager(client: Client, update_policy: UpdatePolicy) -> CacheManager:
    return _CACHE_MANAGER_CLASSES[update_policy](client)
