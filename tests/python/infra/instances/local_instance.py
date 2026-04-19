# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import http.client
import json
import logging
import os
import socket
from pathlib import Path
from subprocess import CalledProcessError, run
from time import sleep

import pytest
import yaml
from infra.config import InfraMode, InfraProfile, RuntimeInfraConfig
from infra.db_restore import PsycopgDatabaseRestorer
from infra.instances.base_instance import InfraInstance, InfraPlugin
from infra.redis_restore import RedisStateRestorer
from infra.rq_cleanup import BackgroundJobCleaner
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
_FAILURE_LOG_CONTAINERS = _COVERED_CONTAINERS + ("cvat_opa", "traefik")
_BACKGROUND_JOB_QUEUES = (
    "import",
    "export",
    "annotation",
    "webhooks",
    "quality_reports",
    "chunks",
    "consensus",
    "cleaning",
    "notifications",
)


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
    project_name = RuntimeInfraConfig.get_run_prefix_from_config(config)
    infra_mode = RuntimeInfraConfig.parse_infra_mode(config.getoption("--infra"))
    requested_profile = config.getoption("--infra-profile")
    os.environ["CVAT_TEST_INFRA_PROFILE"] = str(
        RuntimeInfraConfig.parse_infra_profile(
            requested_profile or RuntimeInfraConfig.get_default_infra_profile()
        )
    )

    if config.getoption("--platform") != "local":
        return

    if config.getoption("--collect-only") or infra_mode == InfraMode.DOWN:
        os.environ["CVAT_TEST_RUN_PREFIX"] = project_name
        return

    project_cfg = RuntimeInfraConfig.get_project_config(project_name)
    port_config = resolve_port_config(
        project_cfg,
        default_project_name=RuntimeInfraConfig.get_default_project_name(),
    )
    _configure_runtime_env(project_name=project_name, port_config=port_config)


def resolve_local_project_context(session) -> tuple[str, dict]:
    config = session.config
    project_name = RuntimeInfraConfig.get_run_prefix_from_config(config)
    project_cfg = RuntimeInfraConfig.get_project_config(project_name)
    port_config = resolve_port_config(
        project_cfg,
        default_project_name=RuntimeInfraConfig.get_default_project_name(),
    )
    _configure_runtime_env(project_name=project_name, port_config=port_config)
    project_cfg.save_state(
        {
            "project_name": project_name,
            "infra_profile": RuntimeInfraConfig.get_infra_profile(),
            **port_config,
            "base_url": os.environ["CVAT_BASE_URL"],
            "minio_endpoint_url": os.environ["CVAT_MINIO_ENDPOINT_URL"],
        }
    )
    return project_name, port_config


def local_exec(container, command, capture_output=True):
    return run_command(
        f"docker exec -u root {RuntimeInfraConfig.get_prefixed_container_name(container)} {command}",
        capture_output=capture_output,
        logger=logger,
    )[0]


def _docker_socket_path() -> str:
    # `docker ps` can become a bottleneck or hang under heavy test churn. Querying the
    # engine API over the local socket keeps local stack discovery cheap and reliable.
    docker_host = os.environ.get("DOCKER_HOST", "")
    if docker_host.startswith("unix://"):
        candidate = docker_host.removeprefix("unix://")
        if os.path.exists(candidate):
            return candidate

    rootless_candidate = f"/run/user/{os.getuid()}/docker.sock"
    for path in (
        "/var/run/docker.sock",
        rootless_candidate,
        os.path.expanduser("~/.docker/run/docker.sock"),
    ):
        if os.path.exists(path):
            return path
    raise FileNotFoundError("Docker socket not found")


def _docker_api_list_containers() -> list[dict]:
    socket_path = _docker_socket_path()
    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as client:
        client.settimeout(5.0)
        client.connect(socket_path)
        client.sendall(
            b"GET /containers/json HTTP/1.1\r\n" b"Host: localhost\r\n" b"Connection: close\r\n\r\n"
        )
        response = http.client.HTTPResponse(client)
        response.begin()
        if response.status != 200:
            raise RuntimeError(f"Docker API request failed: HTTP {response.status}")

        body = response.read()

    return json.loads(body.decode("utf-8"))


def running_containers() -> list[str]:
    containers = []
    for container in _docker_api_list_containers():
        names = container.get("Names") or []
        for name in names:
            containers.append(name.lstrip("/"))
    return containers


def project_containers_running(project_name: str) -> bool:
    containers = set(running_containers())
    expected = {
        f"{project_name}_cvat_server_1",
        f"{project_name}_cvat_db_1",
        f"{project_name}_traefik_1",
    }
    return expected.issubset(containers)


