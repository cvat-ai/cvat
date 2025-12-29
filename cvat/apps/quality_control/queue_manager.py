# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from typing import ClassVar

from django.conf import settings
from rest_framework import serializers

from cvat.apps.engine.models import (
    DimensionType,
    Project,
    RequestTarget,
    StageChoice,
    StateChoice,
    Task,
)
from cvat.apps.profiler import silk_profile
from cvat.apps.quality_control.quality_reports import (
    ProjectQualityCalculator,
    TaskQualityCalculator,
)
from cvat.apps.quality_control.rq import QualityRequestId
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
            return  # nothing prevents project reports
        elif isinstance(self.db_instance, Task):
            if self.db_instance.dimension != DimensionType.DIM_2D:
                raise serializers.ValidationError("Quality reports are only supported in 2d tasks")

            gt_job = self.db_instance.gt_job
            if gt_job is None or not (
                gt_job.stage == StageChoice.ACCEPTANCE and gt_job.state == StateChoice.COMPLETED
            ):
                raise serializers.ValidationError(
                    "Quality reports require a Ground Truth job in the task "
                    f"at the {StageChoice.ACCEPTANCE} stage "
                    f"and in the {StateChoice.COMPLETED} state"
                )
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
