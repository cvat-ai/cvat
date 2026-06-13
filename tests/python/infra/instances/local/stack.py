# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import logging

from infra.config import LocalRuntimeConfig, RuntimeConfig, RuntimeMode

from .compose import build_local_dc_files, stop_services
from .docker import project_service_port_map

logger = logging.getLogger(__name__)


class StackCompatibilityError(RuntimeError):
    pass


def ensure_project_stack_compatible(local_runtime: LocalRuntimeConfig) -> None:
    project_name = local_runtime.project_name
    service_ports = project_service_port_map(project_name)
    expected_ports = {
        "traefik": {
            8080: local_runtime.host_http_port,
            8090: local_runtime.host_logs_port,
        },
        "cvat_db": {5432: local_runtime.host_db_port},
        "cvat_redis_inmem": {6379: local_runtime.host_redis_inmem_port},
        "cvat_redis_ondisk": {6666: local_runtime.host_redis_ondisk_port},
        "minio": {
            9000: local_runtime.host_minio_port,
            9001: local_runtime.host_minio_console_port,
        },
    }

    for service_name, expected_service_ports in expected_ports.items():
        actual_service_ports = service_ports.get(service_name, {})
        for container_port, expected_host_port in expected_service_ports.items():
            actual_host_port = int(actual_service_ports.get(container_port, -1))
            if actual_host_port != expected_host_port:
                raise StackCompatibilityError(
                    f"{service_name}:{container_port} host port mapping is missing "
                    f"or outdated (expected {expected_host_port}, got {actual_host_port})"
                )


def stop_project_services_best_effort(*, project_name: str) -> None:
    local_runtime = RuntimeConfig.get_local_runtime_config(project_name)
    compose_files = build_local_dc_files(local_runtime)

    try:
        stop_services(
            project_name=project_name,
            dc_files=compose_files,
            project_directory=local_runtime.cvat_root_dir,
        )
    except BaseException:
        logger.warning(
            "Failed to stop services for project '%s' during session cleanup",
            project_name,
            exc_info=True,
        )
    finally:
        local_runtime.delete_state()


def cleanup_after_session(*, runtime_mode: RuntimeMode, run_prefix: str) -> None:
    if runtime_mode != RuntimeMode.AUTO:
        return

    state = RuntimeConfig.get_local_runtime_config(run_prefix).load_state() or {}
    if bool(state.get("auto_started", False)):
        stop_project_services_best_effort(project_name=run_prefix)
