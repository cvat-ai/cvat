# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import textwrap

from rest_framework import serializers

from cvat.apps.consensus import models
from cvat.apps.engine import field_validation


class ConsensusMergeCreateSerializer(serializers.Serializer):
    task_id = serializers.IntegerField(write_only=True, required=False)
    job_id = serializers.IntegerField(write_only=True, required=False)

    def validate(self, attrs):
        field_validation.require_one_of_fields(attrs, ["task_id", "job_id"])
        return super().validate(attrs)


class ConsensusSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.ConsensusSettings
        fields = (
            "id",
            "task_id",
            "iou_threshold",
            "quorum",
        )
        read_only_fields = (
            "id",
            "task_id",
        )

        extra_kwargs = {k: {"required": False} for k in fields}

        for field_name, help_text in {
            "iou_threshold": "Pairwise annotation matching IoU threshold",
            "quorum": """
                Minimum required percent of sources having an annotation for it to be accepted
            """,
        }.items():
            extra_kwargs.setdefault(field_name, {}).setdefault(
                "help_text", textwrap.dedent(help_text.lstrip("\n"))
            )

    def validate(self, attrs):
        for k, v in attrs.items():
            if (k.endswith("_threshold") or k == "quorum") and not 0 <= v <= 1:
                raise serializers.ValidationError(f"{k} must be in the range [0; 1]")

        return super().validate(attrs)
