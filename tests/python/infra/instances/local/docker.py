# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import logging

from infra.config import RuntimeSettings
from infra.system_utils import run_command

from .constants import REQUIRED_RUNNING_CONTAINERS

logger = logging.getLogger(__name__)


def exec_container_as_root(container: str, command: list[str], capture_output=True):
    prefixed_name = RuntimeSettings.get_local_runtime_config().prefixed_container_name(container)
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
    expected = {f"{project_name}_{container}_1" for container in REQUIRED_RUNNING_CONTAINERS}
    return expected.issubset(containers)


def _container_belongs_to_project(container: dict, project_name: str) -> bool:
    names = [name.lstrip("/") for name in container.get("Names") or []]
    return any(name.startswith(f"{project_name}_") for name in names)


def used_host_ports(*, exclude_project_name: str | None = None) -> set[int]:
    ports: set[int] = set()
    for container in _docker_list_containers():
        if exclude_project_name and _container_belongs_to_project(container, exclude_project_name):
            continue
        for port in container.get("Ports") or []:
            public_port = port.get("PublicPort")
            if public_port is not None:
                ports.add(int(public_port))
    return ports


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
