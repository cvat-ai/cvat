# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
import re
from pathlib import Path
from subprocess import CalledProcessError, run
from time import sleep
import yaml

import pytest
from infra.config import (
    CLICKHOUSE_INIT_SCRIPT,
    DEFAULT_PROJECT_NAME,
    InfraMode,
    infra_profile,
    logger,
    parse_infra_mode,
    prefixed_container_name,
    project_config,
    run_prefix_from_config,
)
from infra.debug import (
    DEFAULT_DEBUG_PORT_BASE,
    DEBUG_SERVICE_TO_CONTAINER,
    DEBUG_SERVICE_TO_CONTAINER_PORT,
)
from infra.debug.host_debug import add_vscode_debug_options, maybe_wait_for_vscode_attach
from infra.parsing import parse_debug_services
from infra.system_utils import docker_cp, is_port_free, pick_free_port, run_command

from infra.instances.base_instance import InfraInstance, InfraPlugin

_COVERED_CONTAINERS = (
    "cvat_server",
    "cvat_worker_annotation",
    "cvat_worker_import",
    "cvat_worker_export",
    "cvat_worker_quality_reports",
    "cvat_worker_webhooks",
    "cvat_worker_utils",
)


def add_container_debug_options(group) -> None:
    group._addoption(
        "--container-debug",
        action="store",
        default="",
        help=(
            "Enable container-side debugpy for selected services. "
            "Use comma-separated names: "
            + ", ".join(DEBUG_SERVICE_TO_CONTAINER.keys())
            + ", workers, all."
        ),
    )
    group._addoption(
        "--container-debug-wait",
        action="store_true",
        default=False,
        help="When --container-debug is enabled, wait for debugger attach before processing requests/jobs.",
    )
    group._addoption(
        "--container-debug-port-base",
        action="store",
        type=int,
        default=DEFAULT_DEBUG_PORT_BASE,
        help=(
            "Base host port for container debugpy mappings in --container-debug mode. "
            "Per-service ports are allocated starting from this value."
        ),
    )


def resolve_debug_port_config(
    *,
    requested_services: list[str],
    debug_port_base: int,
    state: dict,
    project_running: bool,
    running_service_ports: dict[str, dict[int, int]],
    used_ports: set[int],
    is_port_free,
    pick_free_port,
) -> dict[str, int]:
    if not requested_services:
        return {}

    stored_ports = state.get("debug", {}).get("ports", {})
    debug_ports: dict[str, int] = {}
    for offset, service_name in enumerate(requested_services):
        container_name = DEBUG_SERVICE_TO_CONTAINER[service_name]
        container_debug_port = DEBUG_SERVICE_TO_CONTAINER_PORT[service_name]
        existing_host_port = running_service_ports.get(container_name, {}).get(container_debug_port)
        if existing_host_port:
            debug_ports[service_name] = int(existing_host_port)
            used_ports.add(int(existing_host_port))
            continue

        stored_host_port = stored_ports.get(service_name)
        if isinstance(stored_host_port, int) and (project_running or is_port_free(stored_host_port)):
            debug_ports[service_name] = stored_host_port
            used_ports.add(stored_host_port)
            continue

        start = debug_port_base + offset
        debug_ports[service_name] = pick_free_port(start, used_ports)

    return debug_ports


