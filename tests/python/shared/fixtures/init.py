# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import logging
import argparse
import json
import os
import re
import sys
import socket
import errno
import shlex
import tempfile
from dataclasses import dataclass
from enum import Enum
from http import HTTPStatus
from pathlib import Path
from subprocess import PIPE, CalledProcessError, run
from time import sleep
from urllib.parse import urlencode, urlparse

import pytest
import requests
import yaml
from shared.fixtures.debug_runtime import (
    DEBUG_SERVICE_ENV_PORT,
    add_pytest_options as add_debug_pytest_options,
    apply_compose_debug,
    maybe_wait_for_vscode_attach,
    parse_debug_services,
    resolve_debug_port_config,
)
from shared.fixtures.parallel_runtime import (
    add_pytest_options as add_parallel_pytest_options,
    parse_parallel_profiles,
    run_parallel_infra_mode,
    run_parallel_lanes,
)

logger = logging.getLogger(__name__)

CVAT_ROOT_DIR = next(dir.parent for dir in Path(__file__).parents if dir.name == "tests")
CVAT_DB_DIR = CVAT_ROOT_DIR / "tests/python/shared/assets/cvat_db"
CLICKHOUSE_INIT_SCRIPT = "components/analytics/clickhouse/init.py"
DEFAULT_PROJECT_NAME = "test"
PROJECT_NAME_PATTERN = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_.-]*$")
DEFAULT_INFRA_MODE = "auto"
DEFAULT_INFRA_PROFILE = "full"
BASE_DC_FILES = [
    "tests/docker-compose.file_share.yml",
    "tests/docker-compose.minio.yml",
    "tests/docker-compose.pat_settings.yml",
    "tests/docker-compose.test_servers.yml",
]
PROFILE_DC_FILES = {
    "core": ["tests/docker-compose.core.profile.yml"],
    "extended": ["tests/docker-compose.extended.profile.yml"],
    "full": [],
}
RUNTIME_ROOT_DIR = Path(tempfile.gettempdir()) / "cvat_pytest_infra"
INFRA_MODES = ("auto", "up", "down", "external")
INFRA_PROFILES = tuple(PROFILE_DC_FILES.keys())


def _base_url() -> str:
    return os.environ.get("CVAT_BASE_URL", "http://localhost:8080")


def _get_server_url(endpoint: str, **kwargs) -> str:
    query = urlencode(kwargs)
    return f"{_base_url()}/{endpoint}" + (f"?{query}" if query else "")


def _infra_profile() -> str:
    return os.environ.get("CVAT_TEST_INFRA_PROFILE", DEFAULT_INFRA_PROFILE)


class Container(str, Enum):
    DB = "cvat_db"
    SERVER = "cvat_server"
    WORKER_ANNOTATION = "cvat_worker_annotation"
    WORKER_IMPORT = "cvat_worker_import"
    WORKER_EXPORT = "cvat_worker_export"
    WORKER_QUALITY_REPORTS = "cvat_worker_quality_reports"
    WORKER_WEBHOOKS = "cvat_worker_webhooks"
    WORKER_UTILS = "cvat_worker_utils"

    def __str__(self):
        return self.value

    @classmethod
    def covered(cls):
        return [item.value for item in cls if item != cls.DB]


def _project_name() -> str:
    return os.environ.get("CVAT_TEST_RUN_PREFIX", DEFAULT_PROJECT_NAME)


def _validate_project_name(name: str) -> str:
    if not PROJECT_NAME_PATTERN.match(name):
        raise pytest.UsageError(
            "Invalid project name. Use letters, digits, '_', '-', '.' and start with a letter or digit."
        )

    return name


def _run_prefix_from_config(config) -> str:
    return _validate_project_name(config.getoption("--run-prefix"))


@dataclass(frozen=True)
class InfraProjectConfig:
    project_name: str
    cvat_root_dir: Path = CVAT_ROOT_DIR
    runtime_root_dir: Path = RUNTIME_ROOT_DIR

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
        return self.generated_compose_files + [self.cvat_root_dir / f for f in BASE_DC_FILES]

    @property
    def host_http_port(self) -> int:
        return int(os.environ.get("CVAT_TEST_HTTP_PORT", "8080"))

    @property
    def host_logs_port(self) -> int:
        return int(os.environ.get("CVAT_TEST_LOGS_PORT", "8090"))

    def prefixed_container_name(self, container: str) -> str:
        return f"{self.project_name}_{container}_1"

    def load_state(self) -> dict | None:
        if not self.state_file.exists():
            return None
        try:
            with open(self.state_file) as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            logger.warning("Ignoring unreadable runtime state file: %s", self.state_file)
            return None

    def save_state(self, state: dict) -> None:
        self.state_file.parent.mkdir(parents=True, exist_ok=True)
        tmp_state_file = self.state_file.with_suffix(".state.tmp")
        with open(tmp_state_file, "w") as f:
            json.dump(state, f, indent=2, sort_keys=True)
        os.replace(tmp_state_file, self.state_file)

    def delete_state(self) -> None:
        self.state_file.unlink(missing_ok=True)


def _project_config(project_name: str | None = None, *, cvat_root_dir: Path = CVAT_ROOT_DIR) -> InfraProjectConfig:
    return InfraProjectConfig(project_name=project_name or _project_name(), cvat_root_dir=cvat_root_dir)


def _prefixed_container_name(container: str) -> str:
    return _project_config().prefixed_container_name(container)


def _is_port_free(port: int) -> bool:
    """
    Check whether a TCP port can be bound locally.

    This avoids external tools and works reliably for our use-case when
    selecting host ports for docker-compose.
    """

    targets: list[tuple[int, tuple]] = [(socket.AF_INET, ("", port))]
    if socket.has_ipv6:
        targets.append((socket.AF_INET6, ("::", port, 0, 0)))

    for family, address in targets:
        try:
            with socket.socket(family, socket.SOCK_STREAM) as sock:
                sock.bind(address)
        except OSError as exc:
            if exc.errno in (errno.EADDRINUSE, errno.EACCES):
                return False
            if exc.errno in (errno.EADDRNOTAVAIL, errno.EAFNOSUPPORT):
                continue
            logger.debug(
                "Unexpected error while probing port %s on %s: %s",
                port,
                "ipv6" if family == socket.AF_INET6 else "ipv4",
                exc,
            )
            continue

    return True


