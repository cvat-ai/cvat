# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from drf_spectacular.extensions import OpenApiSerializerFieldExtension
from drf_spectacular.plumbing import force_instance


class QualityReportTargetExtension(OpenApiSerializerFieldExtension):
    # Make a separate class in API schema,
    # otherwise it gets merged with AnalyticsTarget enum

    target_class = "cvat.apps.quality_control.serializers.QualityReportTargetSerializer"

    def get_name(self):
        return "QualityReportTarget"

    def map_serializer_field(self, auto_schema, direction):
        return auto_schema._map_serializer_field(
            force_instance(self.target_class), direction, bypass_extensions=True
        )
