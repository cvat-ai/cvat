# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import pytest
from infra import options as infra_options
from infra.config import (
    CVAT_DB_DIR,
    CVAT_ROOT_DIR,
    DEFAULT_INFRA_PROFILE,
    PROFILE_DC_FILES,
    RUNTIME_ROOT_DIR,
    logger,
)
from infra.instances import InfraInstance, InstanceConfig

# Register fixture modules explicitly.
pytest_plugins = [
    "shared.fixtures.data",
    "shared.fixtures.util",
    "infra.fixtures",
]


def pytest_configure(config) -> None:
    for plugin_class in _selected_plugin_classes(config):
        plugin_class.configure(config)


def pytest_addoption(parser):
    group = infra_options.add_infra_options(parser)
    InfraInstance.register_all_options(group)


def pytest_report_header(config):
    return f"CVAT pytest runtime directory: {RUNTIME_ROOT_DIR}"


def pytest_runtestloop(session):
    result = None
    for plugin_class in _selected_plugin_classes(session.config):
        hook_result = plugin_class.runtestloop(session)
        if hook_result is not None:
            result = hook_result
    return result


def pytest_sessionstart(session) -> None:
    config = session.config

    # Support legacy positional control commands (`up`/`down`) while keeping `--infra` as source of truth.
    infra_mode = config.getoption("--infra")
    if infra_mode == "auto":
        args = list(config.args)
        for candidate in ("up", "down"):
            if candidate in args:
                args.remove(candidate)
                config.args[:] = args
                infra_mode = candidate
                break

    setattr(config, "_cvat_infra_mode", infra_mode)

    rebuild = bool(config.getoption("--rebuild"))
    cleanup = bool(config.getoption("--cleanup"))
    dumpdb = bool(config.getoption("--dumpdb"))
    collect_only = bool(config.getoption("--collect-only"))
    platform = str(config.getoption("--platform"))
    if collect_only and any((rebuild, cleanup, dumpdb, infra_mode in {"up", "down"})):
        raise pytest.UsageError(
            "--collect-only is not compatible with --rebuild/--cleanup/--dumpdb/--infra=up/down"
        )
    if platform == "kube" and any((rebuild, cleanup, dumpdb, infra_mode != "auto")):
        raise pytest.UsageError(
            "--platform=kube is not compatible with --rebuild/--cleanup/--dumpdb/--infra"
        )

    if config.getoption("--container-debug-wait") and not config.getoption("--container-debug"):
        raise pytest.UsageError("--container-debug-wait requires --container-debug with at least one service")

    instance_config = InstanceConfig(
        cvat_root_dir=CVAT_ROOT_DIR,
        cvat_db_dir=CVAT_DB_DIR,
        waiting_time=300,
        extra_dc_files=None,
        default_infra_profile=DEFAULT_INFRA_PROFILE,
        profile_dc_files=PROFILE_DC_FILES,
        logger=logger,
    )
    instance = InfraInstance.create(session, instance_config)
    setattr(config, "_cvat_infra_instance", instance)
    instance.start()


def pytest_sessionfinish(session, exitstatus: int) -> None:
    if session.config.getoption("--collect-only"):
        return

    instance = getattr(session.config, "_cvat_infra_instance", None)
    if instance is not None:
        instance.finish()


def pytest_collection_modifyitems(config, items) -> None:
    for plugin_class in _selected_plugin_classes(config):
        plugin_class.collection_modifyitems(config, items)


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
