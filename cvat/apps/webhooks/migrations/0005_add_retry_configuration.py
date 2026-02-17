# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("webhooks", "0004_alter_webhook_target_url"),
    ]

    operations = [
        migrations.AddField(
            model_name="webhook",
            name="max_retries",
            field=models.PositiveIntegerField(
                default=3,
                help_text="Maximum number of retry attempts for failed deliveries (0 to disable retries)",
            ),
        ),
        migrations.AddField(
            model_name="webhook",
            name="retry_delay",
            field=models.PositiveIntegerField(
                default=60,
                help_text="Initial delay in seconds before first retry attempt",
            ),
        ),
        migrations.AddField(
            model_name="webhook",
            name="retry_backoff_factor",
            field=models.FloatField(
                default=2.0,
                help_text="Multiplier for exponential backoff (1.0 for fixed delay, 2.0 for exponential)",
            ),
        ),
        migrations.AddField(
            model_name="webhookdelivery",
            name="attempt_number",
            field=models.PositiveIntegerField(
                default=1,
                help_text="Delivery attempt number (1 for initial attempt)",
            ),
        ),
        migrations.AddField(
            model_name="webhookdelivery",
            name="next_retry_date",
            field=models.DateTimeField(
                null=True,
                blank=True,
                help_text="Scheduled time for next retry attempt",
            ),
        ),
    ]
