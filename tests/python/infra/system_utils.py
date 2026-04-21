# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import errno
import logging
import socket
from subprocess import run

import pytest


def run_command(command, capture_output=True, *, logger: logging.Logger | None = None):
    shell = isinstance(command, str)
    result = run(
        command,
        shell=shell,
        check=True,
        capture_output=capture_output,
        text=True,
    )
    stdout = result.stdout.strip() if capture_output and result.stdout else ""
    stderr = result.stderr.strip() if capture_output and result.stderr else ""
    if logger and capture_output and stdout:
        logger.debug(stdout)
    return stdout, stderr


def is_port_free(port: int, *, logger: logging.Logger | None = None) -> bool:
    targets: list[tuple[int, tuple]] = [(socket.AF_INET, ("", port))]
    if socket.has_ipv6:
        targets.append((socket.AF_INET6, ("::", port, 0, 0)))

    for family, address in targets:
        try:
            with socket.socket(family, socket.SOCK_STREAM) as sock:
                sock.bind(address)
        except OSError as exc:
            if exc.errno in (errno.EADDRINUSE, errno.EACCES):
                return False
            if exc.errno in (errno.EADDRNOTAVAIL, errno.EAFNOSUPPORT):
                continue
            if logger:
                logger.debug(
                    "Unexpected error while probing port %s on %s: %s",
                    port,
                    "ipv6" if family == socket.AF_INET6 else "ipv4",
                    exc,
                )
            continue

    return True


def pick_free_port(
    start: int, used_ports: set[int], *, logger: logging.Logger | None = None
) -> int:
    for port in range(start, 65535):
        if port not in used_ports and is_port_free(port, logger=logger):
            used_ports.add(port)
            return port

    raise pytest.UsageError(f"Could not find a free TCP port starting from {start}")


def docker_cp(source, target, *, logger: logging.Logger | None = None) -> None:
    run_command(f"docker container cp {source} {target}", logger=logger)


def kubectl_cp(
    source,
    target,
    *,
    context: str | None = None,
    namespace: str | None = None,
    container: str | None = None,
    logger: logging.Logger | None = None,
) -> None:
    command: list[str] = ["kubectl"]
    if context:
        command += ["--context", context]
    if namespace:
        command += ["--namespace", namespace]
    command += ["cp", str(source), str(target)]
    if container:
        command += ["-c", container]
    run_command(command, logger=logger)
