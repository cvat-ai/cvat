# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import pytest

from shared.fixtures import init as legacy_init


def _infra_instance(request):
    instance = getattr(request.config, "_cvat_infra_instance", None)
    if instance is None:
        raise pytest.UsageError(
            "Infra instance is not initialized. Restore fixtures require an active test runtime."
        )
    return instance


def _is_local(request) -> bool:
    return request.config.getoption("--platform") == "local"


@pytest.fixture(scope="function")
def restore_db_per_function(request):
    # Autouse fixtures run first within a scope, so DB restore can reset data that a
    # class-level setup just populated. Keep the semantics identical to the legacy fixture.
    if _is_local(request):
        instance = _infra_instance(request)
        instance.drain_background_jobs()
        instance.restore_db()
    else:
        legacy_init.kube_restore_db()


@pytest.fixture(scope="class")
def restore_db_per_class(request):
    if _is_local(request):
        instance = _infra_instance(request)
        instance.drain_background_jobs()
        instance.restore_db()
    else:
        legacy_init.kube_restore_db()


@pytest.fixture(scope="function")
def restore_cvat_data_per_function(request):
    if _is_local(request):
        _infra_instance(request).restore_cvat_data()
    else:
        legacy_init.kube_restore_data_volumes()


@pytest.fixture(scope="class")
def restore_cvat_data_per_class(request):
    if _is_local(request):
        _infra_instance(request).restore_cvat_data()
    else:
        legacy_init.kube_restore_data_volumes()


@pytest.fixture(scope="function")
def restore_clickhouse_db_per_function(request):
    if _is_local(request):
        _infra_instance(request).restore_clickhouse_db()
    else:
        legacy_init.kube_restore_clickhouse_db()


@pytest.fixture(scope="class")
def restore_clickhouse_db_per_class(request):
    if _is_local(request):
        _infra_instance(request).restore_clickhouse_db()
    else:
        legacy_init.kube_restore_clickhouse_db()


@pytest.fixture(scope="function")
def restore_redis_inmem_per_function(request):
    if _is_local(request):
        _infra_instance(request).restore_redis_inmem()
    else:
        legacy_init.kube_restore_redis_inmem()


@pytest.fixture(scope="class")
def restore_redis_inmem_per_class(request):
    if _is_local(request):
        _infra_instance(request).restore_redis_inmem()
    else:
        legacy_init.kube_restore_redis_inmem()


@pytest.fixture(scope="function")
def restore_redis_ondisk_per_function(request):
    if _is_local(request):
        _infra_instance(request).restore_redis_ondisk()
    else:
        legacy_init.kube_restore_redis_ondisk()


@pytest.fixture(scope="class")
def restore_redis_ondisk_per_class(request):
    if _is_local(request):
        _infra_instance(request).restore_redis_ondisk()
    else:
        legacy_init.kube_restore_redis_ondisk()


@pytest.fixture(scope="class")
def restore_redis_ondisk_after_class(request):
    yield

    if _is_local(request):
        _infra_instance(request).restore_redis_ondisk()
    else:
        legacy_init.kube_restore_redis_ondisk()
