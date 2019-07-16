# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import serializers

class AnnotationFormatSerializer(serializers.Serializer):
    upload = serializers.ListField(
        child=serializers.CharField(max_length=64)
    )
    download = serializers.ListField(
        child=serializers.CharField(max_length=64)
    )

class AnnotationFileSerializer(serializers.Serializer):
    annotation_file = serializers.FileField()