# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from pathlib import Path
from time import monotonic

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models
from django.utils.timezone import now

from cvat.apps.engine.log import get_migration_logger
from cvat.apps.engine.utils import take_by

_MIGRATION_NAME = f"growth_{Path(__file__).stem}"


def create_growth_data_for_existing_users(apps, schema_editor):
    started_at = monotonic()
    with get_migration_logger(_MIGRATION_NAME) as logger:
        User = apps.get_model(settings.AUTH_USER_MODEL)
        UserGrowthData = apps.get_model("growth", "UserGrowthData")
        user_count = User.objects.count()
        logger.info("Migration has started. Need to process %d users.", user_count)

        current_time = now()
        user_ids = User.objects.values_list("id", flat=True).iterator(chunk_size=1000)

        for user_id_batch in take_by(user_ids, 1000):
            UserGrowthData.objects.bulk_create(
                [
                    UserGrowthData(
                        user_id=user_id,
                        github_prompt_shown_at=current_time,
                        github_prompt_support_clicked=False,
                        promotion_notifications_allowed=True,
                    )
                    for user_id in user_id_batch
                ],
                ignore_conflicts=True,
            )

        logger.info("Migration has finished in %.3f seconds.", monotonic() - started_at)


class Migration(migrations.Migration):
    initial = True

    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]

    operations = [
        migrations.CreateModel(
            name="UserGrowthData",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("github_prompt_shown_at", models.DateTimeField(blank=True, null=True)),
                ("github_prompt_support_clicked", models.BooleanField(default=False)),
                ("promotion_notifications_allowed", models.BooleanField(default=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="growth_data",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.RunPython(create_growth_data_for_existing_users, migrations.RunPython.noop),
    ]
