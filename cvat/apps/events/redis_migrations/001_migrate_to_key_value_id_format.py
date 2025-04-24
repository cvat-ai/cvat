# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from pathlib import Path
from uuid import UUID

from django.conf import settings
from rq.job import Job

from cvat.apps.engine.log import get_migration_logger
from cvat.apps.redis_handler.redis_migrations import BaseMigration, migrate_jobs_from_queue
from cvat.apps.redis_handler.redis_migrations.utils import (
    force_deferred_jobs_into_queue,
    get_job_func_name,
)


def process_jobs_from_export_queue(job: Job, **kwargs) -> None:
    func_name = get_job_func_name(job)

    if func_name != "_create_csv":
        return

    user_id = job.meta.get("user", {}).get("id")
    if not user_id:  # this information was added recently
        return

    query_id = UUID(job.id.split("-by-")[0].split("-", maxsplit=2)[-1])
    job.id = f"action=export&target=events&id={query_id}&user_id={user_id}"
    job.args = job.args[:-1]  # cache_ttl was dropped
    job.save()


class Migration(BaseMigration):
    def run(self):
        with get_migration_logger(Path(__file__).stem) as logger:
            migrate_jobs_from_queue(
                queue_name=settings.CVAT_QUEUES.EXPORT_DATA.value,
                logger=logger,
                connection=self.connection,
                process_job_callback=process_jobs_from_export_queue,
                deferred_hook=force_deferred_jobs_into_queue,
            )
