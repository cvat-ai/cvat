# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import logging

from infra.config import LocalRuntimeConfig, RuntimeMode, RuntimeSettings

from .compose import build_local_dc_files, stop_services
from .docker import project_service_port_map

logger = logging.getLogger(__name__)


class StackCompatibilityError(RuntimeError):
    pass


def ensure_project_stack_compatible(project_cfg: LocalRuntimeConfig) -> None:
    project_name = project_cfg.project_name
    service_ports = project_service_port_map(project_name)

    if not _project_traefik_ports_ready(
        service_ports,
        expected_http_host_port=project_cfg.host_http_port,
        expected_logs_host_port=project_cfg.host_logs_port,
    ):
        raise StackCompatibilityError("Traefik host port mapping is missing or outdated")
    if not _project_db_port_ready(service_ports, project_cfg.host_db_port):
        raise StackCompatibilityError("PostgreSQL host port mapping is missing or outdated")
    if not _project_redis_ports_ready(
        service_ports,
        expected_inmem_host_port=project_cfg.host_redis_inmem_port,
        expected_ondisk_host_port=project_cfg.host_redis_ondisk_port,
    ):
        raise StackCompatibilityError("Redis host port mapping is missing or outdated")
    if not _project_minio_ports_ready(
        service_ports,
        expected_minio_host_port=project_cfg.host_minio_port,
        expected_minio_console_host_port=project_cfg.host_minio_console_port,
    ):
        raise StackCompatibilityError("MinIO host port mapping is missing or outdated")


def _project_db_port_ready(
    service_ports: dict[str, dict[int, int]], expected_host_port: int
) -> bool:
    db_ports = service_ports.get("cvat_db", {})
    return int(db_ports.get(5432, -1)) == expected_host_port


def _project_traefik_ports_ready(
    service_ports: dict[str, dict[int, int]],
    *,
    expected_http_host_port: int,
    expected_logs_host_port: int,
) -> bool:
    traefik_ports = service_ports.get("traefik", {})
    http_port = int(traefik_ports.get(8080, -1))
    logs_port = int(traefik_ports.get(8090, -1))
    return http_port == expected_http_host_port and logs_port == expected_logs_host_port


def _project_redis_ports_ready(
    service_ports: dict[str, dict[int, int]],
    *,
    expected_inmem_host_port: int,
    expected_ondisk_host_port: int,
) -> bool:
    inmem_port = int(service_ports.get("cvat_redis_inmem", {}).get(6379, -1))
    ondisk_port = int(service_ports.get("cvat_redis_ondisk", {}).get(6666, -1))
    return inmem_port == expected_inmem_host_port and ondisk_port == expected_ondisk_host_port


def _project_minio_ports_ready(
    service_ports: dict[str, dict[int, int]],
    *,
    expected_minio_host_port: int,
    expected_minio_console_host_port: int,
) -> bool:
    minio_ports = service_ports.get("minio", {})
    minio_port = int(minio_ports.get(9000, -1))
    console_port = int(minio_ports.get(9001, -1))
    return (
        minio_port == expected_minio_host_port and console_port == expected_minio_console_host_port
    )


def stop_project_services_best_effort(*, project_name: str) -> None:
    project_cfg = RuntimeSettings.get_local_runtime_config(project_name)
    dc_files = build_local_dc_files(project_cfg)

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

    state = RuntimeSettings.get_local_runtime_config(run_prefix).load_state() or {}
    if bool(state.get("auto_started", False)):
        stop_project_services_best_effort(project_name=run_prefix)
