# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from copy import deepcopy

from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.db.models.signals import post_delete, post_save, pre_delete, pre_save
from django.dispatch import receiver

from cvat.apps.engine.models import Comment, Issue, Job, Project, Task
from cvat.apps.events.handlers import (
    get_instance_diff,
    get_serializer,
)
from cvat.apps.events.handlers import organization_id as resolve_organization_id
from cvat.apps.events.handlers import project_id as resolve_project_id
from cvat.apps.organizations.models import Invitation, Membership, Organization

from .dispatch import batch_add_to_queue
from .event_type import EventTypeChoice, event_name
from .services import select_webhooks
from .utils import get_sender


@receiver(pre_save, sender=Project)
@receiver(pre_save, sender=Task)
@receiver(pre_save, sender=Job)
@receiver(pre_save, sender=Issue)
@receiver(pre_save, sender=Comment)
@receiver(pre_save, sender=Organization)
@receiver(pre_save, sender=Invitation)
@receiver(pre_save, sender=Membership)
def pre_save_resource_event(sender, instance, **kwargs):
    instance._webhooks_selected_webhooks = []

    if instance.pk is None:
        created = True
    else:
        try:
            old_instance = sender.objects.get(pk=instance.pk)
            created = False
        except ObjectDoesNotExist:
            created = True

    resource_name = instance.__class__.__name__.lower()

    event_type = event_name(action="create" if created else "update", resource=resource_name)
    if event_type not in (a[0] for a in EventTypeChoice.choices()):
        return

    # consider task and project transfers as deletion in one organization and creation in another
    if (
        isinstance(instance, (Project, Task))
        and not created
        and old_instance.organization_id != instance.organization_id
    ):
        new_org_id = resolve_organization_id(instance)
        new_project_id = resolve_project_id(instance)
        old_org_id = resolve_organization_id(old_instance)
        old_project_id = resolve_project_id(old_instance)

        instance._webhooks_selected_webhooks = {}
        for event_, filters in {
            event_type: {
                "organization_id": new_org_id,
                "project_id": new_project_id,
                "select_for_org": False,
            },
            event_name(action="delete", resource=resource_name): {
                "organization_id": old_org_id,
                "project_id": old_project_id,
                "select_for_project": False,
            },
            event_name(action="create", resource=resource_name): {
                "organization_id": new_org_id,
                "project_id": new_project_id,
                "select_for_project": False,
            },
        }.items():
            if webhooks := select_webhooks(event=event_, **filters):
                instance._webhooks_selected_webhooks[event_] = webhooks
    else:
        instance._webhooks_selected_webhooks = select_webhooks(
            event=event_type,
            organization_id=resolve_organization_id(instance),
            project_id=resolve_project_id(instance),
        )

    if not instance._webhooks_selected_webhooks:
        return

    if created:
        instance._webhooks_old_data = None
    else:
        old_serializer = get_serializer(instance=old_instance)
        instance._webhooks_old_data = old_serializer.data


@receiver(post_save, sender=Project)
@receiver(post_save, sender=Task)
@receiver(post_save, sender=Job)
@receiver(post_save, sender=Issue)
@receiver(post_save, sender=Comment)
@receiver(post_save, sender=Organization)
@receiver(post_save, sender=Invitation)
@receiver(post_save, sender=Membership)
def post_save_resource_event(sender, instance, created: bool, raw: bool, **kwargs):
    if created and raw:
        return

    selected_webhooks = instance._webhooks_selected_webhooks
    del instance._webhooks_selected_webhooks

    if not selected_webhooks:
        return

    old_data = instance._webhooks_old_data
    del instance._webhooks_old_data

    created = old_data is None

    resource_name = instance.__class__.__name__.lower()
    event_type = event_name(action="create" if created else "update", resource=resource_name)
    only_one_event_type = not isinstance(selected_webhooks, dict)

    serializer = get_serializer(instance=instance)

    data = {
        resource_name: serializer.data,
        "sender": get_sender(instance=instance),
    }
    # webhooks batch with only one event type
    if only_one_event_type:
        data["event"] = event_type
    else:
        selected_webhooks = {
            event_: {
                "webhooks": webhooks_,
                "event_data": deepcopy(data),
            }
            for event_, webhooks_ in selected_webhooks.items()
        }
        delete_event_type = event_name(action="delete", resource=resource_name)
        if delete_event_type in selected_webhooks:
            assert old_data
            selected_webhooks[delete_event_type]["event_data"][resource_name] = old_data

    if not created and (diff := get_instance_diff(old_data=old_data, data=serializer.data)):
        before_update = {attr: value["old_value"] for attr, value in diff.items()}
        if only_one_event_type:
            data["before_update"] = before_update
        else:
            update_event_type = event_name(action="update", resource=resource_name)
            if update_event_type in selected_webhooks:
                selected_webhooks[update_event_type]["event_data"]["before_update"] = before_update

    transaction.on_commit(
        lambda: batch_add_to_queue(webhooks=selected_webhooks, data=data),
        robust=True,
    )


@receiver(pre_delete, sender=Project)
@receiver(pre_delete, sender=Task)
@receiver(pre_delete, sender=Job)
@receiver(pre_delete, sender=Issue)
@receiver(pre_delete, sender=Comment)
@receiver(pre_delete, sender=Organization)
@receiver(pre_delete, sender=Invitation)
@receiver(pre_delete, sender=Membership)
def pre_delete_resource_event(sender, instance, **kwargs):
    resource_name = instance.__class__.__name__.lower()

    related_webhooks = []
    if resource_name in ["project", "organization"]:
        related_webhooks = select_webhooks(
            event=event_name(action="delete", resource=resource_name),
            organization_id=resolve_organization_id(instance),
            project_id=resolve_project_id(instance),
        )

    serializer = get_serializer(instance=deepcopy(instance))
    instance._deleted_object = dict(serializer.data)
    instance._related_webhooks = related_webhooks


@receiver(post_delete, sender=Project)
@receiver(post_delete, sender=Task)
@receiver(post_delete, sender=Job)
@receiver(post_delete, sender=Issue)
@receiver(post_delete, sender=Comment)
@receiver(post_delete, sender=Organization)
@receiver(post_delete, sender=Invitation)
@receiver(post_delete, sender=Membership)
def post_delete_resource_event(sender, instance, **kwargs):
    resource_name = instance.__class__.__name__.lower()

    event_type = event_name(action="delete", resource=resource_name)
    if event_type not in (a[0] for a in EventTypeChoice.choices()):
        return

    filtered_webhooks = select_webhooks(
        event=event_type,
        organization_id=resolve_organization_id(instance),
        project_id=resolve_project_id(instance),
    )

    data = {
        "event": event_type,
        resource_name: getattr(instance, "_deleted_object"),
        "sender": get_sender(instance=instance),
    }

    related_webhooks = [
        webhook
        for webhook in getattr(instance, "_related_webhooks", [])
        if webhook.id not in (a.id for a in filtered_webhooks)
    ]

    transaction.on_commit(
        lambda: batch_add_to_queue(webhooks=filtered_webhooks + related_webhooks, data=data),
        robust=True,
    )
