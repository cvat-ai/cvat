# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import textwrap

from django.db import IntegrityError, models, transaction
from rest_framework import serializers

from cvat.apps.consensus import models
from cvat.apps.consensus.models import AnnotationId
from cvat.apps.engine.models import Task


class ConsensusAnnotationIdSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnnotationId
        fields = ("obj_id", "job_id", "type", "shape_type")
        read_only_fields = fields


class ConsensusConflictSerializer(serializers.ModelSerializer):
    annotation_ids = ConsensusAnnotationIdSerializer(many=True)

    class Meta:
        model = models.ConsensusConflict
        fields = ("id", "frame", "type", "annotation_ids", "report_id")
        read_only_fields = fields


class ConsensusReportSummarySerializer(serializers.Serializer):
    frame_count = serializers.IntegerField()
    conflict_count = serializers.IntegerField()
    conflicts_by_type = serializers.DictField(child=serializers.IntegerField())

    # This set is enough for basic characteristics, such as
    # DS_unmatched, GT_unmatched, accuracy, precision and recall
    # valid_count = serializers.IntegerField(source="annotations.valid_count")
    # ds_count = serializers.IntegerField(source="annotations.ds_count")
    # gt_count = serializers.IntegerField(source="annotations.gt_count")
    # total_count = serializers.IntegerField(source="annotations.total_count")


class ConsensusReportSerializer(serializers.ModelSerializer):
    summary = ConsensusReportSummarySerializer()

    class Meta:
        model = models.ConsensusReport
        fields = (
            "id",
            "job_id",
            "task_id",
            "summary",
            "created_date",
            "target_last_updated",
        )
        read_only_fields = fields


class ConsensusReportCreateSerializer(serializers.Serializer):
    task_id = serializers.IntegerField(write_only=True)


class ConsensusSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.ConsensusSettings
        fields = (
            "id",
            "task_id",
            "iou_threshold",
            "agreement_score_threshold",
            "quorum",
        )
        read_only_fields = (
            "id",
            "task_id",
        )

        extra_kwargs = {k: {"required": False} for k in fields}

        for field_name, help_text in {
            "iou_threshold": "Used for distinction between matched / unmatched shapes",
            "agreement_score_threshold": """
                Confidence threshold for output annotations
            """,
            "quorum": """
               Minimum count for a label and attribute voting results to be counted
            """,
        }.items():
            extra_kwargs.setdefault(field_name, {}).setdefault(
                "help_text", textwrap.dedent(help_text.lstrip("\n"))
            )

    def validate(self, attrs):
        for k, v in attrs.items():
            if k.endswith("_threshold"):
                if not 0 <= v <= 1:
                    raise serializers.ValidationError(f"{k} must be in the range [0; 1]")
            elif k == "quorum":
                # since we have constrained max. consensus jobs per normal job to 10
                if not 0 <= v <= 10:
                    raise serializers.ValidationError(f"{k} must be in the range [0; 10]")

        return super().validate(attrs)
