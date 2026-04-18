# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import logging
import os
import re
import tempfile
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from pathlib import Path
from urllib.parse import urlencode

import pytest

_LOGGER = logging.getLogger(__name__)

_CVAT_ROOT_DIR = next(dir.parent for dir in Path(__file__).parents if dir.name == "tests")
_CVAT_DB_DIR = _CVAT_ROOT_DIR / "tests/python/shared/assets/cvat_db"
_CLICKHOUSE_INIT_SCRIPT = "components/analytics/clickhouse/init.py"
_DEFAULT_PROJECT_NAME = "test"
_PROJECT_NAME_PATTERN = re.compile(r"^[a-z0-9][a-z0-9_-]*$")


class InfraMode(str, Enum):
    AUTO = "auto"
    UP = "up"
    DOWN = "down"
    RESTORE_DB = "restore-db"
    BUILD_IMAGES = "build-images"
    REUSE = "reuse"

    def __str__(self) -> str:
        return self.value


class InfraProfile(str, Enum):
    SIMPLE = "simple"
    STANDARD = "standard"
    FULL = "full"

    def __str__(self) -> str:
        return self.value


_DEFAULT_INFRA_MODE = str(InfraMode.AUTO)
_DEFAULT_INFRA_PROFILE = str(InfraProfile.SIMPLE)
_PROFILE_BASE_DC_FILES = {
    str(InfraProfile.SIMPLE): [
        "tests/docker-compose.file_share.yml",
        "tests/docker-compose.pat_settings.yml",
    ],
    str(InfraProfile.STANDARD): [
        "tests/docker-compose.file_share.yml",
        "tests/docker-compose.minio.yml",
        "tests/docker-compose.pat_settings.yml",
    ],
    str(InfraProfile.FULL): [
        "tests/docker-compose.file_share.yml",
        "tests/docker-compose.minio.yml",
        "tests/docker-compose.pat_settings.yml",
        "tests/docker-compose.test_servers.yml",
    ],
}
_PROFILE_DC_FILES = {
    str(InfraProfile.SIMPLE): ["tests/docker-compose.simple.profile.yml"],
    str(InfraProfile.STANDARD): ["tests/docker-compose.standard.profile.yml"],
    str(InfraProfile.FULL): [],
}
_RUNTIME_ROOT_DIR = Path(tempfile.gettempdir()) / "cvat_pytest_infra"
_RUNS_ROOT_DIR = _RUNTIME_ROOT_DIR / "runs"
_RUN_CONTEXT_FILE_NAME = "run-context.json"
_INFRA_MODES = tuple(str(mode) for mode in InfraMode)
_INFRA_PROFILES = tuple(_PROFILE_DC_FILES.keys())
_INFRA_PROFILE_RANK = {
    str(InfraProfile.SIMPLE): 0,
    str(InfraProfile.STANDARD): 1,
    str(InfraProfile.FULL): 2,
}
_INFRA_REQUIRED_MARKERS = {profile: f"infra_required_{profile}" for profile in _INFRA_PROFILES}
_BACKGROUND_QUEUE_FAMILIES = {
    "media_io": ("import", "export", "chunks"),
    "annotation_async": ("annotation",),
    "webhook_async": ("webhooks",),
    "quality_async": ("quality_reports", "consensus"),
}
_PROFILE_BACKGROUND_QUEUE_FAMILIES = {
    str(InfraProfile.SIMPLE): (),
    str(InfraProfile.STANDARD): ("media_io",),
    str(InfraProfile.FULL): ("media_io", "annotation_async", "webhook_async", "quality_async"),
}


def _validate_project_name(name: str) -> str:
    if not _PROJECT_NAME_PATTERN.match(name):
        raise pytest.UsageError(
            "Invalid project name. Use lowercase letters, digits, '_' or '-', and start with a letter or digit."
        )

    return name


