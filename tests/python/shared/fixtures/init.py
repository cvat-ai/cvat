# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from pathlib import Path

from infra.config import RuntimeInfraConfig
from infra.fixtures import container_exec_cvat
from infra.system_utils import run_command

CVAT_ROOT_DIR = RuntimeInfraConfig.get_cvat_root_dir()


def get_server_image_tag() -> str:
    import os

    return f"cvat/server:{os.environ.get('CVAT_VERSION', 'dev')}"


def docker_exec_redis_inmem(command):
    return run_command(
        ["docker", "exec", RuntimeInfraConfig.get_prefixed_container_name("cvat_redis_inmem")]
        + list(command)
    )[0]


def kube_exec_redis_inmem(command):
    raise RuntimeError("Kubernetes runtime is not available in this split PR")
