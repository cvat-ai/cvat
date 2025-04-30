# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import re

from django.conf import settings

from cvat.apps.redis_handler.redis_migrations import AbstractJobProcessor, BaseMigration
from cvat.apps.redis_handler.redis_migrations.utils import get_job_func_name


class QualityJobProcessor(AbstractJobProcessor):
    def __call__(self, job, *, logger, queue_or_registry):
        if get_job_func_name(job) != "_check_task_quality":
            raise self.InvalidJobError()

        # very old jobs have the following ID format, delete them
        # update-quality-metrics-task-<task_id>-<timestamp>
        if job.id.startswith("update-quality-metrics-task-"):
            raise self.JobDeletionRequiredError()

        # previous ID format:
        # quality-check-task-<task_id>-user-<user_id>
        match = re.fullmatch(r"quality-check-task-(?P<task_id>\d+)-user-(?P<user_id>\d+)", job.id)
        if not match:
            raise self.InvalidJobIdFormatError()

        job.id = f"action=calculate&target=task&id={match.group('task_id')}&subresource=quality"
        job.save()
        return job


class Migration(BaseMigration):
    def _run(self):
        self.migrate_queue_jobs(
            queue_name=settings.CVAT_QUEUES.QUALITY_REPORTS.value,
            job_processor=QualityJobProcessor(),
            enqueue_deferred_jobs=True,
            job_ids_are_changed=True,
        )
