# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from .annotation_speed import ProjectAnnotationSpeed, TaskAnnotationSpeed
from .annotation_time import ProjectAnnotationTime, TaskAnnotationTime
from .objects import ProjectObjects, TaskObjects
from .total_annotation_speed import (
    JobTotalAnnotationSpeed,
    ProjectTotalAnnotationSpeed,
    TaskTotalAnnotationSpeed,
)
from .total_object_count import JobTotalObjectCount, ProjectTotalObjectCount, TaskTotalObjectCount
