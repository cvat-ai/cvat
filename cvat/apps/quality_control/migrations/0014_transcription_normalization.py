from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("quality_control", "0013_audio_transcription_quality"),
    ]

    operations = [
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
                default="basic",
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name="transcriptionqualityrequirement",
            name="substitutions",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="transcriptionqualityrequirement",
            name="substitutions_hash",
            field=models.CharField(blank=True, default="", max_length=32),
        ),
    ]
