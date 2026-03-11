# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class InstanceConfig:
    cvat_root_dir: Path  # Repo test root used for compose/asset path resolution.
    cvat_db_dir: Path  # Directory with DB/data restore artifacts.
    waiting_time: int  # Max service readiness wait in seconds.
    extra_dc_files: Any  # Optional extra docker-compose override files.
    default_infra_profile: Any  # Fallback profile when state/profile is missing.
    profile_dc_files: Any  # Mapping from infra profile to compose overrides.
    logger: Any  # Shared logger for infra lifecycle diagnostics.


class InfraPlugin(ABC):
    @classmethod
    def register_options(cls, group) -> None:
        return None

    @classmethod
    def configure(cls, config) -> None:
        return None

    @classmethod
    def collection_modifyitems(cls, config, items) -> None:
        return None

    @classmethod
    def runtestloop(cls, session):
        return None

    @classmethod
    @abstractmethod
    def can_handle_config(cls, config) -> bool:
        raise NotImplementedError


class InfraInstance(ABC):
    plugin_class: type[InfraPlugin]

    def __init__(self, session, deps: InstanceConfig):
        self.session = session
        self.config = session.config
        self.deps = deps

    @classmethod
    @abstractmethod
    def can_handle_config(cls, config) -> bool:
        raise NotImplementedError

    @classmethod
    @abstractmethod
    def can_handle(cls, session, deps: InstanceConfig) -> bool:
        raise NotImplementedError

    @abstractmethod
    def start(self) -> None:
        raise NotImplementedError

    def finish(self) -> None:
        return None

    # Fixture-level data restore capabilities.
    def restore_db(self) -> None:
        raise NotImplementedError

    def restore_cvat_data(self) -> None:
        raise NotImplementedError

    def restore_clickhouse_db(self) -> None:
        raise NotImplementedError

    def restore_redis_inmem(self) -> None:
        raise NotImplementedError

    def restore_redis_ondisk(self) -> None:
        raise NotImplementedError

    def exec_cvat(self, command: list[str] | str):
        raise NotImplementedError

    def exec_redis_inmem(self, command: list[str] | str):
        raise NotImplementedError

    @classmethod
    def runtime_candidates(cls):
        from infra.instances.kube_instance import KubeInstance
        from infra.instances.local_instance import LocalInstance
        from infra.instances.parallel_instance import ParallelInstance

        return (ParallelInstance, KubeInstance, LocalInstance)

    @classmethod
    def plugin_candidates(cls):
        from infra.instances.kube_instance import KubePlugin
        from infra.instances.local_instance import LocalPlugin
        from infra.instances.parallel_instance import ParallelPlugin

        return (ParallelPlugin, KubePlugin, LocalPlugin)

    @classmethod
    def register_all_options(cls, group) -> None:
        for candidate in cls.plugin_candidates():
            candidate.register_options(group)

    @classmethod
    def select_runtime_class_for_config(cls, config):
        for candidate in cls.runtime_candidates():
            if candidate.can_handle_config(config):
                return candidate
        raise RuntimeError("Failed to choose infra instance implementation for config")

    @classmethod
    def select_plugin_classes_for_config(cls, config):
        runtime_class = cls.select_runtime_class_for_config(config)
        classes: list[type[InfraPlugin]] = [runtime_class.plugin_class]

        if config.getoption("--parallel-child"):
            from infra.instances.parallel_instance import ParallelPlugin

            if ParallelPlugin not in classes:
                classes.insert(0, ParallelPlugin)

        return classes

    @classmethod
    def create(cls, session, deps: InstanceConfig) -> "InfraInstance":
        selected_class = getattr(session.config, "_cvat_runtime_class", None)
        if selected_class is None:
            selected_class = cls.select_runtime_class_for_config(session.config)
            setattr(session.config, "_cvat_runtime_class", selected_class)

        return selected_class(session, deps)
