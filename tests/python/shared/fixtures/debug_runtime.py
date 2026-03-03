# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import os
import shutil
from pathlib import Path
from subprocess import run

import pytest

DEFAULT_DEBUG_PORT_BASE = 39090
DEBUG_SERVICE_TO_CONTAINER = {
    "server": "cvat_server",
    "worker_annotation": "cvat_worker_annotation",
    "worker_chunks": "cvat_worker_chunks",
    "worker_consensus": "cvat_worker_consensus",
    "worker_export": "cvat_worker_export",
    "worker_import": "cvat_worker_import",
    "worker_quality_reports": "cvat_worker_quality_reports",
    "worker_utils": "cvat_worker_utils",
    "worker_webhooks": "cvat_worker_webhooks",
}
DEBUG_SERVICE_TO_CONTAINER_PORT = {
    "server": 5678,
    "worker_annotation": 5679,
    "worker_chunks": 5680,
    "worker_consensus": 5681,
    "worker_export": 5682,
    "worker_import": 5683,
    "worker_quality_reports": 5684,
    "worker_utils": 5685,
    "worker_webhooks": 5686,
}
DEBUG_SERVICE_ENV_PORT = {
    service_name: f"CVAT_DEBUG_{service_name.upper()}_PORT"
    for service_name in DEBUG_SERVICE_TO_CONTAINER
}


def add_pytest_options(group) -> None:
    group._addoption(
        "--container-debug",
        action="store",
        default=os.environ.get("CVAT_TEST_CONTAINER_DEBUG", ""),
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
    group._addoption(
        "--vscode",
        action="store_true",
        default=False,
        help=(
            "Enable VS Code attach mode for pytest process: open VS Code, "
            "wait for debugger attach, then continue test execution."
        ),
    )
    group._addoption(
        "--vscode-port",
        action="store",
        type=int,
        default=5678,
        help="Debugpy port for --vscode attach mode. (default: %(default)s)",
    )
    group._addoption(
        "--vscode-no-open",
        action="store_true",
        default=False,
        help="Do not run 'code' automatically when --vscode is enabled.",
    )
    group._addoption(
        "--vscode-break",
        action="store_true",
        default=False,
        help="Trigger an immediate debug breakpoint right after VS Code attaches.",
    )


def parse_debug_services(value: str | None) -> list[str]:
    if not value:
        return []

    services: list[str] = []
    for entry in (item.strip() for item in value.split(",") if item.strip()):
        if entry in {"all", "*"}:
            services.extend(DEBUG_SERVICE_TO_CONTAINER.keys())
            continue
        if entry == "workers":
            services.extend(
                service_name
                for service_name in DEBUG_SERVICE_TO_CONTAINER
                if service_name != "server"
            )
            continue
        services.append(entry)

    invalid = sorted(set(services) - set(DEBUG_SERVICE_TO_CONTAINER))
    if invalid:
        raise pytest.UsageError(
            f"Unknown debug service(s): {', '.join(invalid)}. "
            "Allowed: "
            + ", ".join(DEBUG_SERVICE_TO_CONTAINER.keys())
            + ", workers, all"
        )

    return list(dict.fromkeys(services))


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
    # Multiple worker/server processes in one container will try to bind the same
    # debugpy port. Force one process when debugger is enabled for that service.
    service_env["NUMPROCS"] = "1"

    ports = service_config.setdefault("ports", [])
    mapping = f"{host_port}:{container_port}"
    if mapping not in ports:
        ports.append(mapping)


def _vscode_attach_path_mappings() -> list[dict]:
    return [
        {
            "localRoot": "${workspaceFolder}",
            "remoteRoot": "/home/django/",
        },
        {
            "localRoot": "${workspaceFolder}/.env",
            "remoteRoot": "/opt/venv",
        },
    ]


def _generate_tests_vscode_workspace(config, debug_services: list[str], cvat_root_dir: Path) -> Path:
    workspace_path = cvat_root_dir / ".vscode" / "tests-debug.code-workspace"
    vscode_port = int(config.getoption("--vscode-port"))
    configurations: list[dict] = [
        {
            "name": "local: attach pytest (waiting)",
            "type": "debugpy",
            "request": "attach",
            "connect": {"host": "127.0.0.1", "port": vscode_port},
            "justMyCode": False,
        }
    ]
    container_config_names: list[str] = []
    for service_name in debug_services:
        env_name = DEBUG_SERVICE_ENV_PORT[service_name]
        host_port = os.environ.get(env_name)
        if not host_port:
            continue
        config_name = f"tests: attach container {service_name}"
        container_config_names.append(config_name)
        configurations.append(
            {
                "name": config_name,
                "type": "debugpy",
                "request": "attach",
                "connect": {"host": "127.0.0.1", "port": int(host_port)},
                "pathMappings": _vscode_attach_path_mappings(),
                "justMyCode": False,
            }
        )

    compounds: list[dict] = []
    if container_config_names:
        compounds.append(
            {
                "name": "tests: attach all enabled containers",
                "configurations": container_config_names,
            }
        )

    workspace = {
        "folders": [{"path": "."}],
        "launch": {
            "version": "0.2.0",
            "configurations": configurations,
            "compounds": compounds,
        },
    }

    with open(workspace_path, "w") as f:
        json.dump(workspace, f, indent=2)
    return workspace_path


def maybe_wait_for_vscode_attach(session, *, cvat_root_dir: Path) -> None:
    config = session.config
    if not config.getoption("--vscode"):
        return

    if config.getoption("--collect-only"):
        return

    try:
        import debugpy
    except ImportError as ex:
        raise pytest.UsageError(
            "--vscode requires debugpy. Install it in your env: pip install debugpy"
        ) from ex

    host = "127.0.0.1"
    port = config.getoption("--vscode-port")
    debugpy.listen((host, port))
    debug_services = parse_debug_services(config.getoption("--container-debug"))
    workspace_path = _generate_tests_vscode_workspace(config, debug_services, cvat_root_dir)

    terminal_reporter = config.pluginmanager.getplugin("terminalreporter")
    attach_messages = [
        f"[vscode] Generated workspace: {workspace_path}",
        f"[vscode] 1) In VS Code run: local: attach pytest (waiting) ({host}:{port})",
    ]
    if debug_services:
        attach_messages.append(
            "[vscode] 2) Attach containers: tests: attach all enabled containers "
            "(or individual 'tests: attach container <service>')"
        )
    for message in attach_messages:
        if terminal_reporter:
            terminal_reporter.write_line(message)
        else:
            print(message)

    if terminal_reporter:
        terminal_reporter.write_line(
            f"[vscode] Waiting for debugger attach on {host}:{port}. "
            "In VS Code use launch target: 'local: attach pytest (waiting)'"
        )
    else:
        print(
            f"[vscode] Waiting for debugger attach on {host}:{port}. "
            "In VS Code use launch target: 'local: attach pytest (waiting)'"
        )

    if not config.getoption("--vscode-no-open"):
        code_bin = shutil.which("code")
        if code_bin:
            run([code_bin, "-r", str(workspace_path)], check=False)  # nosec
        elif terminal_reporter:
            terminal_reporter.write_line(
                "[vscode] 'code' command not found in PATH; open VS Code manually."
            )

    debugpy.wait_for_client()

    if config.getoption("--vscode-break"):
        debugpy.breakpoint()
