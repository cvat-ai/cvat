from django.db import migrations, models

import cvat.apps.engine.models


def check_list_chunks(apps, schema_editor):
    Data = apps.get_model("engine", "Data")

    CHUNK_TYPE = "list"

    related_rows = (
        Data.objects.filter(
            models.Q(compressed_chunk_type=CHUNK_TYPE) | models.Q(original_chunk_type=CHUNK_TYPE)
        )
        .order_by("-id")
        .values_list("id", flat=True)[:10]
    )

    if related_rows:
        raise Exception(
            "Some '{}' table rows have their compressed or original chunk type = '{}'. "
            "Please review the related tasks and remove them, if possible. "
            "Example Data ids: {}".format(
                Data._meta.db_table,
                CHUNK_TYPE,
                ", ".join(f"{v}" for v in related_rows),
            )
        )


class Migration(migrations.Migration):

    dependencies = [
        ("engine", "0098_data_local_storage_backing_cs"),
    ]

    operations = [
        migrations.RunPython(check_list_chunks, reverse_code=migrations.RunPython.noop),
        migrations.AlterField(
            model_name="data",
            name="compressed_chunk_type",
            field=models.CharField(
                choices=[("video", "VIDEO"), ("imageset", "IMAGESET")],
                default=cvat.apps.engine.models.DataChoice["IMAGESET"],
                max_length=32,
            ),
        ),
        migrations.AlterField(
            model_name="data",
            name="original_chunk_type",
            field=models.CharField(
                choices=[("video", "VIDEO"), ("imageset", "IMAGESET")],
                default=cvat.apps.engine.models.DataChoice["IMAGESET"],
                max_length=32,
            ),
        ),
    ]
