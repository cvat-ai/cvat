# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from contextlib import suppress

from django.db.models.query import Q
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from cvat.apps.engine.models import Annotation, Job, Project, Segment, Task
from cvat.apps.quality_control import quality_reports as qc
from cvat.apps.quality_control.models import QualityReport, QualityReportTarget, QualitySettings


@receiver(post_save, sender=Job, dispatch_uid=__name__ + ".save_job-update_quality_metrics")
@receiver(post_save, sender=Task, dispatch_uid=__name__ + ".save_task-update_quality_metrics")
@receiver(post_save, sender=Project, dispatch_uid=__name__ + ".save_project-update_quality_metrics")
@receiver(
    post_save, sender=Annotation, dispatch_uid=__name__ + ".save_annotation-update_quality_metrics"
)
@receiver(
    post_save,
    sender=QualitySettings,
    dispatch_uid=__name__ + ".save_settings-update_quality_metrics",
)
# label updates must also trigger this, but it happens indirectly via the parent update
def _update_task_quality_metrics(instance, created, **kwargs):
    tasks = []

    if isinstance(instance, Project):
        tasks.extend(instance.tasks.all())
    elif isinstance(instance, Task):
        tasks.append(instance)
    elif isinstance(instance, Job):
        tasks.append(instance.segment.task)
    elif isinstance(instance, Annotation):
        tasks.append(instance.job.segment.task)
    elif isinstance(instance, QualitySettings):
        if instance.task:
            tasks.append(instance.task)
        elif instance.project:
            tasks.extend(instance.project.tasks.all())
        else:
            assert False
    else:
        assert False

    for task in tasks:
        qc.TaskQualityReportUpdateManager().schedule_quality_autoupdate_job(task)


@receiver(
    pre_save, sender=Task, dispatch_uid=__name__ + ".save_task-update_project_quality_metrics"
)
def _on_update_project_quality_metrics_on_task_move_from_project(instance, **kwargs):
    # If a task was moved to another project, the old project quality must be updated
    # to reflect the new task configuration
    try:
        original_task = Task.objects.get(pk=instance.pk)
    except Task.DoesNotExist:
        # The task could have been removed already, nothing to do here
        return

    original_project = original_task.project
    if original_project and instance.project and original_project.pk == instance.project.pk:
        # The project has been changed to the same value, nothing to update
        return

    # Old reports may conflict with newer ones -
    # labels / attributes and settings can be different
    QualityReport.objects.filter(
        Q(job__segment__task__id=instance.id) | Q(task__id=instance.id)
    ).delete()

    # The old settings must not be available anymore
    with suppress(QualitySettings.DoesNotExist):
        QualitySettings.objects.get(task_id=instance.id).delete()

    if original_project:
        qc.ProjectQualityReportUpdateManager().schedule_quality_autoupdate_job(original_project)


@receiver(
    post_save,
    sender=QualityReport,
    dispatch_uid=__name__ + ".save_task_quality_report-update_project_quality_metrics",
)
def _on_task_report_save__update_project_quality_metrics(instance, created, **kwargs):
    project = None

    if isinstance(instance, QualityReport):
        if created and instance.target == QualityReportTarget.TASK and instance.task.project:
            project = instance.task.project
    else:
        assert False

    if project:
        qc.ProjectQualityReportUpdateManager().schedule_quality_autoupdate_job(project)


@receiver(
    post_delete, sender=Job, dispatch_uid=__name__ + ".delete_job-update_project_quality_metrics"
)
@receiver(
    post_delete, sender=Task, dispatch_uid=__name__ + ".delete_task-update_project_quality_metrics"
)
def _on_task_or_job_delete__update_project_quality_metrics(instance, **kwargs):
    try:
        if isinstance(instance, Job):
            task = instance.segment.task
            project = task.project

            QualityReport.objects.filter(task=task).delete()
        elif isinstance(instance, Task):
            project = instance.project
        else:
            assert False
    except (Segment.DoesNotExist, Task.DoesNotExist, Project.DoesNotExist):
        return

    if project:
        qc.ProjectQualityReportUpdateManager().schedule_quality_autoupdate_job(project)
