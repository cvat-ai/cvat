# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from collections.abc import Iterable

from django.db.models.signals import post_save
from django.dispatch import receiver

from cvat.apps.engine.models import Label, LabelType, Project, Task
from cvat.apps.quality_control.models import (
    QualityRequirement,
    QualityRequirementAnnotationType,
    QualitySettings,
)


_DEFAULT_REQUIREMENT_TYPE_ORDER = (
    QualityRequirementAnnotationType.TAG,
    QualityRequirementAnnotationType.RECTANGLE,
    QualityRequirementAnnotationType.SKELETON,
    QualityRequirementAnnotationType.POINTS,
    QualityRequirementAnnotationType.POLYLINE,
    QualityRequirementAnnotationType.MASK,
    QualityRequirementAnnotationType.POLYGON,
    QualityRequirementAnnotationType.ELLIPSE,
)

_LABEL_TYPE_TO_REQUIREMENT_TYPES = {
    LabelType.TAG: (QualityRequirementAnnotationType.TAG,),
    LabelType.RECTANGLE: (QualityRequirementAnnotationType.RECTANGLE,),
    LabelType.SKELETON: (QualityRequirementAnnotationType.SKELETON,),
    LabelType.POINTS: (QualityRequirementAnnotationType.POINTS,),
    LabelType.POLYLINE: (QualityRequirementAnnotationType.POLYLINE,),
    LabelType.MASK: (QualityRequirementAnnotationType.MASK,),
    LabelType.POLYGON: (QualityRequirementAnnotationType.POLYGON,),
    LabelType.ELLIPSE: (QualityRequirementAnnotationType.ELLIPSE,),
    LabelType.CUBOID: (),
    # "any" labels can be used with all top-level annotation types supported by quality requirements.
    LabelType.ANY: _DEFAULT_REQUIREMENT_TYPE_ORDER,
}


def _collect_default_requirement_types(labels: Iterable[Label]) -> list[str]:
    available_types = set()
    for label in labels:
        if label.parent_id is not None:
            continue

        available_types.update(_LABEL_TYPE_TO_REQUIREMENT_TYPES.get(LabelType(label.type), ()))

    return [annotation_type for annotation_type in _DEFAULT_REQUIREMENT_TYPE_ORDER if annotation_type in available_types]


def _ensure_default_requirements_for_task(task: Task) -> None:
    quality_settings, _ = QualitySettings.objects.get_or_create(task_id=task.id)
    required_annotation_types = _collect_default_requirement_types(task.get_labels())
    if not required_annotation_types:
        return

    existing_annotation_types = set(
        quality_settings.requirements.values_list("annotation_type", flat=True)
    )
    new_annotation_types = [
        annotation_type
        for annotation_type in required_annotation_types
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
