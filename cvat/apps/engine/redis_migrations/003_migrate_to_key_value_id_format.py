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


def process_jobs_from_import_queue(
    job: Job,
    *,
    logger: Logger,
    registry: BaseRegistry | django_rq.queues.DjangoRQ,
) -> None:
    func_name = get_job_func_name(job)

    if func_name not in (
        "_create_thread",
        "import_resource_with_clean_up_after",
        "import_resource_from_cloud_storage",
    ):
        return

    for pattern in (
        r"(?P<action>create):(?P<target>task)-(?P<target_id>\d+)",
        r"(?P<action>import):(?P<target>(task|project|job))-(?P<target_id>\d+)-(?P<subresource>(annotations|dataset))",
        r"(?P<action>import):(?P<target>(task|project))-(?P<id>[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12})-(?P<subresource>backup)",
    ):
        if match := re.fullmatch(pattern, job.id):
            job.id = "&".join([f"{k}={v}" for k, v in match.groupdict()])
            if func_name == "_create_thread":
                job.func_name = job.func_name.rsplit(".", maxsplit=1)[0] + "create_thread"
            elif func_name == "import_resource_from_cloud_storage":
                # before: db_storage, key, cleanup_func, import_func, filename, ...
                # after: filename, db_storage, key, import_func, ...
                db_storage, key, _, import_func, filename, rest = job.args
                job.args = (filename, db_storage, key, import_func, *rest)
            job.save()
            return

    logger.error(f"Unexpected job id format in the {registry.name} queue: {job.id}")


def process_jobs_from_export_queue(
    job: Job,
    *,
    logger: Logger,
    registry: BaseRegistry | django_rq.queues.DjangoRQ,
) -> None:
    func_name = get_job_func_name(job)

    if func_name not in (
        "export_job_annotations",
        "export_job_as_dataset",
        "export_task_annotations",
        "export_task_as_dataset",
        "export_project_annotations",
        "export_project_as_dataset",
        "create_backup",
        "export_resource_to_cloud_storage",
    ):
        return

    for pattern in (
        r"(?P<action>export):(?P<target>(task|project))-(?P<target_id>\d+)-(?P<subresource>backup)-by-(?P<user_id>\d+)",
        r"(?P<action>export):(?P<target>(project|task|job))-(?P<target_id>\d+)-(?P<subresource>(annotations|dataset))"
        + r"-in-(?P<format>[\w@]+)-format-by-(?P<user_id>\d+)",
    ):
        if match := re.fullmatch(pattern, job.id):
            # TODO: sorting
            job.id = "&".join([f"{k}={v}" for k, v in match.groupdict()])
            job.save()
            return

    logger.error(f"Unexpected job id format in the {registry.name} queue: {job.id}")


class Migration(BaseMigration):
    def run(self):
        with get_migration_logger(Path(__file__).stem) as logger:
            migrate_jobs_from_queue(
                queue_name=settings.CVAT_QUEUES.IMPORT_DATA.value,
                logger=logger,
                connection=self.connection,
                process_job_callback=process_jobs_from_import_queue,
                deferred_hook=force_deferred_jobs_into_queue,
            )
            migrate_jobs_from_queue(
                queue_name=settings.CVAT_QUEUES.EXPORT_DATA.value,
                logger=logger,
                connection=self.connection,
                process_job_callback=process_jobs_from_export_queue,
                deferred_hook=force_deferred_jobs_into_queue,
            )
