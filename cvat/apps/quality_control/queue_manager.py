# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from typing import ClassVar

from django.conf import settings
from rest_framework import serializers

from cvat.apps.engine.models import (
    DimensionType,
    Job,
    JobType,
    Project,
    RequestTarget,
    Task,
)
from cvat.apps.profiler import silk_profile
from cvat.apps.quality_control.quality_calculators import (
    ProjectQualityCalculator,
    TaskQualityCalculator,
)
from cvat.apps.quality_control.rq import QualityRequestId
from cvat.apps.quality_control.validation import validate_task_quality_settings
from cvat.apps.redis_handler.background import AbstractRequestManager


class QualityReportQueueManager(AbstractRequestManager):
    QUEUE_NAME = settings.CVAT_QUEUES.QUALITY_REPORTS.value
    SUPPORTED_TARGETS: ClassVar[set[RequestTarget]] = {RequestTarget.TASK, RequestTarget.PROJECT}

    @property
    def job_result_ttl(self):
        return 120

    def get_job_by_id(self, id_, /):
        try:
            id_ = QualityRequestId.parse_and_validate_queue(
                id_, expected_queue=self.QUEUE_NAME, try_legacy_format=True
            ).render()
        except ValueError:
            raise serializers.ValidationError("Provided request ID is invalid")

        return super().get_job_by_id(id_)

    def build_request_id(self):
        return QualityRequestId(
            target=self.target,
            target_id=self.db_instance.pk,
        ).render()

    def validate_request(self):
        super().validate_request()

        if isinstance(self.db_instance, Project):
            for task in self.db_instance.tasks.filter(
                id__in=Job.objects.filter(type=JobType.GROUND_TRUTH).values("segment__task_id")
            ):
                validate_task_quality_settings(task)
        elif isinstance(self.db_instance, Task):
            from cvat.apps.quality_control.interval_data_provider import (
                validate_audio_quality_scope,
            )

            validate_audio_quality_scope(self.db_instance)
            if self.db_instance.dimension not in (DimensionType.DIM_2D, DimensionType.DIM_1D):
                raise serializers.ValidationError(
                    "Quality reports are only supported in 1d and 2d tasks"
                )

            if self.db_instance.gt_job is None:
                raise serializers.ValidationError(
                    "Quality reports require a Ground Truth job in the task"
                )
            validate_task_quality_settings(self.db_instance)
        else:
            assert False

    def init_callback_with_params(self):
        assert isinstance(self.db_instance, (Task, Project))
        method_name = f"check_{self.target}_quality"
        self.callback = getattr(QualityReportManager, method_name)
        self.callback_kwargs = {
            f"{self.target}_id": self.db_instance.pk,
        }


class QualityReportManager:
    @classmethod
    @silk_profile()
    def check_task_quality(cls, *, task_id: int) -> int:
        report = TaskQualityCalculator().compute_report(task=task_id)
        if not report:
            return None

        return report.id

    @classmethod
    @silk_profile()
    def check_project_quality(cls, *, project_id: int) -> int:
        return ProjectQualityCalculator().compute_report(project=project_id).id
