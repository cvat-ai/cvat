# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import serializers
from cvat.apps.annotation import models

class AnnotationFormatSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.AnnotationFormat
        exclude = ('handler_file', )

    # pylint: disable=no-self-use
    def to_internal_value(self, data):
        annotation_format = data.copy()
        annotation_format['dump_specification'] = '\n'.join(data.get('dump_specification', []))
        annotation_format['parse_specification'] = '\n'.join(data.get('parse_specification', []))
        return annotation_format

    def to_representation(self, instance):
        annotation_format = super().to_representation(instance)
        annotation_format['dump_specification'] = annotation_format['dump_specification'].split('\n')
        annotation_format['parse_specification'] = annotation_format['parse_specification'].split('\n')
        return annotation_format

class AnnotationFileSerializer(serializers.Serializer):
    annotation_file = serializers.FileField()
