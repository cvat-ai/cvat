# Generated for audio-QE prototype knobs

import django.db.models.deletion
from django.db import migrations, models

import cvat.apps.quality_control.models


def migrate_granularity_forwards(apps, schema_editor):
    Req = apps.get_model("quality_control", "TranscriptionQualityRequirement")
    Req.objects.filter(granularity="wer").update(granularity="word")
    Req.objects.filter(granularity="cer").update(granularity="character")


def migrate_granularity_reverse(apps, schema_editor):
    Req = apps.get_model("quality_control", "TranscriptionQualityRequirement")
    Req.objects.filter(granularity="word").update(granularity="wer")
    Req.objects.filter(granularity="character").update(granularity="cer")


class Migration(migrations.Migration):

    dependencies = [
        ("engine", "0106_add_interval_annotations"),
        ("quality_control", "0012_audio_quality_support"),
    ]

    operations = [
        # Rename the existing `metric` (wer|cer) → `granularity`, then
        # rewrite stored values, then alter the choices/default.
        migrations.RenameField(
            model_name="transcriptionqualityrequirement",
            old_name="metric",
            new_name="granularity",
        ),
        migrations.RunPython(
            migrate_granularity_forwards,
            reverse_code=migrate_granularity_reverse,
        ),
        migrations.AlterField(
            model_name="transcriptionqualityrequirement",
            name="granularity",
            field=models.CharField(
                choices=[("word", "WORD"), ("character", "CHARACTER")],
                default=cvat.apps.quality_control.models.TranscriptionGranularity["WORD"],
                max_length=32,
            ),
        ),
        # New per-requirement audio-QE knobs.
        migrations.AddField(
            model_name="transcriptionqualityrequirement",
            name="metric",
            field=models.CharField(
                choices=[
                    ("equality", "EQUALITY"),
                    ("error-rate", "ERROR_RATE"),
                    ("normalized-lev", "NORMALIZED_LEV"),
                ],
                default=cvat.apps.quality_control.models.TranscriptionQualityMetric["EQUALITY"],
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name="transcriptionqualityrequirement",
            name="align",
            field=models.CharField(
                choices=[("char", "CHAR"), ("word", "WORD")],
                default=cvat.apps.quality_control.models.TranscriptionAlignMode["CHAR"],
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name="transcriptionqualityrequirement",
            name="metric_threshold",
            field=models.FloatField(default=None, null=True),
        ),
        migrations.AddField(
            model_name="transcriptionqualityrequirement",
            name="normalizer_preset",
            field=models.CharField(
                choices=[
                    ("none", "NONE"),
                    ("basic", "BASIC"),
                    ("en", "EN"),
                    ("es", "ES"),
                    ("fr", "FR"),
                    ("de", "DE"),
                    ("it", "IT"),
                    ("pt", "PT"),
                    ("nl", "NL"),
                    ("pl", "PL"),
                    ("ru", "RU"),
                    ("tr", "TR"),
                    ("zh", "ZH"),
                    ("ja", "JA"),
                    ("ko", "KO"),
                    ("hi", "HI"),
                    ("ar", "AR"),
                ],
                default=cvat.apps.quality_control.models.TranscriptionNormalizerPreset["BASIC"],
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name="transcriptionqualityrequirement",
            name="substitutions",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="transcriptionqualityrequirement",
            name="grouping_strategy",
            field=models.CharField(
                choices=[("filter", "FILTER"), ("join", "JOIN")],
                default=cvat.apps.quality_control.models.TranscriptionGroupingStrategy["JOIN"],
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name="transcriptionqualityrequirement",
            name="grouping_separator",
            field=models.CharField(default=" ", max_length=16),
        ),
        migrations.AddField(
            model_name="transcriptionqualityrequirement",
            name="grouping_attribute",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="+",
                to="engine.attributespec",
            ),
        ),
        # Per-settings interval-matching knob.
        migrations.AddField(
            model_name="qualitysettings",
            name="interval_boundary_tolerance_s",
            field=models.FloatField(default=0.2),
        ),
        # CHECK constraint for the new chunk-threshold field.
        migrations.AddConstraint(
            model_name="transcriptionqualityrequirement",
            constraint=models.CheckConstraint(
                condition=(
                    models.Q(("metric_threshold__isnull", True))
                    | models.Q(("metric_threshold__gte", 0))
                ),
                name="transcription_quality_requirement_chunk_threshold_is_valid",
            ),
        ),
    ]
