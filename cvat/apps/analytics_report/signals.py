# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db.models.signals import post_save
from django.dispatch import receiver

from cvat.apps.engine.models import Annotation, Job, Project, Task
from cvat.apps.analytics_report.report.create import JobAnalyticsReportUpdateManager


@receiver(post_save, sender=Job, dispatch_uid=__name__ + ".save_job-update_analytics_report")
@receiver(post_save, sender=Task, dispatch_uid=__name__ + ".save_task-update_analytics_report")
@receiver(post_save, sender=Project, dispatch_uid=__name__ + ".save_project-update_analytics_report")
@receiver(
    post_save, sender=Annotation, dispatch_uid=__name__ + ".save_annotation-update_analytics_report"
)
def __save_job__update_analytics_report(instance, created, **kwargs):
    if isinstance(instance, Project):
        JobAnalyticsReportUpdateManager().schedule_analytics_report_autoupdate_job(project=instance)
    elif isinstance(instance, Task):
        JobAnalyticsReportUpdateManager().schedule_analytics_report_autoupdate_job(task=instance)
    elif isinstance(instance, Job):
        JobAnalyticsReportUpdateManager().schedule_analytics_report_autoupdate_job(job=instance)
    elif isinstance(instance, Annotation):
        JobAnalyticsReportUpdateManager().schedule_analytics_report_autoupdate_job(job=instance.job)
    else:
        assert False
