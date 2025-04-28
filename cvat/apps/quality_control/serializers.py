# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import textwrap
from enum import Enum

from django.db import models as django_models
from rest_framework import serializers

from cvat.apps.engine import field_validation
from cvat.apps.engine import serializers as engine_serializers
from cvat.apps.engine.filters import JsonLogicFilter
from cvat.apps.engine.serializers import WriteOnceMixin
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


class QualityReportTasksSummarySerializer(serializers.Serializer):
    total = serializers.IntegerField(source="total_count", help_text="Total task count")
    custom = serializers.IntegerField(
        source="custom_count", help_text="Tasks with individual settings"
    )
    not_configured = serializers.IntegerField(
        source="not_configured_count", help_text="Tasks with validation not configured"
    )
    excluded = serializers.IntegerField(
        source="excluded_count", help_text="Tasks excluded by filters"
    )
    included = serializers.IntegerField(
        source="included_count",
        help_text="Included task count = total - custom - non_configured - excluded",
    )


class QualityReportJobsSummarySerializer(serializers.Serializer):
    total = serializers.IntegerField(
        source="total_count", help_text="Non-GT jobs in included tasks"
    )
    excluded = serializers.IntegerField(
        source="excluded_count", help_text="Jobs excluded by filters"
    )
    not_checkable = serializers.IntegerField(
        source="not_checkable_count", help_text="Included jobs without validation frames"
    )
    included = serializers.IntegerField(
        source="included_count", help_text="Included job count = total - excluded"
    )


class QualityReportSummarySerializer(serializers.Serializer):
    total_frames = serializers.IntegerField()
    frame_count = serializers.IntegerField(
        required=False, help_text="Deprecated. Use 'validation_frames' instead"
    )
    validation_frames = serializers.IntegerField(source="frame_count")
    frame_share = serializers.FloatField(
        required=False, help_text="Deprecated. Use 'validation_frame_share' instead"
    )
    validation_frame_share = serializers.FloatField(source="frame_share")

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

    tasks = QualityReportTasksSummarySerializer(
        required=False, help_text="Included only in project reports"
    )
    jobs = QualityReportJobsSummarySerializer(
        required=False, help_text="Included only in task and project reports"
    )

    def to_representation(self, instance):
        representation = super().to_representation(instance)

        # Old reports may miss "tasks" and "jobs", new reports may miss "frame_*" fields
        for optional_field in ("tasks", "jobs", "frame_count", "frame_share"):
            if representation.get(optional_field) is None:
                representation.pop(optional_field, None)

        return representation


class QualityReportListSerializer(serializers.ListSerializer):
    def to_representation(self, data):
        if isinstance(data, list) and data:
            # Optimized prefetch only for the current page
            page: list[models.QualityReport] = data

            # Annotate page objects
            # We do it explicitly here and not in the LIST queryset to avoid
            # doing the same DB computations twice - one time for the page retrieval
            # and another one for the COUNT(*) request to get total count
            report_ids = set(report.id for report in page)
            report_fields = {
                report_id: {
                    "data": data,
                    "parent_id": parent_id,
                }
                for report_id, data, parent_id in models.QualityReport.objects.filter(
                    id__in=report_ids
                )
                .annotate(parent_id=django_models.Min("parents__id"))
                .values_list("id", "data", "parent_id")
            }

            for report in page:
                report.data = report_fields.get(report.id, {}).get("data")
                report.parent_id = report_fields.get(report.id, {}).get("parent_id")

            django_models.prefetch_related_objects(
                page,
                "job",
                "job__segment",
                "job__segment__task",
                "job__segment__task__project",
                "task",
                "task__project",
                "project",
            )

        return super().to_representation(data)


class QualityReportSerializer(serializers.ModelSerializer):
    target = serializers.ChoiceField(choices=models.QualityReportTarget.choices())
    assignee = engine_serializers.BasicUserSerializer(allow_null=True, read_only=True)
    summary = QualityReportSummarySerializer()
    parent_id = serializers.IntegerField(default=None, allow_null=True, read_only=True)
    task_id = serializers.IntegerField(
        source="get_task.id", default=None, allow_null=True, read_only=True
    )
    project_id = serializers.IntegerField(
        source="get_project.id", default=None, allow_null=True, read_only=True
    )

    class Meta:
        model = models.QualityReport
        fields = (
            "id",
            "job_id",
            "task_id",
            "project_id",
            "parent_id",
            "target",
            "summary",
            "created_date",
            "target_last_updated",
            "gt_last_updated",
            "assignee",
        )
        read_only_fields = fields
        list_serializer_class = QualityReportListSerializer


class QualityReportCreateSerializer(serializers.Serializer):
    task_id = serializers.IntegerField(write_only=True, required=False)
    project_id = serializers.IntegerField(write_only=True, required=False)

    def validate(self, attrs):
        field_validation.require_one_of_fields(attrs, ["task_id", "project_id"])
        return attrs


class QualitySettingsParentType(str, Enum):
    TASK = "task"
    PROJECT = "project"

    def __str__(self) -> str:
        return self.value

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)


class QualitySettingsSerializer(WriteOnceMixin, serializers.ModelSerializer):
    task_id = serializers.IntegerField(required=False, allow_null=True)
    project_id = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = models.QualitySettings
        fields = (
            "id",
            "task_id",
            "project_id",
            "job_filter",
            "inherit",
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
            "created_date",
            "updated_date",
        )
        read_only_fields = ("id",)
        write_once_fields = ("task_id", "project_id")

        extra_kwargs = {k: {"required": False} for k in fields}
        extra_kwargs.setdefault("empty_is_annotated", {}).setdefault("default", False)

        for field_name, help_text in {
            "inherit": """
                Allow using project settings when computing task quality.
                Only applicable to task quality settings inside projects
            """,
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

        for field_name in fields:
            if field_name.endswith("_threshold") or field_name in ["oks_sigma", "line_thickness"]:
                extra_kwargs.setdefault(field_name, {}).setdefault("min_value", 0)
                extra_kwargs.setdefault(field_name, {}).setdefault("max_value", 1)

    job_filter = serializers.CharField(
        allow_blank=True,
        max_length=1024,
        required=False,
        help_text=textwrap.dedent(
            """\
        A JSON-based logic expression used to filter jobs for quality validation.
        The filter supports various terms to specify conditions on job: {}
        """.format(
                Meta.model.get_job_filter_terms()
            )
        ),
    )

    def validate_job_filter(self, value):
        if value:
            JsonLogicFilter().parse_query(value, raise_on_empty=False)
        return value

    def get_extra_kwargs(self):
        defaults = models.QualitySettings.get_defaults()

        extra_kwargs = super().get_extra_kwargs()

        for param_name in defaults.keys() | extra_kwargs.keys():
            param_kwargs: dict = extra_kwargs.setdefault(param_name, {})

            if param_name in defaults:
                param_kwargs.setdefault("default", defaults[param_name])

        return extra_kwargs

    def update(self, instance, validated_data):
        if instance.task_id:
            instance.task.touch()
        elif instance.project_id:
            instance.project.touch()

        return super().update(instance, validated_data)
