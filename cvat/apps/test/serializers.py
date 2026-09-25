# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import serializers


class ClassCountQuerySerializer(serializers.Serializer):
    """Validates query parameters for the class-counts endpoint."""

    project_id = serializers.IntegerField(required=False, min_value=1)
    task_id = serializers.IntegerField(required=False, min_value=1)
    job_id = serializers.IntegerField(required=False, min_value=1)

    def validate(self, attrs):
        provided = [k for k in ("project_id", "task_id", "job_id") if attrs.get(k) is not None]
        if len(provided) == 0:
            raise serializers.ValidationError(
                "One of 'project_id', 'task_id', or 'job_id' is required."
            )
        if len(provided) > 1:
            raise serializers.ValidationError(
                "Only one of 'project_id', 'task_id', or 'job_id' may be provided."
            )
        return attrs


class ClassCountItemSerializer(serializers.Serializer):
    """Represents a single label's annotation statistics."""

    label_id = serializers.IntegerField()
    label_name = serializers.CharField()
    color = serializers.CharField()
    parent_id = serializers.IntegerField(allow_null=True)
    image_count = serializers.IntegerField(
        help_text=(
            "Number of distinct frames/images that contain at least one annotation "
            "(tag, shape, or non-outside tracked shape) of this label."
        )
    )
    annotation_count = serializers.IntegerField(
        help_text="Total number of annotations of this label (all types combined)."
    )


class ClassCountResponseSerializer(serializers.Serializer):
    """Top-level response envelope."""

    scope = serializers.DictField(
        child=serializers.IntegerField(),
        help_text="The resolved scope, e.g. {'project_id': 1} or {'task_id': 5}.",
    )
    counts = ClassCountItemSerializer(many=True)
