# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import django_rq
from django.conf import settings
from rq.job import Job
from rq_scheduler import Scheduler

from cvat.apps.redis_handler.redis_migrations import BaseMigration
from cvat.apps.webhooks.models import Webhook

_SEND_WEBHOOK_FUNC_NAME = "cvat.apps.webhooks.tasks.send_webhook"


def _migrate_job(job: Job) -> None:
    if job.func_name != _SEND_WEBHOOK_FUNC_NAME or not job.args:
        return

    webhook = job.args[0]
    if not isinstance(webhook, Webhook):
        return

    job.args = (webhook.pk, *job.args[1:])
    job.save()


class Migration(BaseMigration):
    def run(self) -> None:
        queue: django_rq.queues.DjangoRQ = django_rq.get_queue(
            settings.CVAT_QUEUES.WEBHOOKS.value, connection=self.connection
        )
        scheduler: Scheduler = django_rq.get_scheduler(settings.CVAT_QUEUES.WEBHOOKS.value)

        for registry in (
            queue,
            queue.started_job_registry,
            queue.deferred_job_registry,
            queue.finished_job_registry,
            queue.failed_job_registry,
        ):
            job_ids = registry.get_job_ids()
            for idx, job in enumerate(
                queue.job_class.fetch_many(job_ids, connection=self.connection)
            ):
                if job:
                    _migrate_job(job)
                else:
                    registry.remove(job_ids[idx])

        for job in scheduler.get_jobs():
            _migrate_job(job)
