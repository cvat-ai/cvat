# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from drf_spectacular.extensions import OpenApiSerializerFieldExtension
from drf_spectacular.plumbing import force_instance


class AnalyticsTargetExtension(OpenApiSerializerFieldExtension):
    # Make a separate class in API schema,
    # otherwise it gets merged with QualityReportTarget enum

    target_class = "cvat.apps.analytics_report.serializers.AnalyticsReportTargetSerializer"

    def get_name(self):
        return "AnalyticsReportTargetEnum"

    def map_serializer_field(self, auto_schema, direction):
        return auto_schema._map_serializer_field(
            force_instance(self.target_class), direction, bypass_extensions=True
        )