def _pick_free_port(start: int, used_ports: set[int]) -> int:
    for port in range(start, 65535):
        if port not in used_ports and _is_port_free(port):
            used_ports.add(port)
            return port

    raise pytest.UsageError(f"Could not find a free TCP port starting from {start}")


def _resolve_port_config(project_cfg: InfraProjectConfig) -> dict:
    state = project_cfg.load_state() or {}

    env_http = os.environ.get("CVAT_TEST_HTTP_PORT")
    env_logs = os.environ.get("CVAT_TEST_LOGS_PORT")
    env_minio = os.environ.get("CVAT_TEST_MINIO_PORT")
    env_minio_console = os.environ.get("CVAT_TEST_MINIO_CONSOLE_PORT")

    if project_cfg.project_name == DEFAULT_PROJECT_NAME:
        return {
            "http_port": int(env_http or state.get("http_port", 8080)),
            "logs_port": int(env_logs or state.get("logs_port", 8090)),
            "minio_port": int(env_minio or state.get("minio_port", 9000)),
            "minio_console_port": int(env_minio_console or state.get("minio_console_port", 9001)),
        }

    project_running = _project_containers_running(project_cfg.project_name)
    project_ports = _project_host_ports(project_cfg.project_name) if project_running else set()
    running_service_ports = (
        _project_service_port_map(project_cfg.project_name) if project_running else {}
    )

    if project_running:
        traefik_ports = running_service_ports.get("traefik", {})
        minio_ports = running_service_ports.get("minio", {})
        return {
            "http_port": int(env_http)
            if env_http
            else int(traefik_ports.get(8080, state.get("http_port", 18080))),
            "logs_port": int(env_logs)
            if env_logs
            else int(traefik_ports.get(8090, state.get("logs_port", 18090))),
            "minio_port": int(env_minio)
            if env_minio
            else int(minio_ports.get(9000, state.get("minio_port", 19000))),
            "minio_console_port": int(env_minio_console)
            if env_minio_console
            else int(minio_ports.get(9001, state.get("minio_console_port", 19001))),
        }

    def _state_port(name: str, default_start: int, used_ports: set[int]) -> int:
        value = state.get(name)
        if value is None:
            return _pick_free_port(default_start, used_ports)

        port = int(value)
        if _is_port_free(port) or (project_running and port in project_ports):
            used_ports.add(port)
            return port

        return _pick_free_port(default_start, used_ports)

    used_ports: set[int] = set()

    return {
        "http_port": int(env_http) if env_http else _state_port("http_port", 18080, used_ports),
        "logs_port": int(env_logs) if env_logs else _state_port("logs_port", 18090, used_ports),
        "minio_port": int(env_minio) if env_minio else _state_port("minio_port", 19000, used_ports),
        "minio_console_port": int(
            env_minio_console
            if env_minio_console
            else _state_port("minio_console_port", 19001, used_ports)
        ),
    }


def _project_containers_running(project_name: str) -> bool:
    containers = set(running_containers())
    expected = {
        f"{project_name}_cvat_server_1",
        f"{project_name}_cvat_db_1",
        f"{project_name}_traefik_1",
    }
    return expected.issubset(containers)


def _project_host_ports(project_name: str) -> set[int]:
    """
    Return host ports published by currently running containers from the project.
    """
    ports: set[int] = set()
    output, _ = _run(["docker", "ps", "--format", "{{.Names}} {{.Ports}}"])
    for line in output.splitlines():
        if not line.startswith(f"{project_name}_"):
            continue
        for match in re.finditer(r":(\d+)->", line):
            ports.add(int(match.group(1)))

    return ports


def _project_service_port_map(project_name: str) -> dict[str, dict[int, int]]:
    """
    Return published host ports grouped by service for running project containers.
    """
    service_ports: dict[str, dict[int, int]] = {}
    output, _ = _run(["docker", "ps", "--format", "{{.Names}} {{.Ports}}"])
    for line in output.splitlines():
        if not line.startswith(f"{project_name}_"):
            continue

        parts = line.split(maxsplit=1)
        if not parts:
            continue

        container_name = parts[0]
        ports_part = parts[1] if len(parts) > 1 else ""
        prefix = f"{project_name}_"
        suffix = "_1"
        if not (container_name.startswith(prefix) and container_name.endswith(suffix)):
            continue

        service = container_name[len(prefix) : -len(suffix)]
        port_map = service_ports.setdefault(service, {})
        for match in re.finditer(r":(\d+)->(\d+)/tcp", ports_part):
            host_port = int(match.group(1))
            container_port = int(match.group(2))
            port_map[container_port] = host_port

    return service_ports


def pytest_addoption(parser):
    group = parser.getgroup("CVAT REST API testing options")
    group._addoption(
        "--rebuild",
        action="store_true",
        help="Rebuild CVAT images and then start containers. (default: %(default)s)",
    )

    group._addoption(
        "--cleanup",
        action="store_true",
        help="Delete files that was create by tests without running tests. (default: %(default)s)",
    )

    group._addoption(
        "--dumpdb",
        action="store_true",
        help="Update data.json without running tests. (default: %(default)s)",
    )

    group._addoption(
        "--platform",
        action="store",
        default="local",
        choices=("kube", "local"),
        help="Platform identifier - 'kube' or 'local'. (default: %(default)s)",
    )
    group._addoption(
        "--run-prefix",
        action="store",
        default=os.environ.get("CVAT_TEST_RUN_PREFIX", DEFAULT_PROJECT_NAME),
        help=(
            "Prefix used for a test run identity. "
            "It is used as docker compose project/container prefix and runtime state namespace "
            "(default: env CVAT_TEST_RUN_PREFIX or 'test')."
        ),
    )
    group._addoption(
        "--infra",
        action="store",
        default=DEFAULT_INFRA_MODE,
        choices=INFRA_MODES,
        help=(
            "Infrastructure mode: auto (default behavior), up (start services and exit), "
            "down (stop services and exit), external (never manage docker services)."
        ),
    )
    group._addoption(
        "--base-url",
        action="store",
        default=os.environ.get("CVAT_BASE_URL"),
        help="Base URL used in --infra=external mode.",
    )
    group._addoption(
        "--infra-profile",
        action="store",
        default=os.environ.get("CVAT_TEST_INFRA_PROFILE", DEFAULT_INFRA_PROFILE),
        choices=INFRA_PROFILES,
        help=(
            "Compose profile for local docker infrastructure. "
            "'core' starts only mandatory services, 'extended' adds worker services, "
            "'full' keeps all services."
        ),
    )
    add_parallel_pytest_options(group)
    add_debug_pytest_options(group)
    group._addoption("--test-http-port", action="store", default=None, type=int, help=argparse.SUPPRESS)
    group._addoption("--test-logs-port", action="store", default=None, type=int, help=argparse.SUPPRESS)
    group._addoption("--test-minio-port", action="store", default=None, type=int, help=argparse.SUPPRESS)
    group._addoption(
        "--test-minio-console-port", action="store", default=None, type=int, help=argparse.SUPPRESS
    )
