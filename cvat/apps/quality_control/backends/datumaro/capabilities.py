# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from types import MappingProxyType

from cvat.apps.quality_control.backends.capabilities import QualityBackendCapabilities

CAPABILITIES = QualityBackendCapabilities(
    dimension="2d",
    media_types=frozenset({"image"}),
    supported_parameters=frozenset(
        {
            "annotation_type",
            "target_metric",
            "target_metric_threshold",
            "similarity_metric",
            "boundary_f_tolerance",
            "boundary_f_threshold",
            "iou_threshold",
            "oks_threshold",
            "oks_sigma",
            "line_thickness",
            "point_size_base",
            "compare_line_orientation",
            "line_orientation_threshold",
            "compare_groups",
            "group_match_threshold",
            "check_covered_annotations",
            "object_visibility_threshold",
            "panoptic_comparison",
            "compare_attributes",
            "attribute_comparison",
        }
    ),
    similarity_metrics=MappingProxyType(
        {
            "tag": ("equality",),
            "rectangle": ("iou", "boundary_f"),
            "polygon": ("iou", "boundary_f"),
            "mask": ("iou", "boundary_f"),
            "polyline": ("iou", "boundary_f"),
            "ellipse": ("iou", "boundary_f"),
            "points": ("oks",),
            "skeleton": ("oks",),
            "skeleton_keypoint": ("oks",),
        }
    ),
)
