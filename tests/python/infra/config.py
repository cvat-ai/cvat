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
_DEFAULT_RUN_PREFIX = "test"
_DEFAULT_RUNTIME_MODE = "auto"
_RUN_PREFIX_PATTERN = re.compile(r"^[a-z0-9][a-z0-9_-]*$")
_RUNTIME_ROOT_DIR = Path(tempfile.gettempdir()) / "cvat_pytest_infra"
_RUNS_ROOT_DIR = _RUNTIME_ROOT_DIR / "runs"
_RUN_CONTEXT_FILE_NAME = "run-context.json"


class RuntimeMode(str, Enum):
    AUTO = "auto"
    UP = "up"
    DOWN = "down"
    RESTORE = "restore"
    REBUILD = "rebuild"
    REUSE = "reuse"

    def __str__(self) -> str:
        return self.value


_RUNTIME_MODES = tuple(str(mode) for mode in RuntimeMode)
_LIFECYCLE_COMMAND_MODES = (
    RuntimeMode.UP,
    RuntimeMode.DOWN,
    RuntimeMode.REUSE,
    RuntimeMode.RESTORE,
    RuntimeMode.REBUILD,
)
_TESTLESS_LIFECYCLE_MODES = (
    RuntimeMode.UP,
    RuntimeMode.DOWN,
    RuntimeMode.RESTORE,
    RuntimeMode.REBUILD,
)


def _validate_run_prefix(name: str) -> str:
    if not _RUN_PREFIX_PATTERN.match(name):
        raise pytest.UsageError(
            "Invalid run prefix. Use lowercase letters, digits, '_' or '-', and start with a letter or digit."
        )

    return name


@dataclass(frozen=True)
class RuntimeNamespace:
    name: str
    runtime_root_dir: Path = _RUNTIME_ROOT_DIR

    @property
    def runtime_dir(self) -> Path:
        return self.runtime_root_dir / self.name

    @property
    def state_file(self) -> Path:
        return self.runtime_dir / "state.json"

    @property
    def context_file(self) -> Path:
        return self.runtime_dir / _RUN_CONTEXT_FILE_NAME

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


@dataclass(frozen=True)
class LocalComposeStackConfig:
    project_name: str
    cvat_root_dir: Path = _CVAT_ROOT_DIR
    runtime_root_dir: Path = _RUNTIME_ROOT_DIR

    @property
    def namespace(self) -> RuntimeNamespace:
        return RuntimeNamespace(name=self.project_name, runtime_root_dir=self.runtime_root_dir)

    @property
    def runtime_dir(self) -> Path:
        return self.namespace.runtime_dir

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

    @property
    def host_minio_port(self) -> int:
        state = self.load_state() or {}
        return int(state.get("minio_port", 9000))

    @property
    def host_minio_console_port(self) -> int:
        state = self.load_state() or {}
        return int(state.get("minio_console_port", 9001))

    def prefixed_container_name(self, container: str) -> str:
        return f"{self.project_name}_{container}_1"

    def load_state(self) -> dict | None:
        return self.namespace.load_state()

    def save_state(self, state: dict) -> None:
        self.namespace.save_state(state)

    def delete_state(self) -> None:
        self.namespace.delete_state()


@dataclass(frozen=True)
class RuntimeRequest:
    platform: str
    runtime_mode: RuntimeMode
    run_prefix: str
    collect_only: bool
    cleanup: bool
    dumpdb: bool
    rebuild_images_before_start: bool
    no_services: bool
    external_base_url: str | None
    deprecation_warnings: tuple[str, ...]
    should_run_runtime_sanity_checks: bool