def pytest_report_header(config):
    return f"CVAT pytest runtime directory: {RUNTIME_ROOT_DIR}"

def pytest_runtestloop(session):
    config = session.config
    try:
        profiles = parse_parallel_profiles(config.getoption("--parallel"), INFRA_PROFILES)
    except ValueError as ex:
        raise pytest.UsageError(str(ex)) from ex
    if not profiles or config.getoption("--parallel-child"):
        return None

    run_parallel_lanes(
        config=config,
        session=session,
        profiles=profiles,
        run_prefix=_run_prefix_from_config(config),
        pick_free_port=_pick_free_port,
        runtime_dir_for_project=lambda project_name: _project_config(project_name).runtime_dir,
        run_command=lambda cmd, capture: _run(cmd, capture_output=capture),
    )
    return True


def _run(command, capture_output=True):
    _command = command.split() if isinstance(command, str) else command
    logger.debug(f"Executing a command: {_command}")

    if capture_output:
        proc = run(_command, check=True, stdout=PIPE, stderr=PIPE)  # nosec
        stdout = proc.stdout.decode()
        stderr = proc.stderr.decode()
    else:
        proc = run(_command, check=True)  # nosec
        stdout = ""
        stderr = ""

    if stdout:
        logger.debug(f"Output (stdout): {stdout}")
    if stderr:
        logger.debug(f"Output (stderr): {stderr}")

    return stdout, stderr


def _kube_get_pod_name(label_filter):
    return _run(f"kubectl get pods -l {label_filter} -o jsonpath={{.items[0].metadata.name}}")[0]


def _kube_get_server_pod_name():
    return _kube_get_pod_name("component=server")


def _kube_get_db_pod_name():
    return _kube_get_pod_name("app.kubernetes.io/name=postgresql")


def _kube_get_clichouse_pod_name():
    return _kube_get_pod_name("app.kubernetes.io/name=clickhouse")


def _kube_get_redis_inmem_pod_name():
    return _kube_get_pod_name("app.kubernetes.io/name=redis")


def _kube_get_redis_ondisk_pod_name():
    return _kube_get_pod_name("app.kubernetes.io/name=cvat,tier=kvrocks")


def docker_cp(source, target):
    _run(f"docker container cp {source} {target}")


def kube_cp(source, target):
    _run(f"kubectl cp {source} {target}")


def docker_exec(container, command, capture_output=True):
    return _run(
        f"docker exec -u root {_prefixed_container_name(container)} {command}", capture_output
    )[0]


def docker_exec_cvat(command: list[str] | str):
    base = f"docker exec {_prefixed_container_name('cvat_server')}"
    _command = f"{base} {command}" if isinstance(command, str) else base.split() + command
    return _run(_command)[0]


def kube_exec_cvat(command: list[str] | str):
    pod_name = _kube_get_server_pod_name()
    base = f"kubectl exec {pod_name} --"
    _command = f"{base} {command}" if isinstance(command, str) else base.split() + command
    return _run(_command)[0]


def container_exec_cvat(request, command: list[str] | str):
    platform = request.config.getoption("--platform")
    if platform == "local":
        return docker_exec_cvat(command)
    elif platform == "kube":
        return kube_exec_cvat(command)
    else:
        assert False, "unknown platform"


def kube_exec_cvat_db(command):
    pod_name = _kube_get_db_pod_name()
    _run(["kubectl", "exec", pod_name, "--"] + command)


def docker_exec_clickhouse_db(command):
    _run(["docker", "exec", _prefixed_container_name("cvat_clickhouse")] + command)


def kube_exec_clickhouse_db(command):
    pod_name = _kube_get_clichouse_pod_name()
    _run(["kubectl", "exec", pod_name, "--"] + command)


def docker_exec_redis_inmem(command):
    return _run(["docker", "exec", _prefixed_container_name("cvat_redis_inmem")] + command)[0]


def kube_exec_redis_inmem(command):
    pod_name = _kube_get_redis_inmem_pod_name()
    return _run(["kubectl", "exec", pod_name, "--"] + command)[0]


def docker_exec_redis_ondisk(command):
    _run(["docker", "exec", _prefixed_container_name("cvat_redis_ondisk")] + command)


def kube_exec_redis_ondisk(command):
    pod_name = _kube_get_redis_ondisk_pod_name()
    _run(["kubectl", "exec", pod_name, "--"] + command)


def docker_restore_db():
    docker_exec(
        Container.DB, "psql -U root -d postgres -v from=test_db -v to=cvat -f /tmp/restore.sql"
    )


def kube_restore_db():
    kube_exec_cvat_db(
        [
            "/bin/sh",
            "-c",
            "PGPASSWORD=cvat_postgresql_postgres psql -U postgres -d postgres -v from=test_db -v to=cvat -f /tmp/restore.sql",
        ]
    )


def docker_restore_clickhouse_db():
    docker_exec_cvat(
        [
            "/bin/sh",
            "-c",
            f'python "{CLICKHOUSE_INIT_SCRIPT}" --clear',
        ]
    )


def kube_restore_clickhouse_db():
    kube_exec_cvat(
        [
            "/bin/sh",
            "-c",
            f'python "{CLICKHOUSE_INIT_SCRIPT}" --clear',
        ]
    )


def _get_redis_inmem_keys_to_keep():
    return (
        "rq:worker:",
        "rq:workers",
        "rq:scheduler_instance:",
        "rq:queues:",
        "cvat:applied_migrations",
        "cvat:applied_migration:",
    )


