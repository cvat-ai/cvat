# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("quality_control", "0016_annotationconflict_requirements"),
        ("quality_control", "0018_qualityrequirement_boundary_f"),
    ]

    operations = []
