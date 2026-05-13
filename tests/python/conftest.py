# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import warnings

import pytest
from infra import options as infra_options
from infra.config import RuntimeConfig, RuntimeContext, RuntimeMode
from infra.health import run_runtime_sanity_checks
from infra.instances import InfraInstance, InfraInstanceConfig, kube_legacy

# Register fixture modules explicitly.
pytest_plugins = [
    "shared.fixtures.init",
    "shared.fixtures.data",
    "shared.fixtures.s3",
    "shared.fixtures.util",
]


def pytest_configure(config) -> None:
    RuntimeConfig.resolve_request(config)
    RuntimeContext.initialize(config)
    for plugin_class in _selected_plugin_classes(config):
        plugin_class.configure(config)


def pytest_addoption(parser):
    group = infra_options.add_infra_options(parser)
    InfraInstance.register_all_options(group)


def pytest_report_header(config):
    return (
        f"CVAT pytest runtime directory: {RuntimeContext.get_runtime_root_dir()}\n"
        f"CVAT pytest run id: {RuntimeContext.get_run_id()}\n"
        f"CVAT pytest run artifacts: {RuntimeContext.get_run_dir()}"
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
    request = RuntimeConfig.resolve_request(config)

    for warning in request.deprecation_warnings:
        warnings.warn(warning, DeprecationWarning, stacklevel=2)

    if request.runtime_mode == RuntimeMode.REBUILD:
        cvat_root_dir = RuntimeConfig.get_cvat_root_dir()
        from infra.system_utils import run_command

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

    if request.collect_only:
        return

    if request.platform == "kube":
        kube_legacy.session_start(session)
        if request.should_run_runtime_sanity_checks:
            run_runtime_sanity_checks(
                cvat_root_dir=RuntimeConfig.get_cvat_root_dir(), platform=request.platform
            )
        return

    instance_config = InfraInstanceConfig(
        cvat_root_dir=RuntimeConfig.get_cvat_root_dir(),
        cvat_db_dir=RuntimeConfig.get_cvat_db_dir(),
        waiting_time=300,
        extra_dc_files=None,
        rebuild_images_before_start=request.rebuild_images_before_start,
    )
    instance = InfraInstance.create(session, instance_config)
    setattr(config, "_cvat_infra_instance", instance)
    instance.start()

    if request.should_run_runtime_sanity_checks:
        run_runtime_sanity_checks(
            cvat_root_dir=RuntimeConfig.get_cvat_root_dir(), platform=request.platform
        )


def pytest_sessionfinish(session, exitstatus: int) -> None:
    request = RuntimeConfig.resolve_request(session.config)
    if request.collect_only:
        return

    setattr(session.config, "_cvat_exitstatus", int(exitstatus))

    if request.platform == "kube":
        kube_legacy.session_finish(session)
        return

    instance = getattr(session.config, "_cvat_infra_instance", None)
    if instance is not None:
        instance.finish()


def pytest_collection_modifyitems(config, items) -> None:
    for plugin_class in _selected_plugin_classes(config):
        plugin_class.collection_modifyitems(config, items)


def _selected_runtime_class(config):
    if RuntimeConfig.resolve_request(config).platform != "local":
        return None

    selected = getattr(config, "_cvat_runtime_class", None)
    if selected is None:
        selected = InfraInstance.select_runtime_class_for_config(config)
        setattr(config, "_cvat_runtime_class", selected)
    return selected


def _selected_plugin_classes(config):
    if RuntimeConfig.resolve_request(config).platform != "local":
        return []

    classes = getattr(config, "_cvat_plugin_classes", None)
    if classes is None:
        runtime_class = _selected_runtime_class(config)
        classes = [runtime_class.plugin_class] if runtime_class is not None else []
        setattr(config, "_cvat_plugin_classes", classes)
    return classes