def docker_restore_redis_inmem():
    docker_exec_redis_inmem(
        [
            "sh",
            "-c",
            # Redis in-memory DB layout in CVAT:
            # - DB 0: RQ metadata/worker queues (keep a small allowlist of runtime keys)
            # - DB 1: Django cache/throttle counters (must be fully reset between tests)
            # If DB 1 is not cleared, auth/about requests can be throttled (HTTP 429)
            # in later tests due to stale counters from previous runs.
            'redis-cli -e -n 0 --scan --pattern "*" |'
            'grep -v "' + r"\|".join(_get_redis_inmem_keys_to_keep()) + '" |'
            "xargs -r redis-cli -e -n 0 del && "
            "redis-cli -e -n 1 flushdb",
        ]
    )


def kube_restore_redis_inmem():
    kube_exec_redis_inmem(
        [
            "sh",
            "-c",
            # Keep the same semantics as the docker helper above: preserve required
            # RQ keys in DB 0, and fully reset cache/throttle state in DB 1.
            'export REDISCLI_AUTH="${REDIS_PASSWORD}" && '
            'redis-cli -e -n 0 --scan --pattern "*" | '
            'grep -v "' + r"\|".join(_get_redis_inmem_keys_to_keep()) + '" | '
            "xargs -r redis-cli -e -n 0 del && "
            "redis-cli -e -n 1 flushdb",
        ]
    )


def docker_restore_redis_ondisk():
    docker_exec_redis_ondisk(["redis-cli", "-e", "-p", "6666", "flushall"])


def kube_restore_redis_ondisk():
    kube_exec_redis_ondisk(
        ["sh", "-c", 'REDISCLI_AUTH="${CVAT_REDIS_ONDISK_PASSWORD}" redis-cli -e -p 6666 flushall']
    )


def running_containers():
    stdout, _ = _run("docker ps --format {{.Names}}")
    return [cn for cn in stdout.split("\n") if cn]


def dump_db():
    if _prefixed_container_name("cvat_server") not in running_containers():
        pytest.exit("CVAT is not running")
    with open(CVAT_DB_DIR / "data.json", "w") as f:
        try:
            run(  # nosec
                (
                    f"docker exec {_prefixed_container_name('cvat_server')} \
                    python manage.py dumpdata \
                    --indent 2 --natural-foreign \
                    --exclude=auth.permission --exclude=contenttypes"
                ).split(),
                stdout=f,
                check=True,
            )
        except CalledProcessError:
            pytest.exit("Database dump failed.\n")


def create_compose_files(
    container_name_files: list[Path], cvat_root_dir: Path, project_cfg: InfraProjectConfig
):
    state = project_cfg.load_state() or {}
    debug_state = state.get("debug", {})

    def _namespace_traefik_labels(service_config: dict) -> None:
        labels = service_config.get("labels")
        if not isinstance(labels, dict):
            return

        router_service_names = {"cvat", "cvat-ui"}
        suffix = project_cfg.project_name
        replacement = {name: f"{name}-{suffix}" for name in router_service_names}

        updated_labels: dict[str, str] = {}
        for key, value in labels.items():
            new_key = key
            for kind in ("routers", "services"):
                prefix = f"traefik.http.{kind}."
                if new_key.startswith(prefix):
                    parts = new_key.split(".")
                    name_idx = 3
                    if len(parts) > name_idx and parts[name_idx] in replacement:
                        parts[name_idx] = replacement[parts[name_idx]]
                        new_key = ".".join(parts)
                    break

            if (
                new_key.startswith("traefik.http.routers.")
                and new_key.endswith(".service")
                and isinstance(value, str)
                and value in replacement
            ):
                value = replacement[value]

            updated_labels[new_key] = value

        for old_name, new_name in replacement.items():
            rule_key = f"traefik.http.routers.{new_name}.rule"
            service_key = f"traefik.http.routers.{new_name}.service"
            if rule_key in updated_labels and service_key not in updated_labels:
                updated_labels[service_key] = new_name

        service_config["labels"] = updated_labels

    for filename in container_name_files:
        source_name = "docker-compose.yml"
        if ".dev." in filename.name:
            source_name = "docker-compose.dev.yml"

        filename.parent.mkdir(parents=True, exist_ok=True)
        with (
            open(cvat_root_dir / source_name, "r") as dcf,
            open(filename, "w") as ndcf,
        ):
            dc_config = yaml.safe_load(dcf)
            is_dev_compose = ".dev." in filename.name

            for service_name, service_config in dc_config["services"].items():
                service_config.pop("container_name", None)
                if is_dev_compose:
                    service_config.pop("ports", None)

                if not is_dev_compose and service_name in (Container.SERVER, Container.WORKER_UTILS):
                    service_env = service_config["environment"]
                    service_env["DJANGO_SETTINGS_MODULE"] = "cvat.settings.testing_rest"

                if not is_dev_compose and service_name in Container.covered():
                    service_env = service_config["environment"]
                    service_env["COVERAGE_PROCESS_START"] = ".coveragerc"
                    service_config["volumes"].append(
                        "./tests/python/.coveragerc:/home/django/.coveragerc"
                    )
                if service_name == "traefik":
                    service_config["ports"] = [
                        f"{project_cfg.host_http_port}:8080",
                        f"{project_cfg.host_logs_port}:8090",
                    ]
                    service_env = service_config["environment"]
                    service_env["TRAEFIK_PROVIDERS_DOCKER_NETWORK"] = f"{project_cfg.project_name}_cvat"
                    service_env["TRAEFIK_PROVIDERS_DOCKER_CONSTRAINTS"] = (
                        f"Label(`com.docker.compose.project`,`{project_cfg.project_name}`)"
                    )

                apply_compose_debug(
                    service_name, service_config, is_dev=is_dev_compose, debug_state=debug_state
                )
                _namespace_traefik_labels(service_config)

            yaml.dump(dc_config, ndcf)


def delete_compose_files(container_name_files: list[Path]):
    for filename in container_name_files:
        filename.unlink(missing_ok=True)


def wait_for_services(num_secs: int = 300) -> None:
    for i in range(num_secs):
        logger.debug(f"waiting for the server to load ... ({i})")

        try:
            response = requests.get(_get_server_url("api/server/health/", format="json"))

            statuses = response.json()
            logger.debug(f"server status: \n{statuses}")

            if response.status_code == HTTPStatus.OK:
                logger.debug("the server has finished loading!")
                return

        except Exception as e:
            logger.debug(f"an error occurred during the server status checking: {e}")

        sleep(1)

    raise Exception(
        f"Failed to reach the server during {num_secs} seconds. Please check the configuration."
    )


