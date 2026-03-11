# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os

from infra.config import CLICKHOUSE_INIT_SCRIPT, logger, run_prefix_from_config
from infra.instances.base_instance import InfraInstance, InfraPlugin
from infra.debug.host_debug import maybe_wait_for_vscode_attach
from infra.system_utils import kubectl_cp, run_command


def kube_get_pod_name(label_filter):
    return run_command(
        f"kubectl get pods -l {label_filter} -o jsonpath={{.items[0].metadata.name}}",
        logger=logger,
    )[0]


def kube_get_server_pod_name():
    return kube_get_pod_name("component=server")


def kube_get_db_pod_name():
    return kube_get_pod_name("app.kubernetes.io/name=postgresql")


def kube_get_redis_inmem_pod_name():
    return kube_get_pod_name("app.kubernetes.io/name=redis")


def kube_get_redis_ondisk_pod_name():
    return kube_get_pod_name("app.kubernetes.io/name=cvat,tier=kvrocks")


def kube_exec_cvat(command: list[str] | str):
    pod_name = kube_get_server_pod_name()
    base = f"kubectl exec {pod_name} --"
    _command = f"{base} {command}" if isinstance(command, str) else base.split() + command
    return run_command(_command, logger=logger)[0]


def kube_exec_cvat_db(command):
    pod_name = kube_get_db_pod_name()
    run_command(["kubectl", "exec", pod_name, "--"] + command, logger=logger)


def kube_exec_redis_inmem(command):
    pod_name = kube_get_redis_inmem_pod_name()
    return run_command(["kubectl", "exec", pod_name, "--"] + command, logger=logger)[0]


def kube_exec_redis_ondisk(command):
    pod_name = kube_get_redis_ondisk_pod_name()
    run_command(["kubectl", "exec", pod_name, "--"] + command, logger=logger)

_REDIS_INMEM_KEEP_KEYS = (
    "rq:worker:",
    "rq:workers",
    "rq:scheduler_instance:",
    "rq:queues:",
    "cvat:applied_migrations",
    "cvat:applied_migration:",
)


class KubeInstance(InfraInstance):
    plugin_class: type[InfraPlugin]
    exec_cvat = staticmethod(kube_exec_cvat)
    exec_redis_inmem = staticmethod(kube_exec_redis_inmem)

    @classmethod
    def can_handle_config(cls, config) -> bool:
        return config.getoption("--platform") == "kube"

    @classmethod
    def can_handle(cls, session, deps) -> bool:
        return cls.can_handle_config(session.config)

    def start(self) -> None:
        config = self.config
        from infra import health as infra_health

        if config.getoption("--collect-only"):
            return

        os.environ["CVAT_TEST_RUN_PREFIX"] = run_prefix_from_config(config)

        self.restore_cvat_data()
        server_pod_name = kube_get_server_pod_name()
        db_pod_name = kube_get_db_pod_name()
        kubectl_cp(self.deps.cvat_db_dir / "restore.sql", f"{db_pod_name}:/tmp/restore.sql", logger=logger)
        kubectl_cp(self.deps.cvat_db_dir / "data.json", f"{server_pod_name}:/tmp/data.json", logger=logger)

        infra_health.wait_for_services()
        self.exec_cvat(["sh", "-c", "./manage.py flush --no-input && ./manage.py loaddata /tmp/data.json"])
        kube_exec_cvat_db(
            [
                "/bin/sh",
                "-c",
                "PGPASSWORD=cvat_postgresql_postgres psql -U postgres -d postgres -v from=cvat -v to=test_db -f /tmp/restore.sql",
            ]
        )

        maybe_wait_for_vscode_attach(self.session, cvat_root_dir=self.deps.cvat_root_dir)

    def restore_db(self) -> None:
        kube_exec_cvat_db(
            [
                "/bin/sh",
                "-c",
                "PGPASSWORD=cvat_postgresql_postgres psql -U postgres -d postgres -v from=test_db -v to=cvat -f /tmp/restore.sql",
            ]
        )

    def restore_cvat_data(self) -> None:
        pod_name = kube_get_server_pod_name()
        kubectl_cp(self.deps.cvat_db_dir / "cvat_data.tar.bz2", f"{pod_name}:/tmp/cvat_data.tar.bz2", logger=logger)
        self.exec_cvat("tar --strip 3 -xjf /tmp/cvat_data.tar.bz2 -C /home/django/data/")

    def restore_clickhouse_db(self) -> None:
        self.exec_cvat(["/bin/sh", "-c", f'python "{CLICKHOUSE_INIT_SCRIPT}" --clear'])

    def restore_redis_inmem(self) -> None:
        self.exec_redis_inmem(
            [
                "sh",
                "-c",
                # Keep the same semantics as local restore:
                # preserve required RQ keys in DB 0, and fully reset cache/throttle state in DB 1.
                'export REDISCLI_AUTH="${REDIS_PASSWORD}" && '
                'redis-cli -e -n 0 --scan --pattern "*" | '
                'grep -v "'
                + r"\|".join(_REDIS_INMEM_KEEP_KEYS)
                + '" | '
                "xargs -r redis-cli -e -n 0 del && "
                "redis-cli -e -n 1 flushdb",
            ]
        )

    def restore_redis_ondisk(self) -> None:
        kube_exec_redis_ondisk(
            ["sh", "-c", 'REDISCLI_AUTH="${CVAT_REDIS_ONDISK_PASSWORD}" redis-cli -e -p 6666 flushall']
        )


class KubePlugin(InfraPlugin):
    @classmethod
    def can_handle_config(cls, config) -> bool:
        return config.getoption("--platform") == "kube"


KubeInstance.plugin_class = KubePlugin
