# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import logging
import os

from infra.config import RuntimeConfig, RuntimeMode

from .docker import project_containers_running, used_host_ports

logger = logging.getLogger(__name__)


def configure_runtime_env(
    project_name: str,
    port_config: dict,
) -> None:
    os.environ["CVAT_TEST_RUN_PREFIX"] = project_name
    os.environ["CVAT_BASE_URL"] = f"http://localhost:{port_config['http_port']}"
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


def configure_local_runtime_env(config, *, persist_state: bool) -> None:
    """
    Set runtime URL/ports and optionally persist the local runtime state.

    This runs once before collection so import-time config constants see the
    selected ports, and again during startup after the run context is known.
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

    local_runtime = RuntimeConfig.get_local_runtime_config(project_name)
    port_config = local_runtime.resolve_port_config(
        default_project_name=RuntimeConfig.get_default_run_prefix(),
        used_ports=used_host_ports(exclude_project_name=local_runtime.project_name),
        runtime_running=project_containers_running(local_runtime.project_name),
    )
    configure_runtime_env(
        project_name=project_name,
        port_config=port_config,
    )
    if persist_state:
        local_runtime.save_state(
            {
                "project_name": project_name,
                **port_config,
                "base_url": os.environ["CVAT_BASE_URL"],
                "minio_endpoint_url": os.environ["CVAT_MINIO_ENDPOINT_URL"],
            }
        )


def configure_local_runtime_env_before_collection(config) -> None:
    configure_local_runtime_env(config, persist_state=False)