class RuntimeConfig:
    @classmethod
    def get_cvat_root_dir(cls) -> Path:
        return _CVAT_ROOT_DIR

    @classmethod
    def get_cvat_db_dir(cls) -> Path:
        return _CVAT_DB_DIR

    @classmethod
    def get_default_run_prefix(cls) -> str:
        return _DEFAULT_RUN_PREFIX

    @classmethod
    def get_default_runtime_mode(cls) -> str:
        return _DEFAULT_RUNTIME_MODE

    @classmethod
    def get_runtime_modes(cls) -> tuple[str, ...]:
        return _RUNTIME_MODES

    @classmethod
    def get_clickhouse_init_script(cls) -> str:
        return _CLICKHOUSE_INIT_SCRIPT

    @classmethod
    def parse_runtime_mode(cls, value: str) -> RuntimeMode:
        try:
            return RuntimeMode(value)
        except ValueError as ex:
            raise pytest.UsageError(
                f"Unknown runtime mode {value!r}. Allowed: {', '.join(_RUNTIME_MODES)}"
            ) from ex

    @classmethod
    def get_run_prefix_from_config(cls, config) -> str:
        return _validate_run_prefix(config.getoption("--run-prefix"))

    @classmethod
    def get_namespace(cls, name_arg: str | None = None) -> RuntimeNamespace:
        return RuntimeNamespace(
            name=_validate_run_prefix(
                name_arg or os.environ.get("CVAT_TEST_RUN_PREFIX", _DEFAULT_RUN_PREFIX)
            ),
        )

    @classmethod
    def get_local_compose_stack(
        cls, project_name_arg: str | None = None, *, cvat_root_dir: Path = _CVAT_ROOT_DIR
    ) -> LocalComposeStackConfig:
        return LocalComposeStackConfig(
            project_name=_validate_run_prefix(
                project_name_arg or os.environ.get("CVAT_TEST_RUN_PREFIX", _DEFAULT_RUN_PREFIX)
            ),
            cvat_root_dir=cvat_root_dir,
        )

    @classmethod
    def resolve_request(cls, config) -> RuntimeRequest:
        request = getattr(config, "_cvat_runtime_request", None)
        if request is not None:
            return request

        runtime_mode = cls.parse_runtime_mode(config.getoption("--infra"))
        explicit_runtime_mode = runtime_mode != RuntimeMode.AUTO
        args = list(getattr(config, "args", ()) or ())
        lifecycle_commands = tuple(str(mode) for mode in _LIFECYCLE_COMMAND_MODES)
        requested_lifecycle_commands = [arg for arg in args if arg in lifecycle_commands]

        if len(requested_lifecycle_commands) > 1:
            raise pytest.UsageError(
                "Only one lifecycle command can be used at a time: "
                f"{', '.join(requested_lifecycle_commands)}"
            )
        if explicit_runtime_mode and requested_lifecycle_commands:
            raise pytest.UsageError(
                f"--infra={runtime_mode} cannot be combined with lifecycle command "
                f"{requested_lifecycle_commands[0]}"
            )
        if requested_lifecycle_commands:
            args.remove(requested_lifecycle_commands[0])
            if hasattr(config, "args"):
                config.args[:] = args
            runtime_mode = cls.parse_runtime_mode(requested_lifecycle_commands[0])

        no_services = bool(config.getoption("--no-services"))
        start_services = bool(config.getoption("--start-services"))
        stop_services = bool(config.getoption("--stop-services"))
        rebuild_images_before_start = bool(config.getoption("--rebuild"))
        cleanup = bool(config.getoption("--cleanup"))
        dumpdb = bool(config.getoption("--dumpdb"))
        collect_only = bool(config.getoption("--collect-only"))
        platform = str(config.getoption("--platform"))
        skip_runtime_sanity_checks = bool(config.getoption("--skip-version-check"))
        run_prefix = cls.get_run_prefix_from_config(config)

        deprecation_warnings = []
        if start_services:
            deprecation_warnings.append("--start-services is deprecated; use --infra=up")
        if stop_services:
            deprecation_warnings.append("--stop-services is deprecated; use --infra=down")
        if rebuild_images_before_start:
            deprecation_warnings.append("--rebuild is deprecated; use --infra=rebuild")

        if start_services and stop_services:
            raise pytest.UsageError("--start-services and --stop-services are incompatible")
        if runtime_mode != RuntimeMode.AUTO and any((start_services, stop_services)):
            raise pytest.UsageError(
                "--start-services/--stop-services cannot be combined with --infra modes "
                "or lifecycle commands"
            )
        if start_services:
            runtime_mode = RuntimeMode.UP
        elif stop_services:
            runtime_mode = RuntimeMode.DOWN

        if no_services:
            if runtime_mode not in {RuntimeMode.AUTO, RuntimeMode.REUSE}:
                raise pytest.UsageError("--no-services is compatible only with --infra=auto/reuse")
            runtime_mode = RuntimeMode.REUSE

        if platform == "kube" and any((start_services, stop_services, rebuild_images_before_start)):
            raise pytest.UsageError(
                "--platform=kube does not support deprecated local lifecycle flags"
            )
        if platform == "kube" and runtime_mode in {
            RuntimeMode.UP,
            RuntimeMode.DOWN,
            RuntimeMode.RESTORE,
            RuntimeMode.REBUILD,
        }:
            raise pytest.UsageError(
                "--infra=up/down/restore/rebuild are local-runtime lifecycle modes "
                "and cannot be used with --platform=kube"
            )
        if collect_only and any(
            (
                cleanup,
                dumpdb,
                rebuild_images_before_start,
                runtime_mode
                in {
                    RuntimeMode.UP,
                    RuntimeMode.DOWN,
                    RuntimeMode.RESTORE,
                    RuntimeMode.REBUILD,
                },
            )
        ):
            raise pytest.UsageError(
                "--collect-only is not compatible with --cleanup/--dumpdb/--rebuild/"
                "--infra=up/down/restore/rebuild"
            )
        if platform == "kube" and any((cleanup, dumpdb)):
            raise pytest.UsageError("--platform=kube does not support --cleanup/--dumpdb")

        external_base_url = None
        if runtime_mode == RuntimeMode.REUSE or no_services:
            external_base_url = os.environ.get("CVAT_BASE_URL")

        should_run_runtime_sanity_checks = (
            not collect_only
            and runtime_mode not in _TESTLESS_LIFECYCLE_MODES
            and not any((cleanup, dumpdb))
            and not skip_runtime_sanity_checks
        )

        request = RuntimeRequest(
            platform=platform,
            runtime_mode=runtime_mode,
            run_prefix=run_prefix,
            collect_only=collect_only,
            cleanup=cleanup,
            dumpdb=dumpdb,
            rebuild_images_before_start=rebuild_images_before_start,
            no_services=no_services,
            external_base_url=external_base_url,
            deprecation_warnings=tuple(deprecation_warnings),
            should_run_runtime_sanity_checks=should_run_runtime_sanity_checks,
        )
        setattr(config, "_cvat_runtime_request", request)
        setattr(config, "_cvat_runtime_mode", request.runtime_mode)
        return request


