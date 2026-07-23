# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import Any

from django.apps.registry import Apps
from django.db import migrations
from django.db.backends.base.schema import BaseDatabaseSchemaEditor
from django.db.models import Q

_RETIRED_EVENT_KEY = "delete:organization"


def _remove_retired_event_key(events: str) -> str:
    return ",".join(event_key for event_key in events.split(",") if event_key != _RETIRED_EVENT_KEY)


def _forwards(apps: Apps, _schema_editor: BaseDatabaseSchemaEditor) -> None:
    Webhook: Any = apps.get_model("webhooks", "Webhook")

    webhooks = Webhook.objects.filter(
        Q(events=_RETIRED_EVENT_KEY)
        | Q(events__startswith=f"{_RETIRED_EVENT_KEY},")
        | Q(events__endswith=f",{_RETIRED_EVENT_KEY}")
        | Q(events__contains=f",{_RETIRED_EVENT_KEY},")
    ).only("id", "events")

    for webhook in webhooks.iterator(chunk_size=1000):
        webhook.events = _remove_retired_event_key(webhook.events)
        webhook.save(update_fields=["events"])


class Migration(migrations.Migration):
    dependencies = [
        ("webhooks", "0006_migrate_legacy_event_keys"),
    ]

    operations = [
        migrations.RunPython(_forwards, migrations.RunPython.noop),
    ]