def apply_compose_debug(service_name: str, service_config: dict, *, is_dev: bool, debug_state: dict) -> None:
    if is_dev:
        return

    debug_services = set(debug_state.get("services", []))
    debug_wait = bool(debug_state.get("wait", False))
    debug_ports = debug_state.get("ports", {})

    debug_service_name = next(
        (
            candidate
            for candidate, container_name in DEBUG_SERVICE_TO_CONTAINER.items()
            if container_name == service_name
        ),
        None,
    )
    if not debug_service_name or debug_service_name not in debug_services:
        return

    host_port = debug_ports.get(debug_service_name)
    if not isinstance(host_port, int):
        return

    container_port = DEBUG_SERVICE_TO_CONTAINER_PORT[debug_service_name]
    service_env = service_config.setdefault("environment", {})
    service_env["CVAT_DEBUG_ENABLED"] = "yes"
    service_env["CVAT_DEBUG_PORT"] = str(container_port)
    service_env["CVAT_DEBUG_WAIT"] = "yes" if debug_wait else "no"
    service_env["NUMPROCS"] = "1"

    ports = service_config.setdefault("ports", [])
    mapping = f"{host_port}:{container_port}"
    if mapping not in ports:
        ports.append(mapping)


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
    project_name = run_prefix_from_config(config)
    infra_mode = parse_infra_mode(config.getoption("--infra"))
    requested_debug_services = parse_debug_services(config.getoption("--container-debug"))
    debug_port_base = int(config.getoption("--container-debug-port-base"))
    os.environ["CVAT_TEST_INFRA_PROFILE"] = config.getoption("--parallel-lane-profile")

    if config.getoption("--platform") != "local":
        return

    if infra_mode == InfraMode.DOWN:
        os.environ["CVAT_TEST_RUN_PREFIX"] = project_name
        return

    project_cfg = project_config(project_name)
    port_config = resolve_port_config(
        project_cfg,
        default_project_name=DEFAULT_PROJECT_NAME,
        test_http_port=config.getoption("test_http_port"),
        test_logs_port=config.getoption("test_logs_port"),
        test_minio_port=config.getoption("test_minio_port"),
        test_minio_console_port=config.getoption("test_minio_console_port"),
        run_command_fn=lambda cmd, capture=True: run_command(cmd, capture_output=capture, logger=logger),
        running_containers_fn=lambda: running_containers(
            lambda cmd, capture=True: run_command(cmd, capture_output=capture, logger=logger)
        ),
        logger=logger,
    )
    project_state = project_cfg.load_state() or {}
    project_running = project_containers_running(
        project_cfg.project_name,
        lambda: running_containers(
            lambda cmd, capture=True: run_command(cmd, capture_output=capture, logger=logger)
        ),
    )
    run_local_command = lambda cmd, capture=True: run_command(cmd, capture_output=capture, logger=logger)
    running_service_ports = (
        project_service_port_map(project_cfg.project_name, run_local_command) if project_running else {}
    )
    used_ports = project_host_ports(project_cfg.project_name, run_local_command)
    debug_ports = resolve_debug_port_config(
        requested_services=requested_debug_services,
        debug_port_base=debug_port_base,
        state=project_state,
        project_running=project_running,
        running_service_ports=running_service_ports,
        used_ports=used_ports,
        is_port_free=lambda port: is_port_free(port, logger=logger),
        pick_free_port=lambda start, used_ports: pick_free_port(start, used_ports, logger=logger),
    )
    setattr(config, "_cvat_debug_services", requested_debug_services)
    setattr(config, "_cvat_debug_ports", debug_ports)
    _configure_runtime_env(project_name=project_name, port_config=port_config)


def resolve_local_project_context(session) -> tuple[str, dict]:
    config = session.config
    project_name = run_prefix_from_config(config)
    project_cfg = project_config(project_name)
    run_local_command = lambda cmd, capture=True: run_command(cmd, capture_output=capture, logger=logger)
    running_containers_fn = lambda: running_containers(run_local_command)
    port_config = resolve_port_config(
        project_cfg,
        default_project_name=DEFAULT_PROJECT_NAME,
        test_http_port=config.getoption("test_http_port"),
        test_logs_port=config.getoption("test_logs_port"),
        test_minio_port=config.getoption("test_minio_port"),
        test_minio_console_port=config.getoption("test_minio_console_port"),
        run_command_fn=run_local_command,
        running_containers_fn=running_containers_fn,
        logger=logger,
    )
    requested_debug_services = parse_debug_services(config.getoption("--container-debug"))
    debug_wait = bool(config.getoption("--container-debug-wait"))
    debug_port_base = int(config.getoption("--container-debug-port-base"))
    project_state = project_cfg.load_state() or {}
    project_running = project_containers_running(project_cfg.project_name, running_containers_fn)
    running_service_ports = (
        project_service_port_map(project_cfg.project_name, run_local_command) if project_running else {}
    )
    used_ports = project_host_ports(project_cfg.project_name, run_local_command)
    debug_ports = resolve_debug_port_config(
        requested_services=requested_debug_services,
        debug_port_base=debug_port_base,
        state=project_state,
        project_running=project_running,
        running_service_ports=running_service_ports,
        used_ports=used_ports,
        is_port_free=lambda port: is_port_free(port, logger=logger),
        pick_free_port=lambda start, used_ports: pick_free_port(start, used_ports, logger=logger),
    )
    setattr(config, "_cvat_debug_services", requested_debug_services)
    setattr(config, "_cvat_debug_ports", debug_ports)
    _configure_runtime_env(project_name=project_name, port_config=port_config)
    project_cfg.save_state(
        {
            "project_name": project_name,
            "infra_profile": config.getoption("--parallel-lane-profile"),
            **port_config,
            "base_url": os.environ["CVAT_BASE_URL"],
            "minio_endpoint_url": os.environ["CVAT_MINIO_ENDPOINT_URL"],
            "debug": {
                "services": requested_debug_services,
                "wait": debug_wait,
                "port_base": debug_port_base,
                "ports": debug_ports,
            },
        }
    )
    return project_name, port_config


