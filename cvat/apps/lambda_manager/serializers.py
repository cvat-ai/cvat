# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from drf_spectacular.utils import extend_schema_serializer
from rest_framework import serializers


class SublabelMappingEntrySerializer(serializers.Serializer):
    name = serializers.CharField()
    attributes = serializers.DictField(child=serializers.CharField(), required=False)


class LabelMappingEntrySerializer(serializers.Serializer):
    name = serializers.CharField()
    attributes = serializers.DictField(child=serializers.CharField(), required=False)
    sublabels = serializers.DictField(
        child=SublabelMappingEntrySerializer(),
        required=False,
        help_text="Label mapping for from the model to the task sublabels within a parent label",
    )


@extend_schema_serializer(
    # The "Request" suffix is added by drf-spectacular automatically
    component_name="FunctionCall"
)
class FunctionCallRequestSerializer(serializers.Serializer):
    function = serializers.CharField(help_text="The name of the function to execute")
    task = serializers.IntegerField(help_text="The id of the task to be annotated")
    job = serializers.IntegerField(required=False, help_text="The id of the job to be annotated")
    max_distance = serializers.IntegerField(required=False)
    threshold = serializers.FloatField(required=False)
    cleanup = serializers.BooleanField(
        help_text="Whether existing annotations should be removed", default=False
    )
    convMaskToPoly = serializers.BooleanField(
        required=False,
        source="conv_mask_to_poly",
        write_only=True,
        help_text="Deprecated; use conv_mask_to_poly instead",
    )
    conv_mask_to_poly = serializers.BooleanField(
        required=False, help_text="Convert mask shapes to polygons"
    )
    mapping = serializers.DictField(
        child=LabelMappingEntrySerializer(),
        required=False,
        help_text="Label mapping from the model to the task labels",
    )


class FunctionCallParamsSerializer(serializers.Serializer):
    id = serializers.CharField(allow_null=True, help_text="The name of the function")

    task = serializers.IntegerField(allow_null=True, help_text="The id of the task")
    job = serializers.IntegerField(required=False, help_text="The id of the job")

    threshold = serializers.FloatField(allow_null=True)


class FunctionCallSerializer(serializers.Serializer):
    id = serializers.CharField(help_text="Request id")

    function = FunctionCallParamsSerializer()
    status = serializers.CharField(allow_null=True)
    progress = serializers.IntegerField(default=0, allow_null=True)
    enqueued = serializers.DateTimeField(allow_null=True)
    started = serializers.DateTimeField(allow_null=True)
    ended = serializers.DateTimeField(allow_null=True)
    exc_info = serializers.CharField(required=False, allow_null=True)
