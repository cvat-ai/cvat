# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import logging
from subprocess import run


def run_command(
    command: list[str],
    capture_output=True,
    *,
    logger: logging.Logger | None = None,
):
    result = run(
        command,
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
    run_command(["docker", "container", "cp", str(source), str(target)], logger=logger)