def wait_for_auth_login_ready(num_secs: int = 180) -> None:
    """
    Ensure the auth login endpoint is responsive before tests start.

    In practice, /api/server/health may return 200 while /api/auth/login can still
    return intermittent 5xx/504 during warm-up, especially with multiple CVAT
    stacks running simultaneously.
    """

    login_url = _get_server_url("api/auth/login")
    payload = {
        "username": "admin2",
        "password": os.environ.get("CVAT_TEST_USER_PASS", "!Q@W#E$R"),
    }

    for i in range(num_secs):
        logger.debug(f"waiting for login endpoint to become ready ... ({i})")
        try:
            response = requests.post(login_url, json=payload, timeout=5)
            logger.debug("login readiness status: %s", response.status_code)

            # Any non-5xx response indicates the endpoint is reachable and the
            # backend is responding.
            if response.status_code < HTTPStatus.INTERNAL_SERVER_ERROR:
                return
        except Exception as e:
            logger.debug("an error occurred during login readiness checking: %s", e)

        sleep(1)

    raise Exception(
        f"Failed to get a stable response from /api/auth/login during {num_secs} seconds."
    )


def docker_restore_data_volumes():
    docker_cp(
        CVAT_DB_DIR / "cvat_data.tar.bz2",
        f"{_prefixed_container_name('cvat_server')}:/tmp/cvat_data.tar.bz2",
    )
    docker_exec_cvat("tar --strip 3 -xjf /tmp/cvat_data.tar.bz2 -C /home/django/data/")


def kube_restore_data_volumes():
    pod_name = _kube_get_server_pod_name()
    kube_cp(
        CVAT_DB_DIR / "cvat_data.tar.bz2",
        f"{pod_name}:/tmp/cvat_data.tar.bz2",
    )
    kube_exec_cvat("tar --strip 3 -xjf /tmp/cvat_data.tar.bz2 -C /home/django/data/")


def get_server_image_tag():
    return f"cvat/server:{os.environ.get('CVAT_VERSION', 'dev')}"


def docker_compose(dc_files, cvat_root_dir):
    return [
        "docker",
        "compose",
        f"--project-name={_project_name()}",
        f"--project-directory={CVAT_ROOT_DIR}",
        # use compatibility mode to have fixed names for containers (with underscores)
        # https://github.com/docker/compose#about-update-and-backward-compatibility
        "--compatibility",
        f"--env-file={CVAT_ROOT_DIR / 'tests/python/webhook_receiver/.env'}",
        *(f"--file={f}" for f in dc_files),
    ]


def start_services(dc_files, rebuild=False, cvat_root_dir=CVAT_ROOT_DIR):
    if _project_name() == DEFAULT_PROJECT_NAME and any([cn in ["cvat_server", "cvat_db"] for cn in running_containers()]):
        pytest.exit(
            "It's looks like you already have running cvat containers. Stop them and try again. "
            f"List of running containers: {', '.join(running_containers())}"
        )

    _run(
        docker_compose(dc_files, cvat_root_dir) + ["up", "-d", *["--build"] * rebuild],
        capture_output=False,
    )


def stop_services(dc_files, cvat_root_dir=CVAT_ROOT_DIR):
    _run(
        docker_compose(dc_files, cvat_root_dir) + ["down", "-v", "--remove-orphans"],
        capture_output=False,
    )
    # Some profile-inactive services can survive compose down in mixed-profile runs.
    # Ensure full cleanup of all containers that belong to this compose project.
    project_name = _project_name()
    container_ids, _ = _run(
        [
            "docker",
            "ps",
            "-aq",
            "--filter",
            f"label=com.docker.compose.project={project_name}",
        ]
    )
    stale_ids = [container_id for container_id in container_ids.splitlines() if container_id]
    if stale_ids:
        _run(["docker", "rm", "-f", *stale_ids], capture_output=False)


def _infer_infra_mode(session) -> str:
    mode = session.config.getoption("--infra")
    if mode != DEFAULT_INFRA_MODE:
        return mode

    # Compatibility shorthand:
    # pytest tests/python --run-prefix p1 up
    # pytest tests/python --run-prefix p1 down
    args = list(session.config.args)
    for candidate in ("up", "down"):
        if candidate in args:
            args.remove(candidate)
            session.config.args[:] = args
            return candidate

    return mode


def _configure_runtime_env(
    project_name: str,
    port_config: dict,
    *,
    base_url: str | None = None,
    debug_services: list[str] | None = None,
    debug_wait: bool = False,
    debug_ports: dict[str, int] | None = None,
) -> None:
    os.environ["CVAT_TEST_RUN_PREFIX"] = project_name
    os.environ["CVAT_TEST_HTTP_PORT"] = str(port_config["http_port"])
    os.environ["CVAT_TEST_LOGS_PORT"] = str(port_config["logs_port"])
    os.environ["CVAT_TEST_MINIO_PORT"] = str(port_config["minio_port"])
    os.environ["CVAT_TEST_MINIO_CONSOLE_PORT"] = str(port_config["minio_console_port"])
    os.environ["CVAT_BASE_URL"] = base_url or f"http://localhost:{port_config['http_port']}"
    os.environ["CVAT_MINIO_ENDPOINT_URL"] = f"http://localhost:{port_config['minio_port']}"
    debug_services = debug_services or []
    debug_ports = debug_ports or {}
    os.environ["CVAT_TEST_CONTAINER_DEBUG_SERVICES"] = ",".join(debug_services)
    os.environ["CVAT_TEST_CONTAINER_DEBUG_WAIT"] = "yes" if debug_wait else "no"
    for env_name in DEBUG_SERVICE_ENV_PORT.values():
        os.environ.pop(env_name, None)
    for service_name, host_port in debug_ports.items():
        os.environ[DEBUG_SERVICE_ENV_PORT[service_name]] = str(host_port)

    # config.py can be imported before session_start (e.g. by conftest),
    # so refresh module-level constants to the current runtime values.
    try:
        import shared.utils.config as config

        config.BASE_URL = os.environ["CVAT_BASE_URL"]
        config.API_URL = config.BASE_URL + "/api/"
        config.MINIO_ENDPOINT_URL = os.environ["CVAT_MINIO_ENDPOINT_URL"]
    except Exception:
        logger.debug("Failed to refresh shared.utils.config runtime values", exc_info=True)


