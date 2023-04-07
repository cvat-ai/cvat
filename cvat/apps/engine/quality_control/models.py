# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from datetime import datetime
from enum import Enum
from typing import List
from attrs import asdict, define, field


class AnnotationConflictType(str, Enum):
    MISSING_ANNOTATION = 'missing_annotation'
    EXTRA_ANNOTATION = 'extra_annotation'
    MISMATCHING_ANNOTATION = 'mismatching_annotation'

    def __str__(self) -> str:
        return self.value


@define(kw_only=True)
class AnnotationId:
    # TODO: think if uuids can be provided
    type: str
    id: int
    job_id: int

    def to_dict(self) -> dict:
        return asdict(self)


@define(kw_only=True)
class AnnotationConflict:
    frame_id: int
    type: AnnotationConflictType
    annotation_ids: List[AnnotationId] = field(factory=list)
    message: str

    def to_dict(self) -> dict:
        return asdict(self)


@define(kw_only=True)
class AnnotationConflictsReport:
    job_id: int
    job_last_updated: datetime
    gt_job_last_updated: datetime
    conflicts: List[AnnotationConflict]

    def to_dict(self) -> dict:
        return asdict(self)
