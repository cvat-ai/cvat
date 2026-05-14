# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import logging
import os
from pathlib import Path
from subprocess import CalledProcessError
from time import sleep

from infra.config import RuntimeConfig, RuntimeContext, RuntimeMode
from infra.instances.base_instance import InfraInstance, InfraPytestPlugin
from infra.system_utils import docker_cp, run_command

from .docker import COVERED_CONTAINERS, exec_container_as_root, running_containers
from .environment import configure_local_runtime_env
from .lifecycle import run_local_runtime_lifecycle
from .stack import cleanup_after_session

logger = logging.getLogger(__name__)


class LocalInstance(InfraInstance):
    plugin_class: type[InfraPytestPlugin]

    @classmethod
    def can_handle_config(cls, config) -> bool:
        return RuntimeConfig.parse_request(config).platform == "local"

    def exec_cvat(self, command: list[str]):
        prefixed_name = RuntimeConfig.get_local_runtime_config().prefixed_container_name(
            "cvat_server"
        )
        return run_command(
            ["docker", "exec", prefixed_name] + command,
            logger=logger,
        )[0]

    def exec_redis_inmem(self, command: list[str]):
        prefixed_name = RuntimeConfig.get_local_runtime_config().prefixed_container_name(
            "cvat_redis_inmem"
        )
        return run_command(
            ["docker", "exec", prefixed_name] + command,
            logger=logger,
        )[0]

    def exec_cvat_cp(self, source: Path, target: str, *, cvat_host: str) -> None:
        docker_cp(source, f"{cvat_host}:{target}")

    def _get_cvat_host(self) -> str:
        local_runtime = RuntimeConfig.get_local_runtime_config()
        return local_runtime.prefixed_container_name("cvat_server")

    @staticmethod
    def collect_code_coverage_from_containers() -> None:
        running = set(running_containers())
        local_runtime = RuntimeConfig.get_local_runtime_config()
        for container in COVERED_CONTAINERS:
            prefixed_name = local_runtime.prefixed_container_name(container)
            if prefixed_name not in running:
                logger.info("Skipping coverage collection for absent container '%s'", prefixed_name)
                continue

            # find processes with code coverage
            pids = exec_container_as_root(container, ["pidof", "python3", "-o", "1"]).split()

            # stop processes with code coverage
            exec_container_as_root(container, ["kill", "-15", *pids])
            sleep(3)

            coverage_file = exec_container_as_root(
                container,
                [
                    "sh",
                    "-lc",
                    "find /home/django -maxdepth 1 -name '.coverage*' "
                    "! -name '.coveragerc' -print -quit",
                ],
            )
            if not coverage_file:
                logger.warning("Skipping coverage collection for '%s': no coverage data", container)
                continue

            # get code coverage report
            exec_container_as_root(container, ["coverage", "combine"], capture_output=False)
            exec_container_as_root(container, ["coverage", "json"], capture_output=False)
            docker_cp(
                f"{prefixed_name}:home/django/coverage.json",
                f"coverage_{container}.json",
            )

    def start(self) -> None:
        request = RuntimeConfig.parse_request(self.config)
        runtime_mode = request.runtime_mode
        project_name = request.run_prefix

        if request.collect_only:
            return

        if runtime_mode == RuntimeMode.DOWN:
            os.environ["CVAT_TEST_RUN_PREFIX"] = project_name
        else:
            RuntimeContext.write_runtime_context(project_name)
            configure_local_runtime_env(self.config, persist_state=True)

        run_local_runtime_lifecycle(
            self,
            runtime_mode=runtime_mode,
            cleanup=request.cleanup,
        )

    def finish(self) -> None:
        request = RuntimeConfig.parse_request(self.config)
        if request.platform != "local":
            return

        if request.collect_only:
            return

        if self.should_collect_failure_logs():
            self.collect_failure_logs()

        if os.environ.get("COVERAGE_PROCESS_START"):
            self.collect_code_coverage_from_containers()

        cleanup_after_session(
            runtime_mode=request.runtime_mode,
            run_prefix=request.run_prefix,
        )

    def collect_failure_logs(self) -> None:
        FAILURE_LOG_CONTAINERS = COVERED_CONTAINERS + ("cvat_opa", "traefik")

        request = RuntimeConfig.parse_request(self.config)
        local_runtime = RuntimeConfig.get_local_runtime_config(request.run_prefix)
        running = set(running_containers())
        logs_dir = self.failure_logs_dir()
        for container in FAILURE_LOG_CONTAINERS:
            prefixed_name = local_runtime.prefixed_container_name(container)
            if prefixed_name not in running:
                continue

            inspect_text = ""
            restart_count = 0
            try:
                inspect_stdout, _ = run_command(["docker", "inspect", prefixed_name], logger=logger)
                inspect_text = inspect_stdout
                inspect_payload = json.loads(inspect_stdout)
                restart_count = int(inspect_payload[0]["RestartCount"])
                with open(logs_dir / f"{prefixed_name}.inspect.json", "w") as f:
                    f.write(inspect_stdout)
            except Exception:
                logger.debug("Failed to inspect %s", prefixed_name, exc_info=True)

            try:
                stdout, stderr = run_command(["docker", "logs", prefixed_name], logger=logger)
                log_text = (stdout or "") + (f"\n{stderr}" if stderr else "")
            except CalledProcessError as ex:
                log_text = ((ex.stdout or "") + f"\n{ex.stderr or ''}").strip()
            with open(logs_dir / f"{prefixed_name}.log", "w") as f:
                f.write(log_text)

            # Docker does not expose a Kubernetes-style previous-container log stream.
            # Preserve restart evidence so failures can be correlated with restarts.
            if restart_count:
                summary = {
                    "container": prefixed_name,
                    "restart_count": restart_count,
                    "inspect_available": bool(inspect_text),
                }
                with open(logs_dir / f"{prefixed_name}.restart-summary.json", "w") as f:
                    f.write(json.dumps(summary, indent=2, sort_keys=True))

    def restore_db(self) -> None:
        run_command(
            [
                "docker",
                "exec",
                RuntimeConfig.get_local_runtime_config().prefixed_container_name("cvat_db"),
                "psql",
                "-U",
                "root",
                "-d",
                "postgres",
                "-v",
                "from=test_db",
                "-v",
                "to=cvat",
                "-f",
                "/tmp/restore.sql",
            ],
            logger=logger,
        )

    def restore_clickhouse_db(self) -> None:
        self.exec_cvat(
            [
                "/bin/sh",
                "-c",
                f'python "{RuntimeConfig.get_clickhouse_init_script()}" --clear',
            ]
        )

    def restore_redis_inmem(self) -> None:
        keep_keys = (
            "rq:worker:",
            "rq:workers",
            "rq:scheduler_instance:",
            "rq:queues:",
            "cvat:applied_migrations",
            "cvat:applied_migration:",
        )
        patterns = " ".join(f"-e {key}" for key in keep_keys)
        self.exec_redis_inmem(
            [
                "sh",
                "-c",
                (
                    "redis-cli -n 0 --raw keys '*' | grep -v "
                    f"{patterns} | xargs --no-run-if-empty redis-cli -n 0 del "
                    "&& redis-cli -n 1 flushdb"
                ),
            ]
        )

    def restore_redis_ondisk(self) -> None:
        run_command(
            [
                "docker",
                "exec",
                RuntimeConfig.get_local_runtime_config().prefixed_container_name(
                    "cvat_redis_ondisk"
                ),
                "redis-cli",
                "-p",
                "6666",
                "flushall",
            ],
            logger=logger,
        )


class LocalPytestPlugin(InfraPytestPlugin):
    @classmethod
    def configure(cls, config) -> None:
        configure_local_runtime_env(config, persist_state=False)


LocalInstance.plugin_class = LocalPytestPlugin
