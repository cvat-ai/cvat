# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import pytest


def _infra_instance(request):
    instance = getattr(request.config, "_cvat_infra_instance", None)
    if instance is None:
        raise pytest.UsageError(
            "Infra instance is not initialized. Fixtures requiring infra restore "
            "must be used during test execution, not collection."
        )
    return instance


def container_exec_cvat(request, command: list[str] | str):
    return _infra_instance(request).exec_cvat(command)


def container_exec_redis_inmem(request, command: list[str] | str):
    return _infra_instance(request).exec_redis_inmem(command)


@pytest.fixture(scope="function")
def restore_db_per_function(request):
    # Note that autouse fixtures are executed first within their scope, so be aware of the order
    # Pre-test DB setups (eg. with class-declared autouse setup() method) may be cleaned.
    # https://docs.pytest.org/en/stable/reference/fixtures.html#autouse-fixtures-are-executed-first-within-their-scope
    _infra_instance(request).restore_db()


@pytest.fixture(scope="class")
def restore_db_per_class(request):
    _infra_instance(request).restore_db()


@pytest.fixture(scope="function")
def restore_cvat_data_per_function(request):
    _infra_instance(request).restore_cvat_data()


@pytest.fixture(scope="class")
def restore_cvat_data_per_class(request):
    _infra_instance(request).restore_cvat_data()


@pytest.fixture(scope="function")
def restore_clickhouse_db_per_function(request):
    # Note that autouse fixtures are executed first within their scope, so be aware of the order
    # Pre-test DB setups (eg. with class-declared autouse setup() method) may be cleaned.
    # https://docs.pytest.org/en/stable/reference/fixtures.html#autouse-fixtures-are-executed-first-within-their-scope
    _infra_instance(request).restore_clickhouse_db()


@pytest.fixture(scope="class")
def restore_clickhouse_db_per_class(request):
    _infra_instance(request).restore_clickhouse_db()


@pytest.fixture(scope="function")
def restore_redis_inmem_per_function(request):
    # Note that autouse fixtures are executed first within their scope, so be aware of the order
    # Pre-test DB setups (eg. with class-declared autouse setup() method) may be cleaned.
    # https://docs.pytest.org/en/stable/reference/fixtures.html#autouse-fixtures-are-executed-first-within-their-scope
    _infra_instance(request).restore_redis_inmem()


@pytest.fixture(scope="class")
def restore_redis_inmem_per_class(request):
    _infra_instance(request).restore_redis_inmem()


@pytest.fixture(scope="function")
def restore_redis_ondisk_per_function(request):
    _infra_instance(request).restore_redis_ondisk()


@pytest.fixture(scope="class")
def restore_redis_ondisk_per_class(request):
    _infra_instance(request).restore_redis_ondisk()


@pytest.fixture(scope="class")
def restore_redis_ondisk_after_class(request):
    yield

    _infra_instance(request).restore_redis_ondisk()
