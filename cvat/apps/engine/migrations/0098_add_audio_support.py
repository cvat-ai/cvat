from django.db import migrations, models
import django.db.models.deletion


def fill_media_type(apps, schema_editor):
    Task = apps.get_model("engine", "Task")

    Task.objects.filter(media_type="", dimension__iexact="3d").update(media_type="point_cloud")
    Task.objects.filter(media_type="", mode__iexact="interpolation").update(media_type="video")
    Task.objects.filter(media_type="", mode__iexact="annotation").update(media_type="image")


class Migration(migrations.Migration):

    dependencies = [
        ("engine", "0097_alter_relatedfile_path"),
    ]

    operations = [
        migrations.AddField(
            model_name="task",
            name="media_type",
            field=models.CharField(
                choices=[
                    ("image", "Image"),
                    ("video", "Video"),
                    ("point_cloud", "Point Cloud"),
                    ("audio", "Audio"),
                ],
                default=None,
                max_length=32,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="data",
            name="compressed_chunk_type",
            field=models.CharField(
                choices=[
                    ("video", "VIDEO"),
                    ("imageset", "IMAGESET"),
                    ("list", "LIST"),
                    ("audio_mp3", "AUDIO_MP3"),
                ],
                default=None,
                max_length=32,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="data",
            name="image_quality",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AlterField(
            model_name="data",
            name="original_chunk_type",
            field=models.CharField(
                choices=[
                    ("video", "VIDEO"),
                    ("imageset", "IMAGESET"),
                    ("list", "LIST"),
                    ("audio_mp3", "AUDIO_MP3"),
                ],
                default=None,
                max_length=32,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="task",
            name="dimension",
            field=models.CharField(
                choices=[("1d", "DIM_1D"), ("2d", "DIM_2D"), ("3d", "DIM_3D")],
                default=None,
                max_length=2,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="task",
            name="mode",
            field=models.CharField(default=None, max_length=32, null=True),
        ),
        migrations.CreateModel(
            name="Audio",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("path", models.CharField(max_length=1024)),
                ("sampling_rate", models.PositiveIntegerField()),
                (
                    "data",
                    models.OneToOneField(
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="audio",
                        to="engine.data",
                    ),
                ),
            ],
            options={
                "default_permissions": (),
            },
        ),
        migrations.RunPython(fill_media_type, migrations.RunPython.noop)
    ]
