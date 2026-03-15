# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import logging
import os
from subprocess import PIPE, STDOUT, Popen
from time import monotonic, sleep

from infra.config import RuntimeInfraConfig
from infra.db_restore import PsycopgDatabaseRestorer
from infra.instances.base_instance import InfraInstance, InfraPlugin
from infra.debug.host_debug import maybe_wait_for_vscode_attach
from infra.system_utils import kubectl_cp, pick_free_port, run_command

logger = logging.getLogger(__name__)


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

    def __init__(self, session, deps):
        super().__init__(session, deps)
        self._db_restorer: PsycopgDatabaseRestorer | None = None
        self._db_port_forward_proc: Popen | None = None
        self._db_forward_port: int | None = None

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

        os.environ["CVAT_TEST_RUN_PREFIX"] = RuntimeInfraConfig.get_run_prefix_from_config(config)

        self.restore_cvat_data()
        server_pod_name = kube_get_server_pod_name()
        kubectl_cp(self.deps.cvat_db_dir / "data.json", f"{server_pod_name}:/tmp/data.json", logger=logger)

        infra_health.wait_for_services()
        self.exec_cvat(["sh", "-c", "./manage.py flush --no-input && ./manage.py loaddata /tmp/data.json"])
        self._get_db_restorer().restore_from_template(source_db="cvat", target_db="test_db")

        maybe_wait_for_vscode_attach(self.session, cvat_root_dir=self.deps.cvat_root_dir)

    def restore_db(self) -> None:
        self._get_db_restorer().restore_from_template(source_db="test_db", target_db="cvat")

    def finish(self) -> None:
        self._close_db_restorer()

    def restore_cvat_data(self) -> None:
        pod_name = kube_get_server_pod_name()
        kubectl_cp(self.deps.cvat_db_dir / "cvat_data.tar.bz2", f"{pod_name}:/tmp/cvat_data.tar.bz2", logger=logger)
        self.exec_cvat("tar --strip 3 -xjf /tmp/cvat_data.tar.bz2 -C /home/django/data/")

    def restore_clickhouse_db(self) -> None:
        self.exec_cvat(["/bin/sh", "-c", f'python "{RuntimeInfraConfig.get_clickhouse_init_script()}" --clear'])

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

    def _close_db_restorer(self) -> None:
        if self._db_restorer is not None:
            self._db_restorer.close()
            self._db_restorer = None

        if self._db_port_forward_proc is None:
            return

        if self._db_port_forward_proc.poll() is None:
            self._db_port_forward_proc.terminate()
            try:
                self._db_port_forward_proc.wait(timeout=5)
            except BaseException:
                self._db_port_forward_proc.kill()
                self._db_port_forward_proc.wait(timeout=5)

        self._db_port_forward_proc = None
        self._db_forward_port = None

    def _start_db_port_forward(self) -> int:
        if self._db_port_forward_proc is not None and self._db_forward_port is not None:
            if self._db_port_forward_proc.poll() is None:
                return self._db_forward_port
            self._close_db_restorer()

        local_port = pick_free_port(15432, set(), logger=logger)
        db_pod_name = kube_get_db_pod_name()
        self._db_port_forward_proc = Popen(  # nosec
            [
                "kubectl",
                "port-forward",
                f"pod/{db_pod_name}",
                f"{local_port}:5432",
            ],
            stdout=PIPE,
            stderr=STDOUT,
            text=True,
        )
        self._db_forward_port = local_port
        os.environ["CVAT_TEST_DB_PORT"] = str(local_port)
        return local_port

    def _get_db_restorer(self) -> PsycopgDatabaseRestorer:
        if self._db_restorer is not None:
            return self._db_restorer

        local_port = self._start_db_port_forward()
        deadline = monotonic() + 20
        last_error = ""

        while monotonic() < deadline:
            proc = self._db_port_forward_proc
            if proc is None:
                break
            rc = proc.poll()
            if rc is not None:
                output = proc.stdout.read() if proc.stdout else ""
                raise RuntimeError(
                    "kubectl port-forward for PostgreSQL exited unexpectedly "
                    f"with code {rc}. Output:\n{output}"
                )

            try:
                self._db_restorer = PsycopgDatabaseRestorer(
                    host="127.0.0.1",
                    port=local_port,
                    user="postgres",
                    password="cvat_postgresql_postgres",
                    postgres_db="postgres",
                    connect_timeout_s=1,
                )
                return self._db_restorer
            except BaseException as ex:
                last_error = str(ex)
                sleep(0.2)

        raise RuntimeError(
            "Failed to initialize psycopg PostgreSQL restorer for kubernetes "
            f"within timeout. Last error: {last_error}"
        )


class KubePlugin(InfraPlugin):
    @classmethod
    def can_handle_config(cls, config) -> bool:
        return config.getoption("--platform") == "kube"


KubeInstance.plugin_class = KubePlugin
