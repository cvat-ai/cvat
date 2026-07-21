from collections.abc import Iterator
from typing import Any

import django.db.models.deletion
from django.db import migrations, models

from cvat.apps.engine.utils import take_by

_BATCH_SIZE = 1000

_BASE_REQUIREMENT_ANNOTATION_TYPES = (
    "tag",
    "rectangle",
    "skeleton",
    "skeleton_keypoint",
    "points",
    "polyline",
    "mask",
    "polygon",
    "ellipse",
)

_BASE_REQUIREMENT_DEFAULTS = {
    "target_metric": "accuracy",
    "target_metric_threshold": 0.7,
    "iou_threshold": 0.4,
    "oks_sigma": 0.09,
    "line_thickness": 0.01,
    "point_size_base": "group_bbox_size",
    "compare_line_orientation": True,
    "line_orientation_threshold": 0.1,
    "compare_groups": True,
    "group_match_threshold": 0.5,
    "check_covered_annotations": True,
    "object_visibility_threshold": 0.05,
    "panoptic_comparison": True,
    "compare_attributes": False,
    "attribute_comparison": None,
    "empty_is_annotated": True,
}


def _base_requirement_name(annotation_type: str) -> str:
    return f"Base {annotation_type.replace('_', ' ')}"


def _ensure_base_quality_requirements(apps, _schema_editor):
    QualitySettings = apps.get_model("quality_control", "QualitySettings")
    QualityRequirement = apps.get_model("quality_control", "QualityRequirement")

    def make_requirements() -> Iterator[Any]:
        settings_ids = QualitySettings.objects.values_list("id", flat=True).iterator(
            chunk_size=_BATCH_SIZE
        )
        for settings_id in settings_ids:
            for sort_order, annotation_type in enumerate(_BASE_REQUIREMENT_ANNOTATION_TYPES):
                yield QualityRequirement(
                    settings_id=settings_id,
                    name=_base_requirement_name(annotation_type),
                    is_base=True,
                    sort_order=sort_order,
                    filter="",
                    enabled=False,
                    annotation_type=annotation_type,
                    parent_id=None,
                    **_BASE_REQUIREMENT_DEFAULTS,
                )

    for requirements_batch in take_by(make_requirements(), chunk_size=_BATCH_SIZE):
        QualityRequirement.objects.bulk_create(
            requirements_batch,
            batch_size=_BATCH_SIZE,
        )


