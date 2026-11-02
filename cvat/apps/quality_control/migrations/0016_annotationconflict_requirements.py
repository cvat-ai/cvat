# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("quality_control", "0015_qualityrequirement_threshold_policy"),
    ]

    operations = [
        migrations.AddField(
            model_name="annotationconflict",
            name="requirements",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
