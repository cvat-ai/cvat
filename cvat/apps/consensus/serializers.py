from rest_framework import serializers
from cvat.apps.consensus.models import ConsensusSettings
from cvat.apps.engine.models import Task
from django.db import IntegrityError, models, transaction
import textwrap

class ConsensusSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsensusSettings
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
                if not 0 <= v <= 10:
                    raise serializers.ValidationError(f"{k} must be in the range [0; 10]")

        return super().validate(attrs)
