# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db import migrations, models
from django.db.migrations.exceptions import IrreversibleError


def check_scalar_thresholds(apps, schema_editor):
    requirement_model = apps.get_model("quality_control", "QualityRequirement")
    thresholds = requirement_model.objects.values_list("iou_threshold", flat=True)
    if any(
        value is not None and (isinstance(value, bool) or not isinstance(value, float | int))
        for value in thresholds.iterator()
    ):
        raise IrreversibleError("Convert IoU thresholds to numbers or NULL before rolling back.")


class Migration(migrations.Migration):
    dependencies = [("quality_control", "0014_rename_consensus_replica_in_job_filter")]
    operations = [
        # PostgreSQL cannot cast double precision directly to jsonb, so use text
        # as an intermediate type: numeric text is valid JSON, and SQL NULL stays NULL.
        # This preserves existing scalar thresholds while allowing policy objects.
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
        # Rollback runs this check before casting JSON -> text -> double precision.
        migrations.RunPython(migrations.RunPython.noop, check_scalar_thresholds),
    ]
