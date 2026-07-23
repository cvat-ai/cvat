# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
from typing import TypeVar

from django.db import transaction
from django.db.models import Model
from django.db.models.signals import post_delete, post_save, pre_delete
from django.dispatch import receiver
from rest_framework.renderers import JSONRenderer

from cvat.apps.engine.models import Comment, Issue, Job, Project, Task
from cvat.apps.events.handlers import (
    get_serializer,
)
from cvat.apps.events.handlers import organization_id as resolve_organization_id
from cvat.apps.events.handlers import project_id as resolve_project_id
from cvat.apps.organizations.models import Invitation, Membership, Organization
from cvat.apps.webhooks import utils
from cvat.apps.webhooks.event_type import EventKeyChoice, event_key

from .dispatch import batch_add_webhooks_to_queue
from .services import select_webhooks

ModelT = TypeVar("ModelT", bound=Model)


@receiver(post_save, sender=Project)
@receiver(post_save, sender=Task)
@receiver(post_save, sender=Job)
@receiver(post_save, sender=Issue)
@receiver(post_save, sender=Comment)
@receiver(post_save, sender=Organization)
@receiver(post_save, sender=Invitation)
@receiver(post_save, sender=Membership)
def post_save_resource_event(
    sender: type[ModelT],
    instance: ModelT,
    created: bool,
    raw: bool,
    update_fields: frozenset[str] | None,
    **kwargs,
):
    if created and raw:
        return

    resource_name = instance.__class__.__name__.lower()

    event_key_ = event_key(action="create" if created else "update", resource=resource_name)

    if event_key_ not in (a[0] for a in EventKeyChoice.choices()):
        return

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

    # consider task and project transfers as deletion in one organization and creation in another
    if (
        isinstance(instance, (Project, Task))
        and not created
        and resolve_organization_id(old_instance) != resolve_organization_id(instance)
    ):
        new_org_id = resolve_organization_id(instance)
        new_project_id = resolve_project_id(instance)

        old_org_id = resolve_organization_id(old_instance)
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

    if not any(webhooks_per_event_key.values()):
        return

    retrieved_instance = utils.retrieve_instance(model=sender, pk=instance.pk)

    _webhook_payload = {
        resource_name: get_serializer(instance=retrieved_instance).data,
        "sender": utils.get_sender(instance=instance),
    }

    if not created:
        # TODO: backward compatibility, remove in future releases
        _before_update = {field: value["saved"] for field, value in dirty_fields.items()}

        _changes = {
            field: {"from": value["saved"], "to": value["current"]}
            for field, value in dirty_fields.items()
        }
        changes_payload_part = {
            "before_update": json.loads(JSONRenderer().render(_before_update)),
            "changes": json.loads(JSONRenderer().render(_changes)),
        }

    webhook_payload_pairs = [
        (
            webhook,
            {
                "event": event_key,
                "webhook_id": webhook.id,
                **_webhook_payload,
                **(changes_payload_part if event_key.startswith("update") else {}),
            },
        )
        for event_key, webhooks in webhooks_per_event_key.items()
        for webhook in webhooks
    ]

    transaction.on_commit(
        lambda: batch_add_webhooks_to_queue(webhook_payload_pairs=webhook_payload_pairs),
        robust=True,
    )


@receiver(pre_delete, sender=Project)
@receiver(pre_delete, sender=Task)
@receiver(pre_delete, sender=Job)
@receiver(pre_delete, sender=Issue)
@receiver(pre_delete, sender=Comment)
@receiver(pre_delete, sender=Invitation)
@receiver(pre_delete, sender=Membership)
def pre_delete_resource_event(sender: type[ModelT], instance: ModelT, **kwargs):
    resource_name = instance.__class__.__name__.lower()

    event_key_ = event_key(action="delete", resource=resource_name)
    if event_key_ not in (a[0] for a in EventKeyChoice.choices()):
        return

    retrieved_instance = utils.retrieve_instance(model=sender, pk=instance.pk)

    instance._deleted_instance_snapshot = get_serializer(instance=retrieved_instance).data


@receiver(post_delete, sender=Project)
@receiver(post_delete, sender=Task)
@receiver(post_delete, sender=Job)
@receiver(post_delete, sender=Issue)
@receiver(post_delete, sender=Comment)
@receiver(post_delete, sender=Invitation)
@receiver(post_delete, sender=Membership)
def post_delete_resource_event(sender: type[ModelT], instance: ModelT, **kwargs):
    resource_name = instance.__class__.__name__.lower()

    event_key_ = event_key(action="delete", resource=resource_name)
    if event_key_ not in (a[0] for a in EventKeyChoice.choices()):
        return

    deleted_instance_snapshot = instance._deleted_instance_snapshot
    del instance._deleted_instance_snapshot

    webhooks = select_webhooks(
        event_key=event_key(action="delete", resource=resource_name),
        organization_id=resolve_organization_id(instance),
        project_id=resolve_project_id(instance),
    )

    if not webhooks:
        return

    event_key_ = event_key(action="delete", resource=resource_name)

    webhook_payload = {
        "event": event_key_,
        resource_name: deleted_instance_snapshot,
        "sender": utils.get_sender(instance=instance),
    }

    webhook_payload_pairs = [
        (webhook, {**webhook_payload, "webhook_id": webhook.id}) for webhook in webhooks
    ]

    transaction.on_commit(
        lambda: batch_add_webhooks_to_queue(webhook_payload_pairs=webhook_payload_pairs),
        robust=True,
    )
