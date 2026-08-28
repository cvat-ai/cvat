# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import time

from django.db import transaction
from django.db.models import Model, Q

from cvat.apps.engine.models import Project, Task
from cvat.apps.events.handlers import organization_id as resolve_organization_id
from cvat.apps.events.handlers import project_id as resolve_project_id

from . import utils
from .dispatch import add_to_queue, batch_add_webhooks_to_queue
from .event_type import EventKeyChoice, event_key
from .models import (
    Webhook,
    WebhookDelivery,
    WebhookTypeChoice,
)


def select_webhooks(
    *,
    event_key: str,
    organization_id: int | None,
    project_id: int | None,
    select_for_org: bool = True,
    select_for_project: bool = True,
) -> list[Webhook]:
    queryset = Webhook.objects.filter(
        Q(events=event_key)
        | Q(events__startswith=f"{event_key},")
        | Q(events__endswith=f",{event_key}")
        | Q(events__contains=f",{event_key},"),
        is_active=True,
    )

    type_filter = Q(type=WebhookTypeChoice.SERVER)

    if select_for_org and organization_id is not None:
        type_filter |= Q(type=WebhookTypeChoice.ORGANIZATION, organization=organization_id)

    if select_for_project and project_id is not None:
        type_filter |= Q(type=WebhookTypeChoice.PROJECT, project=project_id)

    return list(queryset.filter(type_filter))


def redeliver(webhook: Webhook, data: dict) -> None:
    add_to_queue(webhook=webhook, payload=data, redelivery=True)


def send_webhook(
    webhook: Webhook, payload: dict, attempt: int, redelivery: bool = False
) -> WebhookDelivery:
    start = time.perf_counter()
    status_code, response = utils.perform_webhook_request(webhook=webhook, payload=payload)
    request_duration = int((time.perf_counter() - start) * 1000)

    return WebhookDelivery.objects.create(
        webhook_id=webhook.id,
        event=payload["event"],
        status_code=status_code,
        redelivery=redelivery,
        request=payload,
        response=response,
        attempt=attempt,
        request_duration=request_duration,
    )


def ping(serializer) -> WebhookDelivery:
    webhook = serializer.instance
    payload = {
        "event": "ping",
        "webhook": serializer.data,
        "sender": utils.get_sender(),
    }
    delivery = send_webhook(webhook=webhook, payload=payload, attempt=1)
    return delivery


def trigger_resource_saved_webhooks(
    instance: Model,
    *,
    created: bool,
    update_fields: frozenset[str] | None = None,
) -> None:
    resource_name = instance.__class__.__name__.lower()

    event_key_ = event_key(action="create" if created else "update", resource=resource_name)

    if event_key_ not in (a[0] for a in EventKeyChoice.choices()):
        return

    if isinstance(instance, (Project, Task)) and not created:
        dirty_fields: dict[str, dict] = {
            instance._meta.get_field(field).attname: value
            for field, value in instance.get_dirty_fields(
                verbose=True,
                check_relationship=True,
            ).items()
        }

        if update_fields is not None:
            update_fields = {instance._meta.get_field(field).attname for field in update_fields}

            dirty_fields = {
                field: value for field, value in dirty_fields.items() if field in update_fields
            }

        old_instance = utils.recreate_old_instance(instance=instance, dirty_fields=dirty_fields)

        if resolve_organization_id(instance) != resolve_organization_id(old_instance):
            new_org_id = resolve_organization_id(instance)
            old_org_id = resolve_organization_id(old_instance)
            new_project_id = resolve_project_id(instance)
            old_project_id = resolve_project_id(old_instance)

            webhooks_per_event_key = {
                event_key_: select_webhooks(
                    event_key=event_key_,
                    organization_id=new_org_id,
                    project_id=new_project_id,
                    select_for_org=False,
                ),
                event_key(action="delete", resource=resource_name): select_webhooks(
                    event_key=event_key(action="delete", resource=resource_name),
                    organization_id=old_org_id,
                    project_id=old_project_id,
                    select_for_project=False,
                ),
                event_key(action="create", resource=resource_name): select_webhooks(
                    event_key=event_key(action="create", resource=resource_name),
                    organization_id=new_org_id,
                    project_id=new_project_id,
                    select_for_project=False,
                ),
            }
        else:
            webhooks_per_event_key = {
                event_key_: select_webhooks(
                    event_key=event_key_,
                    organization_id=resolve_organization_id(instance),
                    project_id=resolve_project_id(instance),
                ),
            }
    else:
        webhooks_per_event_key = {
            event_key_: select_webhooks(
                event_key=event_key_,
                organization_id=resolve_organization_id(instance),
                project_id=resolve_project_id(instance),
            ),
        }

    if not any(webhooks_per_event_key.values()):
        return

    retrieved_instance = utils.retrieve_instance(model=type(instance), pk=instance.pk)

    _webhook_payload = {
        resource_name: utils.get_serializer(instance=retrieved_instance).data,
        "sender": utils.get_sender(),
    }

    webhook_payload_pairs = [
        (
            webhook,
            {
                "event": key,
                "webhook_id": webhook.id,
                **_webhook_payload,
            },
        )
        for key, webhooks in webhooks_per_event_key.items()
        for webhook in webhooks
    ]

    transaction.on_commit(
        lambda: batch_add_webhooks_to_queue(webhook_payload_pairs=webhook_payload_pairs),
        robust=True,
    )
