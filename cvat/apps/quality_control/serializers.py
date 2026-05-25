# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import textwrap
from collections.abc import Mapping
from enum import Enum

from django.conf import settings as django_settings
from django.db import models as django_models
from django.db import transaction
from rest_framework import serializers

from cvat.apps.engine import field_validation
from cvat.apps.engine import serializers as engine_serializers
from cvat.apps.engine.filters import JsonLogicFilter
from cvat.apps.engine.serializers import WriteOnceMixin
from cvat.apps.quality_control import models
from cvat.apps.quality_control.filters import RequirementJsonLogicFilter


class AnnotationIdSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.AnnotationId
        fields = ("obj_id", "job_id", "type", "shape_type")
        read_only_fields = fields


class AnnotationConflictSerializer(serializers.ModelSerializer):
    annotation_ids = AnnotationIdSerializer(many=True)

    class Meta:
        model = models.AnnotationConflict
        fields = (
            "id",
            "frame",
            "type",
            "annotation_ids",
            "report_id",
            "severity",
            "attribute_names",
        )
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
    completed = serializers.IntegerField(
        source="completed_count", help_text="Tasks with all enabled requirements met"
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
    completed = serializers.IntegerField(
        source="completed_count", help_text="Jobs with all enabled requirements met"
    )


class QualityReportRequirementSummaryItemSerializer(serializers.Serializer):
    name = serializers.CharField()
    metric = serializers.CharField()
    score = serializers.FloatField(allow_null=True)
    threshold = serializers.FloatField()


class QualityReportRequirementsSummarySerializer(serializers.Serializer):
    total = serializers.IntegerField()
    enabled = serializers.IntegerField()
    completed = serializers.IntegerField()
    items = QualityReportRequirementSummaryItemSerializer(many=True)


class QualityReportTargetSerializer(serializers.ChoiceField):
    def __init__(self, **kwargs):
        super().__init__(choices=models.QualityReportTarget.choices(), **kwargs)


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
    requirements = QualityReportRequirementsSummarySerializer(required=False)

    def to_representation(self, instance):
        representation = super().to_representation(instance)

        # Old reports may miss "tasks" and "jobs", new reports may miss "frame_*" fields
        for optional_field in ("tasks", "jobs", "requirements", "frame_count", "frame_share"):
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
    target = QualityReportTargetSerializer()
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


_INHERITED_REQUIREMENT_FIELDS = (
    "annotation_type",
    "target_metric",
    "target_metric_threshold",
    "iou_threshold",
    "oks_sigma",
    "line_thickness",
    "low_overlap_threshold",
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
    "empty_is_annotated",
)


# TODO: try to split into different types per annotation type?
class QualityRequirementSerializer(serializers.ModelSerializer):
    settings_id = serializers.PrimaryKeyRelatedField(
        source="settings",
        queryset=models.QualitySettings.objects.all(),
        required=False,
    )
    task_id = serializers.IntegerField(source="settings.task_id", read_only=True, allow_null=True)
    project_id = serializers.IntegerField(
        source="settings.project_id", read_only=True, allow_null=True
    )
    metric = serializers.ChoiceField(
        source="target_metric",
        choices=models.QualityTargetMetricType.choices(),
        required=False,
        allow_null=True,
        help_text="The primary metric used for quality estimation",
    )
    required_score = serializers.FloatField(
        source="target_metric_threshold",
        required=False,
        allow_null=True,
        min_value=0,
        max_value=1,
        help_text=textwrap.dedent("""
            Defines the minimal quality requirements in terms of the selected target metric.
            """).strip(),
    )
    parent_requirement = serializers.PrimaryKeyRelatedField(
        source="parent",
        queryset=models.QualityRequirement.objects.all(),
        allow_null=True,
        required=False,
        help_text=textwrap.dedent("""
            The parent requirement. Child requirements inherit comparison settings from it.
            """).strip(),
    )
    point_size = serializers.FloatField(
        source="oks_sigma",
        required=False,
        allow_null=True,
        min_value=0,
        max_value=1,
        help_text=textwrap.dedent("""
            Like IoU threshold, but for points.
            The percent of the bbox side, used as the radius of the circle around the GT point,
            where the checked point is expected to be. For boxes with different width and
            height, the "side" is computed as a geometric mean of the width and height.
            Read more: https://cocodataset.org/#keypoints-eval
            """).strip(),
    )
    match_orientation = serializers.BooleanField(
        source="compare_line_orientation",
        required=False,
        allow_null=True,
        help_text="Enables or disables polyline orientation comparison",
    )
    match_groups = serializers.BooleanField(
        source="compare_groups",
        required=False,
        allow_null=True,
        help_text="Enables or disables annotation group checks",
    )
    match_attributes = serializers.BooleanField(
        source="compare_attributes",
        required=False,
        allow_null=True,
        help_text="Enables or disables annotation attribute comparison",
    )
    effective = serializers.SerializerMethodField(read_only=True)

    @staticmethod
    def _get_requirement_limit() -> int:
        return django_settings.MAX_QUALITY_REQUIREMENTS_PER_SETTINGS

    @classmethod
    def get_requirement_limit_error_message(cls) -> str:
        return (
            "No more than "
            f"{cls._get_requirement_limit()} quality requirements are allowed per task or project."
        )

    def _should_skip_requirement_limit_validation(self) -> bool:
        return self.context.get("skip_requirement_limit_validation", False)

    @staticmethod
    def _field_to_public_name(field_name: str) -> str:
        return {
            "target_metric": "metric",
            "target_metric_threshold": "required_score",
            "oks_sigma": "point_size",
            "compare_line_orientation": "match_orientation",
            "compare_attributes": "match_attributes",
            "compare_groups": "match_groups",
        }.get(field_name, field_name)

    def _validate_requirement_limit_for_settings(
        self, quality_settings: models.QualitySettings
    ) -> None:
        if self._should_skip_requirement_limit_validation():
            return

        if self.instance is not None and self.instance.settings_id == quality_settings.id:
            return

        if quality_settings.requirements.count() >= self._get_requirement_limit():
            raise serializers.ValidationError(
                {"settings_id": self.get_requirement_limit_error_message()}
            )

    @staticmethod
    def _get_effective_annotation_type(
        requirement: models.QualityRequirement | None,
    ) -> str | None:
        visited: set[int] = set()
        while requirement is not None:
            requirement_id = getattr(requirement, "id", None)
            if requirement_id is not None:
                if requirement_id in visited:
                    return None
                visited.add(requirement_id)

            if requirement.annotation_type:
                return requirement.annotation_type

            requirement = getattr(requirement, "parent", None)

        return None

    def get_effective(self, obj: models.QualityRequirement) -> dict:
        from cvat.apps.quality_control.quality_handlers import (
            resolve_effective_requirement,
            serialize_requirement_parameters,
        )

        effective_requirement = resolve_effective_requirement(obj)
        return serialize_requirement_parameters(effective_requirement)

    def validate_filter(self, value):
        annotation_type = self.initial_data.get("annotation_type")
        if annotation_type is None and self.instance is not None:
            annotation_type = self.instance.annotation_type

        parent_requirement = self.initial_data.get("parent_requirement")
        if (
            parent_requirement is None
            and self.instance is not None
            and getattr(self.instance, "parent", None)
        ):
            parent_requirement = self.instance.parent

        if hasattr(parent_requirement, "annotation_type"):
            if annotation_type is None:
                annotation_type = self._get_effective_annotation_type(parent_requirement)
        elif parent_requirement:
            try:
                parent_requirement_obj = models.QualityRequirement.objects.select_related(
                    "parent"
                ).get(pk=parent_requirement)
                if annotation_type is None:
                    annotation_type = self._get_effective_annotation_type(parent_requirement_obj)
            except (
                models.QualityRequirement.DoesNotExist,
                TypeError,
                ValueError,
            ):
                pass

        RequirementJsonLogicFilter.validate_expression(
            value,
            annotation_type=annotation_type,
        )
        return value

    def to_internal_value(self, data):
        if isinstance(data, Mapping):
            unexpected_fields = set(data) - set(self.fields)
            if unexpected_fields:
                raise serializers.ValidationError(
                    {field_name: ["Unexpected field."] for field_name in sorted(unexpected_fields)}
                )

        return super().to_internal_value(data)

    def validate_attribute_comparison(self, value):
        if value is None:
            return value

        if not isinstance(value, Mapping):
            raise serializers.ValidationError("Expected an object or null.")

        unexpected_fields = set(value) - {"enabled", "default", "rules"}
        if unexpected_fields:
            raise serializers.ValidationError(
                {field_name: ["Unexpected field."] for field_name in sorted(unexpected_fields)}
            )

        if "enabled" in value and not isinstance(value["enabled"], bool):
            raise serializers.ValidationError({"enabled": "Expected a boolean."})

        default_rule = value.get("default")
        if default_rule is not None and not isinstance(default_rule, Mapping):
            raise serializers.ValidationError({"default": "Expected an object."})

        rules = value.get("rules", [])
        if not isinstance(rules, list):
            raise serializers.ValidationError({"rules": "Expected a list."})

        for index, rule in enumerate(rules):
            if not isinstance(rule, Mapping):
                raise serializers.ValidationError({"rules": {index: "Expected an object."}})

            if not rule.get("name"):
                raise serializers.ValidationError(
                    {"rules": {index: {"name": "This field is required."}}}
                )

            if "enabled" in rule and not isinstance(rule["enabled"], bool):
                raise serializers.ValidationError(
                    {"rules": {index: {"enabled": "Expected a boolean."}}}
                )

            comparator = rule.get("comparator")
            if comparator is not None and comparator not in {"exact", "levenshtein"}:
                raise serializers.ValidationError(
                    {
                        "rules": {
                            index: {
                                "comparator": (
                                    "Unsupported comparator. Use 'exact' or 'levenshtein'."
                                )
                            }
                        }
                    }
                )

            threshold = rule.get("threshold")
            if threshold is not None and not 0 <= threshold <= 1:
                raise serializers.ValidationError(
                    {"rules": {index: {"threshold": "Must be between 0 and 1."}}}
                )

        return value

    class Meta:
        model = models.QualityRequirement
        fields = (
            "id",
            "settings_id",
            "task_id",
            "project_id",
            "name",
            "is_default",
            "sort_order",
            "filter",
            "enabled",
            "annotation_type",
            "metric",
            "required_score",
            "parent_requirement",
            "effective",
            "iou_threshold",
            "point_size",
            "point_size_base",
            "line_thickness",
            "low_overlap_threshold",
            "match_orientation",
            "line_orientation_threshold",
            "match_groups",
            "group_match_threshold",
            "check_covered_annotations",
            "object_visibility_threshold",
            "panoptic_comparison",
            "match_attributes",
            "attribute_comparison",
            "empty_is_annotated",
            "created_date",
            "updated_date",
        )
        read_only_fields = (
            "id",
            "task_id",
            "project_id",
            "is_default",
            "effective",
            "created_date",
            "updated_date",
        )

        extra_kwargs = {k: {"required": False} for k in fields}
        extra_kwargs.setdefault("empty_is_annotated", {}).setdefault("default", False)

        for field_name, help_text in {
            "iou_threshold": "Used for distinction between matched / unmatched shapes",
            "low_overlap_threshold": """
                Used for distinction between strong / weak (low_overlap) matches
            """,
            "point_size_base": """
                When comparing point annotations (including both separate points and point groups),
                the point size parameter defines matching area for each GT point based to the
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
            "line_orientation_threshold": """
                The minimal gain in the GT IoU between the given and reversed line directions
                to consider the line inverted.
                Only used when the 'match_orientation' parameter is true
            """,
            "group_match_threshold": """
                Minimal IoU for groups to be considered matching.
                Only used when the 'match_groups' parameter is true
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
            if field_name.endswith("_threshold") or field_name in [
                "point_size",
                "line_thickness",
                "required_score",
            ]:
                extra_kwargs.setdefault(field_name, {}).setdefault("min_value", 0)
                extra_kwargs.setdefault(field_name, {}).setdefault("max_value", 1)

    def validate(self, attrs):
        attrs = super().validate(attrs)

        quality_settings = attrs.get("settings", getattr(self.instance, "settings", None))
        parent_requirement = attrs.get("parent", getattr(self.instance, "parent", None))
        annotation_type = attrs.get(
            "annotation_type", getattr(self.instance, "annotation_type", None)
        )
        name = attrs.get("name", getattr(self.instance, "name", None))

        if quality_settings is None:
            raise serializers.ValidationError({"settings_id": "This field is required."})

        if not name:
            raise serializers.ValidationError({"name": "This field is required."})

        if parent_requirement is not None and parent_requirement.settings_id != quality_settings.id:
            raise serializers.ValidationError(
                {
                    "parent_requirement": (
                        "Parent requirement must belong to the same quality settings."
                    )
                }
            )

        if parent_requirement is not None:
            parent_effective_annotation_type = self._get_effective_annotation_type(
                parent_requirement
            )
            if annotation_type is not None:
                if annotation_type != parent_effective_annotation_type:
                    raise serializers.ValidationError(
                        {
                            "annotation_type": (
                                "Child requirements inherit annotation type from their parent."
                            )
                        }
                    )
                attrs["annotation_type"] = None
        elif annotation_type is None:
            raise serializers.ValidationError(
                {"annotation_type": "This field is required for root requirements."}
            )

        if self.instance and parent_requirement is not None:
            current_parent = parent_requirement
            visited_parent_ids: set[int] = set()
            while current_parent is not None:
                if current_parent.id == self.instance.id:
                    raise serializers.ValidationError(
                        {"parent_requirement": "A requirement cannot reference itself as a parent."}
                    )

                if current_parent.id in visited_parent_ids:
                    raise serializers.ValidationError(
                        {"parent_requirement": "Requirement parent cycle is not allowed."}
                    )

                visited_parent_ids.add(current_parent.id)
                current_parent = current_parent.parent

        if parent_requirement is None:
            for field_name in _INHERITED_REQUIREMENT_FIELDS:
                if field_name == "attribute_comparison":
                    continue

                if field_name in attrs and attrs[field_name] is None:
                    raise serializers.ValidationError(
                        {
                            self._field_to_public_name(
                                field_name
                            ): "Root requirements cannot inherit."
                        }
                    )

        self._validate_requirement_limit_for_settings(quality_settings)

        if name:
            qs = models.QualityRequirement.objects.filter(settings=quality_settings, name=name)
            if self.instance:
                qs = qs.exclude(id=self.instance.id)

            retained_requirement_ids = self.context.get("retained_requirement_ids")
            if retained_requirement_ids is not None:
                qs = qs.filter(id__in=retained_requirement_ids)

            if qs.exists():
                raise serializers.ValidationError(
                    {"name": "Requirement with this name already exists in the selected settings."}
                )

        return attrs

    @staticmethod
    def _touch_settings(settings: models.QualitySettings) -> None:
        settings.save()

    def _should_touch_settings(self) -> bool:
        return self.context.get("touch_settings", True)

    @staticmethod
    def _apply_root_defaults(validated_data):
        defaults = models.QualityRequirement.get_defaults()
        for field_name in _INHERITED_REQUIREMENT_FIELDS:
            if field_name in validated_data:
                continue

            if field_name == "target_metric":
                validated_data[field_name] = models.QualityTargetMetricType.ACCURACY
            elif field_name == "target_metric_threshold":
                validated_data[field_name] = 0.7
            elif field_name == "attribute_comparison":
                validated_data[field_name] = None
            elif field_name in defaults:
                validated_data[field_name] = defaults[field_name]

    @staticmethod
    def _clear_child_inherited_defaults(validated_data):
        for field_name in _INHERITED_REQUIREMENT_FIELDS:
            validated_data.setdefault(field_name, None)

    def create(self, validated_data):
        if validated_data.get("parent") is None:
            self._apply_root_defaults(validated_data)
        else:
            self._clear_child_inherited_defaults(validated_data)

        instance = super().create(validated_data)
        if self._should_touch_settings():
            self._touch_settings(instance.settings)
        return instance

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        if self._should_touch_settings():
            self._touch_settings(instance.settings)
        return instance


class QualitySettingsRequirementsField(serializers.Field):
    def to_representation(self, value):
        requirements = value.all() if hasattr(value, "all") else value
        return QualityRequirementSerializer(
            requirements,
            many=True,
            context=getattr(self.parent, "context", {}),
        ).data

    def to_internal_value(self, data):
        if not isinstance(data, list):
            raise serializers.ValidationError("Expected a list of quality requirements.")

        for item in data:
            if not isinstance(item, dict):
                raise serializers.ValidationError("Each quality requirement must be an object.")

        return data


class QualitySettingsSerializer(WriteOnceMixin, serializers.ModelSerializer):
    task_id = serializers.IntegerField(required=False, allow_null=True)
    project_id = serializers.IntegerField(required=False, allow_null=True)
    requirements = QualitySettingsRequirementsField(required=False)

    class Meta:
        model = models.QualitySettings
        fields = (
            "id",
            "task_id",
            "project_id",
            "job_filter",
            "inherit",
            "max_validations_per_job",
            "requirements",
            "created_date",
            "updated_date",
        )
        read_only_fields = ("id", "created_date", "updated_date")
        write_once_fields = ("task_id", "project_id")

        extra_kwargs = {k: {"required": False} for k in fields}
        extra_kwargs.setdefault("empty_is_annotated", {}).setdefault("default", False)

        for field_name, help_text in {
            "inherit": """
                Allow using project settings when computing task quality.
                Only applicable to task quality settings inside projects
            """,
            "max_validations_per_job": """
                The maximum number of job validation attempts for the job assignee.
                The job can be automatically accepted if the job quality is above the required
                threshold, defined by the target threshold parameter.
            """,
        }.items():
            extra_kwargs.setdefault(field_name, {}).setdefault(
                "help_text", textwrap.dedent(help_text.lstrip("\n"))
            )

    job_filter = serializers.CharField(
        allow_blank=True,
        max_length=1024,
        required=False,
        help_text=textwrap.dedent("""\
            A JSON-based logic expression used to filter jobs for quality validation.
            The filter supports various terms to specify conditions on job: {}
        """.format(Meta.model.get_job_filter_terms())),
    )

    def validate_job_filter(self, value):
        if value:
            JsonLogicFilter().parse_query(value, raise_on_empty=False)
        return value

    def get_extra_kwargs(self):
        defaults = models.QualityRequirement.get_defaults()

        extra_kwargs = super().get_extra_kwargs()

        for param_name in defaults.keys() | extra_kwargs.keys():
            param_kwargs: dict = extra_kwargs.setdefault(param_name, {})

            if param_name in defaults:
                param_kwargs.setdefault("default", defaults[param_name])

        return extra_kwargs

    def _make_requirement_serializer(
        self,
        *,
        settings: models.QualitySettings,
        data: dict,
        retained_requirement_ids: set[int],
        instance: models.QualityRequirement | None = None,
    ) -> QualityRequirementSerializer:
        serializer_context = {
            **self.context,
            "touch_settings": False,
            "retained_requirement_ids": retained_requirement_ids,
            "skip_requirement_limit_validation": True,
        }
        serializer_data = {
            **data,
            "settings_id": settings.id,
        }
        return QualityRequirementSerializer(
            instance=instance,
            data=serializer_data,
            context=serializer_context,
        )

    def _sync_requirements(
        self,
        instance: models.QualitySettings,
        requirements_data: list[dict],
    ) -> None:
        # The requirements payload replaces the whole current requirement set.
        if not requirements_data:
            raise serializers.ValidationError(
                {"requirements": "At least one quality requirement must be specified."}
            )

        if len(requirements_data) > QualityRequirementSerializer._get_requirement_limit():
            raise serializers.ValidationError(
                {"requirements": QualityRequirementSerializer.get_requirement_limit_error_message()}
            )

        existing_requirements = {
            requirement.id: requirement
            for requirement in instance.requirements.select_related("parent").all()
        }
        retained_requirement_ids: set[int] = set()
        seen_requirement_ids: set[int] = set()
        seen_requirement_names: set[str] = set()

        for index, requirement_data in enumerate(requirements_data):
            requirement_id = requirement_data.get("id")
            if requirement_id is None:
                continue

            try:
                requirement_id = int(requirement_id)
            except (TypeError, ValueError) as exc:
                raise serializers.ValidationError(
                    {"requirements": {index: {"id": "A valid integer is required."}}}
                ) from exc

            if requirement_id in seen_requirement_ids:
                raise serializers.ValidationError(
                    {"requirements": {index: {"id": "Requirement ids must be unique."}}}
                )

            requirement = existing_requirements.get(requirement_id)
            if requirement is None:
                raise serializers.ValidationError(
                    {
                        "requirements": {
                            index: {"id": "Requirement does not belong to the selected settings."}
                        }
                    }
                )

            seen_requirement_ids.add(requirement_id)
            retained_requirement_ids.add(requirement_id)

        child_serializers: list[QualityRequirementSerializer] = []
        for index, requirement_data in enumerate(requirements_data):
            requirement_id = requirement_data.get("id")
            requirement_instance = None
            if requirement_id is not None:
                requirement_instance = existing_requirements[int(requirement_id)]

            child_serializer = self._make_requirement_serializer(
                settings=instance,
                data=requirement_data,
                retained_requirement_ids=retained_requirement_ids,
                instance=requirement_instance,
            )
            child_serializer.is_valid(raise_exception=True)

            requirement_name = child_serializer.validated_data.get(
                "name",
                getattr(requirement_instance, "name", None),
            )
            if requirement_name in seen_requirement_names:
                raise serializers.ValidationError(
                    {"requirements": {index: {"name": "Requirement names must be unique."}}}
                )

            seen_requirement_names.add(requirement_name)
            child_serializers.append(child_serializer)

        referenced_parent_ids = {
            parent.id
            for child_serializer in child_serializers
            if (
                parent := child_serializer.validated_data.get(
                    "parent",
                    getattr(child_serializer.instance, "parent", None),
                )
            )
            is not None
        }
        missing_parent_ids = referenced_parent_ids - retained_requirement_ids
        if missing_parent_ids:
            raise serializers.ValidationError(
                {
                    "requirements": (
                        "Parent requirements must be included in the same bulk settings update."
                    )
                }
            )

        prospective_parent_ids = {}
        for child_serializer in child_serializers:
            if child_serializer.instance is None:
                continue

            parent = child_serializer.validated_data.get(
                "parent",
                getattr(child_serializer.instance, "parent", None),
            )
            prospective_parent_ids[child_serializer.instance.id] = getattr(parent, "id", None)

        for requirement_id in prospective_parent_ids:
            visited_requirement_ids = set()
            parent_id = prospective_parent_ids[requirement_id]
            while parent_id is not None and parent_id in prospective_parent_ids:
                if parent_id == requirement_id or parent_id in visited_requirement_ids:
                    raise serializers.ValidationError(
                        {"requirements": "Requirement parent cycle is not allowed."}
                    )

                visited_requirement_ids.add(parent_id)
                parent_id = prospective_parent_ids[parent_id]

        saved_requirement_ids = set()
        for child_serializer in child_serializers:
            saved_requirement = child_serializer.save()
            saved_requirement_ids.add(saved_requirement.id)

        obsolete_requirement_ids = set(existing_requirements) - saved_requirement_ids
        if obsolete_requirement_ids:
            obsolete_default_requirements = [
                existing_requirements[requirement_id].name
                for requirement_id in obsolete_requirement_ids
                if existing_requirements[requirement_id].is_default
            ]
            if obsolete_default_requirements:
                raise serializers.ValidationError(
                    {"requirements": "Default quality requirements cannot be deleted."}
                )

            instance.requirements.filter(id__in=obsolete_requirement_ids).delete()

    def to_representation(self, instance):
        models.ensure_default_quality_requirements(instance)
        return super().to_representation(instance)

    def update(self, instance, validated_data):
        requirements_data = validated_data.pop("requirements", serializers.empty)

        with transaction.atomic():
            if instance.task_id:
                instance.task.touch()
            elif instance.project_id:
                instance.project.touch()

            models.ensure_default_quality_requirements(instance)
            instance = super().update(instance, validated_data)

            if requirements_data is not serializers.empty:
                self._sync_requirements(instance, requirements_data)
                instance.save()
                prefetched_objects_cache = getattr(instance, "_prefetched_objects_cache", None)
                if prefetched_objects_cache is not None:
                    prefetched_objects_cache.pop("requirements", None)

        return instance