def local_exec(container, command, capture_output=True):
    return run_command(
        f"docker exec -u root {prefixed_container_name(container)} {command}",
        capture_output=capture_output,
        logger=logger,
    )[0]


def local_exec_cvat(command: list[str] | str):
    base = f"docker exec {prefixed_container_name('cvat_server')}"
    _command = f"{base} {command}" if isinstance(command, str) else base.split() + command
    return run_command(_command, logger=logger)[0]


def local_exec_redis_inmem(command):
    return run_command(
        ["docker", "exec", prefixed_container_name("cvat_redis_inmem")] + command, logger=logger
    )[0]


def local_exec_redis_ondisk(command):
    run_command(["docker", "exec", prefixed_container_name("cvat_redis_ondisk")] + command, logger=logger)

_REDIS_INMEM_KEEP_KEYS = (
    "rq:worker:",
    "rq:workers",
    "rq:scheduler_instance:",
    "rq:queues:",
    "cvat:applied_migrations",
    "cvat:applied_migration:",
)


def running_containers(run_command_fn) -> list[str]:
    stdout, _ = run_command_fn("docker ps --format {{.Names}}")
    return [cn for cn in stdout.split("\n") if cn]


def project_containers_running(project_name: str, running_containers_fn) -> bool:
    containers = set(running_containers_fn())
    expected = {
        f"{project_name}_cvat_server_1",
        f"{project_name}_cvat_db_1",
        f"{project_name}_traefik_1",
    }
    return expected.issubset(containers)


def _profile_required_services(profile: str) -> set[str]:
    # Containers that distinguish core vs extended/full capabilities.
    if profile == "core":
        return set()
    if profile == "extended":
        return {"cvat_clickhouse", "minio", "webhook_receiver"}
    if profile == "full":
        return {"cvat_clickhouse", "minio", "webhook_receiver", "cvat_ui", "cvat_grafana", "cvat_vector"}
    return set()


def profile_services_ready(
    project_name: str, profile: str, running_containers_fn
) -> bool:
    required = _profile_required_services(profile)
    if not required:
        return True
    containers = set(running_containers_fn())
    return all(f"{project_name}_{service}_1" in containers for service in required)


def dump_db(*, prefixed_container_name, running_containers_fn, cvat_db_dir: Path) -> None:
    if prefixed_container_name("cvat_server") not in running_containers_fn():
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


def project_host_ports(project_name: str, run_command_fn) -> set[int]:
    ports: set[int] = set()
    output, _ = run_command_fn(["docker", "ps", "--format", "{{.Names}} {{.Ports}}"])
    for line in output.splitlines():
        if not line.startswith(f"{project_name}_"):
            continue
        for match in re.finditer(r":(\d+)->", line):
            ports.add(int(match.group(1)))
    return ports


def project_service_port_map(project_name: str, run_command_fn) -> dict[str, dict[int, int]]:
    service_ports: dict[str, dict[int, int]] = {}
    output, _ = run_command_fn(["docker", "ps", "--format", "{{.Names}} {{.Ports}}"])
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
            port_map[int(match.group(2))] = int(match.group(1))
    return service_ports