def _resolve_project_context(session) -> tuple[str, dict]:
    project_name = _run_prefix_from_config(session.config)
    project_cfg = _project_config(project_name)
    port_config = _resolve_port_config(project_cfg)
    requested_debug_services = parse_debug_services(session.config.getoption("--container-debug"))
    debug_wait = bool(session.config.getoption("--container-debug-wait"))
    debug_port_base = int(session.config.getoption("--container-debug-port-base"))
    project_state = project_cfg.load_state() or {}
    project_running = _project_containers_running(project_cfg.project_name)
    running_service_ports = (
        _project_service_port_map(project_cfg.project_name) if project_running else {}
    )
    used_ports = _project_host_ports(project_cfg.project_name)
    debug_ports = resolve_debug_port_config(
        requested_services=requested_debug_services,
        debug_port_base=debug_port_base,
        state=project_state,
        project_running=project_running,
        running_service_ports=running_service_ports,
        used_ports=used_ports,
        is_port_free=_is_port_free,
        pick_free_port=_pick_free_port,
    )
    _configure_runtime_env(
        project_name,
        port_config,
        debug_services=requested_debug_services,
        debug_wait=debug_wait,
        debug_ports=debug_ports,
    )
    project_cfg.save_state(
        {
            "project_name": project_name,
            "infra_profile": session.config.getoption("--infra-profile"),
            **port_config,
            "base_url": os.environ["CVAT_BASE_URL"],
            "minio_endpoint_url": os.environ["CVAT_MINIO_ENDPOINT_URL"],
            "debug": {
                "services": requested_debug_services,
                "wait": debug_wait,
                "port_base": debug_port_base,
                "ports": debug_ports,
            },
        },
    )
    return project_name, port_config


def _preconfigure_runtime_env(config) -> None:
    """
    Set runtime URL/ports before test module import/collection.
    This prevents import-time constants from sticking to localhost:8080
    when running with --run-prefix.
    """
    project_name = _run_prefix_from_config(config)
    infra_mode = config.getoption("--infra")
    requested_debug_services = parse_debug_services(config.getoption("--container-debug"))
    debug_wait = bool(config.getoption("--container-debug-wait"))
    debug_port_base = int(config.getoption("--container-debug-port-base"))
    os.environ["CVAT_TEST_INFRA_PROFILE"] = config.getoption("--infra-profile")
    test_http_port = config.getoption("test_http_port")
    test_logs_port = config.getoption("test_logs_port")
    test_minio_port = config.getoption("test_minio_port")
    test_minio_console_port = config.getoption("test_minio_console_port")

    if test_http_port is not None:
        os.environ["CVAT_TEST_HTTP_PORT"] = str(test_http_port)
    if test_logs_port is not None:
        os.environ["CVAT_TEST_LOGS_PORT"] = str(test_logs_port)
    if test_minio_port is not None:
        os.environ["CVAT_TEST_MINIO_PORT"] = str(test_minio_port)
    if test_minio_console_port is not None:
        os.environ["CVAT_TEST_MINIO_CONSOLE_PORT"] = str(test_minio_console_port)

    if config.getoption("--platform") != "local":
        return

    if infra_mode == "down":
        os.environ["CVAT_TEST_RUN_PREFIX"] = project_name
        return

    if infra_mode == "external":
        base_url = config.getoption("--base-url")
        if not base_url:
            state = _project_config(project_name).load_state() or {}
            base_url = state.get("base_url", "http://localhost:8080")
        parsed = urlparse(base_url)
        http_port = parsed.port or (443 if parsed.scheme == "https" else 80)
        _configure_runtime_env(
            project_name,
            {
                "http_port": http_port,
                "logs_port": 8090,
                "minio_port": 9000,
                "minio_console_port": 9001,
            },
            base_url=base_url,
            debug_services=requested_debug_services,
            debug_wait=debug_wait,
        )
        return

    port_config = _resolve_port_config(_project_config(project_name))
    project_cfg = _project_config(project_name)
    project_state = project_cfg.load_state() or {}
    project_running = _project_containers_running(project_cfg.project_name)
    running_service_ports = (
        _project_service_port_map(project_cfg.project_name) if project_running else {}
    )
    used_ports = _project_host_ports(project_cfg.project_name)
    debug_ports = resolve_debug_port_config(
        requested_services=requested_debug_services,
        debug_port_base=debug_port_base,
        state=project_state,
        project_running=project_running,
        running_service_ports=running_service_ports,
        used_ports=used_ports,
        is_port_free=_is_port_free,
        pick_free_port=_pick_free_port,
    )
    _configure_runtime_env(
        project_name,
        port_config,
        debug_services=requested_debug_services,
        debug_wait=debug_wait,
        debug_ports=debug_ports,
    )


