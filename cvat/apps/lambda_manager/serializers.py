# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import serializers


class LabelMappingEntrySerializer(serializers.DictField):
    name = serializers.CharField()

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

class FunctionSerializer(serializers.Serializer):
    id = serializers.CharField(help_text="The name of the function")

    task = serializers.IntegerField(help_text="The id of the task")
    job = serializers.IntegerField(required=False, help_text="The id of the job")

    threshold = serializers.FloatField(required=False)

class FunctionCallSerializer(serializers.Serializer):
    id = serializers.CharField(help_text="Request id")

    function = FunctionSerializer()
    status = serializers.CharField()
    progress = serializers.IntegerField(default=0)
    enqueued = serializers.DateTimeField()
    started = serializers.DateTimeField()
    ended = serializers.DateTimeField()
    exc_info = serializers.CharField()
