# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import Any

from django.apps.registry import Apps
from django.db import migrations
from django.db.backends.base.schema import BaseDatabaseSchemaEditor
from django.db.models import Q

_FORWARD_REPLACEMENTS = {
    "create:export": (
        "completed:export:annotations",
        "completed:export:dataset",
    ),
    "create:backup": ("completed:export:backup",),
}

_BACKWARD_REPLACEMENTS = {
    "completed:export:annotations": ("create:export",),
    "completed:export:dataset": ("create:export",),
    "completed:export:backup": ("create:backup",),
}


def _replace_event_keys(events: str, replacements: dict[str, tuple[str, ...]]) -> str:
    migrated_event_keys: list[str] = []

    for event_key in events.split(","):
        if event_key in replacements:
            migrated_event_keys.extend(replacements[event_key])
        else:
            migrated_event_keys.append(event_key)

    return ",".join(set(migrated_event_keys))


def _migrate_event_keys(apps: Apps, replacements: dict[str, tuple[str, ...]]) -> None:
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
    for webhook in webhooks.iterator(chunk_size=1000):
        migrated_events = _replace_event_keys(webhook.events, replacements)
        webhook.events = migrated_events
        webhook.save(update_fields=["events"])


def _forwards(apps: Apps, _schema_editor: BaseDatabaseSchemaEditor) -> None:
    _migrate_event_keys(apps, _FORWARD_REPLACEMENTS)


def _backwards(apps: Apps, _schema_editor: BaseDatabaseSchemaEditor) -> None:
    _migrate_event_keys(apps, _BACKWARD_REPLACEMENTS)


class Migration(migrations.Migration):
    dependencies = [
        ("webhooks", "0005_add_webhookdelivery_attempt_and_request_duration"),
    ]

    operations = [
        migrations.RunPython(_forwards, _backwards),
    ]
