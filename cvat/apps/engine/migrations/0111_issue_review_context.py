# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("engine", "0110_rename_task_consensus_replicas_initial_replicas")]

    operations = [
        migrations.AddField(
            model_name="issue",
            name="end_frame",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="issue",
            name="object_id",
            field=models.PositiveBigIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="issue",
            name="object_type",
            field=models.CharField(
                blank=True,
                choices=[("shape", "Shape"), ("track", "Track")],
                max_length=5,
                null=True,
            ),
        ),
    ]
