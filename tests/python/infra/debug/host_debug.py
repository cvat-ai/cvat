# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import shutil
from pathlib import Path
from subprocess import run

import pytest


def add_vscode_debug_options(group) -> None:
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


def _generate_tests_vscode_workspace(
    config, debug_services: list[str], debug_ports: dict[str, int], cvat_root_dir: Path
) -> Path:
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
        host_port = debug_ports.get(service_name)
        if not isinstance(host_port, int):
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
    debug_services = getattr(config, "_cvat_debug_services", None)
    if debug_services is None:
        from infra.instances.local_instance import parse_debug_services

        debug_services = parse_debug_services(config.getoption("--container-debug"))
    debug_ports = getattr(config, "_cvat_debug_ports", {})
    workspace_path = _generate_tests_vscode_workspace(config, debug_services, debug_ports, cvat_root_dir)

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
