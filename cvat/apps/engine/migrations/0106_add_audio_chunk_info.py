import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("engine", "0105_add_audio_mp3_chunk_type"),
    ]

    operations = [
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
        ),
    ]
