# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import argparse
import json
import logging
import os
import re
import socket
import tempfile
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from pathlib import Path
from urllib.parse import urlencode

import pytest

_LOGGER = logging.getLogger(__name__)

_CVAT_ROOT_DIR = next(dir.parent for dir in Path(__file__).parents if dir.name == "tests")
_DEFAULT_RUN_PREFIX = "test"
_RUNTIME_ROOT_DIR = Path(tempfile.gettempdir()) / "cvat_pytest_infra"
_DEFAULT_LOCAL_PORT_CONFIG = {
    "http_port": 8080,
    "logs_port": 8090,
    "db_port": 15432,
    "redis_inmem_port": 16379,
    "redis_ondisk_port": 16666,
    "minio_port": 9000,
    "minio_console_port": 9001,
}


class RuntimeMode(str, Enum):
    AUTO = "auto"
    UP = "up"
    DOWN = "down"
    BUILD = "build"
    DUMPDB = "dumpdb"

    def __str__(self) -> str:
        return self.value


def _validate_run_prefix(name: str) -> str:
    if not re.match(r"^[a-z0-9][a-z0-9_-]*$", name):
        raise pytest.UsageError(
            "Invalid run prefix. Use lowercase letters, digits, '_' or '-', and start with a letter or digit."
        )

    return name


@dataclass(frozen=True)
class RuntimeStateStore:
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
        return self.runtime_dir / "run-context.json"

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
class LocalRuntimeConfig:
    project_name: str
    cvat_root_dir: Path = _CVAT_ROOT_DIR
    runtime_root_dir: Path = _RUNTIME_ROOT_DIR

    @property
    def state_store(self) -> RuntimeStateStore:
        return RuntimeStateStore(name=self.project_name, runtime_root_dir=self.runtime_root_dir)

    @property
    def runtime_dir(self) -> Path:
        return self.state_store.runtime_dir

    @property
    def generated_compose_files(self) -> list[Path]:
        return [
            self.runtime_dir / "docker-compose.tests.yml",
            self.runtime_dir / "docker-compose.dev.yml",
        ]

    @property
    def host_http_port(self) -> int:
        state = self.load_state() or {}
        return int(state.get("http_port", _DEFAULT_LOCAL_PORT_CONFIG["http_port"]))

    @property
    def host_logs_port(self) -> int:
        state = self.load_state() or {}
        return int(state.get("logs_port", _DEFAULT_LOCAL_PORT_CONFIG["logs_port"]))

    @property
    def host_db_port(self) -> int:
        state = self.load_state() or {}
        return int(state.get("db_port", _DEFAULT_LOCAL_PORT_CONFIG["db_port"]))

    @property
    def host_redis_inmem_port(self) -> int:
        state = self.load_state() or {}
        return int(state.get("redis_inmem_port", _DEFAULT_LOCAL_PORT_CONFIG["redis_inmem_port"]))

    @property
    def host_redis_ondisk_port(self) -> int:
        state = self.load_state() or {}
        return int(state.get("redis_ondisk_port", _DEFAULT_LOCAL_PORT_CONFIG["redis_ondisk_port"]))

    @property
    def host_minio_port(self) -> int:
        state = self.load_state() or {}
        return int(state.get("minio_port", _DEFAULT_LOCAL_PORT_CONFIG["minio_port"]))

    @property
    def host_minio_console_port(self) -> int:
        state = self.load_state() or {}
        return int(
            state.get("minio_console_port", _DEFAULT_LOCAL_PORT_CONFIG["minio_console_port"])
        )

    def prefixed_container_name(self, container: str) -> str:
        return f"{self.project_name}_{container}_1"

    def resolve_port_config(
        self,
        *,
        default_project_name: str,
        used_ports: set[int],
        runtime_running: bool,
        running_port_config: dict | None = None,
    ) -> dict:
        state = self.load_state() or {}

        if (
            runtime_running
            and running_port_config
            and all(name in running_port_config for name in _DEFAULT_LOCAL_PORT_CONFIG)
        ):
            port_config = {
                name: int(running_port_config[name]) for name in _DEFAULT_LOCAL_PORT_CONFIG
            }
            self.save_state({**state, **port_config})
            return port_config

        if self.project_name == default_project_name:
            return {**_DEFAULT_LOCAL_PORT_CONFIG, **state}

        state_has_port_config = all(name in state for name in _DEFAULT_LOCAL_PORT_CONFIG)
        state_port_config_is_available = state_has_port_config and all(
            _local_port_is_available(int(state[name]), used_ports=used_ports)
            for name in _DEFAULT_LOCAL_PORT_CONFIG
        )

        if state_has_port_config and (runtime_running or state_port_config_is_available):
            return {name: int(state[name]) for name in _DEFAULT_LOCAL_PORT_CONFIG}

        port_config = _allocate_local_port_config(used_ports=used_ports)
        self.save_state({**state, **port_config})
        return port_config

    def load_state(self) -> dict | None:
        return self.state_store.load_state()

    def save_state(self, state: dict) -> None:
        self.state_store.save_state(state)

    def delete_state(self) -> None:
        self.state_store.delete_state()


