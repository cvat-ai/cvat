# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db.models.signals import post_save
from django.dispatch import receiver

from cvat.apps.engine.models import Job, JobType, Project, Task
from cvat.apps.quality_control.models import (
    QualitySettings,
    ensure_base_quality_requirements,
)


def _ensure_base_requirements_for_task(task: Task) -> None:
    quality_settings, _ = QualitySettings.objects.get_or_create(task_id=task.id)
    # Data upload creates the GT before saving the detected task dimension.
    quality_settings.task = task
    ensure_base_quality_requirements(quality_settings)


def _ensure_base_requirements_for_project(project: Project) -> None:
    quality_settings, _ = QualitySettings.objects.get_or_create(project_id=project.id)
    ensure_base_quality_requirements(quality_settings)


@receiver(post_save, sender=Project)
def __save_project__initialize_quality_settings(
    instance: Project, created: bool, raw: bool, **kwargs
):
    if created and not raw:
        QualitySettings.objects.get_or_create(project_id=instance.id)


@receiver(post_save, sender=Task)
def __save_task__initialize_quality_settings(instance: Task, created: bool, **kwargs):
    if kwargs.get("raw"):
        return

    if created:
        QualitySettings.objects.get_or_create(task_id=instance.id)

    if not instance.project_id:
        return

    update_fields = kwargs.get("update_fields")
    if (
        not created
        and update_fields is not None
        and not {"dimension", "project", "project_id"}.intersection(update_fields)
    ):
        return

    # Covers a GT task moved into a project and the final save after data upload.
    if Job.objects.filter(segment__task_id=instance.id, type=JobType.GROUND_TRUTH).exists():
        _ensure_base_requirements_for_project(instance.project)


@receiver(post_save, sender=Job)
def __save_gt_job__initialize_quality_requirements(
    instance: Job, created: bool, raw: bool, **kwargs
):
    if not created or raw or instance.type != JobType.GROUND_TRUTH:
        return

    task = instance.segment.task
    _ensure_base_requirements_for_task(task)
    if task.project_id:
        _ensure_base_requirements_for_project(task.project)
