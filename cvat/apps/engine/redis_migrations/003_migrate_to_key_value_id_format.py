# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import re

from django.conf import settings

from cvat.apps.redis_handler.redis_migrations import AbstractJobProcessor, BaseMigration
from cvat.apps.redis_handler.redis_migrations.utils import get_job_func_name


class ImportQueueJobProcessor(AbstractJobProcessor):
    def __call__(self, job, *, logger, registry):
        func_name = get_job_func_name(job)

        if func_name not in (
            "_create_thread",
            "import_resource_with_clean_up_after",
            "import_resource_from_cloud_storage",
        ):
            return  # do not raise UnexpectedJobError here since there can be cleanup functions

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

        raise self.UnexpectedJobIdFormatError()


class ExportQueueJobProcessor(AbstractJobProcessor):
    def __call__(self, job, *, logger, registry):
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
            return  # do not raise UnexpectedJobError here since there can be export events jobs

        for pattern in (
            r"(?P<action>export):(?P<target>(task|project))-(?P<target_id>\d+)-(?P<subresource>backup)-by-(?P<user_id>\d+)",
            r"(?P<action>export):(?P<target>(project|task|job))-(?P<target_id>\d+)-(?P<subresource>(annotations|dataset))"
            + r"-in-(?P<format>[\w@]+)-format-by-(?P<user_id>\d+)",
        ):
            if match := re.fullmatch(pattern, job.id):
                job.id = "&".join([f"{k}={v}" for k, v in match.groupdict()])
                job.save()
                return

        raise self.UnexpectedJobIdFormatError()


class Migration(BaseMigration):
    def _run(self):
        self.migrate_queue_jobs(
            queue_name=settings.CVAT_QUEUES.IMPORT_DATA.value,
            job_processor=ImportQueueJobProcessor(),
            enqueue_deferred_jobs=True,
        )
        self.migrate_queue_jobs(
            queue_name=settings.CVAT_QUEUES.EXPORT_DATA.value,
            job_processor=ExportQueueJobProcessor(),
            enqueue_deferred_jobs=True,
        )
