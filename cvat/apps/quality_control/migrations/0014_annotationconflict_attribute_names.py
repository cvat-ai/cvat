# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("quality_control", "0013_qualityrequirement_filter_enabled_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="annotationconflict",
            name="attribute_names",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
