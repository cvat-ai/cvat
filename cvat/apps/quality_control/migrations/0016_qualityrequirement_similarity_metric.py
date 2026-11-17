from django.db import migrations, models

# The default similarity metrics of the requirement annotation types, at the time of the migration
DEFAULT_SIMILARITY_METRICS = {
    "tag": "equality",
    "points": "oks",
    "skeleton": "oks",
    "skeleton_keypoint": "oks",
    "rectangle": "iou",
    "polygon": "iou",
    "mask": "iou",
    "polyline": "iou",
    "ellipse": "iou",
}


def set_default_similarity_metric(apps, schema_editor):
    QualityRequirement = apps.get_model("quality_control", "QualityRequirement")

    for annotation_type, similarity_metric in DEFAULT_SIMILARITY_METRICS.items():
        QualityRequirement.objects.filter(
            parent__isnull=True, annotation_type=annotation_type, similarity_metric__isnull=True
        ).update(similarity_metric=similarity_metric)


class Migration(migrations.Migration):

    dependencies = [
        ("quality_control", "0015_qualityrequirement_threshold_policy"),
    ]

    operations = [
        migrations.AddField(
            model_name="qualityrequirement",
            name="similarity_metric",
            field=models.CharField(
                blank=True,
                choices=[
                    ("iou", "IoU"),
                    ("oks", "OKS"),
                    ("boundary_f", "Boundary F"),
                    ("equality", "Equality"),
                ],
                max_length=32,
                null=True,
            ),
        ),
        migrations.RunPython(set_default_similarity_metric, migrations.RunPython.noop),
    ]
