# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import serializers
from cvat.apps.annotation import models

class AnnotationDumperSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.AnnotationDumper
        exclude = ('handler_file',)

class AnnotationParserSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.AnnotationDumper
        exclude = ('handler_file',)

class FormatsSerializer(serializers.Serializer):
    parsers = AnnotationParserSerializer(many=True)
    dumpers = AnnotationDumperSerializer(many=True)

class AnnotationFileSerializer(serializers.Serializer):
    annotation_file = serializers.FileField()