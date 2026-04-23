from django.db import migrations, models

import cvat.apps.engine.models


def fill_empty_source_group(apps, schema_editor):
    for model_name in ("LabeledImage", "LabeledShape", "LabeledTrack"):
        model = apps.get_model("engine", model_name)

        model.objects.filter(group__isnull=True).update(group=0)
        model.objects.filter(source__isnull=True).update(source="manual")


class Migration(migrations.Migration):

    dependencies = [
        ("engine", "0098_data_local_storage_backing_cs"),
    ]

    operations = [
        migrations.RunPython(fill_empty_source_group, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="labeledimage",
            name="group",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AlterField(
            model_name="labeledimage",
            name="source",
            field=models.CharField(
                choices=[
                    ("auto", "AUTO"),
                    ("semi-auto", "SEMI_AUTO"),
                    ("manual", "MANUAL"),
                    ("file", "FILE"),
                    ("consensus", "CONSENSUS"),
                ],
                default=cvat.apps.engine.models.SourceType["MANUAL"],
                max_length=16,
            ),
        ),
        migrations.AlterField(
            model_name="labeledshape",
            name="group",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AlterField(
            model_name="labeledshape",
            name="source",
            field=models.CharField(
                choices=[
                    ("auto", "AUTO"),
                    ("semi-auto", "SEMI_AUTO"),
                    ("manual", "MANUAL"),
                    ("file", "FILE"),
                    ("consensus", "CONSENSUS"),
                ],
                default=cvat.apps.engine.models.SourceType["MANUAL"],
                max_length=16,
            ),
        ),
        migrations.AlterField(
            model_name="labeledtrack",
            name="group",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AlterField(
            model_name="labeledtrack",
            name="source",
            field=models.CharField(
                choices=[
                    ("auto", "AUTO"),
                    ("semi-auto", "SEMI_AUTO"),
                    ("manual", "MANUAL"),
                    ("file", "FILE"),
                    ("consensus", "CONSENSUS"),
                ],
                default=cvat.apps.engine.models.SourceType["MANUAL"],
                max_length=16,
            ),
        ),
    ]
