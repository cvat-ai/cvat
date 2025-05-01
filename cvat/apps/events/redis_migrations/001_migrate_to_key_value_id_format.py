# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT
import re
from uuid import UUID

from django.conf import settings

from cvat.apps.redis_handler.redis_migrations import AbstractJobProcessor, BaseMigration
from cvat.apps.redis_handler.redis_migrations.utils import get_job_func_name


class EventsJobProcessor(AbstractJobProcessor):
    def __call__(self, job, *, logger, queue_or_registry, pipeline):
        func_name = get_job_func_name(job)

        if func_name != "_create_csv":
            raise self.JobSkippedError()

        user_id = job.meta.get("user", {}).get("id")
        if not user_id:  # this information was added recently
            raise self.JobDeletionRequiredError()

        try:
            query_id = UUID(job.id.split("-by-")[0].split("-", maxsplit=2)[-1])
        except ValueError:
            if re.match(
                r"^action=[a-z]+&target=[a-z]+", job.id
            ):
                # make migration idempotent
                # job has been updated on the previous migration attempt
                raise self.JobSkippedError()
            raise self.InvalidJobIdFormatError()

        job.id = f"action=export&target=events&id={query_id}&user_id={user_id}"
        job.args = job.args[:-1]  # cache_ttl was dropped
        job.save(pipeline=pipeline)


class Migration(BaseMigration):
    def _run(self):
        self.migrate_queue_jobs(
            queue_name=settings.CVAT_QUEUES.EXPORT_DATA.value,
            job_processor=EventsJobProcessor(),
            enqueue_deferred_jobs=True,
            job_ids_are_changed=True,
        )
