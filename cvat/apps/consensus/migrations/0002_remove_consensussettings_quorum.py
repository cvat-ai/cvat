# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("consensus", "0001_initial"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="consensussettings",
            name="quorum",
        ),
    ]