def session_start(
    session,
    cvat_root_dir=CVAT_ROOT_DIR,
    cvat_db_dir=CVAT_DB_DIR,
    extra_dc_files=None,
    waiting_time=300,
):
    infra_mode = _infer_infra_mode(session)
    setattr(session.config, "_cvat_infra_mode", infra_mode)
    debug_services = parse_debug_services(session.config.getoption("--container-debug"))
    if session.config.getoption("--container-debug-wait") and not debug_services:
        raise pytest.UsageError("--container-debug-wait requires --container-debug with at least one service")

    try:
        profiles = parse_parallel_profiles(session.config.getoption("--parallel"), INFRA_PROFILES)
    except ValueError as ex:
        raise pytest.UsageError(str(ex)) from ex
    if profiles and not session.config.getoption("--parallel-child"):
        rebuild = session.config.getoption("--rebuild")
        cleanup = session.config.getoption("--cleanup")
        dumpdb = session.config.getoption("--dumpdb")
        vscode = session.config.getoption("--vscode")
        if any((rebuild, cleanup, dumpdb, vscode, bool(debug_services))):
            raise pytest.UsageError(
                "--parallel does not support --rebuild/--cleanup/--dumpdb/--vscode/--container-debug in parent mode"
            )

        if infra_mode in {"up", "down"}:
            try:
                run_parallel_infra_mode(
                    session=session,
                    profiles=profiles,
                    run_prefix=_run_prefix_from_config(session.config),
                    infra_mode=infra_mode,
                    profile_mismatch_policy=session.config.getoption(
                        "--parallel-profile-mismatch"
                    ),
                    pick_free_port=_pick_free_port,
                    runtime_dir_for_project=lambda project_name: _project_config(project_name).runtime_dir,
                )
            except Exception as ex:
                pytest.exit(str(ex), returncode=1)
            pytest.exit(
                f"Parallel infra '{infra_mode}' finished for {len(profiles)} lane(s)",
                returncode=0,
            )

        # Parent process does not manage a separate infra stack in parallel mode.
        return

    base_url = session.config.getoption("--base-url")
    project_name = _run_prefix_from_config(session.config)

    rebuild = session.config.getoption("--rebuild")
    cleanup = session.config.getoption("--cleanup")
    dumpdb = session.config.getoption("--dumpdb")

    if session.config.getoption("--collect-only"):
        if any((rebuild, cleanup, dumpdb, infra_mode in {"up", "down"})):
            raise pytest.UsageError("""--collect-only is not compatible with any of the other options:
                --rebuild --cleanup --dumpdb --infra=up/down""")
        return  # don't need to start the services to collect tests

    platform = session.config.getoption("--platform")

    if platform == "kube" and any((rebuild, cleanup, dumpdb, infra_mode != "auto")):
        raise pytest.UsageError("""--platform=kube is not compatible with any of the other options
            --rebuild --cleanup --dumpdb --infra""")

    if infra_mode == "external":
        if not base_url:
            state = _project_config(project_name).load_state() or {}
            base_url = state.get("base_url", "http://localhost:8080")
        parsed = urlparse(base_url)
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        requested_debug_services = parse_debug_services(session.config.getoption("--container-debug"))
        _configure_runtime_env(
            project_name,
            {
                "http_port": port,
                "logs_port": 8090,
                "minio_port": 9000,
                "minio_console_port": 9001,
            },
            base_url=base_url,
            debug_services=requested_debug_services,
            debug_wait=bool(session.config.getoption("--container-debug-wait")),
        )
        maybe_wait_for_vscode_attach(session, cvat_root_dir=CVAT_ROOT_DIR)
        return

    if infra_mode == "down":
        os.environ["CVAT_TEST_RUN_PREFIX"] = project_name
    else:
        _resolve_project_context(session)

    if platform == "local":
        local_start(
            infra_mode,
            dumpdb,
            cleanup,
            rebuild,
            cvat_root_dir,
            cvat_db_dir,
            extra_dc_files,
            waiting_time,
        )

    elif platform == "kube":
        kube_start(cvat_db_dir)

    if infra_mode == "auto":
        maybe_wait_for_vscode_attach(session, cvat_root_dir=CVAT_ROOT_DIR)


def local_start(
    infra_mode,
    dumpdb,
    cleanup,
    rebuild,
    cvat_root_dir,
    cvat_db_dir,
    extra_dc_files,
    waiting_time,
):
    if dumpdb:
        dump_db()
        pytest.exit("data.json has been updated", returncode=0)

    project_cfg = _project_config(cvat_root_dir=cvat_root_dir)
    project_name = project_cfg.project_name

    dc_files = project_cfg.dc_files
    profile_dc_files = PROFILE_DC_FILES.get(_infra_profile(), [])
    if profile_dc_files:
        dc_files += [project_cfg.cvat_root_dir / f for f in profile_dc_files]
    if extra_dc_files is not None:
        dc_files += extra_dc_files

    container_name_files = project_cfg.generated_compose_files

    if cleanup:
        delete_compose_files(container_name_files)
        pytest.exit("All generated test files have been deleted", returncode=0)

    delete_compose_files(container_name_files)
    create_compose_files(container_name_files, cvat_root_dir, project_cfg)

    if infra_mode == "down":
        stop_services(dc_files, cvat_root_dir)
        project_cfg.delete_state()
        pytest.exit("All testing containers are stopped", returncode=0)

    if infra_mode == "up":
        # Fast path for explicit "up": create/start infrastructure only.
        # If already running, just verify readiness and exit quickly.
        if not _project_containers_running(project_name):
            start_services(dc_files, rebuild, cvat_root_dir)
        wait_for_services(waiting_time)
        wait_for_auth_login_ready()
        pytest.exit("All necessary containers have been created and started.", returncode=0)

    preexisting_project_running = _project_containers_running(project_name)
    if infra_mode == "auto":
        state = project_cfg.load_state() or {}
        # In auto mode, tear down only stacks that this session had to start.
        # If the stack already existed before running pytest, keep it running.
        state["auto_started"] = not preexisting_project_running
        project_cfg.save_state(state)

    if not preexisting_project_running:
        start_services(dc_files, rebuild, cvat_root_dir)

    docker_restore_data_volumes()
    docker_cp(cvat_db_dir / "restore.sql", f"{_prefixed_container_name('cvat_db')}:/tmp/restore.sql")
    docker_cp(
        cvat_db_dir / "data.json",
        f"{_prefixed_container_name('cvat_server')}:/tmp/data.json",
    )

    wait_for_services(waiting_time)

    docker_exec_cvat(
        ["sh", "-c", "./manage.py flush --no-input && ./manage.py loaddata /tmp/data.json"]
    )
    docker_exec(
        Container.DB, "psql -U root -d postgres -v from=cvat -v to=test_db -f /tmp/restore.sql"
    )
    wait_for_auth_login_ready()


def kube_start(cvat_db_dir):
    kube_restore_data_volumes()
    server_pod_name = _kube_get_server_pod_name()
    db_pod_name = _kube_get_db_pod_name()
    kube_cp(cvat_db_dir / "restore.sql", f"{db_pod_name}:/tmp/restore.sql")
    kube_cp(cvat_db_dir / "data.json", f"{server_pod_name}:/tmp/data.json")

    wait_for_services()

    kube_exec_cvat(
        ["sh", "-c", "./manage.py flush --no-input && ./manage.py loaddata /tmp/data.json"]
    )

    kube_exec_cvat_db(
        [
            "/bin/sh",
            "-c",
            "PGPASSWORD=cvat_postgresql_postgres psql -U postgres -d postgres -v from=cvat -v to=test_db -f /tmp/restore.sql",
        ]
    )


