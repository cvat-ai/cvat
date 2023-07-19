# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from drf_spectacular.utils import extend_schema_serializer
from rest_framework import serializers


class LabelMappingEntrySerializer(serializers.DictField):
    name = serializers.CharField()

@extend_schema_serializer(
    # The "Request" suffix is added by drf-spectacular automatically
    component_name='FunctionCall'
)
class FunctionCallRequestSerializer(serializers.Serializer):
    function = serializers.CharField(help_text="The name of the function to execute")

    task = serializers.IntegerField(help_text="The id of the task to annotate")
    job = serializers.IntegerField(required=False, help_text="The id of the job to annotate")

    quality = serializers.ChoiceField(choices=['compressed', 'original'], default="original",
        help_text="The quality of the images to use in the model run"
    )
    cleanup = serializers.BooleanField(default=False)
    convMaskToPoly = serializers.BooleanField(default=False) # TODO: use lowercase naming
    threshold = serializers.FloatField(required=False)
    mapping = serializers.DictField(child=LabelMappingEntrySerializer(), required=False,
        help_text="Label mapping from the model to the task labels"
    )
    max_distance = serializers.IntegerField(required=False)

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
