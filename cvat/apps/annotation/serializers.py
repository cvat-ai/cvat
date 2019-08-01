# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import serializers
from cvat.apps.annotation import models

class AnnotationHandlerSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.AnnotationHandler
        exclude = ('annotation_format',)
    # pylint: disable=no-self-use
    def update(self, instance, validated_data):
        instance.display_name = validated_data.get('display_name', instance.display_name)
        instance.format = validated_data.get('format', instance.format)
        instance.version = validated_data.get('version', instance.version)
        instance.handler = validated_data.get('handler', instance.handler)
        instance.save()
        return instance

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
    def update(self, instance, validated_data):
        handler_names = [handler["display_name"] for handler in validated_data["handlers"]]

        handlers_to_delete = [ db_handler for db_handler in instance.annotationhandler_set.all() if db_handler.display_name not in handler_names]
        for db_handler in handlers_to_delete:
            db_handler.delete()

        handlers_to_create = []
        for handler in validated_data["handlers"]:
            updated = False
            for db_handler in instance.annotationhandler_set.all():
                if handler["display_name"] == db_handler.display_name:
                    serializer = AnnotationHandlerSerializer(db_handler, data=handler)
                    if serializer.is_valid(raise_exception=True):
                        serializer.save()
                        updated = True
                        break
            if not updated:
                handlers_to_create.append(handler)

        handlers_to_create = [models.AnnotationHandler(annotation_format=instance, **handler) for handler in handlers_to_create]
        if handlers_to_create:
            models.AnnotationHandler.objects.bulk_create(handlers_to_create)

        instance.save()
        return instance

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
