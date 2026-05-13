# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import logging
import os
import socket
from pathlib import Path
from subprocess import CalledProcessError, run
from time import sleep

import pytest
import yaml
from infra.config import RuntimeConfig, RuntimeContext, RuntimeMode
from infra.instances.base_instance import InfraInstance, InfraPlugin
from infra.system_utils import docker_cp, run_command

logger = logging.getLogger(__name__)

_COVERED_CONTAINERS = (
    "cvat_server",
    "cvat_worker_annotation",
    "cvat_worker_import",
    "cvat_worker_export",
    "cvat_worker_quality_reports",
    "cvat_worker_webhooks",
    "cvat_worker_utils",
)
_REQUIRED_RUNNING_CONTAINERS = _COVERED_CONTAINERS + (
    "cvat_db",
    "cvat_worker_chunks",
    "cvat_worker_consensus",
    "traefik",
)
_FAILURE_LOG_CONTAINERS = _COVERED_CONTAINERS + ("cvat_opa", "traefik")
_LOCAL_DC_FILES = (
    "tests/docker-compose.file_share.yml",
    "tests/docker-compose.minio.yml",
    "tests/docker-compose.pat_settings.yml",
    "tests/docker-compose.test_servers.yml",
)
_DEFAULT_PORT_CONFIG = {
    "http_port": 8080,
    "logs_port": 8090,
    "db_port": 15432,
    "redis_inmem_port": 16379,
    "redis_ondisk_port": 16666,
    "minio_port": 9000,
    "minio_console_port": 9001,
}
_NON_DEFAULT_PORT_STARTS = {
    "http_port": 18080,
    "logs_port": 18090,
    "db_port": 15432,
    "redis_inmem_port": 16379,
    "redis_ondisk_port": 16666,
    "minio_port": 19000,
    "minio_console_port": 19001,
}


class StackCompatibilityError(RuntimeError):
    pass


def _configure_runtime_env(
    project_name: str,
    port_config: dict,
    *,
    base_url: str | None = None,
) -> None:
    os.environ["CVAT_TEST_RUN_PREFIX"] = project_name
    os.environ["CVAT_BASE_URL"] = base_url or f"http://localhost:{port_config['http_port']}"
    os.environ["CVAT_MINIO_ENDPOINT_URL"] = f"http://localhost:{port_config['minio_port']}"
    # tests/docker-compose.minio.yml uses these compose envs for host bindings.
    os.environ["CVAT_TEST_MINIO_PORT"] = str(port_config["minio_port"])
    os.environ["CVAT_TEST_MINIO_CONSOLE_PORT"] = str(port_config["minio_console_port"])
    os.environ["CVAT_TEST_DB_PORT"] = str(port_config["db_port"])
    os.environ.pop("CVAT_TEST_DB_MINIO_ENDPOINT_URL", None)
    os.environ.pop("CVAT_TEST_DB_WEBHOOK_RECEIVER_URL", None)

    # config.py can be imported before session_start (e.g. by conftest),
    # so refresh module-level constants to the current runtime values.
    try:
        import shared.utils.config as config

        config.BASE_URL = os.environ["CVAT_BASE_URL"]
        config.API_URL = config.BASE_URL + "/api/"
        config.MINIO_ENDPOINT_URL = os.environ["CVAT_MINIO_ENDPOINT_URL"]
    except Exception:
        logger.debug("Failed to refresh shared.utils.config runtime values", exc_info=True)


def preconfigure_local_runtime_env(config) -> None:
    """
    Set runtime URL/ports before test module import/collection.
    This prevents import-time constants from sticking to localhost:8080
    when running with --run-prefix.
    """
    request = RuntimeConfig.resolve_request(config)
    project_name = request.run_prefix

    if request.platform != "local":
        return

    if request.collect_only or request.runtime_mode == RuntimeMode.DOWN:
        os.environ["CVAT_TEST_RUN_PREFIX"] = project_name
        return

    project_cfg = RuntimeConfig.get_local_compose_stack(project_name)
    port_config = resolve_port_config(
        project_cfg,
        default_project_name=RuntimeConfig.get_default_run_prefix(),
    )
    _configure_runtime_env(
        project_name=project_name,
        port_config=port_config,
        base_url=request.external_base_url,
    )


