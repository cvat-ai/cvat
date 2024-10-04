# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import textwrap

from rest_framework import serializers

from cvat.apps.consensus import models
from cvat.apps.consensus.models import AnnotationId
from cvat.apps.engine import serializers as engine_serializers


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


class ConsensusReportSerializer(serializers.ModelSerializer):
    target = serializers.ChoiceField(models.ConsensusReportTarget.choices())
    assignee = engine_serializers.BasicUserSerializer(allow_null=True, read_only=True)
    summary = ConsensusReportSummarySerializer()

    class Meta:
        model = models.ConsensusReport
        fields = (
            "id",
            "job_id",
            "task_id",
            "parent_id",
            "summary",
            "created_date",
            "target_last_updated",
            "target",
            "assignee",
            "consensus_score",
        )
        read_only_fields = fields


class ConsensusReportCreateSerializer(serializers.Serializer):
    task_id = serializers.IntegerField(write_only=True, required=False)
    job_id = serializers.IntegerField(write_only=True, required=False)


class AssigneeConsensusReportSerializer(serializers.ModelSerializer):
    assignee = engine_serializers.BasicUserSerializer(allow_null=True, read_only=True)

    class Meta:
        model = models.AssigneeConsensusReport
        fields = (
            "task_id",
            "assignee",
            "consensus_score",
            "consensus_report_id",
            "conflict_count",
        )
        read_only_fields = fields


class ConsensusSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.ConsensusSettings
        fields = (
            "id",
            "task_id",
            "iou_threshold",
            "agreement_score_threshold",
            "quorum",
            "sigma",
            "line_thickness",
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
            "sigma": """
                Sigma value for OKS calculation
            """,
            "line_thickness": """
                thickness of polylines, relatively to the (image area) ^ 0.5.
            """,
        }.items():
            extra_kwargs.setdefault(field_name, {}).setdefault(
                "help_text", textwrap.dedent(help_text.lstrip("\n"))
            )

    def validate(self, attrs):
        for k, v in attrs.items():
            if (k.endswith("_threshold") or k == "line_thickness") and not 0 <= v <= 1:
                raise serializers.ValidationError(f"{k} must be in the range [0; 1]")
            elif k == "quorum" and not 0 <= v <= 10:
                # since we have constrained max. consensus jobs per regular job to 10
                raise serializers.ValidationError(f"{k} must be in the range [0; 10]")
            elif k == "sigma" and not 0 < v < 1:
                raise serializers.ValidationError(f"{k} must be in the range [0; 100]")

        return super().validate(attrs)
