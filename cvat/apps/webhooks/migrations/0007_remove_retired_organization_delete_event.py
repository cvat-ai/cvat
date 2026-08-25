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
_RETIRED_EVENT_KEY = "delete:organization"


def _remove_retired_event_key(events: str) -> str:
    return ",".join(event_key for event_key in events.split(",") if event_key != _RETIRED_EVENT_KEY)


def _forwards(apps: Apps, _schema_editor: BaseDatabaseSchemaEditor) -> None:
    started_at = monotonic()
    with get_migration_logger(_MIGRATION_NAME) as logger:
        Webhook: Any = apps.get_model("webhooks", "Webhook")

        webhooks = Webhook.objects.filter(
            Q(events=_RETIRED_EVENT_KEY)
            | Q(events__startswith=f"{_RETIRED_EVENT_KEY},")
            | Q(events__endswith=f",{_RETIRED_EVENT_KEY}")
            | Q(events__contains=f",{_RETIRED_EVENT_KEY},")
        ).only("id", "events")
        webhook_count = webhooks.count()
        logger.info(
            "Migration has started. Need to process %d webhooks.",
            webhook_count,
        )

        for webhook in webhooks.iterator(chunk_size=1000):
            webhook.events = _remove_retired_event_key(webhook.events)
            webhook.save(update_fields=["events"])

        logger.info("Migration has finished in %.3f seconds.", monotonic() - started_at)


class Migration(migrations.Migration):
    dependencies = [
        ("webhooks", "0006_migrate_legacy_event_keys"),
    ]

    operations = [
        migrations.RunPython(_forwards, migrations.RunPython.noop),
    ]
