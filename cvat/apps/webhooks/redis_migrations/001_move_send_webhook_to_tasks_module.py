# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from logging import Logger
from pathlib import Path

import django_rq
from django.conf import settings
from rq.job import Job

from cvat.apps.engine.log import get_migration_logger
from cvat.apps.engine.utils import take_by
from cvat.apps.redis_handler.redis_migrations import BaseMigration

_OLD_FUNC_PATH = "cvat.apps.webhooks.signals.send_webhook"
_NEW_FUNC_PATH = "cvat.apps.webhooks.tasks.send_webhook"


def _migrate_job(job: Job, logger: Logger) -> None:
    if job.func_name != _OLD_FUNC_PATH:
        return
    logger.info(
        "Rewriting func_name for job %s: %s -> %s",
        job.id,
        _OLD_FUNC_PATH,
        _NEW_FUNC_PATH,
    )
    job.func_name = _NEW_FUNC_PATH
    job.save()


class Migration(BaseMigration):
    def run(self) -> None:
        queue: django_rq.queues.DjangoRQ = django_rq.get_queue(
            settings.CVAT_QUEUES.WEBHOOKS.value, connection=self.connection
        )
        scheduler: django_rq.queues.DjangoScheduler = django_rq.get_scheduler(
            settings.CVAT_QUEUES.WEBHOOKS.value
        )

        with get_migration_logger(Path(__file__).stem) as logger:
            for registry in (
                queue,
                queue.started_job_registry,
                queue.deferred_job_registry,
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