def pytest_sessionstart(session) -> None:
    session_start(session)


def pytest_configure(config) -> None:
    _preconfigure_runtime_env(config)


def pytest_sessionfinish(session, exitstatus: int) -> None:
    session_finish(session)


def session_finish(session):
    if session.config.getoption("--collect-only"):
        return

    platform = session.config.getoption("--platform")

    if platform == "local":
        if os.environ.get("COVERAGE_PROCESS_START"):
            collect_code_coverage_from_containers()
        _cleanup_local_infra_after_session(session)


def _stop_project_services_best_effort(project_name: str) -> None:
    project_cfg = _project_config(project_name)
    saved_state = project_cfg.load_state() or {}
    saved_profile = str(saved_state.get("infra_profile") or DEFAULT_INFRA_PROFILE)

    dc_files = project_cfg.dc_files
    profile_dc_files = PROFILE_DC_FILES.get(saved_profile, [])
    if profile_dc_files:
        dc_files += [project_cfg.cvat_root_dir / f for f in profile_dc_files]

    try:
        stop_services(dc_files, project_cfg.cvat_root_dir)
    except BaseException:
        logger.warning(
            "Failed to stop services for project '%s' during session cleanup",
            project_name,
            exc_info=True,
        )
    finally:
        project_cfg.delete_state()


def _cleanup_local_infra_after_session(session) -> None:
    infra_mode = getattr(session.config, "_cvat_infra_mode", _infer_infra_mode(session))
    if infra_mode != "auto":
        return

    run_prefix = _run_prefix_from_config(session.config)
    try:
        profiles = parse_parallel_profiles(session.config.getoption("--parallel"), INFRA_PROFILES)
    except ValueError as ex:
        raise pytest.UsageError(str(ex)) from ex
    is_parallel_child = bool(session.config.getoption("--parallel-child"))

    def should_stop_project(project_name: str) -> bool:
        state = _project_config(project_name).load_state() or {}
        return bool(state.get("auto_started", False))

    if profiles and not is_parallel_child:
        for lane_idx in range(1, len(profiles) + 1):
            project_name = f"{run_prefix}{lane_idx}" if len(profiles) > 1 else run_prefix
            if should_stop_project(project_name):
                _stop_project_services_best_effort(project_name)
    else:
        if should_stop_project(run_prefix):
            _stop_project_services_best_effort(run_prefix)


def collect_code_coverage_from_containers():
    for container in Container.covered():
        process_command = "python3"

        # find process with code coverage
        pid = docker_exec(container, f"pidof {process_command} -o 1")

        # stop process with code coverage
        docker_exec(container, f"kill -15 {pid}")
        sleep(3)

        # get code coverage report
        docker_exec(container, "coverage combine", capture_output=False)
        docker_exec(container, "coverage json", capture_output=False)
        docker_cp(
            f"{_prefixed_container_name(container)}:home/django/coverage.json",
            f"coverage_{container}.json",
        )


@pytest.fixture(scope="function")
def restore_db_per_function(request):
    # Note that autouse fixtures are executed first within their scope, so be aware of the order
    # Pre-test DB setups (eg. with class-declared autouse setup() method) may be cleaned.
    # https://docs.pytest.org/en/stable/reference/fixtures.html#autouse-fixtures-are-executed-first-within-their-scope
    platform = request.config.getoption("--platform")
    if platform == "local":
        docker_restore_db()
    else:
        kube_restore_db()


@pytest.fixture(scope="class")
def restore_db_per_class(request):
    platform = request.config.getoption("--platform")
    if platform == "local":
        docker_restore_db()
    else:
        kube_restore_db()


@pytest.fixture(scope="function")
def restore_cvat_data_per_function(request):
    platform = request.config.getoption("--platform")
    if platform == "local":
        docker_restore_data_volumes()
    else:
        kube_restore_data_volumes()


@pytest.fixture(scope="class")
def restore_cvat_data_per_class(request):
    platform = request.config.getoption("--platform")
    if platform == "local":
        docker_restore_data_volumes()
    else:
        kube_restore_data_volumes()


@pytest.fixture(scope="function")
def restore_clickhouse_db_per_function(request):
    # Note that autouse fixtures are executed first within their scope, so be aware of the order
    # Pre-test DB setups (eg. with class-declared autouse setup() method) may be cleaned.
    # https://docs.pytest.org/en/stable/reference/fixtures.html#autouse-fixtures-are-executed-first-within-their-scope
    platform = request.config.getoption("--platform")
    if platform == "local":
        docker_restore_clickhouse_db()
    else:
        kube_restore_clickhouse_db()


@pytest.fixture(scope="class")
def restore_clickhouse_db_per_class(request):
    platform = request.config.getoption("--platform")
    if platform == "local":
        docker_restore_clickhouse_db()
    else:
        kube_restore_clickhouse_db()


@pytest.fixture(scope="function")
def restore_redis_inmem_per_function(request):
    # Note that autouse fixtures are executed first within their scope, so be aware of the order
    # Pre-test DB setups (eg. with class-declared autouse setup() method) may be cleaned.
    # https://docs.pytest.org/en/stable/reference/fixtures.html#autouse-fixtures-are-executed-first-within-their-scope
    platform = request.config.getoption("--platform")
    if platform == "local":
        docker_restore_redis_inmem()
    else:
        kube_restore_redis_inmem()


@pytest.fixture(scope="class")
def restore_redis_inmem_per_class(request):
    platform = request.config.getoption("--platform")
    if platform == "local":
        docker_restore_redis_inmem()
    else:
        kube_restore_redis_inmem()


@pytest.fixture(scope="function")
def restore_redis_ondisk_per_function(request):
    platform = request.config.getoption("--platform")
    if platform == "local":
        docker_restore_redis_ondisk()
    else:
        kube_restore_redis_ondisk()


@pytest.fixture(scope="class")
def restore_redis_ondisk_per_class(request):
    platform = request.config.getoption("--platform")
    if platform == "local":
        docker_restore_redis_ondisk()
    else:
        kube_restore_redis_ondisk()


@pytest.fixture(scope="class")
def restore_redis_ondisk_after_class(request):
    yield

    platform = request.config.getoption("--platform")
    if platform == "local":
        docker_restore_redis_ondisk()
    else:
        kube_restore_redis_ondisk()
