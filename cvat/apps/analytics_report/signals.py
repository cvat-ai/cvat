# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from cvat.apps.analytics_report.report.create import AnalyticsReportUpdateManager
from cvat.apps.engine.models import Annotation, Job, Project, Task


@receiver(post_save, sender=Job, dispatch_uid=__name__ + ".save_job-update_analytics_report")
@receiver(post_save, sender=Task, dispatch_uid=__name__ + ".save_task-update_analytics_report")
@receiver(
    post_save, sender=Project, dispatch_uid=__name__ + ".save_project-update_analytics_report"
)
@receiver(
    post_save, sender=Annotation, dispatch_uid=__name__ + ".save_annotation-update_analytics_report"
)
def __save_job__update_analytics_report(instance, created, **kwargs):
    if isinstance(instance, Project):
        kwargs = {"project": instance}
    elif isinstance(instance, Task):
        kwargs = {"task": instance}
    elif isinstance(instance, Job):
        kwargs = {"job": instance}
    elif isinstance(instance, Annotation):
        kwargs = {"job": instance.job}
    else:
        assert False

    def schedule_autoupdate_job():
        if any(v.id is None for v in kwargs.values()):
            # The object may have been deleted after the on_commit call.
            return

        AnalyticsReportUpdateManager().schedule_analytics_report_autoupdate_job(**kwargs)

    transaction.on_commit(schedule_autoupdate_job, robust=True)
