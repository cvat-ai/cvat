# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("consensus", "0003_consensussettings_quorum"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="consensussettings",
            name="quorum",
        ),
    ]
