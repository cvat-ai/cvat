# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("growth", "0001_initial")]

    operations = [
        migrations.AddField(
            model_name="usergrowthdata",
            name="last_seen_release_notes_version",
            field=models.CharField(blank=True, max_length=64, null=True),
        ),
        migrations.AddField(
            model_name="usergrowthdata",
            name="last_seen_announcements_date",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
