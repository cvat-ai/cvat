# Generated for the mio-cvat fisheye lens calibration feature.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("engine", "0101_alter_labeledimage_options_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="task",
            name="lens_calibration",
            field=models.JSONField(blank=True, default=None, null=True),
        ),
    ]
