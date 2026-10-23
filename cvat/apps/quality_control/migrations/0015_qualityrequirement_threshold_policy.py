# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db import migrations, models
from django.db.migrations.exceptions import IrreversibleError


def check_scalar_thresholds(apps, schema_editor):
    requirement_model = apps.get_model("quality_control", "QualityRequirement")
    thresholds = requirement_model.objects.using(schema_editor.connection.alias).values_list(
        "iou_threshold", flat=True
    )
    if any(isinstance(value, dict) for value in thresholds.iterator()):
        raise IrreversibleError("Convert IoU policies to numeric thresholds before rolling back.")


class Migration(migrations.Migration):
    dependencies = [("quality_control", "0014_rename_consensus_replica_in_job_filter")]
    operations = [
        # PostgreSQL cannot cast double precision directly to jsonb.
        migrations.AlterField(
            model_name="qualityrequirement",
            name="iou_threshold",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="qualityrequirement",
            name="iou_threshold",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.RunPython(migrations.RunPython.noop, check_scalar_thresholds),
    ]
