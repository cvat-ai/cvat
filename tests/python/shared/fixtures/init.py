# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import shlex

import pytest
from infra.config import RuntimeConfig
from infra.instances import InfraInstance, kube_legacy


def _command_args(command: list[str] | str) -> list[str]:
    return shlex.split(command) if isinstance(command, str) else command


def _platform(config) -> str:
    return RuntimeConfig.parse_request(config).platform


def _local_instance(config) -> InfraInstance:
    instance = getattr(config, "_cvat_infra_instance", None)
    if instance is None:
        raise RuntimeError("CVAT local infra instance is not initialized")
    return instance


def container_exec_cvat(request: pytest.FixtureRequest, command: list[str] | str) -> str:
    if _platform(request.config) == "local":
        return _local_instance(request.config).exec_cvat(_command_args(command))
    return kube_legacy.exec_cvat(_command_args(command))


def exec_redis_inmem(config, command: list[str] | str) -> str:
    if _platform(config) == "local":
        return _local_instance(config).exec_redis_inmem(_command_args(command))
    return kube_legacy.exec_redis_inmem(_command_args(command))


@pytest.fixture(scope="function")
def restore_db_per_function(request):
    # Note that autouse fixtures are executed first within their scope, so be aware of the order
    # Pre-test DB setups (eg. with class-declared autouse setup() method) may be cleaned.
    # https://docs.pytest.org/en/stable/reference/fixtures.html#autouse-fixtures-are-executed-first-within-their-scope
    if _platform(request.config) == "local":
        _local_instance(request.config).restore_db()
    else:
        kube_legacy.restore_db()


@pytest.fixture(scope="class")
def restore_db_per_class(request):
    if _platform(request.config) == "local":
        _local_instance(request.config).restore_db()
    else:
        kube_legacy.restore_db()


@pytest.fixture(scope="function")
def restore_cvat_data_per_function(request):
    if _platform(request.config) == "local":
        _local_instance(request.config).restore_cvat_data()
    else:
        kube_legacy.restore_cvat_data()


@pytest.fixture(scope="class")
def restore_cvat_data_per_class(request):
    if _platform(request.config) == "local":
        _local_instance(request.config).restore_cvat_data()
    else:
        kube_legacy.restore_cvat_data()


@pytest.fixture(scope="function")
def restore_clickhouse_db_per_function(request):
    # Note that autouse fixtures are executed first within their scope, so be aware of the order
    # Pre-test DB setups (eg. with class-declared autouse setup() method) may be cleaned.
    # https://docs.pytest.org/en/stable/reference/fixtures.html#autouse-fixtures-are-executed-first-within-their-scope
    if _platform(request.config) == "local":
        _local_instance(request.config).restore_clickhouse_db()
    else:
        kube_legacy.restore_clickhouse_db()


@pytest.fixture(scope="class")
def restore_clickhouse_db_per_class(request):
    if _platform(request.config) == "local":
        _local_instance(request.config).restore_clickhouse_db()
    else:
        kube_legacy.restore_clickhouse_db()


@pytest.fixture(scope="function")
def restore_redis_inmem_per_function(request):
    # Note that autouse fixtures are executed first within their scope, so be aware of the order
    # Pre-test DB setups (eg. with class-declared autouse setup() method) may be cleaned.
    # https://docs.pytest.org/en/stable/reference/fixtures.html#autouse-fixtures-are-executed-first-within-their-scope
    if _platform(request.config) == "local":
        _local_instance(request.config).restore_redis_inmem()
    else:
        kube_legacy.restore_redis_inmem()


@pytest.fixture(scope="class")
def restore_redis_inmem_per_class(request):
    if _platform(request.config) == "local":
        _local_instance(request.config).restore_redis_inmem()
    else:
        kube_legacy.restore_redis_inmem()


@pytest.fixture(scope="function")
def restore_redis_ondisk_per_function(request):
    if _platform(request.config) == "local":
        _local_instance(request.config).restore_redis_ondisk()
    else:
        kube_legacy.restore_redis_ondisk()


@pytest.fixture(scope="class")
def restore_redis_ondisk_per_class(request):
    if _platform(request.config) == "local":
        _local_instance(request.config).restore_redis_ondisk()
    else:
        kube_legacy.restore_redis_ondisk()


@pytest.fixture(scope="class")
def restore_redis_ondisk_after_class(request):
    yield

    if _platform(request.config) == "local":
        _local_instance(request.config).restore_redis_ondisk()
    else:
        kube_legacy.restore_redis_ondisk()
