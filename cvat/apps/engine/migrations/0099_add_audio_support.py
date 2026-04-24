import django.db.models.deletion
from django.db import migrations, models

import cvat.apps.engine.models


def fill_task_media_type(apps, schema_editor):
    Task = apps.get_model("engine", "Task")

    Task.objects.filter(media_type__isnull=True, dimension="3d").update(media_type="point_cloud")
    Task.objects.filter(media_type__isnull=True, mode="interpolation").update(media_type="video")
    Task.objects.filter(media_type__isnull=True, mode="annotation").update(media_type="image")


class Migration(migrations.Migration):

    dependencies = [
        ("engine", "0098_data_local_storage_backing_cs"),
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
                (
                    "has_cover_image",
                    models.BooleanField(default=False),
                ),
            ],
            options={
                "default_permissions": (),
            },
        ),
        migrations.RunPython(fill_task_media_type, migrations.RunPython.noop),
        migrations.CreateModel(
            name="AudioChunkInfo",
            fields=[
                ("created_date", models.DateTimeField(auto_now_add=True)),
                ("updated_date", models.DateTimeField(auto_now=True)),
                ("key", models.CharField(max_length=128, primary_key=True, serialize=False)),
                ("left_padding", models.PositiveIntegerField(default=0)),
                ("right_padding", models.PositiveIntegerField(default=0)),
                ("content_offset", models.PositiveIntegerField(default=0)),
                (
                    "audio",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="chunks",
                        related_query_name="chunk",
                        to="engine.audio",
                    ),
                ),
                (
                    "data",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="audio_chunks",
                        related_query_name="audio_chunk",
                        to="engine.data",
                    ),
                ),
            ],
            options={
                "default_permissions": (),
            },
        ),
        migrations.CreateModel(
            name="LabeledInterval",
            fields=[
                ("id", models.BigAutoField(primary_key=True, serialize=False)),
                ("group", models.PositiveIntegerField(null=True)),
                (
                    "source",
                    models.CharField(
                        choices=[
                            ("auto", "AUTO"),
                            ("semi-auto", "SEMI_AUTO"),
                            ("manual", "MANUAL"),
                            ("file", "FILE"),
                            ("consensus", "CONSENSUS"),
                        ],
                        default="manual",
                        max_length=16,
                        null=True,
                    ),
                ),
                ("score", models.FloatField(default=1)),
                ("start", models.PositiveIntegerField()),
                ("stop", models.PositiveIntegerField(null=True)),
                (
                    "job",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.DO_NOTHING, to="engine.job"
                    ),
                ),
                (
                    "label",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to="engine.label"
                    ),
                ),
            ],
            options={
                "abstract": False,
                "default_permissions": (),
            },
        ),
        migrations.CreateModel(
            name="LabeledIntervalAttributeVal",
            fields=[
                ("id", models.BigAutoField(primary_key=True, serialize=False)),
                ("value", cvat.apps.engine.models.SafeCharField(max_length=4096)),
                (
                    "interval",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.DO_NOTHING,
                        related_name="attributes",
                        related_query_name="attribute",
                        to="engine.labeledinterval",
                    ),
                ),
                (
                    "job",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.DO_NOTHING, to="engine.job"
                    ),
                ),
                (
                    "spec",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to="engine.attributespec"
                    ),
                ),
            ],
            options={
                "abstract": False,
                "default_permissions": (),
            },
        ),
    ]
