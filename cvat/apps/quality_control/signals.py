# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from cvat.apps.engine.models import Annotation, Job, Project, Task
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
def _update_project_quality_metrics_on_task_move_from_project(
    instance, created, *, update_fields, **kwargs
):
    # If a task was moved to another project, the old project quality must be updated
    # to reflect the new task configuration
    if created:
        return

    if "project" in update_fields and instance:
        try:
            original_task = Task.objects.get(pk=instance.pk)
        except Task.DoesNotExist:
            # The task could have been removed already, nothing to do here
            return

        original_project = original_task.project
        if not original_project:
            # There was no project before the update, nothing to update
            return
        elif instance.project and original_project.pk == instance.project.pk:
            # The project has been changed to the same value, nothing to update
            return

        qc.ProjectQualityReportUpdateManager().schedule_quality_autoupdate_job(original_project)


@receiver(
    post_save,
    sender=Project,
    dispatch_uid=__name__ + ".save_project-update_project_quality_metrics",
)
@receiver(
    post_save,
    sender=QualityReport,
    dispatch_uid=__name__ + ".save_task_quality_report-update_project_quality_metrics",
)
def _update_project_quality_metrics(instance, created, **kwargs):
    project = None

    if isinstance(instance, Project):
        project = instance
    elif isinstance(instance, QualityReport):
        if created and instance.target == QualityReportTarget.TASK and instance.task.project:
            project = instance.task.project
    else:
        assert False

    if project:
        qc.ProjectQualityReportUpdateManager().schedule_quality_autoupdate_job(project)


@receiver(post_save, sender=Job, dispatch_uid=__name__ + ".save_job-initialize_quality_settings")
@receiver(post_save, sender=Task, dispatch_uid=__name__ + ".save_task-initialize_quality_settings")
def _initialize_quality_settings(instance, created, **kwargs):
    # Initializes default quality settings for the task
    # this is done in a signal to decouple this component from the engine app

    if created:
        task = None

        if isinstance(instance, Task):
            task = instance
        elif isinstance(instance, Job):
            task = instance.segment.task
        else:
            assert False

        QualitySettings.objects.get_or_create(task=task)
