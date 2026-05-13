# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import logging
from pathlib import Path
from typing import Any

import pytest
import yaml
from infra.config import LocalRuntimeConfig
from infra.system_utils import run_command

from .constants import COVERED_CONTAINERS, LOCAL_DC_FILES
from .docker import running_containers

logger = logging.getLogger(__name__)


def build_local_dc_files(project_cfg: LocalRuntimeConfig, extra_dc_files: Any = None) -> list[Path]:
    dc_files = project_cfg.generated_compose_files + [
        project_cfg.cvat_root_dir / f for f in LOCAL_DC_FILES
    ]
    if extra_dc_files is not None:
        dc_files += extra_dc_files
    return dc_files


def docker_compose_command(
    project_name: str, dc_files: list[Path], project_directory: Path
) -> list[str]:
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
    running = running_containers()
    if project_name == default_project_name and any(
        [cn in ["cvat_server", "cvat_db"] for cn in running]
    ):
        pytest.exit(
            "It's looks like you already have running cvat containers. Stop them and try again. "
            f"List of running containers: {', '.join(running)}"
        )

    run_command(
        docker_compose_command(project_name, dc_files, project_directory)
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
        docker_compose_command(project_name, dc_files, project_directory)
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


def create_compose_files(
    container_name_files: list[Path],
    cvat_root_dir: Path,
    project_cfg: LocalRuntimeConfig,
):
    def namespace_traefik_labels(service_config: dict) -> None:
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

                if not is_dev_compose and service_name in COVERED_CONTAINERS:
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

                namespace_traefik_labels(service_config)

            yaml.dump(dc_config, ndcf)


def delete_compose_files(container_name_files: list[Path]):
    for filename in container_name_files:
        filename.unlink(missing_ok=True)
