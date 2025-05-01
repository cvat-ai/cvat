# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT
import re
from datetime import datetime
from urllib.parse import quote
from uuid import UUID

from django.conf import settings
from django.utils import timezone

from cvat.apps.redis_handler.redis_migrations import AbstractJobProcessor, BaseMigration
from cvat.apps.redis_handler.redis_migrations.utils import (
    delete_job_from_redis,
    get_job_func_name,
    rename_job_result,
    reset_job_relationships,
)


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
            if re.match(r"^action=[a-z]+&target=[a-z]+", job.id):
                # make migration idempotent
                # job has been updated on the previous migration attempt
                raise self.JobSkippedError()
            raise self.InvalidJobIdFormatError()

        reset_job_relationships(job, pipeline=pipeline, save_to_redis=False)
        delete_job_from_redis(job, pipeline=pipeline)

        updated_job_id = f"action=export&target=events&id={query_id}&user_id={user_id}"
        rename_job_result(job.id, updated_job_id, pipeline=pipeline)

        job.id = updated_job_id
        job.args = job.args[:-1]  # cache_ttl was dropped

        job.meta.update(
            {
                "result_url": f"{settings.CVAT_BASE_URL}/api/events/download?rq_id={quote(job.id)}",
                "result_filename": f'logs_{datetime.strftime(timezone.now(), "%Y_%m_%d_%H_%M_%S")}.csv',
            }
        )

        job.save(pipeline=pipeline)


class Migration(BaseMigration):
    def _run(self):
        self.migrate_queue_jobs(
            queue_name=settings.CVAT_QUEUES.EXPORT_DATA.value,
            job_processor=EventsJobProcessor(),
            enqueue_deferred_jobs=True,
            job_ids_are_changed=True,
        )
