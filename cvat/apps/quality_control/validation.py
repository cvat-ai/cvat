# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from collections.abc import Sequence

from rest_framework.exceptions import ValidationError

from cvat.apps.engine.models import DimensionType, MediaType, Task
from cvat.apps.quality_control import models
from cvat.apps.quality_control.data_providers import QualitySettingsManager
from cvat.apps.quality_control.quality_handlers import (
    EffectiveQualityRequirement,
    resolve_effective_requirements,
)


def validate_task_requirements(
    task: Task, requirements: Sequence[EffectiveQualityRequirement]
) -> None:
    is_audio = task.media_type == MediaType.AUDIO
    if is_audio:
        supported_types = {models.QualityRequirementAnnotationType.INTERVAL}
    else:
        supported_types = set(models.QualityRequirementAnnotationType) - {
            models.QualityRequirementAnnotationType.INTERVAL
        }

    incompatible = [
        requirement.name
        for requirement in requirements
        if requirement.enabled and requirement.annotation_type not in supported_types
    ]
    if incompatible:
        supported = "interval" if is_audio else "2d"
        raise ValidationError(
            {
                "requirements": (
                    f"Task {task.id} supports only {supported} quality requirements. "
                    f"Disable incompatible requirements: {', '.join(incompatible)}."
                )
            }
        )


def validate_task_quality_settings(task: Task) -> None:
    if task.dimension not in (DimensionType.DIM_1D, DimensionType.DIM_2D):
        raise ValidationError("Quality reports are only supported in audio and 2d tasks")
    settings = QualitySettingsManager().get_task_settings(task)
    validate_task_requirements(
        task, resolve_effective_requirements(list(settings.requirements.select_related("parent")))
    )


def validate_quality_settings(settings: models.QualitySettings) -> None:
    requirements = resolve_effective_requirements(
        list(settings.requirements.select_related("parent"))
    )
    if settings.task_id:
        validate_task_requirements(settings.task, requirements)
        if settings.inherit and settings.task.project_id:
            project_settings = QualitySettingsManager().get_project_settings(settings.task.project)
            validate_task_requirements(
                settings.task,
                resolve_effective_requirements(
                    list(project_settings.requirements.select_related("parent"))
                ),
            )
    else:
        for task in settings.project.tasks.filter(quality_settings__inherit=True):
            validate_task_requirements(task, requirements)