@dataclass(frozen=True)
class ProjectInfraConfig:
    project_name: str
    cvat_root_dir: Path = _CVAT_ROOT_DIR
    runtime_root_dir: Path = _RUNTIME_ROOT_DIR

    @property
    def runtime_dir(self) -> Path:
        return self.runtime_root_dir / self.project_name

    @property
    def state_file(self) -> Path:
        return self.runtime_dir / "state.json"

    @property
    def generated_compose_files(self) -> list[Path]:
        return [
            self.runtime_dir / "docker-compose.tests.yml",
            self.runtime_dir / "docker-compose.dev.yml",
        ]

    @property
    def dc_files(self) -> list[Path]:
        return self.generated_compose_files

    @property
    def host_http_port(self) -> int:
        state = self.load_state() or {}
        return int(state.get("http_port", 8080))

    @property
    def host_logs_port(self) -> int:
        state = self.load_state() or {}
        return int(state.get("logs_port", 8090))

    @property
    def host_db_port(self) -> int:
        state = self.load_state() or {}
        return int(state.get("db_port", 15432))

    @property
    def host_redis_inmem_port(self) -> int:
        state = self.load_state() or {}
        return int(state.get("redis_inmem_port", 16379))

    @property
    def host_redis_ondisk_port(self) -> int:
        state = self.load_state() or {}
        return int(state.get("redis_ondisk_port", 16666))

    def prefixed_container_name(self, container: str) -> str:
        return f"{self.project_name}_{container}_1"

    def load_state(self) -> dict | None:
        if not self.state_file.exists():
            return None
        try:
            with open(self.state_file) as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            _LOGGER.warning("Ignoring unreadable runtime state file: %s", self.state_file)
            return None

    def save_state(self, state: dict) -> None:
        self.state_file.parent.mkdir(parents=True, exist_ok=True)
        tmp_state_file = self.state_file.with_suffix(".state.tmp")
        with open(tmp_state_file, "w") as f:
            json.dump(state, f, indent=2, sort_keys=True)
        os.replace(tmp_state_file, self.state_file)

    def delete_state(self) -> None:
        self.state_file.unlink(missing_ok=True)

    @classmethod
    def from_config(cls, config, *, cvat_root_dir: Path = _CVAT_ROOT_DIR) -> "ProjectInfraConfig":
        return cls(
            project_name=_validate_project_name(config.getoption("--run-prefix")),
            cvat_root_dir=cvat_root_dir,
        )

    @classmethod
    def from_env(cls, *, cvat_root_dir: Path = _CVAT_ROOT_DIR) -> "ProjectInfraConfig":
        return cls(
            project_name=os.environ.get("CVAT_TEST_RUN_PREFIX", _DEFAULT_PROJECT_NAME),
            cvat_root_dir=cvat_root_dir,
        )


