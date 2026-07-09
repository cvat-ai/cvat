# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import logging
from pathlib import Path

from infra import health as infra_health
from infra.config import RuntimeConfig
from infra.system_utils import run_command

logger = logging.getLogger(__name__)


def _kube_get_pod_name(label_filter: str) -> str:
    stdout, _ = run_command(
        [
            "kubectl",
            "get",
            "pods",
            "-l",
            label_filter,
            "-o",
            "jsonpath={.items[0].metadata.name}",
        ],
        logger=logger,
    )
    return stdout


def _kube_wait_for_ready_pod(label_filter: str) -> None:
    TIMEOUT_SECONDS = 300

    logger.debug(
        "waiting for kube pod to become ready label=%s timeout=%ss",
        label_filter,
        TIMEOUT_SECONDS,
    )
    run_command(
        [
            "kubectl",
            "wait",
            "pod",
            "-l",
            label_filter,
            "--for=condition=Ready",
            f"--timeout={TIMEOUT_SECONDS}s",
        ],
        logger=logger,
    )


def _kube_get_ready_pod_name(label_filter: str) -> str:
    _kube_wait_for_ready_pod(label_filter)
    return _kube_get_pod_name(label_filter)


def _kube_get_server_pod_name() -> str:
    return _kube_get_pod_name("component=server")


def _kube_get_db_pod_name() -> str:
    return _kube_get_pod_name("app.kubernetes.io/name=postgresql")


def kube_cp(source: Path, target: str) -> None:
    run_command(["kubectl", "cp", str(source), target], logger=logger)


def exec_cvat(command: list[str]) -> str:
    pod_name = _kube_get_server_pod_name()
    stdout, _ = run_command(["kubectl", "exec", pod_name, "--", *command], logger=logger)
    return stdout


def exec_cvat_db(command: list[str]) -> None:
    pod_name = _kube_get_db_pod_name()
    run_command(["kubectl", "exec", pod_name, "--", *command], logger=logger)


def exec_redis_inmem(command: list[str]) -> str:
    pod_name = _kube_get_pod_name("app.kubernetes.io/name=redis")
    stdout, _ = run_command(["kubectl", "exec", pod_name, "--", *command], logger=logger)
    return stdout


def exec_redis_ondisk(command: list[str]) -> None:
    pod_name = _kube_get_pod_name("app.kubernetes.io/name=cvat,tier=kvrocks")
    run_command(["kubectl", "exec", pod_name, "--", *command], logger=logger)


def restore_db() -> None:
    exec_cvat_db(
        [
            "/bin/sh",
            "-c",
            "PGPASSWORD=cvat_postgresql_postgres psql -U postgres -d postgres "
            "-v from=test_db -v to=cvat -f /tmp/restore.sql",
        ]
    )


def restore_clickhouse_db() -> None:
    exec_cvat(
        [
            "/bin/sh",
            "-c",
            f'python "{RuntimeConfig.get_clickhouse_init_script()}" --clear',
        ]
    )


def restore_redis_inmem() -> None:
    REDIS_INMEM_KEYS_TO_KEEP = (
        "rq:worker:",
        "rq:workers",
        "rq:scheduler_instance:",
        "rq:queues:",
        "cvat:applied_migrations",
        "cvat:applied_migration:",
    )

    exec_redis_inmem(
        [
            "sh",
            "-c",
            'export REDISCLI_AUTH="${REDIS_PASSWORD}" && '
            'redis-cli -e --scan --pattern "*" | '
            'grep -v "' + r"\|".join(REDIS_INMEM_KEYS_TO_KEEP) + '" | '
            "xargs -r redis-cli -e del",
        ]
    )


def restore_redis_ondisk() -> None:
    exec_redis_ondisk(
        ["sh", "-c", 'REDISCLI_AUTH="${CVAT_REDIS_ONDISK_PASSWORD}" redis-cli -e -p 6666 flushall']
    )


def restore_cvat_data(cvat_db_dir: Path | None = None) -> None:
    cvat_db_dir = cvat_db_dir or RuntimeConfig.get_cvat_db_dir()
    pod_name = _kube_get_ready_pod_name("component=server")
    kube_cp(
        cvat_db_dir / "cvat_data.tar.bz2",
        f"{pod_name}:/tmp/cvat_data.tar.bz2",
    )
    exec_cvat(["tar", "--strip", "3", "-xjf", "/tmp/cvat_data.tar.bz2", "-C", "/home/django/data/"])


def start(cvat_db_dir: Path | None = None) -> None:
    cvat_db_dir = cvat_db_dir or RuntimeConfig.get_cvat_db_dir()
    restore_cvat_data(cvat_db_dir)

    server_pod_name = _kube_get_ready_pod_name("component=server")
    db_pod_name = _kube_get_ready_pod_name("app.kubernetes.io/name=postgresql")
    kube_cp(cvat_db_dir / "restore.sql", f"{db_pod_name}:/tmp/restore.sql")
    kube_cp(cvat_db_dir / "data.json", f"{server_pod_name}:/tmp/data.json")

    infra_health.wait_for_services()

    exec_cvat(
        ["sh", "-c", "./manage.py flush --no-input && ./manage.py loaddata_sorted /tmp/data.json"]
    )
    exec_cvat_db(
        [
            "/bin/sh",
            "-c",
            "PGPASSWORD=cvat_postgresql_postgres psql -U postgres -d postgres "
            "-v from=cvat -v to=test_db -f /tmp/restore.sql",
        ]
    )


def session_start(session) -> None:
    request = RuntimeConfig.parse_request(session.config)
    if request.collect_only:
        return
    start()