def resolve_port_config(
    project_cfg,
    *,
    default_project_name: str,
    test_http_port: int | None = None,
    test_logs_port: int | None = None,
    test_minio_port: int | None = None,
    test_minio_console_port: int | None = None,
    run_command_fn,
    running_containers_fn,
    logger=None,
) -> dict:
    state = project_cfg.load_state() or {}

    if project_cfg.project_name == default_project_name:
        return {
            "http_port": int(test_http_port if test_http_port is not None else state.get("http_port", 8080)),
            "logs_port": int(test_logs_port if test_logs_port is not None else state.get("logs_port", 8090)),
            "minio_port": int(test_minio_port if test_minio_port is not None else state.get("minio_port", 9000)),
            "minio_console_port": int(
                test_minio_console_port
                if test_minio_console_port is not None
                else state.get("minio_console_port", 9001)
            ),
        }

    project_running = project_containers_running(project_cfg.project_name, running_containers_fn)
    project_ports = project_host_ports(project_cfg.project_name, run_command_fn) if project_running else set()
    running_service_ports = (
        project_service_port_map(project_cfg.project_name, run_command_fn) if project_running else {}
    )

    if project_running:
        traefik_ports = running_service_ports.get("traefik", {})
        minio_ports = running_service_ports.get("minio", {})
        return {
            "http_port": int(test_http_port)
            if test_http_port is not None
            else int(traefik_ports.get(8080, state.get("http_port", 18080))),
            "logs_port": int(test_logs_port)
            if test_logs_port is not None
            else int(traefik_ports.get(8090, state.get("logs_port", 18090))),
            "minio_port": int(test_minio_port)
            if test_minio_port is not None
            else int(minio_ports.get(9000, state.get("minio_port", 19000))),
            "minio_console_port": int(test_minio_console_port)
            if test_minio_console_port is not None
            else int(minio_ports.get(9001, state.get("minio_console_port", 19001))),
        }

    def _state_port(name: str, default_start: int, used_ports: set[int]) -> int:
        value = state.get(name)
        if value is None:
            return pick_free_port(default_start, used_ports, logger=logger)
        port = int(value)
        if is_port_free(port, logger=logger) or (project_running and port in project_ports):
            used_ports.add(port)
            return port
        return pick_free_port(default_start, used_ports, logger=logger)

    used_ports: set[int] = set()
    return {
        "http_port": int(test_http_port)
        if test_http_port is not None
        else _state_port("http_port", 18080, used_ports),
        "logs_port": int(test_logs_port)
        if test_logs_port is not None
        else _state_port("logs_port", 18090, used_ports),
        "minio_port": int(test_minio_port)
        if test_minio_port is not None
        else _state_port("minio_port", 19000, used_ports),
        "minio_console_port": int(
            test_minio_console_port
            if test_minio_console_port is not None
            else _state_port("minio_console_port", 19001, used_ports)
        ),
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
    rebuild: bool,
    project_directory: Path,
    running_containers_fn,
    run_command_fn,
) -> None:
    if project_name == default_project_name and any(
        [cn in ["cvat_server", "cvat_db"] for cn in running_containers_fn()]
    ):
        pytest.exit(
            "It's looks like you already have running cvat containers. Stop them and try again. "
            f"List of running containers: {', '.join(running_containers_fn())}"
        )

    run_command_fn(
        docker_compose(project_name, dc_files, project_directory) + ["up", "-d", *["--build"] * rebuild],
        False,
    )


def rebuild_services(
    *,
    project_name: str,
    dc_files: list[Path],
    project_directory: Path,
    run_command_fn,
) -> None:
    run_command_fn(
        docker_compose(project_name, dc_files, project_directory) + ["build"],
        False,
    )


