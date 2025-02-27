# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import django_rq
from django.conf import settings

from cvat.apps.engine.log import get_migration_logger
from cvat.apps.engine.utils import take_by
from cvat.apps.redis_handler.redis_migrations import BaseMigration


class Migration(BaseMigration):
    def run(self):
        queue: django_rq.queues.DjangoRQ = django_rq.get_queue(
            settings.CVAT_QUEUES.EXPORT_DATA.value, connection=self.connection
        )
        scheduler = django_rq.get_scheduler(settings.CVAT_QUEUES.EXPORT_DATA.value)
        job_ids = (
            queue.get_job_ids()
            + queue.started_job_registry.get_job_ids()
            + queue.deferred_job_registry.get_job_ids()
            + queue.finished_job_registry.get_job_ids()
            + queue.failed_job_registry.get_job_ids()

        )

        def update_result_in_meta(
            *,
            filename: str,
            ext: str = ".zip",
            url: str | None = None,
        ):
            job.meta["result"] = {
                "filename": filename,
                "ext": ext,
                "url": url,
            }
            if "result_url" in job.meta:
                del job.meta["result_url"]

            job.save_meta()


        with get_migration_logger(Path(__file__).stem) as logger:
            # TODO: scheduler.get_jobs()
            for subset_with_ids in take_by(job_ids, 10000):
                for job in queue.job_class.fetch_many(subset_with_ids, connection=self.connection):
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
                        continue

                    if (
                        (result := job.meta.get("result", {}))
                        and isinstance(result, dict)
                        and len({"filename", "ext"} & set(result.keys())) == 2
                    ):
                        continue

                    # export was initiated to cloud storage
                    if "export_resource_to_cloud_storage" == func_name:
                        filename, ext = os.path.splitext(job.args[1] or job.args[2].format(".zip"))
                        update_result_in_meta(filename=filename, ext=ext)
                        # exclude filename and filename_template from args
                        job.args = job.args[:1] + job.args[3:]
                        job.save()
                        continue

                    # local downloading was selected
                    try:
                        result_url = job.meta["result_url"]
                    except KeyError:
                        logger.warning(f"[{job.id}] The result_url field is missing in the meta")
                        continue  # remove job?

                    parsed_result_url = urlparse(result_url)
                    target, pk, subresource, _ = job.id.removeprefix("export:").split(
                        "-", maxsplit=3
                    )
                    subpath = subresource if subresource != "annotations" else "dataset"

                    actual_result_url = (
                        parsed_result_url.scheme
                        + "://"
                        + parsed_result_url.netloc
                        + f"/api/{target}s/{pk}/{subpath}/download?rq_id={job.id}"
                    )

                    # check whether a filename was provided by a user
                    if filename := parse_qs(parsed_result_url.query).get("filename"):
                        filename, ext = os.path.splitext(filename[0])
                        update_result_in_meta(filename=filename, ext=ext, url=actual_result_url)
                        continue

                    # filename was not specified by a user
                    update_result_in_meta(
                        # we cannot provide the same filename structure
                        # since there is no instance timestamp in Redis HASH
                        filename="-".join([target, pk, subresource]),
                        url=actual_result_url
                    )
