from django.db import migrations, models
from django.db.models.functions import Cast
from django.db.models.lookups import Exact, In, Lookup

from cvat.apps.engine.utils import take_by

# The requirement types compared by OKS
POINT_ANNOTATION_TYPES = ("points", "skeleton", "skeleton_keypoint")

# The default value at the time of the migration
DEFAULT_OKS_THRESHOLD = 0.4

BATCH_SIZE = 5000


def get_point_requirement_ids(QualityRequirement) -> list[int]:
    """
    The ids of the root requirements with the point annotation types and all their descendants.
    The child requirements always have the root annotation type, stored as NULL.
    """

    # Can be written via a recursive CTE query (WITH RECURSIVE), but the ORM is used
    # for portability. The requirement trees are shallow,
    # so it's a few batched queries per tree level.
    # At most MAX_QUALITY_REQUIREMENTS_PER_SETTINGS levels deep.
    ids = []
    level_ids = list(
        QualityRequirement.objects.filter(
            parent__isnull=True, annotation_type__in=POINT_ANNOTATION_TYPES
        ).values_list("id", flat=True)
    )
    while level_ids:
        ids.extend(level_ids)

        next_level_ids = []
        for batch_ids in take_by(level_ids, BATCH_SIZE):
            next_level_ids.extend(
                QualityRequirement.objects.filter(parent_id__in=batch_ids).values_list(
                    "id", flat=True
                )
            )
        level_ids = next_level_ids

    return ids


def is_number_iou_threshold(*, connection) -> Lookup:
    """
    IoU thresholds are stored as JSON, and can be either numbers or threshold policy objects.
    """

    match connection.vendor:
        case "postgresql":
            # https://www.postgresql.org/docs/14/functions-json.html
            return Exact(
                models.Func(
                    "iou_threshold", function="jsonb_typeof", output_field=models.CharField()
                ),
                "number",
            )
        case "sqlite":
            # The unit tests use SQLite, so it's supported as well.
            # https://www.sqlite.org/json1.html#jtype
            return In(
                models.Func("iou_threshold", function="json_type", output_field=models.CharField()),
                ["integer", "real"],
            )
        case _:
            raise NotImplementedError(f"Unknown database vendor '{connection.vendor}'")


def number_to_json(field_name: str, *, connection) -> models.Func:
    match connection.vendor:
        case "postgresql":
            return models.Func(field_name, function="to_jsonb", output_field=models.JSONField())
        case "sqlite":
            return models.Func(field_name, function="json_quote", output_field=models.JSONField())
        case _:
            raise NotImplementedError(f"Unknown database vendor '{connection.vendor}'")


def set_oks_threshold(apps, schema_editor):
    """
    The OKS threshold was defined by the IoU threshold before the migration.
    The root requirements must define all the inheritable fields,
    and the point children should keep their overrides set in the IoU threshold.
    """

    QualityRequirement = apps.get_model("quality_control", "QualityRequirement")

    # Update the bases:
    # Copy IoU threshold to OKS threshold, if it's a number.
    # Otherwise, use the default OKS threshold. IoU threshold policies are not applicable
    # to point bases, so these should all be non-point bases.
    QualityRequirement.objects.filter(parent__isnull=True, oks_threshold__isnull=True).update(
        oks_threshold=models.Case(
            models.When(
                is_number_iou_threshold(connection=schema_editor.connection),
                then=Cast("iou_threshold", models.FloatField()),
            ),
            default=models.Value(DEFAULT_OKS_THRESHOLD),
        )
    )

    # Move the point child requirement overrides
    for batch_ids in take_by(get_point_requirement_ids(QualityRequirement), BATCH_SIZE):
        QualityRequirement.objects.filter(
            is_number_iou_threshold(connection=schema_editor.connection),
            id__in=batch_ids,
            parent__isnull=False,
            oks_threshold__isnull=True,
        ).update(oks_threshold=Cast("iou_threshold", models.FloatField()))


def restore_iou_threshold(apps, schema_editor):
    """
    Move the overridden OKS thresholds back into IoU thresholds
    """

    QualityRequirement = apps.get_model("quality_control", "QualityRequirement")

    for batch_ids in take_by(get_point_requirement_ids(QualityRequirement), BATCH_SIZE):
        QualityRequirement.objects.filter(id__in=batch_ids, oks_threshold__isnull=False).update(
            iou_threshold=number_to_json("oks_threshold", connection=schema_editor.connection)
        )


class Migration(migrations.Migration):

    dependencies = [
        ("quality_control", "0016_qualityrequirement_similarity_metric"),
    ]

    operations = [
        migrations.AddField(
            model_name="qualityrequirement",
            name="oks_threshold",
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.RunPython(set_oks_threshold, restore_iou_threshold),
    ]
