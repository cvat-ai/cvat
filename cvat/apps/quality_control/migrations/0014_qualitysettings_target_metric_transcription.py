# Generated for the transcription_error_rate target metric option

from django.db import migrations, models

import cvat.apps.quality_control.models


class Migration(migrations.Migration):

    dependencies = [
        ("quality_control", "0013_audio_transcription_matching"),
    ]

    operations = [
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
                default=cvat.apps.quality_control.models.QualityTargetMetricType["ACCURACY"],
                max_length=32,
            ),
        ),
    ]
