# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from logging import Logger
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import django_rq
from django.conf import settings
from rq.job import Job, JobStatus
from rq_scheduler import Scheduler

from cvat.apps.engine.log import get_migration_logger
from cvat.apps.engine.utils import take_by
from cvat.apps.redis_handler.redis_migrations import BaseMigration


def process_job(
    job: Job,
    *,
    logger: Logger,
    scheduler: Scheduler | None = None,
) -> None:
    def update_meta(
        *,
        result_filename: str,
        result_url: str | None = None,
        save_meta: bool = True,
    ) -> None:
        job.meta.update(
            {
                "result_url": result_url,
                "result_filename": result_filename,
            }
        )

        if save_meta:
            job.save_meta()

    func_name = job.func_name.rsplit(".", maxsplit=1)[1]

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

    # job was already processed
    if "result_filename" in job.meta.keys():
        return

    # export was initiated to cloud storage
    if "export_resource_to_cloud_storage" == func_name:
        filename = job.args[1] or job.args[2].format(".zip")
        update_meta(result_filename=filename, save_meta=False)
        # exclude filename and filename_template from args
        job.args = job.args[:1] + job.args[3:]
        job.save(include_meta=True)
        return

    # local downloading was selected
    try:
        result_url = job.meta["result_url"]
    except KeyError:
        logger.warning(
            f"Job({job.id}) is going to be removed since the result_url field is missing in the meta"
        )

        # scheduled jobs should be explicitly removed by calling scheduler.cancel() method
        # since they are not stored in ScheduledJobRegistry
        if scheduler:
            scheduler.cancel(job)

        if job.get_status() not in (
            JobStatus.FINISHED,
            JobStatus.FAILED,
            JobStatus.STOPPED,
            JobStatus.CANCELED,
        ):
            job.cancel()

        job.delete()
        return

    parsed_result_url = urlparse(result_url)
    target, pk, subresource, _ = job.id.removeprefix("export:").split("-", maxsplit=3)
    subpath = subresource if subresource != "annotations" else "dataset"

    actual_result_url = (
        parsed_result_url.scheme
        + "://"
        + parsed_result_url.netloc
        + f"/api/{target}s/{pk}/{subpath}/download?rq_id={job.id}"
    )

    # check whether a filename was provided by a user
    if filename := parse_qs(parsed_result_url.query).get("filename"):
        update_meta(result_filename=filename[0], result_url=actual_result_url)
        return

    # filename was not specified by a user
    update_meta(
        # we cannot provide the same filename structure
        # since there is no instance timestamp in Redis HASH
        result_filename="-".join([target, pk, subresource]) + ".zip",
        result_url=actual_result_url,
    )


class Migration(BaseMigration):
    def run(self):
        queue: django_rq.queues.DjangoRQ = django_rq.get_queue(
            settings.CVAT_QUEUES.EXPORT_DATA.value, connection=self.connection
        )
        scheduler: django_rq.queues.DjangoScheduler = django_rq.get_scheduler(
            settings.CVAT_QUEUES.EXPORT_DATA.value
        )

        with get_migration_logger(Path(__file__).stem) as logger:
            for registry in (
                queue,
                queue.started_job_registry,
                queue.deferred_job_registry,
                queue.finished_job_registry,
                queue.failed_job_registry,
            ):
                job_ids = set(registry.get_job_ids())
                for subset_with_ids in take_by(job_ids, 1000):
                    for idx, job in enumerate(
                        queue.job_class.fetch_many(subset_with_ids, connection=self.connection)
                    ):
                        if job:
                            process_job(job, logger=logger)
                        else:
                            registry.remove(subset_with_ids[idx])

            for job in scheduler.get_jobs():
                process_job(job, logger=logger, scheduler=scheduler)
