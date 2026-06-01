import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("engine", "0106_add_interval_annotations"),
        ("quality_control", "0012_audio_interval_quality"),
    ]

    operations = [
        migrations.AddField(
            model_name="annotationconflict",
            name="attributes",
            field=models.JSONField(default=None, null=True),
        ),
        migrations.AlterField(
            model_name="qualitysettings",
            name="target_metric",
            field=models.CharField(
                choices=[
                    ("accuracy", "ACCURACY"),
                    ("precision", "PRECISION"),
                    ("recall", "RECALL"),
                    ("transcription_error_rate", "TRANSCRIPTION_ERROR_RATE"),
                ],
                default="accuracy",
                max_length=32,
            ),
        ),
        migrations.CreateModel(
            name="TranscriptionQualityRequirement",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                (
                    "granularity",
                    models.CharField(
                        choices=[("word", "WORD"), ("character", "CHARACTER")],
                        default="word",
                        max_length=32,
                    ),
                ),
                (
                    "metric",
                    models.CharField(
                        choices=[
                            ("equality", "EQUALITY"),
                            ("error-rate", "ERROR_RATE"),
                            ("normalized-lev", "NORMALIZED_LEV"),
                        ],
                        default="equality",
                        max_length=32,
                    ),
                ),
                (
                    "alignment",
                    models.CharField(
                        choices=[("char", "CHAR"), ("word", "WORD")],
                        default="char",
                        max_length=32,
                    ),
                ),
                ("metric_threshold", models.FloatField(default=None, null=True)),
                (
                    "grouping_strategy",
                    models.CharField(
                        choices=[("filter", "FILTER"), ("join", "JOIN")],
                        default="join",
                        max_length=32,
                    ),
                ),
                ("grouping_separator", models.CharField(default=" ", max_length=16)),
                ("acceptance_threshold", models.FloatField()),
                (
                    "attribute",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to="engine.attributespec",
                    ),
                ),
                (
                    "grouping_attribute",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to="engine.attributespec",
                    ),
                ),
                (
                    "settings",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="transcription_requirements",
                        related_query_name="transcription_requirement",
                        to="quality_control.qualitysettings",
                    ),
                ),
            ],
            options={
                "constraints": [
                    models.CheckConstraint(
                        condition=models.Q(
                            ("acceptance_threshold__gte", 0), ("acceptance_threshold__lte", 1)
                        ),
                        name="transcription_quality_requirement_threshold_is_valid",
                    ),
                    models.CheckConstraint(
                        condition=models.Q(
                            ("metric_threshold__isnull", True), ("metric_threshold__gte", 0), _connector="OR"
                        ),
                        name="transcription_quality_requirement_chunk_threshold_is_valid",
                    ),
                    models.UniqueConstraint(
                        fields=("settings_id", "attribute_id"),
                        name="transcription_quality_requirement_attr_unique_per_settings",
                    ),
                ],
            },
        ),
    ]
