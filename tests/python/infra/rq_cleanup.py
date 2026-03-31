# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from dataclasses import dataclass
from time import monotonic, sleep

from redis import Redis
from rq import Queue
from rq.command import send_stop_job_command
from rq.job import Job, JobStatus
from rq.registry import BaseRegistry


@dataclass(frozen=True)
class ActiveJob:
    queue_name: str
    job_id: str
    status: str


class BackgroundJobCleaner:
    _POLL_INTERVAL_S = 0.2
    _ACTIVE_STATUSES = {
        JobStatus.STARTED,
        JobStatus.QUEUED,
        JobStatus.DEFERRED,
        JobStatus.SCHEDULED,
    }

    def __init__(self, connection: Redis):
        self._connection = self._make_binary_safe_connection(connection)

    @staticmethod
    def _make_binary_safe_connection(connection: Redis) -> Redis:
        kwargs = dict(connection.connection_pool.connection_kwargs)
        kwargs["decode_responses"] = False
        return Redis(**kwargs)

    def drain(self, queue_names: tuple[str, ...], *, timeout_seconds: int = 20) -> None:
        if not queue_names:
            return

        queues = [Queue(name, connection=self._connection) for name in queue_names]
        active_jobs = self._collect_active_jobs(queues)
        if not active_jobs:
            return

        for queue, job, status in active_jobs:
            if status == JobStatus.STARTED:
                try:
                    send_stop_job_command(self._connection, job.id)
                except Exception:
                    pass

            try:
                if status == JobStatus.SCHEDULED:
                    queue.scheduled_job_registry.remove(job, delete_job=False)
                elif status == JobStatus.DEFERRED:
                    queue.deferred_job_registry.remove(job, delete_job=False)

                job.cancel(enqueue_dependents=False)
            except Exception:
                try:
                    job.cancel()
                except Exception:
                    pass

        deadline = monotonic() + timeout_seconds
        while monotonic() < deadline:
            remaining = self._collect_active_jobs(queues)
            if not remaining:
                return
            sleep(self._POLL_INTERVAL_S)

        remaining_state = [
            ActiveJob(queue_name=queue.name, job_id=job.id, status=str(status))
            for queue, job, status in self._collect_active_jobs(queues)
        ]
        raise RuntimeError(f"Timed out waiting for background jobs to drain: {remaining_state}")

    def _collect_active_jobs(
        self, queues: list[Queue]
    ) -> list[tuple[Queue, Job, JobStatus]]:
        active_jobs: list[tuple[Queue, Job, JobStatus]] = []
        for queue in queues:
            jobs_by_id: dict[str, Job] = {}

            for job in queue.jobs:
                jobs_by_id[job.id] = job

            for registry in (
                queue.started_job_registry,
                queue.deferred_job_registry,
                queue.scheduled_job_registry,
            ):
                for job in self._collect_jobs_from_registry(queue, registry):
                    jobs_by_id[job.id] = job

            for job in jobs_by_id.values():
                try:
                    status = job.get_status(refresh=False)
                except Exception:
                    continue

                if status in self._ACTIVE_STATUSES:
                    active_jobs.append((queue, job, status))

        return active_jobs

    @staticmethod
    def _collect_jobs_from_registry(queue: Queue, registry: BaseRegistry) -> list[Job]:
        jobs: list[Job] = []
        for job_id in registry.get_job_ids():
            try:
                job = queue.fetch_job(job_id)
            except Exception:
                job = None
            if job is not None:
                jobs.append(job)
        return jobs
