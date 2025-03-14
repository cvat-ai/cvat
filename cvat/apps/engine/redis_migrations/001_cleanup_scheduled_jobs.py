# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import django_rq
from django.conf import settings
from rq_scheduler import Scheduler

from cvat.apps.redis_handler.redis_migrations import BaseMigration


class Migration(BaseMigration):
    def run(self):
        scheduler: Scheduler = django_rq.get_scheduler(settings.CVAT_QUEUES.EXPORT_DATA.value)

        for job in scheduler.get_jobs():
            if job.func_name == "cvat.apps.dataset_manager.views.clear_export_cache":
                scheduler.cancel(job)
                job.delete()
