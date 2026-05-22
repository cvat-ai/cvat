# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db.models.signals import post_save
from django.dispatch import receiver

from cvat.apps.engine.models import Label, Project, Task
from cvat.apps.quality_control.models import (
    QualitySettings,
    ensure_default_quality_requirements,
)


def _ensure_default_requirements_for_task(task: Task) -> None:
    quality_settings, _ = QualitySettings.objects.get_or_create(task_id=task.id)
    ensure_default_quality_requirements(quality_settings)


def _ensure_default_requirements_for_project(project: Project) -> None:
    quality_settings, _ = QualitySettings.objects.get_or_create(project_id=project.id)
    ensure_default_quality_requirements(quality_settings)


@receiver(post_save, sender=Project)
def __save_project__initialize_quality_settings(
    instance: Project, created: bool, raw: bool, **kwargs
):
    if created and not raw:
        _ensure_default_requirements_for_project(instance)


@receiver(post_save, sender=Task)
def __save_task__initialize_quality_settings(instance: Task, created: bool, **kwargs):
    if created and not kwargs.get("raw"):
        _ensure_default_requirements_for_task(instance)


@receiver(post_save, sender=Label)
def __save_label__initialize_default_quality_requirements(
    instance: Label, created: bool, raw: bool, **kwargs
):
    if not created or raw or instance.parent_id is not None:
        return

    if instance.task_id:
        _ensure_default_requirements_for_task(instance.task)
    elif instance.project_id:
        _ensure_default_requirements_for_project(instance.project)
        for task in instance.project.tasks.all():
            _ensure_default_requirements_for_task(task)
