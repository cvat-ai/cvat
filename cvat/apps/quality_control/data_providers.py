# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from abc import ABC, abstractmethod

from django.db import transaction

from cvat.apps.dataset_manager import data_model as cdm
from cvat.apps.dataset_manager.bindings import JobData
from cvat.apps.dataset_manager.task import JobAnnotation
from cvat.apps.engine.models import DimensionType, Project, Task
from cvat.apps.quality_control import models


class JobDataProvider(ABC):
    """Load a CVAT job and expose its annotations through the common data model.

    Dataset views and unresolved references remain valid until the provider is closed.
    Native conversion and cache ownership belong to the concrete implementation.
    """

    @classmethod
    def add_prefetch_info(cls, queryset):
        return JobAnnotation.add_prefetch_info(queryset)

    @transaction.atomic
    def __init__(self, job_id: int, *, queryset=None, included_frames=None) -> None:
        self.job_id = job_id
        self.job_annotation = JobAnnotation(job_id, queryset=queryset)
        self.job_annotation.init_from_db()
        self.job_data = JobData(
            annotation_ir=self.job_annotation.ir_data,
            db_job=self.job_annotation.db_job,
            use_server_track_ids=True,
            included_frames=included_frames,
        )

    @property
    @abstractmethod
    def dataset(self) -> cdm.Dataset:
        raise NotImplementedError

    @property
    def label_catalog(self) -> cdm.LabelCatalog:
        return self.dataset.label_catalog

    @property
    def dimension(self) -> DimensionType:
        return self.job_data.db_instance.segment.task.dimension

    @property
    def total_frames(self) -> int:
        return len(self.job_data)

    def _load_label_catalog(self) -> cdm.LabelCatalog:
        return cdm.LabelCatalog(
            tuple(
                cdm.Label(
                    id=label.id,
                    name=label.name,
                    parent=label.parent.name if label.parent else "",
                    type=label.type,
                    attributes=tuple(
                        cdm.AttributeSpec(
                            id=attribute.id,
                            name=attribute.name,
                            input_type=attribute.input_type,
                            default_value=attribute.default_value,
                        )
                        for attribute in label.attributespec_set.all()
                    ),
                )
                for label in self.job_data._label_mapping.values()
            )
        )

    @abstractmethod
    def close(self) -> None:
        raise NotImplementedError


def make_job_data_provider(job_id: int, *, queryset=None, included_frames=None) -> JobDataProvider:
    # Datumaro is the existing implementation. Audio quality remains unsupported.
    from cvat.apps.quality_control.datumaro_data_provider import DatumaroJobDataProvider

    return DatumaroJobDataProvider(job_id, queryset=queryset, included_frames=included_frames)


class QualitySettingsManager:
    def get_project_settings(self, project: Project) -> models.QualitySettings:
        return project.quality_settings

    def get_task_settings(self, task: Task, *, inherit: bool = True) -> models.QualitySettings:
        quality_settings = task.quality_settings

        if inherit and quality_settings.inherit and task.project:
            quality_settings = self.get_project_settings(task.project)

        return quality_settings