def _can_bind_port(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        try:
            sock.bind(("127.0.0.1", port))
        except OSError:
            return False
    return True


def _local_port_is_available(port: int, *, used_ports: set[int]) -> bool:
    return port not in used_ports and _can_bind_port(port)


def _next_available_local_port(
    start_port: int, *, used_ports: set[int], reserved_ports: set[int]
) -> int:
    port = start_port
    while port in reserved_ports or not _local_port_is_available(port, used_ports=used_ports):
        port += 1
    reserved_ports.add(port)
    return port


def _allocate_local_port_config(*, used_ports: set[int]) -> dict:
    NON_DEFAULT_LOCAL_PORT_STARTS = {
        "http_port": 18080,
        "logs_port": 18090,
        "db_port": 15432,
        "redis_inmem_port": 16379,
        "redis_ondisk_port": 16666,
        "minio_port": 19000,
        "minio_console_port": 19001,
    }
    reserved_ports: set[int] = set()
    return {
        name: _next_available_local_port(
            start_port,
            used_ports=used_ports,
            reserved_ports=reserved_ports,
        )
        for name, start_port in NON_DEFAULT_LOCAL_PORT_STARTS.items()
    }


@dataclass(frozen=True)
class RuntimeRequest:
    platform: str
    runtime_mode: RuntimeMode
    run_prefix: str
    collect_only: bool
    cleanup: bool
    deprecation_warnings: tuple[str, ...]
    should_run_runtime_sanity_checks: bool


class RuntimeConfig:
    @classmethod
    def parse_request(cls, config) -> RuntimeRequest:
        request = getattr(config, "_cvat_runtime_request", None)
        if request is not None:
            return request

        LIFECYCLE_COMMAND_MODES = (
            RuntimeMode.UP,
            RuntimeMode.DOWN,
            RuntimeMode.BUILD,
            RuntimeMode.DUMPDB,
        )
        TESTLESS_LIFECYCLE_MODES = (
            RuntimeMode.UP,
            RuntimeMode.DOWN,
            RuntimeMode.BUILD,
            RuntimeMode.DUMPDB,
        )

        runtime_mode = cls.parse_runtime_mode(config.getoption("--infra"))
        explicit_runtime_mode = runtime_mode != RuntimeMode.AUTO
        args = list(getattr(config, "args", ()) or ())
        lifecycle_commands = tuple(str(mode) for mode in LIFECYCLE_COMMAND_MODES)
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
        rebuild = bool(config.getoption("--rebuild"))
        cleanup = bool(config.getoption("--cleanup"))
        dumpdb = bool(config.getoption("--dumpdb"))
        collect_only = bool(config.getoption("--collect-only"))
        platform = str(config.getoption("--platform"))
        skip_runtime_sanity_checks = bool(config.getoption("--skip-version-check"))
        run_prefix = _validate_run_prefix(config.getoption("--run-prefix"))

        deprecation_warnings = []
        if start_services:
            deprecation_warnings.append(
                "--start-services is deprecated; use pytest tests/python up"
            )
        if stop_services:
            deprecation_warnings.append(
                "--stop-services is deprecated; use pytest tests/python down"
            )
        if rebuild:
            deprecation_warnings.append("--rebuild is deprecated; use pytest tests/python build")
        if dumpdb:
            deprecation_warnings.append("--dumpdb is deprecated; use pytest tests/python dumpdb")

        if start_services and stop_services:
            raise pytest.UsageError("--start-services and --stop-services are incompatible")
        if no_services:
            raise pytest.UsageError(
                "--no-services is deprecated and unsupported by the pytest-managed runtime; "
                "use pytest tests/python with a managed test stack"
            )
        if runtime_mode != RuntimeMode.AUTO and any(
            (start_services, stop_services, rebuild, dumpdb)
        ):
            raise pytest.UsageError(
                "--start-services/--stop-services/--rebuild/--dumpdb cannot be combined "
                "with --infra modes or lifecycle commands"
            )
        if start_services:
            runtime_mode = RuntimeMode.UP
        elif stop_services:
            runtime_mode = RuntimeMode.DOWN
        elif rebuild:
            runtime_mode = RuntimeMode.BUILD
        elif dumpdb:
            runtime_mode = RuntimeMode.DUMPDB

        if platform == "kube" and any((start_services, stop_services, rebuild, dumpdb)):
            raise pytest.UsageError(
                "--platform=kube does not support deprecated local lifecycle flags"
            )
        if platform == "kube" and runtime_mode in {
            RuntimeMode.UP,
            RuntimeMode.DOWN,
            RuntimeMode.BUILD,
            RuntimeMode.DUMPDB,
        }:
            raise pytest.UsageError(
                "--infra=up/down/build/dumpdb are local-runtime lifecycle modes "
                "and cannot be used with --platform=kube"
            )
        if collect_only and any(
            (
                cleanup,
                runtime_mode
                in {
                    RuntimeMode.UP,
                    RuntimeMode.DOWN,
                    RuntimeMode.BUILD,
                    RuntimeMode.DUMPDB,
                },
            )
        ):
            raise pytest.UsageError(
                "--collect-only is not compatible with --cleanup/--dumpdb/--rebuild/"
                "--infra=up/down/build/dumpdb"
            )
        if platform == "kube" and cleanup:
            raise pytest.UsageError("--platform=kube does not support --cleanup/--dumpdb")

        should_run_runtime_sanity_checks = (
            not collect_only
            and runtime_mode not in TESTLESS_LIFECYCLE_MODES
            and not cleanup
            and not skip_runtime_sanity_checks
        )

        request = RuntimeRequest(
            platform=platform,
            runtime_mode=runtime_mode,
            run_prefix=run_prefix,
            collect_only=collect_only,
            cleanup=cleanup,
            deprecation_warnings=tuple(deprecation_warnings),
            should_run_runtime_sanity_checks=should_run_runtime_sanity_checks,
        )
        setattr(config, "_cvat_runtime_request", request)
        setattr(config, "_cvat_runtime_mode", request.runtime_mode)
        return request

    @classmethod
    def add_options(cls, parser):
        group = parser.getgroup("CVAT REST API testing options")
        group._addoption(
            "--cleanup",
            action="store_true",
            help=(
                "Delete files that was create by tests without running tests. "
                "(default: %(default)s)"
            ),
        )

        group._addoption(
            "--dumpdb",
            action="store_true",
            help=argparse.SUPPRESS,
        )

        group._addoption(
            "--platform",
            action="store",
            default="local",
            choices=("kube", "local"),
            help="Platform identifier - 'kube' or 'local'. (default: %(default)s)",
        )
        group._addoption(
            "--no-services",
            action="store_true",
            help=argparse.SUPPRESS,
        )
        group._addoption(
            "--run-prefix",
            action="store",
            default=cls.get_default_run_prefix(),
            help=(
                "Prefix used for a test run identity. "
                "It is used as docker compose project/container prefix and runtime state directory "
                "(default: 'test')."
            ),
        )
        group._addoption(
            "--infra",
            action="store",
            default=str(RuntimeMode.AUTO),
            choices=tuple(str(mode) for mode in RuntimeMode),
            help=(
                "Infrastructure mode: auto (default behavior), up (start services and exit), "
                "down (stop services and exit), build (rebuild cvat/server:dev and cvat/ui:dev "
                "and exit), dumpdb (update data.json from a running stack and exit)."
            ),
        )
        group._addoption(
            "--skip-version-check",
            action="store_true",
            default=False,
            help=(
                "Skip startup sanity check for sdk/cli/server image versions. "
                "(default: %(default)s)"
            ),
        )
        group._addoption("--start-services", action="store_true", help=argparse.SUPPRESS)
        group._addoption("--stop-services", action="store_true", help=argparse.SUPPRESS)
        group._addoption("--rebuild", action="store_true", help=argparse.SUPPRESS)
        return group

    @classmethod
    def get_cvat_root_dir(cls) -> Path:
        return _CVAT_ROOT_DIR

    @classmethod
    def get_cvat_db_dir(cls) -> Path:
        return _CVAT_ROOT_DIR / "tests/python/shared/assets/cvat_db"

    @classmethod
    def get_default_run_prefix(cls) -> str:
        return _DEFAULT_RUN_PREFIX

    @classmethod
    def get_clickhouse_init_script(cls) -> str:
        return "components/analytics/clickhouse/init.py"

    @classmethod
    def parse_runtime_mode(cls, value: str) -> RuntimeMode:
        try:
            return RuntimeMode(value)
        except ValueError as ex:
            allowed_modes = ", ".join(str(mode) for mode in RuntimeMode)
            raise pytest.UsageError(
                f"Unknown runtime mode {value!r}. Allowed: {allowed_modes}"
            ) from ex

    @classmethod
    def get_state_store(cls, name_arg: str | None = None) -> RuntimeStateStore:
        return RuntimeStateStore(
            name=_validate_run_prefix(
                name_arg or os.environ.get("CVAT_TEST_RUN_PREFIX", _DEFAULT_RUN_PREFIX)
            ),
        )

    @classmethod
    def get_local_runtime_config(
        cls, project_name_arg: str | None = None, *, cvat_root_dir: Path = _CVAT_ROOT_DIR
    ) -> LocalRuntimeConfig:
        return LocalRuntimeConfig(
            project_name=_validate_run_prefix(
                project_name_arg or os.environ.get("CVAT_TEST_RUN_PREFIX", _DEFAULT_RUN_PREFIX)
            ),
            cvat_root_dir=cvat_root_dir,
        )


class RuntimeContext:
    _run_id: str | None = None
    _run_dir: Path | None = None

    @classmethod
    def initialize(cls, config) -> None:
        if cls._run_id and cls._run_dir:
            return

        request = RuntimeConfig.parse_request(config)
        runs_root_dir = _RUNTIME_ROOT_DIR / "runs"
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
    def get_server_url(cls, endpoint: str, **kwargs) -> str:
        query = urlencode(kwargs)
        return f"{cls.get_base_url().rstrip('/')}/{endpoint}" + (f"?{query}" if query else "")

    @classmethod
    def get_base_url(cls) -> str:
        if base_url := os.environ.get("CVAT_BASE_URL"):
            return base_url

        # Helm CI rewrites the shared test config to cvat.local instead of localhost.
        from shared.utils import config as shared_config

        return getattr(shared_config, "BASE_URL", "http://localhost:8080")

    @classmethod
    def write_runtime_context(cls, runtime_name: str) -> None:
        context_file = RuntimeConfig.get_state_store(runtime_name).context_file
        context_file.parent.mkdir(parents=True, exist_ok=True)

        payload = {
            "run_id": cls.get_run_id(),
            "run_dir": str(cls.get_run_dir()),
        }
        tmp_file = context_file.with_suffix(context_file.suffix + ".tmp")
        with open(tmp_file, "w") as f:
            json.dump(payload, f, indent=2, sort_keys=True)
        tmp_file.replace(context_file)
