# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import serializers
from enum import Enum
from cvat.apps.engine.serializers import (LabeledImageSerializer,
    LabeledShapeSerializer, LabeledTrackSerializer)

class FunctionCall(Enum):
    ONLINE = 'online'
    OFFLINE = 'offline'

    def __str__(self):
        return self.value

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

class FunctionType(Enum):
    PREDICTOR = 'predictor' # image -> objects
    TRACKER = 'tracker' # (image, object) -> track of objects
    INTERACTOR = 'interactor' # (image, object) -> object
    MATCHER = 'matcher' # (object, object) -> correlation coefficient

    def __str__(self):
        return self.value

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)


class FunctionSerializer(serializers.Serializer):
    name = serializers.SlugField(max_length=1024)
    type = serializers.ChoiceField(FunctionType.choices())
    code = serializers.FileField(write_only=True)

class RequestSerializer(serializers.Serializer):
    function = serializers.SlugField(max_length=1024)
    call = serializers.ChoiceField(FunctionCall.choices())
    data = serializers.IntegerField(min_value=0)
    start_frame = serializers.IntegerField(required=False, min_value=0)
    stop_frame = serializers.IntegerField(required=False, min_value=0)
    frame_step = serializers.IntegerField(required=False, min_value=0)
    tags = LabeledImageSerializer(many=True, default=[])
    shapes = LabeledShapeSerializer(many=True, default=[])
    tracks = LabeledTrackSerializer(many=True, default=[])
