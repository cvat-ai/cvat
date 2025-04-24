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
    job: Job, *, logger: Logger, registry: BaseRegistry | django_rq.queues.DjangoRQ
) -> None:
    if get_job_func_name(job) != "_merge":
        logger.error(f"Unexpected job in the {registry.name!r} queue: {job.id}")
        return

    # previous ID formats:
    # consensus-merge-task-<task_id>-user-<user_id>
    # consensus-merge-task-<task_id>-job-<job_id>-user-<user_id>
    for pattern in (
        r"consensus-merge-(?P<target>task)-(?P<target_id>\d+)-user-\d+",
        r"consensus-merge-task-\d+-(?P<target>job)-(?P<target_id>\d+))-user-\d+",
    ):
        if match := re.fullmatch(pattern, job.id):
            matched = match.groupdict()
            job.id = f"action=merge&target={matched['target']}&target_id={matched['target_id']}"
            job.save()
            return

    logger.error(f"Unexpected job id format in the {registry.name!r} queue: {job.id}")


class Migration(BaseMigration):
    def run(self):
        with get_migration_logger(Path(__file__).stem) as logger:
            migrate_jobs_from_queue(
                queue_name=settings.CVAT_QUEUES.CONSENSUS.value,
                logger=logger,
                connection=self.connection,
                process_job_callback=process_job,
                deferred_hook=force_deferred_jobs_into_queue,
            )
