# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from pathlib import Path
from typing import Any

from django.dispatch import receiver
from rq.job import Job as RQJob

from cvat.apps.dataset_manager.cron import InstanceTmpDirectoriesCleaner, TmpDirectoryCleaner
from cvat.apps.engine import background
from cvat.apps.engine.log import ServerLogManager
from cvat.apps.redis_handler.signals import request_failed, request_succeeded

slogger = ServerLogManager(__name__)


@receiver(request_succeeded, sender=background.DatasetImporter)
@receiver(request_failed, sender=background.DatasetImporter)
@receiver(request_succeeded, sender=background.BackupImporter)
@receiver(request_failed, sender=background.BackupImporter)
def remove_import_input_file(sender: Any, rq_job: RQJob, **kwargs: Any) -> None:
    match sender:
        case background.BackupImporter:
            cleaner = TmpDirectoryCleaner()
        case background.DatasetImporter:
            cleaner = InstanceTmpDirectoriesCleaner()
        case _:
            raise ValueError(f"Unexpected sender: {sender!r}")

    try:
        cleaner.single_file_cleanup(Path(rq_job.args[0]))
    except Exception:
        slogger.glob.exception(f"Job {rq_job.id}: failed to remove the input file")
