# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import logging
import os

from infra.config import RuntimeMode, RuntimeSettings

from .docker import project_containers_running, used_host_ports

logger = logging.getLogger(__name__)


def configure_runtime_env(
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
    request = RuntimeSettings.resolve_request(config)
    project_name = request.run_prefix

    if request.platform != "local":
        return

    if request.collect_only or request.runtime_mode == RuntimeMode.DOWN:
        os.environ["CVAT_TEST_RUN_PREFIX"] = project_name
        return

    project_cfg = RuntimeSettings.get_local_runtime_config(project_name)
    port_config = project_cfg.resolve_port_config(
        default_project_name=RuntimeSettings.get_default_run_prefix(),
        used_ports=used_host_ports(exclude_project_name=project_cfg.project_name),
        runtime_running=project_containers_running(project_cfg.project_name),
    )
    configure_runtime_env(
        project_name=project_name,
        port_config=port_config,
        base_url=request.external_base_url,
    )


def resolve_local_project_context(session) -> tuple[str, dict]:
    config = session.config
    request = RuntimeSettings.resolve_request(config)
    project_name = request.run_prefix
    project_cfg = RuntimeSettings.get_local_runtime_config(project_name)
    port_config = project_cfg.resolve_port_config(
        default_project_name=RuntimeSettings.get_default_run_prefix(),
        used_ports=used_host_ports(exclude_project_name=project_cfg.project_name),
        runtime_running=project_containers_running(project_cfg.project_name),
    )
    configure_runtime_env(
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
