# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from types import MappingProxyType

from cvat.apps.quality_control.backends.capabilities import QualityBackendCapabilities

CAPABILITIES = QualityBackendCapabilities(
    dimension="3d",
    media_types=frozenset({"point_cloud"}),
    supported_parameters=frozenset(
        {
            "annotation_type",
            "target_metric",
            "target_metric_threshold",
            "similarity_metric",
            "iou_threshold",
            "compare_attributes",
            "attribute_comparison",
        }
    ),
    similarity_metrics=MappingProxyType({"cuboid": ("iou",)}),
)