class RuntimeInfraConfig:
    _run_id: str | None = None
    _run_dir: Path | None = None

    @classmethod
    def initialize(cls, config) -> None:
        if cls._run_id and cls._run_dir:
            return

        runs_root_dir = _RUNS_ROOT_DIR
        runs_root_dir.mkdir(parents=True, exist_ok=True)

        run_prefix = cls.get_run_prefix_from_config(config)
        run_id = ""
        run_dir: Path | None = None

        if config.getoption("--parallel-child"):
            run_id, run_dir = cls._load_run_context_for_project(run_prefix)

        if not run_id:
            base_run_id = f"{run_prefix}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
            run_id = base_run_id
            suffix = 2
            while (runs_root_dir / run_id).exists():
                run_id = f"{base_run_id}-{suffix}"
                suffix += 1
            run_dir = runs_root_dir / run_id

        assert run_dir is not None
        run_dir.mkdir(parents=True, exist_ok=True)
        cls._run_id = run_id
        cls._run_dir = run_dir

    @classmethod
    def get_run_id(cls) -> str:
        if not cls._run_id:
            raise RuntimeError("RuntimeInfraConfig is not initialized")
        return cls._run_id

    @classmethod
    def get_run_dir(cls) -> Path:
        if cls._run_dir is None:
            raise RuntimeError("RuntimeInfraConfig is not initialized")
        return cls._run_dir

    @classmethod
    def get_runtime_root_dir(cls) -> Path:
        return _RUNTIME_ROOT_DIR

    @classmethod
    def get_runs_root_dir(cls) -> Path:
        return _RUNS_ROOT_DIR

    @classmethod
    def get_cvat_root_dir(cls) -> Path:
        return _CVAT_ROOT_DIR

    @classmethod
    def get_cvat_db_dir(cls) -> Path:
        return _CVAT_DB_DIR

    @classmethod
    def get_default_infra_profile(cls) -> str:
        return _DEFAULT_INFRA_PROFILE

    @classmethod
    def get_default_project_name(cls) -> str:
        return _DEFAULT_PROJECT_NAME

    @classmethod
    def get_default_infra_mode(cls) -> str:
        return _DEFAULT_INFRA_MODE

    @classmethod
    def get_infra_modes(cls) -> tuple[str, ...]:
        return _INFRA_MODES

    @classmethod
    def get_infra_profiles(cls) -> tuple[str, ...]:
        return _INFRA_PROFILES

    @classmethod
    def get_infra_profile_rank(cls, profile: str) -> int:
        return _INFRA_PROFILE_RANK[str(cls.parse_infra_profile(profile))]

    @classmethod
    def get_infra_profiles_desc(cls) -> tuple[str, ...]:
        return tuple(
            sorted(_INFRA_PROFILES, key=lambda profile: _INFRA_PROFILE_RANK[profile], reverse=True)
        )

    @classmethod
    def profile_supports(cls, required: str, lane_profile: str) -> bool:
        return cls.get_infra_profile_rank(lane_profile) >= cls.get_infra_profile_rank(required)

    @classmethod
    def get_required_marker_name(cls, profile: str) -> str:
        normalized = str(cls.parse_infra_profile(profile))
        return _INFRA_REQUIRED_MARKERS[normalized]

    @classmethod
    def get_required_marker_names(cls) -> tuple[str, ...]:
        return tuple(_INFRA_REQUIRED_MARKERS[profile] for profile in _INFRA_PROFILES)

    @classmethod
    def get_profile_dc_files(cls) -> dict[str, list[str]]:
        return {profile: list(files) for profile, files in _PROFILE_DC_FILES.items()}

    @classmethod
    def get_base_dc_files(cls, profile: str) -> list[str]:
        normalized = str(cls.parse_infra_profile(profile))
        return list(_PROFILE_BASE_DC_FILES[normalized])

    @classmethod
    def get_background_queue_families(cls, profile: str) -> tuple[str, ...]:
        normalized = str(cls.parse_infra_profile(profile))
        return tuple(_PROFILE_BACKGROUND_QUEUE_FAMILIES[normalized])

    @classmethod
    def get_background_queue_names(cls, profile: str) -> tuple[str, ...]:
        normalized = str(cls.parse_infra_profile(profile))
        queue_names: list[str] = []
        for family in _PROFILE_BACKGROUND_QUEUE_FAMILIES[normalized]:
            queue_names.extend(_BACKGROUND_QUEUE_FAMILIES[family])
        return tuple(dict.fromkeys(queue_names))

    @classmethod
    def profile_uses_background_jobs(cls, profile: str) -> bool:
        return bool(cls.get_background_queue_names(profile))

    @classmethod
    def get_clickhouse_init_script(cls) -> str:
        return _CLICKHOUSE_INIT_SCRIPT

    @classmethod
    def parse_infra_mode(cls, value: str) -> InfraMode:
        try:
            return InfraMode(value)
        except ValueError as ex:
            raise pytest.UsageError(
                f"Unknown infra mode {value!r}. Allowed: {', '.join(_INFRA_MODES)}"
            ) from ex

    @classmethod
    def parse_infra_profile(cls, value: str) -> InfraProfile:
        try:
            return InfraProfile(value)
        except ValueError as ex:
            raise pytest.UsageError(
                f"Unknown infra profile {value!r}. Allowed: {', '.join(_INFRA_PROFILES)}"
            ) from ex

    @classmethod
    def get_infra_profile(cls) -> str:
        profile = os.environ.get("CVAT_TEST_INFRA_PROFILE", _DEFAULT_INFRA_PROFILE)
        return str(cls.parse_infra_profile(profile))

    @classmethod
    def get_server_url(cls, endpoint: str, **kwargs) -> str:
        query = urlencode(kwargs)
        return f"{cls.get_base_url()}/{endpoint}" + (f"?{query}" if query else "")

    @classmethod
    def get_base_url(cls) -> str:
        return os.environ.get("CVAT_BASE_URL", "http://localhost:8080")

    @classmethod
    def get_run_prefix_from_config(cls, config) -> str:
        return _validate_project_name(config.getoption("--run-prefix"))

    @classmethod
    def get_project_config(
        cls, project_name_arg: str | None = None, *, cvat_root_dir: Path = _CVAT_ROOT_DIR
    ) -> ProjectInfraConfig:
        return ProjectInfraConfig(
            project_name=project_name_arg
            or os.environ.get("CVAT_TEST_RUN_PREFIX", _DEFAULT_PROJECT_NAME),
            cvat_root_dir=cvat_root_dir,
        )

    @classmethod
    def get_prefixed_container_name(
        cls, container: str, *, project_name_arg: str | None = None
    ) -> str:
        return cls.get_project_config(project_name_arg).prefixed_container_name(container)

    @classmethod
    def write_context_for_project(cls, project_name_arg: str) -> None:
        context_file = cls.context_file_for_project(project_name_arg)
        context_file.parent.mkdir(parents=True, exist_ok=True)

        payload = {
            "run_id": cls.get_run_id(),
            "run_dir": str(cls.get_run_dir()),
        }
        tmp_file = context_file.with_suffix(context_file.suffix + ".tmp")
        with open(tmp_file, "w") as f:
            json.dump(payload, f, indent=2, sort_keys=True)
        tmp_file.replace(context_file)

    @classmethod
    def context_file_for_project(cls, project_name_arg: str) -> Path:
        return cls.get_project_config(project_name_arg).runtime_dir / _RUN_CONTEXT_FILE_NAME

    @classmethod
    def _load_run_context_for_project(cls, project_name_arg: str) -> tuple[str, Path | None]:
        context_file = cls.context_file_for_project(project_name_arg)
        if not context_file.exists():
            return "", None

        try:
            with open(context_file) as f:
                context = json.load(f)
        except (json.JSONDecodeError, OSError, TypeError, ValueError):
            return "", None

        run_id = str(context.get("run_id", "")).strip()
        run_dir_raw = str(context.get("run_dir", "")).strip()
        if not run_id or not run_dir_raw:
            return "", None
        return run_id, Path(run_dir_raw)
