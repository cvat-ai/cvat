# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from pathlib import Path
from time import monotonic
from typing import Any

from django.apps.registry import Apps
from django.db import migrations
from django.db.backends.base.schema import BaseDatabaseSchemaEditor
from django.db.models import Q

from cvat.apps.engine.log import get_migration_logger

_MIGRATION_NAME = f"webhooks_{Path(__file__).stem}"

_FORWARD_REPLACEMENTS = {
    "create:export": (
        "completed:request[export:annotations]",
        "completed:request[export:dataset]",
    ),
    "create:backup": ("completed:request[export:backup]",),
}

_BACKWARD_REPLACEMENTS = {
    "completed:request[export:annotations]": ("create:export",),
    "completed:request[export:dataset]": ("create:export",),
    "completed:request[export:backup]": ("create:backup",),
}


def _replace_event_keys(events: str, replacements: dict[str, tuple[str, ...]]) -> str:
    migrated_event_keys: list[str] = []

    for event_key in events.split(","):
        if event_key in replacements:
            migrated_event_keys.extend(replacements[event_key])
        else:
            migrated_event_keys.append(event_key)

    return ",".join(set(migrated_event_keys))


def _migrate_event_keys(
    apps: Apps, replacements: dict[str, tuple[str, ...]], *, direction: str
) -> None:
    started_at = monotonic()
    with get_migration_logger(_MIGRATION_NAME) as logger:
        Webhook: Any = apps.get_model("webhooks", "Webhook")

        event_keys_filter = Q()
        for event_key in replacements:
            event_keys_filter |= (
                Q(events=event_key)
                | Q(events__startswith=f"{event_key},")
                | Q(events__endswith=f",{event_key}")
                | Q(events__contains=f",{event_key},")
            )

        webhooks = Webhook.objects.filter(event_keys_filter).only("id", "events")
        webhook_count = webhooks.count()
        logger.info(
            "%s migration has started. Need to process %d webhooks.",
            direction,
            webhook_count,
        )

        for webhook in webhooks.iterator(chunk_size=1000):
            migrated_events = _replace_event_keys(webhook.events, replacements)
            webhook.events = migrated_events
            webhook.save(update_fields=["events"])

        logger.info(
            "%s migration has finished in %.3f seconds.",
            direction,
            monotonic() - started_at,
        )


def _forwards(apps: Apps, _schema_editor: BaseDatabaseSchemaEditor) -> None:
    _migrate_event_keys(apps, _FORWARD_REPLACEMENTS, direction="Forward")


def _backwards(apps: Apps, _schema_editor: BaseDatabaseSchemaEditor) -> None:
    _migrate_event_keys(apps, _BACKWARD_REPLACEMENTS, direction="Reverse")


class Migration(migrations.Migration):
    dependencies = [
        ("webhooks", "0005_add_webhookdelivery_attempt_and_request_duration"),
    ]

    operations = [
        migrations.RunPython(_forwards, _backwards),
    ]
