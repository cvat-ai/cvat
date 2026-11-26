# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("quality_control", "0020_qualityreport_version")]
    operations = [
        migrations.AlterField(
            model_name="qualityrequirement",
            name="annotation_type",
            field=models.CharField(
                blank=True,
                null=True,
                max_length=32,
                choices=[
                    ("tag", "Tag"),
                    ("rectangle", "Rectangle"),
                    ("skeleton", "Skeleton"),
                    ("skeleton_keypoint", "Skeleton Keypoint"),
                    ("points", "Points"),
                    ("polyline", "Polyline"),
                    ("mask", "Mask"),
                    ("polygon", "Polygon"),
                    ("ellipse", "Ellipse"),
                    ("cuboid", "Cuboid"),
                ],
            ),
        ),
    ]
