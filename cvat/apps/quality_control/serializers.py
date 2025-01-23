# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import textwrap

from rest_framework import serializers

from cvat.apps.engine import serializers as engine_serializers
from cvat.apps.quality_control import models


class AnnotationIdSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.AnnotationId
        fields = ("obj_id", "job_id", "type", "shape_type")
        read_only_fields = fields


class AnnotationConflictSerializer(serializers.ModelSerializer):
    annotation_ids = AnnotationIdSerializer(many=True)

    class Meta:
        model = models.AnnotationConflict
        fields = ("id", "frame", "type", "annotation_ids", "report_id", "severity")
        read_only_fields = fields


class QualityReportSummarySerializer(serializers.Serializer):
    frame_count = serializers.IntegerField()
    frame_share = serializers.FloatField()
    conflict_count = serializers.IntegerField()
    warning_count = serializers.IntegerField()
    error_count = serializers.IntegerField()
    conflicts_by_type = serializers.DictField(child=serializers.IntegerField())

    valid_count = serializers.IntegerField(source="annotations.valid_count")
    ds_count = serializers.IntegerField(source="annotations.ds_count")
    gt_count = serializers.IntegerField(source="annotations.gt_count")
    total_count = serializers.IntegerField(source="annotations.total_count")

    accuracy = serializers.FloatField(source="annotations.accuracy")
    precision = serializers.FloatField(source="annotations.precision")
    recall = serializers.FloatField(source="annotations.recall")


class QualityReportSerializer(serializers.ModelSerializer):
    target = serializers.ChoiceField(models.QualityReportTarget.choices())
    assignee = engine_serializers.BasicUserSerializer(allow_null=True, read_only=True)
    summary = QualityReportSummarySerializer()

    class Meta:
        model = models.QualityReport
        fields = (
            "id",
            "job_id",
            "task_id",
            "parent_id",
            "target",
            "summary",
            "created_date",
            "target_last_updated",
            "gt_last_updated",
            "assignee",
        )
        read_only_fields = fields


class QualityReportCreateSerializer(serializers.Serializer):
    task_id = serializers.IntegerField(write_only=True, required=False)


class QualitySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.QualitySettings
        fields = (
            "id",
            "task_id",
            "target_metric",
            "target_metric_threshold",
            "max_validations_per_job",
            "iou_threshold",
            "oks_sigma",
            "point_size_base",
            "line_thickness",
            "low_overlap_threshold",
            "compare_line_orientation",
            "line_orientation_threshold",
            "compare_groups",
            "group_match_threshold",
            "check_covered_annotations",
            "object_visibility_threshold",
            "panoptic_comparison",
            "compare_attributes",
            "empty_is_annotated",
        )
        read_only_fields = (
            "id",
            "task_id",
        )

        extra_kwargs = {k: {"required": False} for k in fields}
        extra_kwargs.setdefault("empty_is_annotated", {}).setdefault("default", False)

        for field_name, help_text in {
            "target_metric": "The primary metric used for quality estimation",
            "target_metric_threshold": """
                Defines the minimal quality requirements in terms of the selected target metric.
            """,
            "max_validations_per_job": """
                The maximum number of job validation attempts for the job assignee.
                The job can be automatically accepted if the job quality is above the required
                threshold, defined by the target threshold parameter.
            """,
            "iou_threshold": "Used for distinction between matched / unmatched shapes",
            "low_overlap_threshold": """
                Used for distinction between strong / weak (low_overlap) matches
            """,
            "oks_sigma": """
                Like IoU threshold, but for points.
                The percent of the bbox side, used as the radius of the circle around the GT point,
                where the checked point is expected to be. For boxes with different width and
                height, the "side" is computed as a geometric mean of the width and height.
                Read more: https://cocodataset.org/#keypoints-eval
            """,
            "point_size_base": """
                When comparing point annotations (including both separate points and point groups),
                the OKS sigma parameter defines matching area for each GT point based to the
                object size. The point size base parameter allows to configure how to determine
                the object size.
                If {image_size}, the image size is used. Useful if each point
                annotation represents a separate object or boxes grouped with points do not
                represent object boundaries.
                If {group_bbox_size}, the object size is based on
                the point group bbox size. Useful if each point group represents an object
                or there is a bbox grouped with points, representing the object size.
            """.format(
                image_size=models.PointSizeBase.IMAGE_SIZE,
                group_bbox_size=models.PointSizeBase.GROUP_BBOX_SIZE,
            ),
            "line_thickness": """
                Thickness of polylines, relatively to the (image area) ^ 0.5.
                The distance to the boundary around the GT line,
                inside of which the checked line points should be
            """,
            "compare_line_orientation": "Enables or disables polyline orientation comparison",
            "line_orientation_threshold": """
                The minimal gain in the GT IoU between the given and reversed line directions
                to consider the line inverted.
                Only used when the 'compare_line_orientation' parameter is true
            """,
            "compare_groups": "Enables or disables annotation group checks",
            "group_match_threshold": """
                Minimal IoU for groups to be considered matching.
                Only used when the 'compare_groups' parameter is true
            """,
            "check_covered_annotations": """
                Check for partially-covered annotations, useful in segmentation tasks
            """,
            "object_visibility_threshold": """
                Minimal visible area percent of the spatial annotations (polygons, masks)
                for reporting covered annotations.
                Only used when the 'object_visibility_threshold' parameter is true
            """,
            "panoptic_comparison": """
                Use only the visible part of the masks and polygons in comparisons
            """,
            "compare_attributes": "Enables or disables annotation attribute comparison",
            "empty_is_annotated": """
                Consider empty frames annotated as "empty". This affects target metrics like
                accuracy in cases there are no annotations. If disabled, frames without annotations
                are counted as not matching (accuracy is 0). If enabled, accuracy will be 1 instead.
                This will also add virtual annotations to empty frames in the comparison results.
            """,
        }.items():
            extra_kwargs.setdefault(field_name, {}).setdefault(
                "help_text", textwrap.dedent(help_text.lstrip("\n"))
            )

    def validate(self, attrs):
        for k, v in attrs.items():
            if k.endswith("_threshold") or k in ["oks_sigma", "line_thickness"]:
                if not 0 <= v <= 1:
                    raise serializers.ValidationError(f"{k} must be in the range [0; 1]")

        return super().validate(attrs)