def resolve_local_project_context(session) -> tuple[str, dict]:
    config = session.config
    request = RuntimeConfig.resolve_request(config)
    project_name = request.run_prefix
    project_cfg = RuntimeConfig.get_local_compose_stack(project_name)
    port_config = resolve_port_config(
        project_cfg,
        default_project_name=RuntimeConfig.get_default_run_prefix(),
    )
    _configure_runtime_env(
        project_name=project_name,
        port_config=port_config,
        base_url=request.external_base_url,
    )
    project_cfg.save_state(
        {
            "project_name": project_name,
            **port_config,
            "base_url": os.environ["CVAT_BASE_URL"],
            "minio_endpoint_url": os.environ["CVAT_MINIO_ENDPOINT_URL"],
        }
    )
    return project_name, port_config


def local_exec(container, command: list[str], capture_output=True):
    prefixed_name = RuntimeConfig.get_local_compose_stack().prefixed_container_name(container)
    return run_command(
        [
            "docker",
            "exec",
            "-u",
            "root",
            prefixed_name,
            *command,
        ],
        capture_output=capture_output,
        logger=logger,
    )[0]


def _docker_list_containers() -> list[dict]:
    container_ids, _ = run_command(["docker", "ps", "-q"])
    if not container_ids:
        return []

    inspect_stdout, _ = run_command(["docker", "inspect", *container_ids.splitlines()])
    return [
        _normalize_docker_inspect_container(container) for container in json.loads(inspect_stdout)
    ]


def _normalize_docker_inspect_container(container: dict) -> dict:
    return {
        "Names": [str(container.get("Name", "")).lstrip("/")],
        "Ports": _normalize_docker_inspect_ports(
            container.get("NetworkSettings", {}).get("Ports") or {}
        ),
    }


def _normalize_docker_inspect_ports(ports: dict) -> list[dict]:
    normalized_ports = []
    for private_port_spec, bindings in ports.items():
        private_port, _, port_type = private_port_spec.partition("/")
        if not bindings:
            continue
        for binding in bindings:
            host_port = binding.get("HostPort")
            if host_port:
                normalized_ports.append(
                    {
                        "PrivatePort": int(private_port),
                        "PublicPort": int(host_port),
                        "Type": port_type,
                    }
                )
    return normalized_ports


def running_containers() -> list[str]:
    containers = []
    for container in _docker_list_containers():
        names = container.get("Names") or []
        for name in names:
            containers.append(name.lstrip("/"))
    return containers


def project_containers_running(project_name: str) -> bool:
    containers = set(running_containers())
    expected = {f"{project_name}_{container}_1" for container in _REQUIRED_RUNNING_CONTAINERS}
    return expected.issubset(containers)


def ensure_project_stack_compatible(
    project_name: str,
    *,
    expected_http_port: int,
    expected_logs_port: int,
    expected_db_port: int,
    expected_redis_inmem_port: int,
    expected_redis_ondisk_port: int,
    expected_minio_port: int,
    expected_minio_console_port: int,
) -> None:
    if not project_traefik_ports_ready(
        project_name,
        expected_http_host_port=expected_http_port,
        expected_logs_host_port=expected_logs_port,
    ):
        raise StackCompatibilityError("Traefik host port mapping is missing or outdated")
    if not project_db_port_ready(project_name, expected_db_port):
        raise StackCompatibilityError("PostgreSQL host port mapping is missing or outdated")
    if not project_redis_ports_ready(
        project_name,
        expected_inmem_host_port=expected_redis_inmem_port,
        expected_ondisk_host_port=expected_redis_ondisk_port,
    ):
        raise StackCompatibilityError("Redis host port mapping is missing or outdated")
    if not project_minio_ports_ready(
        project_name,
        expected_minio_host_port=expected_minio_port,
        expected_minio_console_host_port=expected_minio_console_port,
    ):
        raise StackCompatibilityError("MinIO host port mapping is missing or outdated")


