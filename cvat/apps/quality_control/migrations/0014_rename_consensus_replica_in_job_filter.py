# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db import migrations
from django.db.models import Value
from django.db.models.functions import Replace

OLD = '"consensus_replica"'
NEW = '"replica"'


def _replace(old: str, new: str):
    def forwards(apps, schema_editor):
        QualitySettings = apps.get_model("quality_control", "QualitySettings")

        QualitySettings.objects.filter(job_filter__contains=old).update(
            job_filter=Replace("job_filter", Value(old), Value(new))
        )

    return forwards


class Migration(migrations.Migration):
    dependencies = [
        ("quality_control", "0013_alter_qualityrequirement_target_metric"),
    ]

    operations = [
        migrations.RunPython(_replace(old=OLD, new=NEW), _replace(old=NEW, new=OLD)),
    ]
