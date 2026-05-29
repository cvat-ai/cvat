# Generated for renaming the transcription requirement `align` field to `alignment`

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("quality_control", "0015_rename_interval_boundary_tolerance_s"),
    ]

    operations = [
        migrations.RenameField(
            model_name="transcriptionqualityrequirement",
            old_name="align",
            new_name="alignment",
        ),
    ]
