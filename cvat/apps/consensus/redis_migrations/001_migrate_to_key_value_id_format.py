# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import re

from django.conf import settings

from cvat.apps.redis_handler.redis_migrations import AbstractJobProcessor, BaseMigration
from cvat.apps.redis_handler.redis_migrations.utils import get_job_func_name


class JobProcessor(AbstractJobProcessor):
    def __call__(self, job, *, logger, queue_or_registry, pipeline):
        if get_job_func_name(job) != "_merge":
            raise self.InvalidJobError()

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
                job.save(pipeline=pipeline)
                return

        if re.match(r"^action=[a-z]+&target=[a-z]+", job.id):
            # make migration idempotent
            # job has been updated on the previous migration attempt
            raise self.JobSkippedError()
        raise self.InvalidJobIdFormatError()


class Migration(BaseMigration):
    def _run(self):
        self.migrate_queue_jobs(
            queue_name=settings.CVAT_QUEUES.CONSENSUS.value,
            job_processor=JobProcessor(),
            enqueue_deferred_jobs=True,
            job_ids_are_changed=True,
        )
