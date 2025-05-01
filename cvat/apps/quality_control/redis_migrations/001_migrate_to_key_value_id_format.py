# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import re

from django.conf import settings

from cvat.apps.redis_handler.redis_migrations import AbstractJobProcessor, BaseMigration
from cvat.apps.redis_handler.redis_migrations.utils import (
    delete_job_from_redis,
    get_job_func_name,
    rename_job_result,
    reset_job_relationships,
)


class QualityJobProcessor(AbstractJobProcessor):
    def __call__(self, job, *, logger, queue_or_registry, pipeline):
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
            if re.match(r"^action=[a-z]+&target=[a-z]+", job.id):
                # make migration idempotent
                # job has been updated on the previous migration attempt
                raise self.JobSkippedError()
            raise self.InvalidJobIdFormatError()

        reset_job_relationships(job, pipeline=pipeline, save_to_redis=False)
        delete_job_from_redis(job, pipeline=pipeline)

        updated_job_id = (
            f"action=calculate&target=task&id={match.group('task_id')}&subresource=quality"
        )
        rename_job_result(job.id, updated_job_id, pipeline=pipeline)

        job.id = updated_job_id
        job.save(pipeline=pipeline)


class Migration(BaseMigration):
    def _run(self):
        self.migrate_queue_jobs(
            queue_name=settings.CVAT_QUEUES.QUALITY_REPORTS.value,
            job_processor=QualityJobProcessor(),
            enqueue_deferred_jobs=True,
            job_ids_are_changed=True,
        )
