# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import re
from logging import Logger
from pathlib import Path

import django_rq
from django.conf import settings
from rq.job import Job
from rq.registry import BaseRegistry

from cvat.apps.engine.log import get_migration_logger
from cvat.apps.redis_handler.redis_migrations import BaseMigration, migrate_jobs_from_queue
from cvat.apps.redis_handler.redis_migrations.utils import (
    force_deferred_jobs_into_queue,
    get_job_func_name,
)


def process_job(
    job: Job,
    *,
    logger: Logger,
    registry: BaseRegistry | django_rq.queues.DjangoRQ,
) -> None:
    if get_job_func_name(job) != "_check_task_quality":
        logger.error(f"Unexpected job in the {registry.name} queue: {job.id}")
        return

    # very old jobs have the following ID format, delete them
    # update-quality-metrics-task-<task_id>-<timestamp>
    if job.id.startswith("update-quality-metrics-task-"):
        registry.remove(job.id)
        job.delete()
        return

    # previous ID format:
    # quality-check-task-<task_id>-user-<user_id>
    match = re.fullmatch(r"quality-check-task-(?P<task_id>\d+)-user-(?P<user_id>\d+)", job.id)
    if not match:
        logger.error(f"Unexpected job id format in the {registry.name} queue: {job.id}")
        return

    job.id = f"action=calculate&target=task&id={match.group('task_id')}&subresource=quality"
    job.save()


class Migration(BaseMigration):
    def run(self):
        with get_migration_logger(Path(__file__).stem) as logger:
            migrate_jobs_from_queue(
                queue_name=settings.CVAT_QUEUES.QUALITY_REPORTS.value,
                logger=logger,
                connection=self.connection,
                process_job_callback=process_job,
                deferred_hook=force_deferred_jobs_into_queue,
            )
