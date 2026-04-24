from django.db import migrations


def fix_invalid_source(apps, schema_editor):
    for model_name in ("LabeledImage", "LabeledShape", "LabeledTrack"):
        model = apps.get_model("engine", model_name)

        model.objects.filter(source__iexact="Ground truth").update(source="manual")


class Migration(migrations.Migration):

    dependencies = [
        ("engine", "0098_data_local_storage_backing_cs"),
    ]

    operations = [
        migrations.RunPython(fix_invalid_source, migrations.RunPython.noop),
    ]
