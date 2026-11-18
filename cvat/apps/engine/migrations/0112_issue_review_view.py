# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("engine", "0111_issue_review_context")]

    operations = [
        migrations.AddField(
            model_name="issue",
            name="view",
            field=models.JSONField(blank=True, null=True),
        ),
    ]