class Migration(migrations.Migration):
    dependencies = [
        ("quality_control", "0011_default_quality_settings_for_old_tasks"),
    ]

    operations = [
        migrations.CreateModel(
            name="QualityRequirement",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("created_date", models.DateTimeField(auto_now_add=True)),
                ("updated_date", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=250)),
                (
                    "annotation_type",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("tag", "Tag"),
                            ("rectangle", "Rectangle"),
                            ("skeleton", "Skeleton"),
                            ("skeleton_keypoint", "Skeleton Keypoint"),
                            ("points", "Points"),
                            ("polyline", "Polyline"),
                            ("mask", "Mask"),
                            ("polygon", "Polygon"),
                            ("ellipse", "Ellipse"),
                        ],
                        max_length=32,
                        null=True,
                    ),
                ),
                (
                    "target_metric",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("accuracy", "ACCURACY"),
                            ("precision", "PRECISION"),
                            ("recall", "RECALL"),
                        ],
                        default="accuracy",
                        max_length=32,
                        null=True,
                    ),
                ),
                (
                    "target_metric_threshold",
                    models.FloatField(blank=True, default=0.7, null=True),
                ),
                ("filter", models.TextField(blank=True)),
                ("enabled", models.BooleanField(default=True)),
                ("is_base", models.BooleanField(default=False)),
                ("sort_order", models.IntegerField(default=0)),
                ("iou_threshold", models.FloatField(blank=True, null=True)),
                ("oks_sigma", models.FloatField(blank=True, null=True)),
                ("line_thickness", models.FloatField(blank=True, null=True)),
                (
                    "point_size_base",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("image_size", "IMAGE_SIZE"),
                            ("group_bbox_size", "GROUP_BBOX_SIZE"),
                        ],
                        default="group_bbox_size",
                        max_length=32,
                        null=True,
                    ),
                ),
                ("compare_line_orientation", models.BooleanField(blank=True, null=True)),
                ("line_orientation_threshold", models.FloatField(blank=True, null=True)),
                ("compare_groups", models.BooleanField(blank=True, null=True)),
                ("group_match_threshold", models.FloatField(blank=True, null=True)),
                ("check_covered_annotations", models.BooleanField(blank=True, null=True)),
                ("object_visibility_threshold", models.FloatField(blank=True, null=True)),
                ("panoptic_comparison", models.BooleanField(blank=True, null=True)),
                ("compare_attributes", models.BooleanField(blank=True, null=True)),
                ("attribute_comparison", models.JSONField(blank=True, default=None, null=True)),
                ("empty_is_annotated", models.BooleanField(blank=True, default=True, null=True)),
                (
                    "parent",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.DO_NOTHING,
                        related_name="children",
                        to="quality_control.qualityrequirement",
                    ),
                ),
                (
                    "settings",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="requirements",
                        related_query_name="requirement",
                        to="quality_control.qualitysettings",
                    ),
                ),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(
                        fields=("settings", "name"),
                        name="quality_requirements_unique_per_settings",
                    ),
                ],
            },
        ),
        migrations.AddField(
            model_name="annotationconflict",
            name="attribute_names",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AlterField(
            model_name="annotationconflict",
            name="severity",
            field=models.CharField(choices=[("error", "ERROR")], max_length=32),
        ),
        migrations.AlterField(
            model_name="annotationconflict",
            name="type",
            field=models.CharField(
                choices=[
                    ("missing_annotation", "MISSING_ANNOTATION"),
                    ("extra_annotation", "EXTRA_ANNOTATION"),
                    ("mismatching_label", "MISMATCHING_LABEL"),
                    ("mismatching_direction", "MISMATCHING_DIRECTION"),
                    ("mismatching_attributes", "MISMATCHING_ATTRIBUTES"),
                    ("mismatching_groups", "MISMATCHING_GROUPS"),
                    ("covered_annotation", "COVERED_ANNOTATION"),
                ],
                max_length=32,
            ),
        ),
        migrations.RemoveField(
            model_name="qualitysettings",
            name="check_covered_annotations",
        ),
        migrations.RemoveField(
            model_name="qualitysettings",
            name="compare_attributes",
        ),
        migrations.RemoveField(
            model_name="qualitysettings",
            name="compare_groups",
        ),
        migrations.RemoveField(
            model_name="qualitysettings",
            name="compare_line_orientation",
        ),
        migrations.RemoveField(
            model_name="qualitysettings",
            name="empty_is_annotated",
        ),
        migrations.RemoveField(
            model_name="qualitysettings",
            name="group_match_threshold",
        ),
        migrations.RemoveField(
            model_name="qualitysettings",
            name="iou_threshold",
        ),
        migrations.RemoveField(
            model_name="qualitysettings",
            name="line_orientation_threshold",
        ),
        migrations.RemoveField(
            model_name="qualitysettings",
            name="line_thickness",
        ),
        migrations.RemoveField(
            model_name="qualitysettings",
            name="low_overlap_threshold",
        ),
        migrations.RemoveField(
            model_name="qualitysettings",
            name="object_visibility_threshold",
        ),
        migrations.RemoveField(
            model_name="qualitysettings",
            name="oks_sigma",
        ),
        migrations.RemoveField(
            model_name="qualitysettings",
            name="panoptic_comparison",
        ),
        migrations.RemoveField(
            model_name="qualitysettings",
            name="point_size_base",
        ),
        migrations.RemoveField(
            model_name="qualitysettings",
            name="target_metric",
        ),
        migrations.RemoveField(
            model_name="qualitysettings",
            name="target_metric_threshold",
        ),
        migrations.RunPython(
            _ensure_base_quality_requirements,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
