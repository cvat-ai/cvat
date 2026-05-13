# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import logging
from pathlib import Path
from subprocess import CalledProcessError, run

import pytest
from infra import health as infra_health
from infra.config import RuntimeMode, RuntimeSettings
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


def run_local_lifecycle(
    instance, *, runtime_mode: RuntimeMode, dumpdb: bool, cleanup: bool
) -> None:
    project_cfg = RuntimeSettings.get_local_runtime_config(
        cvat_root_dir=instance.deps.cvat_root_dir
    )
    project_name = project_cfg.project_name
    dc_files = build_local_dc_files(project_cfg, extra_dc_files=instance.deps.extra_dc_files)
    container_name_files = project_cfg.generated_compose_files

    if dumpdb:
        dump_db(
            prefixed_container_name=project_cfg.prefixed_container_name,
            cvat_db_dir=instance.deps.cvat_db_dir,
        )
        pytest.exit("data.json has been updated", returncode=0)

    if cleanup:
        delete_compose_files(container_name_files)
        pytest.exit("All generated test files have been deleted", returncode=0)

    project_running = project_containers_running(project_name)
    if runtime_mode == RuntimeMode.REUSE:
        if not project_running:
            raise pytest.UsageError(
                f"--infra={RuntimeMode.REUSE} requires running services for project '{project_name}'"
            )
        try:
            ensure_project_stack_compatible(project_cfg)
        except StackCompatibilityError as exc:
            raise pytest.UsageError(
                f"--infra={RuntimeMode.REUSE} found an incompatible running stack for "
                f"project '{project_name}': {exc}"
            ) from exc
        infra_health.wait_for_services(instance.deps.waiting_time)
        infra_health.wait_for_auth_login_ready()
        return

    delete_compose_files(container_name_files)
    create_compose_files(
        container_name_files,
        instance.deps.cvat_root_dir,
        project_cfg,
    )

    if runtime_mode == RuntimeMode.DOWN:
        stop_services(
            project_name=project_name,
            dc_files=dc_files,
            project_directory=instance.deps.cvat_root_dir,
        )
        project_cfg.delete_state()
        pytest.exit("All testing containers are stopped", returncode=0)

    stack_ok = True
    incompatibility_reason = ""
    try:
        ensure_project_stack_compatible(project_cfg)
    except StackCompatibilityError as exc:
        stack_ok = False
        incompatibility_reason = str(exc)

    if project_running and not stack_ok and runtime_mode in {RuntimeMode.AUTO, RuntimeMode.UP}:
        logger.warning(
            "Project '%s' is running but incompatible with the requested test runtime "
            "(%s); recreating stack",
            project_name,
            incompatibility_reason,
        )
        stop_services(
            project_name=project_name,
            dc_files=dc_files,
            project_directory=instance.deps.cvat_root_dir,
        )
        project_running = False

    if runtime_mode == RuntimeMode.UP:
        if not project_running or instance.deps.rebuild_images_before_start:
            start_services(
                project_name=project_name,
                default_project_name=RuntimeSettings.get_default_run_prefix(),
                dc_files=dc_files,
                project_directory=instance.deps.cvat_root_dir,
                rebuild_images=instance.deps.rebuild_images_before_start,
            )
            infra_health.wait_for_services(instance.deps.waiting_time)
        restore_runtime_state_from_assets(instance, project_cfg)
        pytest.exit("All necessary containers have been created and started.", returncode=0)

    if runtime_mode == RuntimeMode.RESTORE:
        if not project_running:
            start_services(
                project_name=project_name,
                default_project_name=RuntimeSettings.get_default_run_prefix(),
                dc_files=dc_files,
                project_directory=instance.deps.cvat_root_dir,
                rebuild_images=instance.deps.rebuild_images_before_start,
            )
        restore_runtime_state_from_assets(instance, project_cfg)
        pytest.exit("CVAT test runtime has been restored from test assets.", returncode=0)

    if runtime_mode == RuntimeMode.AUTO:
        _set_auto_started(project_cfg, not project_running)

    if not project_running or instance.deps.rebuild_images_before_start:
        start_services(
            project_name=project_name,
            default_project_name=RuntimeSettings.get_default_run_prefix(),
            dc_files=dc_files,
            project_directory=instance.deps.cvat_root_dir,
            rebuild_images=instance.deps.rebuild_images_before_start,
        )

    restore_runtime_state_from_assets(instance, project_cfg)


def restore_runtime_state_from_assets(instance, project_cfg) -> None:
    prefixed_name = project_cfg.prefixed_container_name
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
            "./manage.py flush --no-input && ./manage.py loaddata /tmp/data.json",
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


def dump_db(*, prefixed_container_name, cvat_db_dir: Path) -> None:
    if prefixed_container_name("cvat_server") not in running_containers():
        pytest.exit("CVAT is not running")
    with open(cvat_db_dir / "data.json", "w") as output:
        try:
            run(  # nosec
                (
                    f"docker exec {prefixed_container_name('cvat_server')} "
                    "python manage.py dumpdata "
                    "--indent 2 --natural-foreign "
                    "--exclude=auth.permission --exclude=contenttypes"
                ).split(),
                stdout=output,
                check=True,
            )
        except CalledProcessError:
            pytest.exit("Database dump failed.\n")


def _set_auto_started(project_cfg, value: bool) -> None:
    state = project_cfg.load_state() or {}
    state["auto_started"] = value
    project_cfg.save_state(state)
