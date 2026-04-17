# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from infra.config import RuntimeInfraConfig
from infra.rq_cleanup import BackgroundJobCleaner

from shared.utils.config import normalize_runtime_asset_urls


@dataclass(frozen=True)
class InstanceConfig:
    cvat_root_dir: Path  # Repo test root used for compose/asset path resolution.
    cvat_db_dir: Path  # Directory with DB/data restore artifacts.
    waiting_time: int  # Max service readiness wait in seconds.
    extra_dc_files: Any  # Optional extra docker-compose override files.
    default_infra_profile: Any  # Fallback profile when state/profile is missing.
    profile_dc_files: Any  # Mapping from infra profile to compose overrides.


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
    _CVAT_DATA_ARCHIVE_PATH = "/tmp/cvat_data.tar.bz2"
    _CVAT_DATA_TEMPLATE_DIR = "/tmp/cvat_data_template"
    _CVAT_DATA_DIR = "/home/django/data"
    _CVAT_RUNTIME_DIRS = (
        "/home/django/data/cache",
        "/home/django/data/cache/export",
        "/home/django/data/jobs",
        "/home/django/data/tasks",
        "/home/django/data/projects",
        "/home/django/data/assets",
        "/home/django/data/storages",
        "/home/django/data/tmp",
    )

    def __init__(self, session, deps: InstanceConfig):
        self.session = session
        self.config = session.config
        self.deps = deps
        self._cvat_data_archive_host: str | None = None
        self._cvat_data_template_host: str | None = None
        self._background_job_cleaner: BackgroundJobCleaner | None = None

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

    def should_collect_failure_logs(self) -> bool:
        if self.config.getoption("--collect-only"):
            return False

        exitstatus = getattr(self.config, "_cvat_exitstatus", 0)
        return int(exitstatus) != 0

    def failure_logs_dir(self) -> Path:
        path = RuntimeInfraConfig.get_run_dir() / "container-logs"
        path.mkdir(parents=True, exist_ok=True)
        return path

    def prepare_runtime_db_fixture(self) -> Path:
        source = self.deps.cvat_db_dir / "data.json"
        target = RuntimeInfraConfig.get_run_dir() / "data.runtime.json"

        with open(source) as f:
            data = json.load(f)

        data = normalize_runtime_asset_urls(
            data,
            webhook_url=os.environ.get("CVAT_TEST_DB_WEBHOOK_RECEIVER_URL"),
            minio_url=os.environ.get("CVAT_TEST_DB_MINIO_ENDPOINT_URL"),
        )

        with open(target, "w") as f:
            json.dump(data, f, indent=2)

        return target

    # Fixture-level data restore capabilities.
    def restore_db(self) -> None:
        raise NotImplementedError

    def restore_cvat_data(self) -> None:
        cvat_host = self._get_cvat_host()
        if self._cvat_data_template_host != cvat_host:
            if self._cvat_data_archive_host != cvat_host:
                self.exec_cvat_cp(
                    self.deps.cvat_db_dir / "cvat_data.tar.bz2",
                    self._CVAT_DATA_ARCHIVE_PATH,
                    cvat_host=cvat_host,
                )
                self._cvat_data_archive_host = cvat_host

            self.exec_cvat(
                [
                    "sh",
                    "-c",
                    f"rm -rf {self._CVAT_DATA_TEMPLATE_DIR} && mkdir -p {self._CVAT_DATA_TEMPLATE_DIR} "
                    f"&& tar --strip 3 -xjf {self._CVAT_DATA_ARCHIVE_PATH} -C {self._CVAT_DATA_TEMPLATE_DIR}",
                ]
            )
            self._cvat_data_template_host = cvat_host

        self.exec_cvat(
            [
                "sh",
                "-c",
                f"find {self._CVAT_DATA_DIR} -mindepth 1 -delete "
                f"&& cp -r {self._CVAT_DATA_TEMPLATE_DIR}/. {self._CVAT_DATA_DIR}/ "
                f"&& mkdir -p {' '.join(self._CVAT_RUNTIME_DIRS)}",
            ]
        )

    def restore_clickhouse_db(self) -> None:
        raise NotImplementedError

    def restore_redis_inmem(self) -> None:
        raise NotImplementedError

    def restore_redis_ondisk(self) -> None:
        raise NotImplementedError

    def drain_background_jobs(self, profile: str, *, timeout_seconds: int = 20) -> None:
        queue_names = RuntimeInfraConfig.get_background_queue_names(profile)
        if not queue_names:
            return

        cleaner = self._background_job_cleaner
        if cleaner is None:
            cleaner = BackgroundJobCleaner(self._get_redis_restorer().inmem_db0)
            self._background_job_cleaner = cleaner

        cleaner.drain(queue_names, timeout_seconds=timeout_seconds)

    def exec_cvat(self, command: list[str] | str):
        raise NotImplementedError

    def exec_redis_inmem(self, command: list[str] | str):
        raise NotImplementedError

    @abstractmethod
    def _get_redis_restorer(self):
        raise NotImplementedError

    @abstractmethod
    def exec_cvat_cp(self, source: Path, target: str, *, cvat_host: str) -> None:
        raise NotImplementedError

    @abstractmethod
    def _get_cvat_host(self) -> str:
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
