# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("engine", "0111_relatedfile_calibration_matrices"),
        ("engine", "0112_issue_review_view"),
    ]

    operations = []
