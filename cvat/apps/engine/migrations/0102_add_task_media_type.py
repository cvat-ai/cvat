from django.db import migrations, models


def fix_default_task_dimension(apps, schema_editor):
    Task = apps.get_model("engine", "Task")

    Task.objects.filter(models.Q(data_id__isnull=True) | models.Q(data__size=0)).update(
        dimension=""
    )


def restore_default_task_dimension(apps, schema_editor):
    Task = apps.get_model("engine", "Task")

    Task.objects.filter(models.Q(data_id__isnull=True) | models.Q(data__size=0)).update(
        dimension="2d"
    )


def infer_task_media_type(apps, schema_editor):
    Task = apps.get_model("engine", "Task")

    Task.objects.filter(media_type="", dimension="3d").update(media_type="point_cloud")
    Task.objects.filter(media_type="", dimension="2d").update(media_type="image")


class Migration(migrations.Migration):

    dependencies = [
        ("engine", "0101_alter_labeledimage_options_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="task",
            name="dimension",
            field=models.CharField(
                blank=True, choices=[("3d", "DIM_3D"), ("2d", "DIM_2D")], default="", max_length=2
            ),
        ),
        migrations.RunPython(fix_default_task_dimension, restore_default_task_dimension),
        migrations.AddField(
            model_name="task",
            name="media_type",
            field=models.CharField(
                blank=True,
                choices=[("image", "Image"), ("point_cloud", "Point Cloud")],
                default="",
                max_length=32,
            ),
        ),
        migrations.RunPython(infer_task_media_type, migrations.RunPython.noop),
    ]
