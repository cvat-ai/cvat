# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("quality_control", "0013_alter_qualityrequirement_target_metric")]
    operations = [
        migrations.AddField(
            model_name="qualityrequirement",
            name="similarity_threshold_policy",
            field=models.JSONField(blank=True, null=True),
        ),
    ]