def project_stack_compatible(
    project_name: str,
    *,
    profile: str,
    expected_db_port: int,
    expected_redis_inmem_port: int,
    expected_redis_ondisk_port: int,
) -> tuple[bool, str]:
    if not profile_services_ready(project_name, profile):
        return False, f"missing required services for profile '{profile}'"
    if not project_db_port_ready(project_name, expected_db_port):
        return False, "PostgreSQL host port mapping is missing or outdated"
    if not project_redis_ports_ready(
        project_name,
        expected_inmem_host_port=expected_redis_inmem_port,
        expected_ondisk_host_port=expected_redis_ondisk_port,
    ):
        return False, "Redis host port mapping is missing or outdated"
    return True, ""


def _profile_required_services(profile: str) -> set[str]:
    normalized = str(RuntimeInfraConfig.parse_infra_profile(profile))
    if normalized == str(InfraProfile.SIMPLE):
        return set()
    if normalized == str(InfraProfile.STANDARD):
        return {
            "minio",
            "cvat_worker_chunks",
            "cvat_worker_export",
            "cvat_worker_import",
        }
    return {
        "cvat_clickhouse",
        "minio",
        "webhook_receiver",
        "cvat_ui",
        "cvat_grafana",
        "cvat_vector",
        "cvat_worker_annotation",
        "cvat_worker_chunks",
        "cvat_worker_consensus",
        "cvat_worker_export",
        "cvat_worker_import",
        "cvat_worker_quality_reports",
        "cvat_worker_webhooks",
        "cvat_worker_utils",
    }


def profile_services_ready(project_name: str, profile: str) -> bool:
    required = _profile_required_services(profile)
    if not required:
        return True

    containers = set(running_containers())
    return all(f"{project_name}_{service}_1" in containers for service in required)


def project_db_port_ready(project_name: str, expected_host_port: int) -> bool:
    service_ports = project_service_port_map(project_name).get("cvat_db", {})
    return int(service_ports.get(5432, -1)) == expected_host_port


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
    for container in _docker_api_list_containers():
        names = [name.lstrip("/") for name in container.get("Names") or []]
        if not any(name.startswith(f"{project_name}_") for name in names):
            continue
        for port in container.get("Ports") or []:
            public_port = port.get("PublicPort")
            if public_port is not None:
                ports.add(int(public_port))
    return ports


