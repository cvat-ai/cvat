# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import serializers
from cvat.apps.annotation import models

class AnnotationHandlerSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.AnnotationHandler
        exclude = ('annotation_format',)


class AnnotationFormatSerializer(serializers.ModelSerializer):
    handlers = AnnotationHandlerSerializer(many=True, source='annotationhandler_set')

    class Meta:
        model = models.AnnotationFormat
        exclude = ("handler_file", )

    # pylint: disable=no-self-use
    def create(self, validated_data):
        handlers = validated_data.pop('handlers')

        annotation_format = models.AnnotationFormat.objects.create(**validated_data)

        handlers = [models.AnnotationHandler(annotation_format=annotation_format, **handler) for handler in handlers]
        models.AnnotationHandler.objects.bulk_create(handlers)

        return annotation_format

    # pylint: disable=no-self-use
    def to_internal_value(self, data):
        _data = data.copy()
        _data["handlers"] = []
        for d in _data.pop("dumpers"):
            d["type"] = models.HandlerType.DUMPER
            _data["handlers"].append(d)

        for l in _data.pop("loaders"):
            l["type"] = models.HandlerType.LOADER
            _data["handlers"].append(l)
        return _data

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['dumpers'] = []
        data['loaders'] = []
        for handler in data.pop("handlers"):
            handler_type = handler.pop("type")
            if handler_type == models.HandlerType.DUMPER:
                data["dumpers"].append(handler)
            else:
                data["loaders"].append(handler)

        return data

class AnnotationFileSerializer(serializers.Serializer):
    annotation_file = serializers.FileField()
