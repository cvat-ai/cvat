# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import logging
import sys
from pathlib import Path
from subprocess import CalledProcessError

import pytest
from infra import health as infra_health
from infra.config import RuntimeConfig, RuntimeMode
from infra.system_utils import docker_cp, run_command

from .compose import (
    build_local_dc_files,
    create_compose_files,
    delete_compose_files,
    start_services,
    stop_services,
)
from .docker import project_containers_running, running_containers
from .stack import StackCompatibilityError, ensure_project_stack_compatible

logger = logging.getLogger(__name__)


def run_local_runtime_lifecycle(instance, *, runtime_mode: RuntimeMode, cleanup: bool) -> None:
    local_runtime = RuntimeConfig.get_local_runtime_config(
        cvat_root_dir=instance.deps.cvat_root_dir
    )
    project_name = local_runtime.project_name
    compose_files = build_local_dc_files(local_runtime, extra_dc_files=instance.deps.extra_dc_files)
    generated_compose_files = local_runtime.generated_compose_files

    if runtime_mode == RuntimeMode.DUMPDB:
        dump_db(
            prefixed_container_name=local_runtime.prefixed_container_name,
            cvat_root_dir=instance.deps.cvat_root_dir,
            cvat_db_dir=instance.deps.cvat_db_dir,
        )
        pytest.exit("data.json has been updated", returncode=0)

    if cleanup:
        delete_compose_files(generated_compose_files)
        pytest.exit("All generated test files have been deleted", returncode=0)

    project_running = project_containers_running(project_name)

    delete_compose_files(generated_compose_files)
    create_compose_files(
        generated_compose_files,
        instance.deps.cvat_root_dir,
        local_runtime,
    )

    if runtime_mode == RuntimeMode.DOWN:
        stop_services(
            project_name=project_name,
            dc_files=compose_files,
            project_directory=instance.deps.cvat_root_dir,
        )
        local_runtime.delete_state()
        pytest.exit("All testing containers are stopped", returncode=0)

    stack_ok = True
    incompatibility_reason = ""
    try:
        ensure_project_stack_compatible(local_runtime)
    except StackCompatibilityError as exc:
        stack_ok = False
        incompatibility_reason = str(exc)

    if project_running and not stack_ok and runtime_mode == RuntimeMode.AUTO:
        logger.warning(
            "Project '%s' is running but incompatible with the requested test runtime "
            "(%s); recreating stack",
            project_name,
            incompatibility_reason,
        )
        stop_services(
            project_name=project_name,
            dc_files=compose_files,
            project_directory=instance.deps.cvat_root_dir,
        )
        project_running = False

    if runtime_mode == RuntimeMode.UP:
        start_services(
            project_name=project_name,
            default_project_name=RuntimeConfig.get_default_run_prefix(),
            dc_files=compose_files,
            project_directory=instance.deps.cvat_root_dir,
        )
        infra_health.wait_for_services(instance.deps.waiting_time)
        restore_runtime_state_from_assets(instance, local_runtime)
        pytest.exit("All necessary containers have been created and started.", returncode=0)

    if runtime_mode == RuntimeMode.AUTO:
        _set_auto_started(local_runtime, not project_running)

    if not project_running:
        start_services(
            project_name=project_name,
            default_project_name=RuntimeConfig.get_default_run_prefix(),
            dc_files=compose_files,
            project_directory=instance.deps.cvat_root_dir,
        )

    restore_runtime_state_from_assets(instance, local_runtime)


def restore_runtime_state_from_assets(instance, local_runtime) -> None:
    prefixed_name = local_runtime.prefixed_container_name
    instance.restore_cvat_data()
    docker_cp(
        instance.deps.cvat_db_dir / "restore.sql",
        f"{prefixed_name('cvat_db')}:/tmp/restore.sql",
    )
    docker_cp(
        instance.prepare_runtime_db_fixture(),
        f"{prefixed_name('cvat_server')}:/tmp/data.json",
    )
    infra_health.wait_for_services(instance.deps.waiting_time)
    instance.exec_cvat(
        [
            "sh",
            "-c",
            "./manage.py flush --no-input && ./manage.py loaddata_sorted /tmp/data.json",
        ]
    )
    run_command(
        [
            "docker",
            "exec",
            prefixed_name("cvat_db"),
            "psql",
            "-U",
            "root",
            "-d",
            "postgres",
            "-v",
            "from=cvat",
            "-v",
            "to=test_db",
            "-f",
            "/tmp/restore.sql",
        ],
        logger=logger,
    )
    instance.restore_clickhouse_db()
    instance.restore_redis_inmem()
    instance.restore_redis_ondisk()
    infra_health.wait_for_auth_login_ready()


def dump_db(*, prefixed_container_name, cvat_root_dir: Path, cvat_db_dir: Path) -> None:
    if prefixed_container_name("cvat_server") not in running_containers():
        pytest.exit("CVAT is not running")
    try:
        run_command(
            [
                sys.executable,
                str(cvat_root_dir / "tests/python/shared/utils/dump_test_db.py"),
                "--container",
                prefixed_container_name("cvat_server"),
                "--output",
                str(cvat_db_dir / "data.json"),
            ],
            capture_output=False,
            logger=logger,
        )
    except CalledProcessError:
        pytest.exit("Database dump failed.\n")


def _set_auto_started(local_runtime, value: bool) -> None:
    state = local_runtime.load_state() or {}
    state["auto_started"] = value
    local_runtime.save_state(state)
