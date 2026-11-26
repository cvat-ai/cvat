# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from collections.abc import Iterable
from typing import TYPE_CHECKING

from cvat.apps.quality_control.backends.factory import get_quality_backend_class

if TYPE_CHECKING:
    from cvat.apps.engine.models import Task
    from cvat.apps.quality_control.quality_handlers import EffectiveQualityRequirement


def validate_quality_task(task: Task, requirements: Iterable[EffectiveQualityRequirement]) -> None:
    """Validate before calculation or report reuse.

    Job reports share task data and settings. Project reports validate each
    contributing task, including tasks with saved reports that can be reused.
    """
    backend_class = get_quality_backend_class(task.dimension)
    backend_class.validate_task(task)
    for requirement in requirements:
        if requirement.enabled:
            backend_class.validate_requirement(requirement)