def stop_services(
    *,
    project_name: str,
    dc_files: list[Path],
    project_directory: Path,
    run_command_fn,
) -> None:
    run_command_fn(
        docker_compose(project_name, dc_files, project_directory) + ["down", "-v", "--remove-orphans"],
        False,
    )
    container_ids, _ = run_command_fn(
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
        run_command_fn(["docker", "rm", "-f", *stale_ids], False)


def _create_compose_files(
    container_name_files: list[Path],
    cvat_root_dir: Path,
    project_cfg,
    *,
    apply_compose_debug,
    covered_containers: list[str],
    server_container: str,
    worker_utils_container: str,
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

                if not is_dev_compose and service_name in (server_container, worker_utils_container):
                    service_env = service_config["environment"]
                    service_env["DJANGO_SETTINGS_MODULE"] = "cvat.settings.testing_rest"

                if not is_dev_compose and service_name in covered_containers:
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


def _delete_compose_files(container_name_files: list[Path]):
    for filename in container_name_files:
        filename.unlink(missing_ok=True)


def stop_project_services_best_effort(
    *,
    project_name: str,
    default_infra_profile: str,
    profile_dc_files: dict[str, list[str]],
    logger,
) -> None:
    project_cfg = project_config(project_name)
    saved_state = project_cfg.load_state() or {}
    saved_profile = str(saved_state.get("infra_profile") or default_infra_profile)

    dc_files = project_cfg.dc_files
    profile_files = profile_dc_files.get(saved_profile, [])
    if profile_files:
        dc_files += [project_cfg.cvat_root_dir / f for f in profile_files]

    try:
        stop_services(
            project_name=project_name,
            dc_files=dc_files,
            project_directory=project_cfg.cvat_root_dir,
            run_command_fn=lambda cmd, capture=True: run_command(
                cmd, capture_output=capture, logger=logger
            ),
        )
    except BaseException:
        logger.warning(
            "Failed to stop services for project '%s' during session cleanup",
            project_name,
            exc_info=True,
        )
    finally:
        project_cfg.delete_state()


def cleanup_after_session(
    *,
    infra_mode: InfraMode,
    run_prefix: str,
    profiles: list[str],
    is_parallel_child: bool,
    stop_project_services_best_effort_fn,
) -> None:
    if infra_mode != InfraMode.AUTO:
        return

    def should_stop_project(project_name: str) -> bool:
        state = project_config(project_name).load_state() or {}
        return bool(state.get("auto_started", False))

    if profiles and not is_parallel_child:
        for lane_idx in range(1, len(profiles) + 1):
            project_name = f"{run_prefix}{lane_idx}" if len(profiles) > 1 else run_prefix
            if should_stop_project(project_name):
                stop_project_services_best_effort_fn(project_name)
    elif should_stop_project(run_prefix):
        stop_project_services_best_effort_fn(run_prefix)


class LocalInstance(InfraInstance):
    plugin_class: type[InfraPlugin]
    exec_cvat = staticmethod(local_exec_cvat)
    exec_redis_inmem = staticmethod(local_exec_redis_inmem)

    @classmethod
    def can_handle_config(cls, config) -> bool:
        return config.getoption("--platform") == "local"

    @staticmethod
    def collect_code_coverage_from_containers(
        *, covered_containers, docker_exec, docker_cp, prefixed_container_name, sleep
    ) -> None:
        for container in covered_containers():
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
                f"{prefixed_container_name(container)}:home/django/coverage.json",
                f"coverage_{container}.json",
            )

    @classmethod
    def can_handle(cls, session, deps) -> bool:
        return cls.can_handle_config(session.config)

    def _build_local_dc_files(self, project_cfg) -> list[Path]:
        dc_files = project_cfg.dc_files
        active_profile_files = self.deps.profile_dc_files.get(infra_profile(), [])
        if active_profile_files:
            dc_files += [project_cfg.cvat_root_dir / f for f in active_profile_files]
        if self.deps.extra_dc_files is not None:
            dc_files += self.deps.extra_dc_files
        return dc_files

    def _run_local_lifecycle(
        self, *, infra_mode: InfraMode, dumpdb: bool, cleanup: bool, rebuild: bool
    ) -> None:
        from infra import health as infra_health

        project_cfg = project_config(cvat_root_dir=self.deps.cvat_root_dir)
        project_name = project_cfg.project_name
        dc_files = self._build_local_dc_files(project_cfg)
        container_name_files = project_cfg.generated_compose_files
        run_local_command = lambda cmd, capture=True: run_command(
            cmd, capture_output=capture, logger=logger
        )
        running_containers_fn = lambda: running_containers(run_local_command)

        def set_auto_started(value: bool) -> None:
            state = project_cfg.load_state() or {}
            state["auto_started"] = value
            project_cfg.save_state(state)

        if dumpdb:
            dump_db(
                prefixed_container_name=prefixed_container_name,
                running_containers_fn=running_containers_fn,
                cvat_db_dir=self.deps.cvat_db_dir,
            )
            pytest.exit("data.json has been updated", returncode=0)

        if cleanup:
            _delete_compose_files(container_name_files)
            pytest.exit("All generated test files have been deleted", returncode=0)

        project_running = project_containers_running(project_name, running_containers_fn)
        if infra_mode == InfraMode.REUSE:
            if not project_running:
                raise pytest.UsageError(
                    f"--infra={InfraMode.REUSE} requires running services for project '{project_name}'"
                )
            infra_health.wait_for_services(self.deps.waiting_time)
            infra_health.wait_for_auth_login_ready()
            return

        _delete_compose_files(container_name_files)
        _create_compose_files(
            container_name_files,
            self.deps.cvat_root_dir,
            project_cfg,
            apply_compose_debug=apply_compose_debug,
            covered_containers=list(_COVERED_CONTAINERS),
            server_container="cvat_server",
            worker_utils_container="cvat_worker_utils",
        )

        if infra_mode == InfraMode.AUTO and rebuild:
            rebuild_services(
                project_name=project_name,
                dc_files=dc_files,
                project_directory=self.deps.cvat_root_dir,
                run_command_fn=run_local_command,
            )
            pytest.exit("CVAT images have been rebuilt", returncode=0)

        if infra_mode == InfraMode.DOWN:
            stop_services(
                project_name=project_name,
                dc_files=dc_files,
                project_directory=self.deps.cvat_root_dir,
                run_command_fn=run_local_command,
            )
            project_cfg.delete_state()
            pytest.exit("All testing containers are stopped", returncode=0)

        if (
            infra_mode == InfraMode.AUTO
            and project_running
            and not profile_services_ready(project_name, infra_profile(), running_containers_fn)
        ):
            logger.warning(
                "Project '%s' is running but missing required services for profile '%s'; recreating stack",
                project_name,
                infra_profile(),
            )
            stop_services(
                project_name=project_name,
                dc_files=dc_files,
                project_directory=self.deps.cvat_root_dir,
                run_command_fn=run_local_command,
            )
            project_running = False

        if infra_mode == InfraMode.UP:
            if not project_running:
                start_services(
                    project_name=project_name,
                    default_project_name=DEFAULT_PROJECT_NAME,
                    dc_files=dc_files,
                    rebuild=bool(rebuild),
                    project_directory=self.deps.cvat_root_dir,
                    running_containers_fn=running_containers_fn,
                    run_command_fn=run_local_command,
                )
            infra_health.wait_for_services(self.deps.waiting_time)
            infra_health.wait_for_auth_login_ready()
            pytest.exit("All necessary containers have been created and started.", returncode=0)

        if infra_mode == InfraMode.AUTO:
            # In auto mode, tear down only stacks that this session had to start.
            set_auto_started(not project_running)

        if not project_running:
            start_services(
                project_name=project_name,
                default_project_name=DEFAULT_PROJECT_NAME,
                dc_files=dc_files,
                rebuild=bool(rebuild),
                project_directory=self.deps.cvat_root_dir,
                running_containers_fn=running_containers_fn,
                run_command_fn=run_local_command,
            )

        self.restore_cvat_data()
        docker_cp(
            self.deps.cvat_db_dir / "restore.sql",
            f"{project_name}_cvat_db_1:/tmp/restore.sql",
        )
        docker_cp(
            self.deps.cvat_db_dir / "data.json",
            f"{project_name}_cvat_server_1:/tmp/data.json",
        )
        infra_health.wait_for_services(self.deps.waiting_time)
        self.exec_cvat(["sh", "-c", "./manage.py flush --no-input && ./manage.py loaddata /tmp/data.json"])
        local_exec(
            "cvat_db", "psql -U root -d postgres -v from=cvat -v to=test_db -f /tmp/restore.sql"
        )
        infra_health.wait_for_auth_login_ready()

    def start(self) -> None:
        config = self.config
        infra_mode = getattr(config, "_cvat_infra_mode")
        project_name = run_prefix_from_config(config)

        if config.getoption("--collect-only"):
            return

        if infra_mode == InfraMode.DOWN:
            os.environ["CVAT_TEST_RUN_PREFIX"] = project_name
        else:
            resolve_local_project_context(self.session)

        self._run_local_lifecycle(
            infra_mode=infra_mode,
            dumpdb=config.getoption("--dumpdb"),
            cleanup=config.getoption("--cleanup"),
            rebuild=config.getoption("--rebuild"),
        )

        if infra_mode == InfraMode.AUTO:
            maybe_wait_for_vscode_attach(self.session, cvat_root_dir=self.deps.cvat_root_dir)

    def finish(self) -> None:
        if self.config.getoption("--platform") != "local":
            return

        if self.config.getoption("--collect-only"):
            return

        if os.environ.get("COVERAGE_PROCESS_START"):
            self.collect_code_coverage_from_containers(
                covered_containers=lambda: list(_COVERED_CONTAINERS),
                docker_exec=local_exec,
                docker_cp=docker_cp,
                prefixed_container_name=prefixed_container_name,
                sleep=sleep,
            )

        infra_mode = getattr(self.config, "_cvat_infra_mode", InfraMode.AUTO)
        run_prefix = run_prefix_from_config(self.config)
        try:
            from infra.instances.parallel_instance import parse_parallel_count

            parallel_count = parse_parallel_count(self.config.getoption("--parallel"))
        except ValueError as ex:
            raise pytest.UsageError(str(ex)) from ex
        profiles = ["lane"] * parallel_count if parallel_count > 1 else []
        is_parallel_child = bool(self.config.getoption("--parallel-child"))

        def stop_project_for_cleanup(project_name: str) -> None:
            stop_project_services_best_effort(
                project_name=project_name,
                default_infra_profile=self.deps.default_infra_profile,
                profile_dc_files=self.deps.profile_dc_files,
                logger=self.deps.logger,
            )

        cleanup_after_session(
            infra_mode=infra_mode,
            run_prefix=run_prefix,
            profiles=profiles,
            is_parallel_child=is_parallel_child,
            stop_project_services_best_effort_fn=stop_project_for_cleanup,
        )

    def restore_db(self) -> None:
        local_exec(
            "cvat_db",
            "psql -U root -d postgres -v from=test_db -v to=cvat -f /tmp/restore.sql",
        )

    def restore_cvat_data(self) -> None:
        docker_cp(
            self.deps.cvat_db_dir / "cvat_data.tar.bz2",
            f"{prefixed_container_name('cvat_server')}:/tmp/cvat_data.tar.bz2",
        )
        self.exec_cvat("tar --strip 3 -xjf /tmp/cvat_data.tar.bz2 -C /home/django/data/")

    def restore_clickhouse_db(self) -> None:
        self.exec_cvat(["/bin/sh", "-c", f'python "{CLICKHOUSE_INIT_SCRIPT}" --clear'])

    def restore_redis_inmem(self) -> None:
        self.exec_redis_inmem(
            [
                "sh",
                "-c",
                # Redis in-memory DB layout in CVAT:
                # - DB 0: RQ metadata/worker queues (keep a small allowlist of runtime keys)
                # - DB 1: Django cache/throttle counters (must be fully reset between tests)
                # If DB 1 is not cleared, auth/about requests can be throttled (HTTP 429)
                # in later tests due to stale counters from previous runs.
                'redis-cli -e -n 0 --scan --pattern "*" |'
                'grep -v "'
                + r"\|".join(_REDIS_INMEM_KEEP_KEYS)
                + '" |'
                "xargs -r redis-cli -e -n 0 del && "
                "redis-cli -e -n 1 flushdb",
            ]
        )

    def restore_redis_ondisk(self) -> None:
        local_exec_redis_ondisk(["redis-cli", "-e", "-p", "6666", "flushall"])


class LocalPlugin(InfraPlugin):
    @classmethod
    def register_options(cls, group) -> None:
        add_container_debug_options(group)
        add_vscode_debug_options(group)

    @classmethod
    def configure(cls, config) -> None:
        preconfigure_local_runtime_env(config)

    @classmethod
    def can_handle_config(cls, config) -> bool:
        return config.getoption("--platform") == "local"


LocalInstance.plugin_class = LocalPlugin
