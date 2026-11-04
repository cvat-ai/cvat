# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("quality_control", "0012_qualityrequirement_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="qualityrequirement",
            name="target_metric",
            field=models.CharField(
                blank=True,
                choices=[
                    ("accuracy", "ACCURACY"),
                    ("precision", "PRECISION"),
                    ("recall", "RECALL"),
                    ("jaccard_index", "JACCARD_INDEX"),
                    ("dice", "DICE"),
                    ("mean_accuracy", "MEAN_ACCURACY"),
                    ("mean_precision", "MEAN_PRECISION"),
                    ("mean_recall", "MEAN_RECALL"),
                    ("mean_jaccard_index", "MEAN_JACCARD_INDEX"),
                    ("mean_dice", "MEAN_DICE"),
                    ("label_accuracy", "LABEL_ACCURACY"),
                    ("label_precision", "LABEL_PRECISION"),
                    ("label_recall", "LABEL_RECALL"),
                    ("label_jaccard_index", "LABEL_JACCARD_INDEX"),
                    ("label_dice", "LABEL_DICE"),
                ],
                max_length=32,
                null=True,
            ),
        ),
    ]
