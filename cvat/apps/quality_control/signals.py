# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db.models.signals import post_save
from django.dispatch import receiver

from cvat.apps.engine.models import Label, Project, Task
from cvat.apps.quality_control.models import (
    QualityRequirement,
    QualityRequirementAnnotationType,
    QualitySettings,
)

_DEFAULT_REQUIREMENT_ANNOTATION_TYPES = (
    QualityRequirementAnnotationType.TAG,
    QualityRequirementAnnotationType.RECTANGLE,
    QualityRequirementAnnotationType.SKELETON,
    QualityRequirementAnnotationType.SKELETON_KEYPOINT,
    QualityRequirementAnnotationType.POINTS,
    QualityRequirementAnnotationType.POLYLINE,
    QualityRequirementAnnotationType.MASK,
    QualityRequirementAnnotationType.POLYGON,
    QualityRequirementAnnotationType.ELLIPSE,
)


def _ensure_default_requirements_for_task(task: Task) -> None:
    quality_settings, _ = QualitySettings.objects.get_or_create(task_id=task.id)
    existing_annotation_types = set(
        quality_settings.requirements.values_list("annotation_type", flat=True)
    )
    new_annotation_types = [
        annotation_type
        for annotation_type in _DEFAULT_REQUIREMENT_ANNOTATION_TYPES
        if annotation_type not in existing_annotation_types
    ]

    if new_annotation_types:
        for annotation_type in new_annotation_types:
            QualityRequirement.objects.create(
                settings=quality_settings,
                name=f"default:{annotation_type}",
                annotation_type=annotation_type,
                enabled=False,
            )
        quality_settings.save()


@receiver(post_save, sender=Project)
def __save_project__initialize_quality_settings(
    instance: Project, created: bool, raw: bool, **kwargs
):
    if created and not raw:
        QualitySettings.objects.get_or_create(project_id=instance.id)


@receiver(post_save, sender=Task)
def __save_task__initialize_quality_settings(instance: Task, created: bool, **kwargs):
    if created and not kwargs.get("raw"):
        QualitySettings.objects.get_or_create(task_id=instance.id)
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
        for task in instance.project.tasks.all():
            _ensure_default_requirements_for_task(task)
