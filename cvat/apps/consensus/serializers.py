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
        )
        read_only_fields = (
            "id",
            "task_id",
        )

        extra_kwargs = {}

        for field_name, help_text in {
            "iou_threshold": "Pairwise annotation matching IoU threshold",
        }.items():
            extra_kwargs.setdefault(field_name, {}).setdefault(
                "help_text", textwrap.dedent(help_text.lstrip("\n"))
            )

        for field_name in fields:
            if field_name.endswith("_threshold"):
                extra_kwargs.setdefault(field_name, {}).setdefault("min_value", 0)
                extra_kwargs.setdefault(field_name, {}).setdefault("max_value", 1)