def project_db_port_ready(project_name: str, expected_host_port: int) -> bool:
    service_ports = project_service_port_map(project_name).get("cvat_db", {})
    return int(service_ports.get(5432, -1)) == expected_host_port


def project_traefik_ports_ready(
    project_name: str,
    *,
    expected_http_host_port: int,
    expected_logs_host_port: int,
) -> bool:
    service_ports = project_service_port_map(project_name).get("traefik", {})
    http_port = int(service_ports.get(8080, -1))
    logs_port = int(service_ports.get(8090, -1))
    return http_port == expected_http_host_port and logs_port == expected_logs_host_port


def project_redis_ports_ready(
    project_name: str,
    *,
    expected_inmem_host_port: int,
    expected_ondisk_host_port: int,
) -> bool:
    service_ports = project_service_port_map(project_name)
    inmem_port = int(service_ports.get("cvat_redis_inmem", {}).get(6379, -1))
    ondisk_port = int(service_ports.get("cvat_redis_ondisk", {}).get(6666, -1))
    return inmem_port == expected_inmem_host_port and ondisk_port == expected_ondisk_host_port


def project_minio_ports_ready(
    project_name: str,
    *,
    expected_minio_host_port: int,
    expected_minio_console_host_port: int,
) -> bool:
    service_ports = project_service_port_map(project_name).get("minio", {})
    minio_port = int(service_ports.get(9000, -1))
    console_port = int(service_ports.get(9001, -1))
    return minio_port == expected_minio_host_port and console_port == expected_minio_console_host_port


def dump_db(*, prefixed_container_name, cvat_db_dir: Path) -> None:
    if prefixed_container_name("cvat_server") not in running_containers():
        pytest.exit("CVAT is not running")
    with open(cvat_db_dir / "data.json", "w") as output:
        try:
            run(  # nosec
                (
                    f"docker exec {prefixed_container_name('cvat_server')} "
                    "python manage.py dumpdata "
                    "--indent 2 --natural-foreign "
                    "--exclude=auth.permission --exclude=contenttypes"
                ).split(),
                stdout=output,
                check=True,
            )
        except CalledProcessError:
            pytest.exit("Database dump failed.\n")


def project_host_ports(project_name: str) -> set[int]:
    ports: set[int] = set()
    for container in _docker_list_containers():
        names = [name.lstrip("/") for name in container.get("Names") or []]
        if not any(name.startswith(f"{project_name}_") for name in names):
            continue
        for port in container.get("Ports") or []:
            public_port = port.get("PublicPort")
            if public_port is not None:
                ports.add(int(public_port))
    return ports


def _container_belongs_to_project(container: dict, project_name: str) -> bool:
    names = [name.lstrip("/") for name in container.get("Names") or []]
    return any(name.startswith(f"{project_name}_") for name in names)


def _used_host_ports(*, exclude_project_name: str | None = None) -> set[int]:
    ports: set[int] = set()
    for container in _docker_list_containers():
        if exclude_project_name and _container_belongs_to_project(container, exclude_project_name):
            continue
        for port in container.get("Ports") or []:
            public_port = port.get("PublicPort")
            if public_port is not None:
                ports.add(int(public_port))
    return ports


