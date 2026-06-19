from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("engine", "0106_add_interval_annotations"),
        ("quality_control", "0011_default_quality_settings_for_old_tasks"),
    ]

    operations = [
        migrations.AddField(
            model_name="qualitysettings",
            name="interval_boundary_tolerance",
            field=models.FloatField(default=100),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name="annotationconflict",
            name="frame",
            field=models.PositiveIntegerField(null=True),
        ),
        migrations.AlterField(
            model_name="annotationid",
            name="type",
            field=models.CharField(
                choices=[
                    ("tag", "TAG"),
                    ("shape", "SHAPE"),
                    ("track", "TRACK"),
                    ("interval", "INTERVAL"),
                ],
                max_length=32,
            ),
        ),
    ]
