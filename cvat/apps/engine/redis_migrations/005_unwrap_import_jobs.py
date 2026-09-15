# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from logging import Logger
from pathlib import Path

import django_rq
from django.conf import settings
from rq.exceptions import DeserializationError
from rq.job import Job

from cvat.apps.engine.log import get_migration_logger
from cvat.apps.engine.utils import take_by
from cvat.apps.redis_handler.redis_migrations import BaseMigration

_OLD_FUNC_PATH = "cvat.apps.engine.utils.import_resource_with_clean_up_after"


def _migrate_job(job: Job, logger: Logger) -> None:
    try:
        if job.func_name != _OLD_FUNC_PATH:
            return

        args = job.args
    except DeserializationError:
        logger.warning("Job %s: could not deserialize job data, skipping", job.id)
        return

    wrapped_func = args[0]
    new_func_path = f"{wrapped_func.__module__}.{wrapped_func.__qualname__}"

    logger.info("Job %s: %s -> %s", job.id, _OLD_FUNC_PATH, new_func_path)
    job.func_name = new_func_path
    job.args = tuple(args[1:])
    job.save()


class Migration(BaseMigration):
    def run(self) -> None:
        queue: django_rq.queues.DjangoRQ = django_rq.get_queue(
            settings.CVAT_QUEUES.IMPORT_DATA.value, connection=self.connection
        )
        scheduler: django_rq.queues.DjangoScheduler = django_rq.get_scheduler(
            settings.CVAT_QUEUES.IMPORT_DATA.value
        )

        with get_migration_logger(Path(__file__).stem) as logger:
            for registry in (
                queue,
                queue.started_job_registry,
                queue.deferred_job_registry,
                queue.scheduled_job_registry,
                queue.finished_job_registry,
                queue.failed_job_registry,
            ):
                job_ids = list(registry.get_job_ids())
                for subset in take_by(job_ids, 1000):
                    for idx, job in enumerate(
                        queue.job_class.fetch_many(subset, connection=self.connection)
                    ):
                        if job:
                            _migrate_job(job, logger)
                        else:
                            registry.remove(subset[idx])

            for job in scheduler.get_jobs():
                _migrate_job(job, logger)
