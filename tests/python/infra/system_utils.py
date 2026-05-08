# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import logging
from subprocess import run


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
