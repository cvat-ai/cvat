# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os

import pytest
from infra import options as infra_options
from infra.config import (
    InfraMode,
    InfraProfile,
    RuntimeInfraConfig,
)
from infra.instances import InfraInstance, InstanceConfig
from infra.profiler import RuntimeProfilerPlugin
from infra.system_utils import run_command
from infra.version_check import run_sanity_version_check

# Register fixture modules explicitly.
pytest_plugins = [
    "shared.fixtures.data",
    "shared.fixtures.util",
    "infra.fixtures",
]


def pytest_configure(config) -> None:
    if not config.getoption("--parallel-child"):
        os_profile = str(config.getoption("--infra-profile") or "").strip()
        if os_profile:
            os.environ["CVAT_TEST_INFRA_PROFILE"] = os_profile

    RuntimeInfraConfig.initialize(config)
    for profile in RuntimeInfraConfig.get_infra_profiles():
        marker_name = RuntimeInfraConfig.get_required_marker_name(profile)
        config.addinivalue_line(
            "markers",
            f"{marker_name}: Auto-assigned marker for tests requiring {profile} profile.",
        )

    for plugin_class in _selected_plugin_classes(config):
        plugin_class.configure(config)

    plugin_name = "cvat_runtime_profiler"
    if config.pluginmanager.get_plugin(plugin_name) is None:
        config.pluginmanager.register(RuntimeProfilerPlugin(config), plugin_name)


def pytest_addoption(parser):
    group = infra_options.add_infra_options(parser)
    InfraInstance.register_all_options(group)


def pytest_report_header(config):
    return (
        f"CVAT pytest runtime directory: {RuntimeInfraConfig.get_runtime_root_dir()}\n"
        f"CVAT pytest run id: {RuntimeInfraConfig.get_run_id()}\n"
        f"CVAT pytest run artifacts: {RuntimeInfraConfig.get_run_dir()}"
    )


def pytest_runtestloop(session):
    result = None
    for plugin_class in _selected_plugin_classes(session.config):
        hook_result = plugin_class.runtestloop(session)
        if hook_result is not None:
            result = hook_result
    return result


def pytest_sessionstart(session) -> None:
    config = session.config

    # Support positional control commands while keeping `--infra` as source of truth.
    infra_mode = RuntimeInfraConfig.parse_infra_mode(config.getoption("--infra"))
    if infra_mode == InfraMode.AUTO:
        args = list(config.args)
        for candidate in (
            str(InfraMode.UP),
            str(InfraMode.DOWN),
            str(InfraMode.RESTORE_DB),
            str(InfraMode.BUILD_IMAGES),
        ):
            if candidate in args:
                args.remove(candidate)
                config.args[:] = args
                infra_mode = RuntimeInfraConfig.parse_infra_mode(candidate)
                break

    setattr(config, "_cvat_infra_mode", infra_mode)

    cleanup = bool(config.getoption("--cleanup"))
    dumpdb = bool(config.getoption("--dumpdb"))
    collect_only = bool(config.getoption("--collect-only"))
    platform = str(config.getoption("--platform"))
    parallel = config.getoption("--parallel")
    if collect_only and any(
        (
            cleanup,
            dumpdb,
            infra_mode
            in {InfraMode.UP, InfraMode.DOWN, InfraMode.RESTORE_DB, InfraMode.BUILD_IMAGES},
        )
    ):
        raise pytest.UsageError(
            "--collect-only is not compatible with --cleanup/--dumpdb/"
            "--infra=up/down/restore-db/build-images"
        )
    if platform == "kube" and any((cleanup, dumpdb)):
        raise pytest.UsageError("--platform=kube does not support --cleanup/--dumpdb")
    if infra_mode == InfraMode.RESTORE_DB and parallel is not None:
        raise pytest.UsageError("--infra=restore-db is not supported with --parallel")

    if infra_mode == InfraMode.BUILD_IMAGES:
        cvat_root_dir = RuntimeInfraConfig.get_cvat_root_dir()
        run_command(
            [
                "docker",
                "compose",
                "-f",
                str(cvat_root_dir / "docker-compose.yml"),
                "-f",
                str(cvat_root_dir / "docker-compose.dev.yml"),
                "build",
                "cvat_server",
                "cvat_ui",
            ],
            capture_output=False,
        )
        pytest.exit("CVAT images have been rebuilt (cvat/server:dev, cvat/ui:dev)", returncode=0)

    if config.getoption("--container-debug-wait") and not config.getoption("--container-debug"):
        raise pytest.UsageError(
            "--container-debug-wait requires --container-debug with at least one service"
        )

    should_run_version_check = (
        not collect_only
        and infra_mode
        not in {InfraMode.UP, InfraMode.DOWN, InfraMode.RESTORE_DB, InfraMode.BUILD_IMAGES}
        and not any((cleanup, dumpdb))
        and not bool(config.getoption("--parallel-child"))
        and not bool(config.getoption("--skip-version-check"))
    )
    if collect_only:
        return

    instance_config = InstanceConfig(
        cvat_root_dir=RuntimeInfraConfig.get_cvat_root_dir(),
        cvat_db_dir=RuntimeInfraConfig.get_cvat_db_dir(),
        waiting_time=300,
        extra_dc_files=None,
        default_infra_profile=RuntimeInfraConfig.get_default_infra_profile(),
        profile_dc_files=RuntimeInfraConfig.get_profile_dc_files(),
    )
    instance = InfraInstance.create(session, instance_config)
    setattr(config, "_cvat_infra_instance", instance)
    instance.start()

    if should_run_version_check:
        run_sanity_version_check(
            cvat_root_dir=RuntimeInfraConfig.get_cvat_root_dir(), platform=platform
        )


def pytest_sessionfinish(session, exitstatus: int) -> None:
    if session.config.getoption("--collect-only"):
        return

    setattr(session.config, "_cvat_exitstatus", int(exitstatus))
    instance = getattr(session.config, "_cvat_infra_instance", None)
    if instance is not None:
        instance.finish()


@pytest.hookimpl(tryfirst=True)
def pytest_collection_modifyitems(config, items) -> None:
    _assign_required_infra_markers(items)
    for plugin_class in _selected_plugin_classes(config):
        plugin_class.collection_modifyitems(config, items)


def _assign_required_infra_markers(items) -> None:
    for item in items:
        marker = item.get_closest_marker("infra_profile")
        required = marker.args[0] if marker and marker.args else str(InfraProfile.SIMPLE)
        required = str(RuntimeInfraConfig.parse_infra_profile(required))
        item.add_marker(getattr(pytest.mark, RuntimeInfraConfig.get_required_marker_name(required)))


def _selected_runtime_class(config):
    selected = getattr(config, "_cvat_runtime_class", None)
    if selected is None:
        selected = InfraInstance.select_runtime_class_for_config(config)
        setattr(config, "_cvat_runtime_class", selected)
    return selected


def _selected_plugin_classes(config):
    classes = getattr(config, "_cvat_plugin_classes", None)
    if classes is None:
        _selected_runtime_class(config)
        classes = InfraInstance.select_plugin_classes_for_config(config)
        setattr(config, "_cvat_plugin_classes", classes)
    return classes
