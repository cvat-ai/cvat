# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import serializers


class HoneypotsReportCreateSerializer(serializers.Serializer):
    task_id = serializers.IntegerField()


class HoneypotsReportSummarySerializer(serializers.Serializer):
    pass