def project_service_port_map(project_name: str) -> dict[str, dict[int, int]]:
    service_ports: dict[str, dict[int, int]] = {}
    for container in _docker_api_list_containers():
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
    return {
        "http_port": 8080,
        "logs_port": 8090,
        "db_port": 15432,
        "redis_inmem_port": 16379,
        "redis_ondisk_port": 16666,
        "minio_port": 9000,
        "minio_console_port": 9001,
    }


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
) -> None:
    if project_name == default_project_name and any(
        [cn in ["cvat_server", "cvat_db"] for cn in running_containers()]
    ):
        pytest.exit(
            "It's looks like you already have running cvat containers. Stop them and try again. "
            f"List of running containers: {', '.join(running_containers())}"
        )

    run_command(
        docker_compose(project_name, dc_files, project_directory) + ["up", "-d"],
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
    project_cfg = RuntimeInfraConfig.get_project_config(project_name)
    saved_state = project_cfg.load_state() or {}
    saved_profile = str(
        RuntimeInfraConfig.parse_infra_profile(
            saved_state.get("infra_profile", RuntimeInfraConfig.get_default_infra_profile())
        )
    )
    dc_files = project_cfg.dc_files + [
        project_cfg.cvat_root_dir / f for f in RuntimeInfraConfig.get_base_dc_files(saved_profile)
    ]
    dc_files += [
        project_cfg.cvat_root_dir / f
        for f in RuntimeInfraConfig.get_profile_dc_files().get(saved_profile, [])
    ]

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


def cleanup_after_session(*, infra_mode: InfraMode, run_prefix: str) -> None:
    if infra_mode != InfraMode.AUTO:
        return

    state = RuntimeInfraConfig.get_project_config(run_prefix).load_state() or {}
    if bool(state.get("auto_started", False)):
        stop_project_services_best_effort(project_name=run_prefix)


class LocalInstance(InfraInstance):
    plugin_class: type[InfraPlugin]

    def __init__(self, session, deps):
        super().__init__(session, deps)
        self._db_restorer: PsycopgDatabaseRestorer | None = None
        self._redis_restorer: RedisStateRestorer | None = None
        self._background_job_cleaner: BackgroundJobCleaner | None = None

    @classmethod
    def can_handle_config(cls, config) -> bool:
        return config.getoption("--platform") == "local"

    def exec_cvat(self, command: list[str] | str):
        base = f"docker exec {RuntimeInfraConfig.get_prefixed_container_name('cvat_server')}"
        docker_command = f"{base} {command}" if isinstance(command, str) else base.split() + command
        return run_command(docker_command, logger=logger)[0]

    def exec_redis_inmem(self, command: list[str] | str):
        redis_command = ["sh", "-c", command] if isinstance(command, str) else command
        return run_command(
            ["docker", "exec", RuntimeInfraConfig.get_prefixed_container_name("cvat_redis_inmem")]
            + redis_command,
            logger=logger,
        )[0]

    def exec_cvat_cp(self, source: Path, target: str, *, cvat_host: str) -> None:
        docker_cp(source, f"{cvat_host}:{target}")

    def _get_cvat_host(self) -> str:
        project_cfg = RuntimeInfraConfig.get_project_config()
        return project_cfg.prefixed_container_name("cvat_server")

    def _close_db_restorer(self) -> None:
        if self._db_restorer is None:
            return
        self._db_restorer.close()
        self._db_restorer = None

    def _close_redis_restorer(self) -> None:
        if self._redis_restorer is None:
            return
        self._redis_restorer.close()
        self._redis_restorer = None
        self._background_job_cleaner = None

    def _reset_runtime_restore_caches(self) -> None:
        self._cvat_data_archive_host = None
        self._cvat_data_template_host = None

    def _get_db_restorer(self) -> PsycopgDatabaseRestorer:
        if self._db_restorer is None:
            project_cfg = RuntimeInfraConfig.get_project_config()
            self._db_restorer = PsycopgDatabaseRestorer(
                host="127.0.0.1",
                port=project_cfg.host_db_port,
                user="root",
                postgres_db="postgres",
            )

        return self._db_restorer

    def _get_redis_restorer(self) -> RedisStateRestorer:
        if self._redis_restorer is None:
            project_cfg = RuntimeInfraConfig.get_project_config()
            self._redis_restorer = RedisStateRestorer(
                host="127.0.0.1",
                inmem_port=project_cfg.host_redis_inmem_port,
                ondisk_port=project_cfg.host_redis_ondisk_port,
            )
        return self._redis_restorer

    @staticmethod
    def collect_code_coverage_from_containers() -> None:
        running = set(running_containers())
        for container in _COVERED_CONTAINERS:
            prefixed_name = RuntimeInfraConfig.get_prefixed_container_name(container)
            if prefixed_name not in running:
                logger.info("Skipping coverage collection for absent container '%s'", prefixed_name)
                continue

            process_command = "python3"

            # find process with code coverage
            pid = local_exec(container, f"pidof {process_command} -o 1")

            # stop process with code coverage
            local_exec(container, f"kill -15 {pid}")
            sleep(3)

            # get code coverage report
            local_exec(container, "coverage combine", capture_output=False)
            local_exec(container, "coverage json", capture_output=False)
            docker_cp(
                f"{prefixed_name}:home/django/coverage.json",
                f"coverage_{container}.json",
            )

    @classmethod
    def can_handle(cls, session, deps) -> bool:
        return cls.can_handle_config(session.config)

    def _build_local_dc_files(self, project_cfg) -> list[Path]:
        active_profile = RuntimeInfraConfig.get_infra_profile()
        dc_files = project_cfg.generated_compose_files + [
            project_cfg.cvat_root_dir / f
            for f in RuntimeInfraConfig.get_base_dc_files(active_profile)
        ]
        dc_files += [
            project_cfg.cvat_root_dir / f
            for f in RuntimeInfraConfig.get_profile_dc_files().get(active_profile, [])
        ]
        if self.deps.extra_dc_files is not None:
            dc_files += self.deps.extra_dc_files
        return dc_files

    def _run_local_lifecycle(self, *, infra_mode: InfraMode, dumpdb: bool, cleanup: bool) -> None:
        from infra import health as infra_health

        project_cfg = RuntimeInfraConfig.get_project_config(cvat_root_dir=self.deps.cvat_root_dir)
        project_name = project_cfg.project_name
        prefixed_name = project_cfg.prefixed_container_name
        dc_files = self._build_local_dc_files(project_cfg)
        container_name_files = project_cfg.generated_compose_files

        def restore_databases_from_assets() -> None:
            self.restore_cvat_data()
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
            self._get_db_restorer().restore_from_template(source_db="cvat", target_db="test_db")
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
        if infra_mode == InfraMode.REUSE:
            if not project_running:
                raise pytest.UsageError(
                    f"--infra={InfraMode.REUSE} requires running services for project '{project_name}'"
                )
            stack_ok, reason = project_stack_compatible(
                project_name,
                profile=RuntimeInfraConfig.get_infra_profile(),
                expected_db_port=project_cfg.host_db_port,
                expected_redis_inmem_port=project_cfg.host_redis_inmem_port,
                expected_redis_ondisk_port=project_cfg.host_redis_ondisk_port,
            )
            if not stack_ok:
                raise pytest.UsageError(
                    f"--infra={InfraMode.REUSE} found an incompatible running stack for "
                    f"project '{project_name}': {reason}"
                )
            infra_health.wait_for_services(self.deps.waiting_time)
            infra_health.wait_for_auth_login_ready()
            return

        _delete_compose_files(container_name_files)
        _create_compose_files(
            container_name_files,
            self.deps.cvat_root_dir,
            project_cfg,
        )

        if infra_mode == InfraMode.DOWN:
            self._reset_runtime_restore_caches()
            self._close_db_restorer()
            self._close_redis_restorer()
            stop_services(
                project_name=project_name,
                dc_files=dc_files,
                project_directory=self.deps.cvat_root_dir,
            )
            project_cfg.delete_state()
            pytest.exit("All testing containers are stopped", returncode=0)

        stack_ok, incompatibility_reason = project_stack_compatible(
            project_name,
            profile=RuntimeInfraConfig.get_infra_profile(),
            expected_db_port=project_cfg.host_db_port,
            expected_redis_inmem_port=project_cfg.host_redis_inmem_port,
            expected_redis_ondisk_port=project_cfg.host_redis_ondisk_port,
        )

        if project_running and not stack_ok and infra_mode in {InfraMode.AUTO, InfraMode.UP}:
            logger.warning(
                "Project '%s' is running but incompatible with the requested test runtime "
                "(%s); recreating stack",
                project_name,
                incompatibility_reason,
            )
            self._reset_runtime_restore_caches()
            self._close_db_restorer()
            self._close_redis_restorer()
            stop_services(
                project_name=project_name,
                dc_files=dc_files,
                project_directory=self.deps.cvat_root_dir,
            )
            project_running = False

        if infra_mode == InfraMode.UP:
            if not project_running:
                start_services(
                    project_name=project_name,
                    default_project_name=RuntimeInfraConfig.get_default_project_name(),
                    dc_files=dc_files,
                    project_directory=self.deps.cvat_root_dir,
                )
                infra_health.wait_for_services(self.deps.waiting_time)
            restore_databases_from_assets()
            infra_health.wait_for_auth_login_ready()
            pytest.exit("All necessary containers have been created and started.", returncode=0)

        if infra_mode == InfraMode.RESTORE_DB:
            if not project_running:
                start_services(
                    project_name=project_name,
                    default_project_name=RuntimeInfraConfig.get_default_project_name(),
                    dc_files=dc_files,
                    project_directory=self.deps.cvat_root_dir,
                )
            restore_databases_from_assets()
            pytest.exit("CVAT database has been restored from test assets.", returncode=0)

        if infra_mode == InfraMode.AUTO:
            # In auto mode, tear down only stacks that this session had to start.
            set_auto_started(not project_running)

        if not project_running:
            start_services(
                project_name=project_name,
                default_project_name=RuntimeInfraConfig.get_default_project_name(),
                dc_files=dc_files,
                project_directory=self.deps.cvat_root_dir,
            )

        restore_databases_from_assets()

    def start(self) -> None:
        config = self.config
        infra_mode = getattr(config, "_cvat_infra_mode")
        project_name = RuntimeInfraConfig.get_run_prefix_from_config(config)

        if config.getoption("--collect-only"):
            return

        if infra_mode == InfraMode.DOWN:
            os.environ["CVAT_TEST_RUN_PREFIX"] = project_name
        else:
            RuntimeInfraConfig.write_context_for_project(project_name)
            resolve_local_project_context(self.session)

        setattr(self.config, "_cvat_started_infra_profile", RuntimeInfraConfig.get_infra_profile())
        self._run_local_lifecycle(
            infra_mode=infra_mode,
            dumpdb=config.getoption("--dumpdb"),
            cleanup=config.getoption("--cleanup"),
        )
        setattr(self.config, "_cvat_started_infra_profile", RuntimeInfraConfig.get_infra_profile())

    def reconcile_runtime_profile(self) -> None:
        infra_mode = getattr(self.config, "_cvat_infra_mode", InfraMode.AUTO)
        if infra_mode not in {InfraMode.AUTO, InfraMode.REUSE}:
            return

        resolve_local_project_context(self.session)
        self._run_local_lifecycle(infra_mode=infra_mode, dumpdb=False, cleanup=False)
        setattr(self.config, "_cvat_started_infra_profile", RuntimeInfraConfig.get_infra_profile())

    def finish(self) -> None:
        if self.config.getoption("--platform") != "local":
            return

        if self.config.getoption("--collect-only"):
            return

        if self.should_collect_failure_logs():
            self.collect_failure_logs()

        self._close_db_restorer()
        self._close_redis_restorer()

        if os.environ.get("COVERAGE_PROCESS_START"):
            self.collect_code_coverage_from_containers()

        infra_mode = getattr(self.config, "_cvat_infra_mode", InfraMode.AUTO)
        run_prefix = RuntimeInfraConfig.get_run_prefix_from_config(self.config)
        cleanup_after_session(
            infra_mode=infra_mode,
            run_prefix=run_prefix,
        )

    def collect_failure_logs(self) -> None:
        project_cfg = RuntimeInfraConfig.get_project_config(
            RuntimeInfraConfig.get_run_prefix_from_config(self.config)
        )
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
        self._get_db_restorer().restore_from_template(source_db="test_db", target_db="cvat")

    def restore_clickhouse_db(self) -> None:
        self.exec_cvat(
            [
                "/bin/sh",
                "-c",
                f'python "{RuntimeInfraConfig.get_clickhouse_init_script()}" --clear',
            ]
        )

    def restore_redis_inmem(self) -> None:
        self._get_redis_restorer().restore_inmem()

    def restore_redis_ondisk(self) -> None:
        self._get_redis_restorer().restore_ondisk()

    def drain_background_jobs(self, *, timeout_seconds: int = 20) -> None:
        if self._background_job_cleaner is None:
            self._background_job_cleaner = BackgroundJobCleaner(
                self._get_redis_restorer().inmem_db0
            )

        # Drain async queues before DB restore; otherwise already queued jobs can
        # repopulate state after the restored snapshot is applied.
        self._background_job_cleaner.drain(_BACKGROUND_JOB_QUEUES, timeout_seconds=timeout_seconds)


class LocalPlugin(InfraPlugin):
    @classmethod
    def register_options(cls, group) -> None:
        pass

    @classmethod
    def configure(cls, config) -> None:
        preconfigure_local_runtime_env(config)

    @classmethod
    def collection_modifyitems(cls, config, items) -> None:
        if config.getoption("--platform") != "local":
            return

        required_profile = str(InfraProfile.SIMPLE)
        for item in items:
            marker = item.get_closest_marker("infra_profile")
            if marker and marker.args:
                item_profile = str(RuntimeInfraConfig.parse_infra_profile(marker.args[0]))
            else:
                item_profile = str(InfraProfile.SIMPLE)

            if RuntimeInfraConfig.get_infra_profile_rank(
                item_profile
            ) > RuntimeInfraConfig.get_infra_profile_rank(required_profile):
                required_profile = item_profile

        requested_profile = config.getoption("--infra-profile")
        if requested_profile is not None:
            selected_profile = str(RuntimeInfraConfig.parse_infra_profile(requested_profile))
            if RuntimeInfraConfig.get_infra_profile_rank(
                selected_profile
            ) < RuntimeInfraConfig.get_infra_profile_rank(required_profile):
                raise pytest.UsageError(
                    f"--infra-profile={selected_profile!r} is too small for the collected test set; "
                    f"required profile is {required_profile!r}"
                )
        else:
            selected_profile = required_profile

        setattr(config, "_cvat_selected_infra_profile", selected_profile)
        os.environ["CVAT_TEST_INFRA_PROFILE"] = selected_profile

    @classmethod
    def runtestloop(cls, session):
        config = session.config
        if config.getoption("--platform") != "local" or config.getoption("--collect-only"):
            return None

        selected_profile = getattr(config, "_cvat_selected_infra_profile", None)
        if not selected_profile:
            return None

        started_profile = getattr(
            config, "_cvat_started_infra_profile", RuntimeInfraConfig.get_infra_profile()
        )
        if str(started_profile) == str(selected_profile):
            return None

        os.environ["CVAT_TEST_INFRA_PROFILE"] = str(selected_profile)
        instance = getattr(config, "_cvat_infra_instance", None)
        if instance is not None:
            instance.reconcile_runtime_profile()
        return None

    @classmethod
    def can_handle_config(cls, config) -> bool:
        return config.getoption("--platform") == "local"


LocalInstance.plugin_class = LocalPlugin
