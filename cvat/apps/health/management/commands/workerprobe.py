import os
import platform
from datetime import datetime, timedelta
from pathlib import Path
from time import monotonic

import django_rq
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from rq.worker import Worker


class Command(BaseCommand):
    help = "Check worker liveness in specified queues"
    _DEFAULT_LOG_PATH = Path("/home/django/logs/workerprobe.log")

    def add_arguments(self, parser):
        parser.add_argument("queue_names", nargs="+", type=str)

    @staticmethod
    def _soft_timeout_seconds() -> float | None:
        value = os.getenv("CVAT_WORKERPROBE_SOFT_TIMEOUT_SECONDS")
        if not value:
            return None

        return float(value)

    @staticmethod
    def _debug_enabled() -> bool:
        return os.getenv("CVAT_WORKERPROBE_DEBUG", "").lower() in {"1", "true", "yes", "on"}

    @classmethod
    def _log_path(cls) -> Path | None:
        value = os.getenv("CVAT_WORKERPROBE_LOG_PATH")
        if value:
            return Path(value)

        return cls._DEFAULT_LOG_PATH if cls._debug_enabled() else None

    @classmethod
    def _persist_message(cls, message: str) -> None:
        log_path = cls._log_path()
        if log_path is None:
            return

        log_path.parent.mkdir(parents=True, exist_ok=True)
        with log_path.open("a", encoding="utf-8") as fp:
            fp.write(f"{message}\n")

    def _report_progress(
        self,
        *,
        queue_name: str,
        stage: str,
        started_at: float,
        stage_started_at: float,
        **extra,
    ) -> None:
        total_elapsed = monotonic() - started_at
        stage_elapsed = monotonic() - stage_started_at
        details = ", ".join(f"{key}={value}" for key, value in extra.items())
        message = (
            f"workerprobe queue={queue_name} stage={stage} "
            f"stage_elapsed={stage_elapsed:.3f}s total_elapsed={total_elapsed:.3f}s"
        )
        if details:
            message += f" {details}"

        if self._debug_enabled():
            self.stderr.write(message)
        self._persist_message(message)

        soft_timeout = self._soft_timeout_seconds()
        if soft_timeout is not None and total_elapsed >= soft_timeout:
            raise CommandError(
                f"{message} soft_timeout={soft_timeout:.3f}s; "
                "probe would likely exceed Kubernetes exec timeout"
            )

    def handle(self, *args, **options):
        hostname = platform.node()
        started_at = monotonic()
        for queue_name in options["queue_names"]:
            stage_started_at = monotonic()
            if queue_name not in settings.RQ_QUEUES:
                raise CommandError(f"Queue {queue_name} is not defined")
            self._report_progress(
                queue_name=queue_name,
                stage="validated_queue",
                started_at=started_at,
                stage_started_at=stage_started_at,
            )

            stage_started_at = monotonic()
            connection = django_rq.get_connection(queue_name)
            self._report_progress(
                queue_name=queue_name,
                stage="connected",
                started_at=started_at,
                stage_started_at=stage_started_at,
            )

            stage_started_at = monotonic()
            all_workers = Worker.all(connection)
            self._report_progress(
                queue_name=queue_name,
                stage="loaded_workers",
                started_at=started_at,
                stage_started_at=stage_started_at,
                total_workers=len(all_workers),
            )

            stage_started_at = monotonic()
            workers = [
                w for w in all_workers if queue_name in w.queue_names() and w.hostname == hostname
            ]
            self._report_progress(
                queue_name=queue_name,
                stage="filtered_workers",
                started_at=started_at,
                stage_started_at=stage_started_at,
                matching_workers=len(workers),
                hostname=hostname,
            )

            expected_workers = int(os.getenv("NUMPROCS", 1))

            if len(workers) != expected_workers:
                raise CommandError(
                    "Number of registered workers does not match the expected number, "
                    f"actual: {len(workers)}, expected: {expected_workers}"
                )

            stage_started_at = monotonic()
            for worker in workers:
                if datetime.now() - worker.last_heartbeat > timedelta(seconds=worker.worker_ttl):
                    raise CommandError(
                        f"It seems that worker {worker.name}, pid: {worker.pid} is dead"
                    )
            self._report_progress(
                queue_name=queue_name,
                stage="checked_heartbeats",
                started_at=started_at,
                stage_started_at=stage_started_at,
                checked_workers=len(workers),
            )