def _can_bind_port(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        try:
            sock.bind(("", port))
        except OSError:
            return False
    return True


def _port_is_available(port: int, *, used_ports: set[int]) -> bool:
    return port not in used_ports and _can_bind_port(port)


def _next_available_port(start_port: int, *, used_ports: set[int], reserved_ports: set[int]) -> int:
    port = start_port
    while port in reserved_ports or not _port_is_available(port, used_ports=used_ports):
        port += 1
    reserved_ports.add(port)
    return port


def _state_has_port_config(state: dict) -> bool:
    return all(name in state for name in _DEFAULT_PORT_CONFIG)


def _state_port_config_is_available(project_name: str, state: dict) -> bool:
    used_ports = _used_host_ports(exclude_project_name=project_name)
    return all(
        _port_is_available(int(state[name]), used_ports=used_ports)
        for name in _DEFAULT_PORT_CONFIG
    )


def _allocate_port_config(project_name: str) -> dict:
    used_ports = _used_host_ports(exclude_project_name=project_name)
    reserved_ports: set[int] = set()
    return {
        name: _next_available_port(
            start_port,
            used_ports=used_ports,
            reserved_ports=reserved_ports,
        )
        for name, start_port in _NON_DEFAULT_PORT_STARTS.items()
    }


def project_service_port_map(project_name: str) -> dict[str, dict[int, int]]:
    service_ports: dict[str, dict[int, int]] = {}
    for container in _docker_list_containers():
        names = [name.lstrip("/") for name in container.get("Names") or []]
        container_name = next((name for name in names if name.startswith(f"{project_name}_")), None)
        if not container_name:
            continue
        prefix = f"{project_name}_"
        suffix = "_1"
        if not (container_name.startswith(prefix) and container_name.endswith(suffix)):
            continue
        service = container_name[len(prefix) : -len(suffix)]
        port_map = service_ports.setdefault(service, {})
        for port in container.get("Ports") or []:
            public_port = port.get("PublicPort")
            private_port = port.get("PrivatePort")
            if public_port is not None and private_port is not None and port.get("Type") == "tcp":
                port_map[int(private_port)] = int(public_port)
    return service_ports


def resolve_port_config(
    project_cfg,
    *,
    default_project_name: str,
) -> dict:
    state = project_cfg.load_state() or {}

    if project_cfg.project_name == default_project_name:
        return {**_DEFAULT_PORT_CONFIG, **state}

    if _state_has_port_config(state) and (
        project_containers_running(project_cfg.project_name)
        or _state_port_config_is_available(project_cfg.project_name, state)
    ):
        return {name: int(state[name]) for name in _DEFAULT_PORT_CONFIG}

    port_config = _allocate_port_config(project_cfg.project_name)
    project_cfg.save_state({**state, **port_config})
    return port_config


def docker_compose(project_name: str, dc_files: list[Path], project_directory: Path):
    return [
        "docker",
        "compose",
        f"--project-name={project_name}",
        f"--project-directory={project_directory}",
        "--compatibility",
        f"--env-file={project_directory / 'tests/python/webhook_receiver/.env'}",
        *(f"--file={f}" for f in dc_files),
    ]


def start_services(
    *,
    project_name: str,
    default_project_name: str,
    dc_files: list[Path],
    project_directory: Path,
    rebuild_images: bool = False,
) -> None:
    if project_name == default_project_name and any(
        [cn in ["cvat_server", "cvat_db"] for cn in running_containers()]
    ):
        pytest.exit(
            "It's looks like you already have running cvat containers. Stop them and try again. "
            f"List of running containers: {', '.join(running_containers())}"
        )

    run_command(
        docker_compose(project_name, dc_files, project_directory)
        + ["up", "-d", *(["--build"] if rebuild_images else [])],
        capture_output=False,
        logger=logger,
    )


def stop_services(
    *,
    project_name: str,
    dc_files: list[Path],
    project_directory: Path,
) -> None:
    run_command(
        docker_compose(project_name, dc_files, project_directory)
        + ["down", "-v", "--remove-orphans"],
        capture_output=False,
        logger=logger,
    )
    container_ids, _ = run_command(
        [
            "docker",
            "ps",
            "-aq",
            "--filter",
            f"label=com.docker.compose.project={project_name}",
        ],
        logger=logger,
    )
    stale_ids = [container_id for container_id in container_ids.splitlines() if container_id]
    if stale_ids:
        run_command(["docker", "rm", "-f", *stale_ids], capture_output=False, logger=logger)


def _create_compose_files(
    container_name_files: list[Path],
    cvat_root_dir: Path,
    project_cfg,
):
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

        for new_name in replacement.values():
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

                if not is_dev_compose and service_name in ("cvat_server", "cvat_worker_utils"):
                    service_env = service_config["environment"]
                    service_env["DJANGO_SETTINGS_MODULE"] = "cvat.settings.testing_rest"

                if not is_dev_compose and service_name in _COVERED_CONTAINERS:
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
                    service_env["TRAEFIK_PROVIDERS_DOCKER_NETWORK"] = (
                        f"{project_cfg.project_name}_cvat"
                    )
                    service_env["TRAEFIK_PROVIDERS_DOCKER_CONSTRAINTS"] = (
                        f"Label(`com.docker.compose.project`,`{project_cfg.project_name}`)"
                    )
                if service_name == "cvat_db":
                    service_config["ports"] = [
                        f"{project_cfg.host_db_port}:5432",
                    ]
                if service_name == "cvat_redis_inmem":
                    service_config["ports"] = [
                        f"{project_cfg.host_redis_inmem_port}:6379",
                    ]
                if service_name == "cvat_redis_ondisk":
                    service_config["ports"] = [
                        f"{project_cfg.host_redis_ondisk_port}:6666",
                    ]

                _namespace_traefik_labels(service_config)

            yaml.dump(dc_config, ndcf)


def _delete_compose_files(container_name_files: list[Path]):
    for filename in container_name_files:
        filename.unlink(missing_ok=True)


def stop_project_services_best_effort(*, project_name: str) -> None:
    project_cfg = RuntimeConfig.get_local_compose_stack(project_name)
    dc_files = project_cfg.dc_files + [project_cfg.cvat_root_dir / f for f in _LOCAL_DC_FILES]

    try:
        stop_services(
            project_name=project_name,
            dc_files=dc_files,
            project_directory=project_cfg.cvat_root_dir,
        )
    except BaseException:
        logger.warning(
            "Failed to stop services for project '%s' during session cleanup",
            project_name,
            exc_info=True,
        )
    finally:
        project_cfg.delete_state()


def cleanup_after_session(*, runtime_mode: RuntimeMode, run_prefix: str) -> None:
    if runtime_mode != RuntimeMode.AUTO:
        return

    state = RuntimeConfig.get_local_compose_stack(run_prefix).load_state() or {}
    if bool(state.get("auto_started", False)):
        stop_project_services_best_effort(project_name=run_prefix)


class LocalInstance(InfraInstance):
    plugin_class: type[InfraPlugin]

    @classmethod
    def can_handle_config(cls, config) -> bool:
        return RuntimeConfig.resolve_request(config).platform == "local"

    def exec_cvat(self, command: list[str]):
        prefixed_name = RuntimeConfig.get_local_compose_stack().prefixed_container_name(
            "cvat_server"
        )
        return run_command(
            ["docker", "exec", prefixed_name] + command,
            logger=logger,
        )[0]

    def exec_redis_inmem(self, command: list[str]):
        prefixed_name = RuntimeConfig.get_local_compose_stack().prefixed_container_name(
            "cvat_redis_inmem"
        )
        return run_command(
            ["docker", "exec", prefixed_name] + command,
            logger=logger,
        )[0]

    def exec_cvat_cp(self, source: Path, target: str, *, cvat_host: str) -> None:
        docker_cp(source, f"{cvat_host}:{target}")

    def _get_cvat_host(self) -> str:
        project_cfg = RuntimeConfig.get_local_compose_stack()
        return project_cfg.prefixed_container_name("cvat_server")

    @staticmethod
    def collect_code_coverage_from_containers() -> None:
        running = set(running_containers())
        project_cfg = RuntimeConfig.get_local_compose_stack()
        for container in _COVERED_CONTAINERS:
            prefixed_name = project_cfg.prefixed_container_name(container)
            if prefixed_name not in running:
                logger.info("Skipping coverage collection for absent container '%s'", prefixed_name)
                continue

            # find process with code coverage
            pid = local_exec(container, ["pidof", "python3", "-o", "1"])

            # stop process with code coverage
            local_exec(container, ["kill", "-15", pid])
            sleep(3)

            # get code coverage report
            local_exec(container, ["coverage", "combine"], capture_output=False)
            local_exec(container, ["coverage", "json"], capture_output=False)
            docker_cp(
                f"{prefixed_name}:home/django/coverage.json",
                f"coverage_{container}.json",
            )

    @classmethod
    def can_handle(cls, session, deps) -> bool:
        return cls.can_handle_config(session.config)

    def _build_local_dc_files(self, project_cfg) -> list[Path]:
        dc_files = project_cfg.generated_compose_files + [
            project_cfg.cvat_root_dir / f for f in _LOCAL_DC_FILES
        ]
        if self.deps.extra_dc_files is not None:
            dc_files += self.deps.extra_dc_files
        return dc_files

    def _run_local_lifecycle(
        self, *, runtime_mode: RuntimeMode, dumpdb: bool, cleanup: bool
    ) -> None:
        from infra import health as infra_health

        project_cfg = RuntimeConfig.get_local_compose_stack(cvat_root_dir=self.deps.cvat_root_dir)
        project_name = project_cfg.project_name
        prefixed_name = project_cfg.prefixed_container_name
        dc_files = self._build_local_dc_files(project_cfg)
        container_name_files = project_cfg.generated_compose_files

        def restore_runtime_state_from_assets() -> None:
            self.restore_cvat_data()
            docker_cp(
                self.deps.cvat_db_dir / "restore.sql",
                f"{prefixed_name('cvat_db')}:/tmp/restore.sql",
            )
            docker_cp(
                self.prepare_runtime_db_fixture(),
                f"{prefixed_name('cvat_server')}:/tmp/data.json",
            )
            infra_health.wait_for_services(self.deps.waiting_time)
            self.exec_cvat(
                [
                    "sh",
                    "-c",
                    "./manage.py flush --no-input && ./manage.py loaddata /tmp/data.json",
                ]
            )
            run_command(
                [
                    "docker",
                    "exec",
                    prefixed_name("cvat_db"),
                    "psql",
                    "-U",
                    "root",
                    "-d",
                    "postgres",
                    "-v",
                    "from=cvat",
                    "-v",
                    "to=test_db",
                    "-f",
                    "/tmp/restore.sql",
                ],
                logger=logger,
            )
            self.restore_clickhouse_db()
            self.restore_redis_inmem()
            self.restore_redis_ondisk()
            infra_health.wait_for_auth_login_ready()

        def set_auto_started(value: bool) -> None:
            state = project_cfg.load_state() or {}
            state["auto_started"] = value
            project_cfg.save_state(state)

        if dumpdb:
            dump_db(
                prefixed_container_name=prefixed_name,
                cvat_db_dir=self.deps.cvat_db_dir,
            )
            pytest.exit("data.json has been updated", returncode=0)

        if cleanup:
            _delete_compose_files(container_name_files)
            pytest.exit("All generated test files have been deleted", returncode=0)

        project_running = project_containers_running(project_name)
        if runtime_mode == RuntimeMode.REUSE:
            if not project_running:
                raise pytest.UsageError(
                    f"--infra={RuntimeMode.REUSE} requires running services for project '{project_name}'"
                )
            try:
                ensure_project_stack_compatible(
                    project_name,
                    expected_http_port=project_cfg.host_http_port,
                    expected_logs_port=project_cfg.host_logs_port,
                    expected_db_port=project_cfg.host_db_port,
                    expected_redis_inmem_port=project_cfg.host_redis_inmem_port,
                    expected_redis_ondisk_port=project_cfg.host_redis_ondisk_port,
                    expected_minio_port=project_cfg.host_minio_port,
                    expected_minio_console_port=project_cfg.host_minio_console_port,
                )
            except StackCompatibilityError as exc:
                raise pytest.UsageError(
                    f"--infra={RuntimeMode.REUSE} found an incompatible running stack for "
                    f"project '{project_name}': {exc}"
                ) from exc
            infra_health.wait_for_services(self.deps.waiting_time)
            infra_health.wait_for_auth_login_ready()
            return

        _delete_compose_files(container_name_files)
        _create_compose_files(
            container_name_files,
            self.deps.cvat_root_dir,
            project_cfg,
        )

        if runtime_mode == RuntimeMode.DOWN:
            stop_services(
                project_name=project_name,
                dc_files=dc_files,
                project_directory=self.deps.cvat_root_dir,
            )
            project_cfg.delete_state()
            pytest.exit("All testing containers are stopped", returncode=0)

        stack_ok = True
        incompatibility_reason = ""
        try:
            ensure_project_stack_compatible(
                project_name,
                expected_http_port=project_cfg.host_http_port,
                expected_logs_port=project_cfg.host_logs_port,
                expected_db_port=project_cfg.host_db_port,
                expected_redis_inmem_port=project_cfg.host_redis_inmem_port,
                expected_redis_ondisk_port=project_cfg.host_redis_ondisk_port,
                expected_minio_port=project_cfg.host_minio_port,
                expected_minio_console_port=project_cfg.host_minio_console_port,
            )
        except StackCompatibilityError as exc:
            stack_ok = False
            incompatibility_reason = str(exc)

        if project_running and not stack_ok and runtime_mode in {RuntimeMode.AUTO, RuntimeMode.UP}:
            logger.warning(
                "Project '%s' is running but incompatible with the requested test runtime "
                "(%s); recreating stack",
                project_name,
                incompatibility_reason,
            )
            stop_services(
                project_name=project_name,
                dc_files=dc_files,
                project_directory=self.deps.cvat_root_dir,
            )
            project_running = False

        if runtime_mode == RuntimeMode.UP:
            if not project_running or self.deps.rebuild_images_before_start:
                start_services(
                    project_name=project_name,
                    default_project_name=RuntimeConfig.get_default_run_prefix(),
                    dc_files=dc_files,
                    project_directory=self.deps.cvat_root_dir,
                    rebuild_images=self.deps.rebuild_images_before_start,
                )
                infra_health.wait_for_services(self.deps.waiting_time)
            restore_runtime_state_from_assets()
            pytest.exit("All necessary containers have been created and started.", returncode=0)

        if runtime_mode == RuntimeMode.RESTORE:
            if not project_running:
                start_services(
                    project_name=project_name,
                    default_project_name=RuntimeConfig.get_default_run_prefix(),
                    dc_files=dc_files,
                    project_directory=self.deps.cvat_root_dir,
                    rebuild_images=self.deps.rebuild_images_before_start,
                )
            restore_runtime_state_from_assets()
            pytest.exit("CVAT test runtime has been restored from test assets.", returncode=0)

        if runtime_mode == RuntimeMode.AUTO:
            # In auto mode, tear down only stacks that this session had to start.
            set_auto_started(not project_running)

        if not project_running or self.deps.rebuild_images_before_start:
            start_services(
                project_name=project_name,
                default_project_name=RuntimeConfig.get_default_run_prefix(),
                dc_files=dc_files,
                project_directory=self.deps.cvat_root_dir,
                rebuild_images=self.deps.rebuild_images_before_start,
            )

        restore_runtime_state_from_assets()

    def start(self) -> None:
        request = RuntimeConfig.resolve_request(self.config)
        runtime_mode = request.runtime_mode
        project_name = request.run_prefix

        if request.collect_only:
            return

        if runtime_mode == RuntimeMode.DOWN:
            os.environ["CVAT_TEST_RUN_PREFIX"] = project_name
        else:
            RuntimeContext.write_namespace_context(project_name)
            resolve_local_project_context(self.session)

        self._run_local_lifecycle(
            runtime_mode=runtime_mode,
            dumpdb=request.dumpdb,
            cleanup=request.cleanup,
        )

    def finish(self) -> None:
        request = RuntimeConfig.resolve_request(self.config)
        if request.platform != "local":
            return

        if request.collect_only:
            return

        if self.should_collect_failure_logs():
            self.collect_failure_logs()

        if os.environ.get("COVERAGE_PROCESS_START"):
            self.collect_code_coverage_from_containers()

        cleanup_after_session(
            runtime_mode=request.runtime_mode,
            run_prefix=request.run_prefix,
        )

    def collect_failure_logs(self) -> None:
        request = RuntimeConfig.resolve_request(self.config)
        project_cfg = RuntimeConfig.get_local_compose_stack(request.run_prefix)
        running = set(running_containers())
        logs_dir = self.failure_logs_dir()
        for container in _FAILURE_LOG_CONTAINERS:
            prefixed_name = project_cfg.prefixed_container_name(container)
            if prefixed_name not in running:
                continue

            inspect_text = ""
            restart_count = 0
            try:
                inspect_stdout, _ = run_command(["docker", "inspect", prefixed_name], logger=logger)
                inspect_text = inspect_stdout
                inspect_payload = json.loads(inspect_stdout)
                restart_count = int(inspect_payload[0]["RestartCount"])
                with open(logs_dir / f"{prefixed_name}.inspect.json", "w") as f:
                    f.write(inspect_stdout)
            except Exception:
                logger.debug("Failed to inspect %s", prefixed_name, exc_info=True)

            try:
                stdout, stderr = run_command(["docker", "logs", prefixed_name], logger=logger)
                log_text = (stdout or "") + (f"\n{stderr}" if stderr else "")
            except CalledProcessError as ex:
                log_text = ((ex.stdout or "") + f"\n{ex.stderr or ''}").strip()
            with open(logs_dir / f"{prefixed_name}.log", "w") as f:
                f.write(log_text)

            # Docker does not expose a Kubernetes-style previous-container log stream.
            # Preserve restart evidence so failures can be correlated with restarts.
            if restart_count:
                summary = {
                    "container": prefixed_name,
                    "restart_count": restart_count,
                    "inspect_available": bool(inspect_text),
                }
                with open(logs_dir / f"{prefixed_name}.restart-summary.json", "w") as f:
                    f.write(json.dumps(summary, indent=2, sort_keys=True))

    def restore_db(self) -> None:
        run_command(
            [
                "docker",
                "exec",
                RuntimeConfig.get_local_compose_stack().prefixed_container_name("cvat_db"),
                "psql",
                "-U",
                "root",
                "-d",
                "postgres",
                "-v",
                "from=test_db",
                "-v",
                "to=cvat",
                "-f",
                "/tmp/restore.sql",
            ],
            logger=logger,
        )

    def restore_clickhouse_db(self) -> None:
        self.exec_cvat(
            [
                "/bin/sh",
                "-c",
                f'python "{RuntimeConfig.get_clickhouse_init_script()}" --clear',
            ]
        )

    def restore_redis_inmem(self) -> None:
        keep_keys = (
            "rq:worker:",
            "rq:workers",
            "rq:scheduler_instance:",
            "rq:queues:",
            "cvat:applied_migrations",
            "cvat:applied_migration:",
        )
        patterns = " ".join(f"-e {key}" for key in keep_keys)
        self.exec_redis_inmem(
            [
                "sh",
                "-c",
                (
                    "redis-cli -n 0 --raw keys '*' | grep -v "
                    f"{patterns} | xargs --no-run-if-empty redis-cli -n 0 del "
                    "&& redis-cli -n 1 flushdb"
                ),
            ]
        )

    def restore_redis_ondisk(self) -> None:
        run_command(
            [
                "docker",
                "exec",
                RuntimeConfig.get_local_compose_stack().prefixed_container_name(
                "cvat_redis_ondisk"
            ),
            "redis-cli",
            "-p",
            "6666",
            "flushall",
        ],
        logger=logger,
    )


class LocalPlugin(InfraPlugin):
    @classmethod
    def register_options(cls, group) -> None:
        pass

    @classmethod
    def configure(cls, config) -> None:
        preconfigure_local_runtime_env(config)

    @classmethod
    def can_handle_config(cls, config) -> bool:
        return RuntimeConfig.resolve_request(config).platform == "local"


LocalInstance.plugin_class = LocalPlugin
