# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from abc import ABCMeta, abstractmethod
from logging import Logger
from typing import Callable

import django_rq
from attrs import define, field, validators
from redis import Redis
from rq.job import Job
from rq.registry import BaseRegistry

from cvat.apps.engine.utils import take_by


@define
class BaseMigration(metaclass=ABCMeta):
    name: str = field(validator=[validators.instance_of(str)])
    app_label: str = field(validator=[validators.instance_of(str)])
    connection: Redis = field(validator=[validators.instance_of(Redis)], kw_only=True)

    @abstractmethod
    def run(self) -> None: ...


def migrate_jobs_from_queue(
    *,
    queue_name: str,
    connection: Redis,
    logger: Logger,
    process_job_callback: Callable[[Job, Logger, BaseRegistry | django_rq.queues.DjangoRQ], None],
    deferred_hook: Callable[[Job, django_rq.queues.DjangoRQ], None] | None = None,
):
    queue: django_rq.queues.DjangoRQ = django_rq.get_queue(queue_name, connection=connection)
    scheduler: django_rq.queues.DjangoScheduler = django_rq.get_scheduler(queue_name)

    def handle_registry_jobs(
        registry: BaseRegistry | django_rq.queues.DjangoRQ, process_job_callback: Callable
    ) -> None:
        for subset_with_ids in take_by(set(registry.get_job_ids()), 1000):
            for idx, job in enumerate(
                queue.job_class.fetch_many(subset_with_ids, connection=connection)
            ):
                if job:
                    try:
                        process_job_callback(
                            job,
                            logger=logger,
                            queue=queue,
                            registry=registry,
                        )
                    except Exception:
                        continue
                else:
                    registry.remove(subset_with_ids[idx])

    if deferred_hook:
        handle_registry_jobs(queue.deferred_job_registry, deferred_hook)

    for registry in (
        queue,
        queue.started_job_registry,
        queue.deferred_job_registry,
        queue.finished_job_registry,
        queue.failed_job_registry,
    ):
        handle_registry_jobs(registry, process_job_callback)

        for job in scheduler.get_jobs():
            process_job_callback(job, logger=logger, scheduler=scheduler)
