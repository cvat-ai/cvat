# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import serializers
from cvat.apps.annotation import models

class AnnotationDumperSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.AnnotationDumper
        exclude = ('annotation_format',)
        # https://www.django-rest-framework.org/api-guide/validators/#updating-nested-serializers
        extra_kwargs = {
            'display_name': {
                'validators': [],
            },
        }

class AnnotationLoaderSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.AnnotationLoader
        exclude = ('annotation_format',)
        # https://www.django-rest-framework.org/api-guide/validators/#updating-nested-serializers
        extra_kwargs = {
            'display_name': {
                'validators': [],
            },
        }

class AnnotationFormatSerializer(serializers.ModelSerializer):
    dumpers = AnnotationDumperSerializer(many=True, source="annotationdumper_set")
    loaders = AnnotationLoaderSerializer(many=True, source="annotationloader_set")

    class Meta:
        model = models.AnnotationFormat
        fields = "__all__"

    # pylint: disable=no-self-use
    def create(self, validated_data):
        dumpers = validated_data.pop("annotationdumper_set")
        loaders = validated_data.pop("annotationloader_set")

        annotation_format = models.AnnotationFormat()
        annotation_format.name = validated_data["name"]
        annotation_format.handler_file = validated_data["handler_file"].name
        annotation_format.save()

        for dumper in dumpers:
            models.AnnotationDumper(annotation_format=annotation_format, **dumper).save()

        for loader in loaders:
            models.AnnotationLoader(annotation_format=annotation_format, **loader).save()

        return annotation_format

    # pylint: disable=no-self-use
    def update(self, instance, validated_data):
        dumper_names = [handler["display_name"] for handler in validated_data["annotationdumper_set"]]
        loader_names = [handler["display_name"] for handler in validated_data["annotationloader_set"]]

        handlers_to_delete = [d for d in instance.annotationdumper_set.all() if d.display_name not in dumper_names] + \
            [l for l in instance.annotationloader_set.all() if l.display_name not in loader_names]

        for db_handler in handlers_to_delete:
            db_handler.delete()

        for dumper in validated_data["annotationdumper_set"]:
            models.AnnotationDumper(annotation_format=instance, **dumper).save()
        for loader in validated_data["annotationloader_set"]:
            models.AnnotationLoader(annotation_format=instance, **loader).save()

        instance.save()
        return instance

class AnnotationFileSerializer(serializers.Serializer):
    annotation_file = serializers.FileField()