class RuntimeContext:
    _run_id: str | None = None
    _run_dir: Path | None = None

    @classmethod
    def initialize(cls, config) -> None:
        if cls._run_id and cls._run_dir:
            return

        request = RuntimeConfig.resolve_request(config)
        runs_root_dir = _RUNS_ROOT_DIR
        runs_root_dir.mkdir(parents=True, exist_ok=True)

        base_run_id = f"{request.run_prefix}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        run_id = base_run_id
        suffix = 2
        while (runs_root_dir / run_id).exists():
            run_id = f"{base_run_id}-{suffix}"
            suffix += 1

        run_dir = runs_root_dir / run_id
        run_dir.mkdir(parents=True, exist_ok=True)
        cls._run_id = run_id
        cls._run_dir = run_dir

    @classmethod
    def get_run_id(cls) -> str:
        if not cls._run_id:
            raise RuntimeError("RuntimeContext is not initialized")
        return cls._run_id

    @classmethod
    def get_run_dir(cls) -> Path:
        if cls._run_dir is None:
            raise RuntimeError("RuntimeContext is not initialized")
        return cls._run_dir

    @classmethod
    def get_runtime_root_dir(cls) -> Path:
        return _RUNTIME_ROOT_DIR

    @classmethod
    def get_runs_root_dir(cls) -> Path:
        return _RUNS_ROOT_DIR

    @classmethod
    def get_server_url(cls, endpoint: str, **kwargs) -> str:
        query = urlencode(kwargs)
        return f"{cls.get_base_url().rstrip('/')}/{endpoint}" + (f"?{query}" if query else "")

    @classmethod
    def get_base_url(cls) -> str:
        return os.environ.get("CVAT_BASE_URL", "http://localhost:8080")

    @classmethod
    def get_namespace(cls, name_arg: str | None = None) -> RuntimeNamespace:
        return RuntimeConfig.get_namespace(name_arg)

    @classmethod
    def write_namespace_context(cls, namespace_name: str) -> None:
        context_file = cls.get_namespace(namespace_name).context_file
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
    def context_file_for_namespace(cls, namespace_name: str) -> Path:
        return cls.get_namespace(namespace_name).context_file
