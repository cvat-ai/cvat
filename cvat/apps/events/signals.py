# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.core.exceptions import ObjectDoesNotExist
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from cvat.apps.engine.models import (
    CloudStorage,
    Comment,
    Issue,
    Job,
    Label,
    Project,
    Task,
    TimestampedModel,
    User,
)
from cvat.apps.organizations.models import Invitation, Membership, Organization
from cvat.apps.webhooks.models import Webhook

from .event import EventScopeChoice, event_scope
from .handlers import handle_create, handle_delete, handle_update


@receiver(pre_save, sender=Webhook, dispatch_uid="webhook:update_receiver")
@receiver(pre_save, sender=Membership, dispatch_uid="membership:update_receiver")
@receiver(pre_save, sender=Organization, dispatch_uid="organization:update_receiver")
@receiver(pre_save, sender=Project, dispatch_uid="project:update_receiver")
@receiver(pre_save, sender=Task, dispatch_uid="task:update_receiver")
@receiver(pre_save, sender=Job, dispatch_uid="job:update_receiver")
@receiver(pre_save, sender=User, dispatch_uid="user:update_receiver")
@receiver(pre_save, sender=CloudStorage, dispatch_uid="cloudstorage:update_receiver")
@receiver(pre_save, sender=Issue, dispatch_uid="issue:update_receiver")
@receiver(pre_save, sender=Comment, dispatch_uid="comment:update_receiver")
@receiver(pre_save, sender=Label, dispatch_uid="label:update_receiver")
def resource_update(sender, *, instance, update_fields, **kwargs):
    if (
        isinstance(instance, TimestampedModel)
        and update_fields
        and list(update_fields) == ["updated_date"]
    ):
        # This is an optimization for the common case where only the date is bumped
        # (see `TimestampedModel.touch`). Since the actual update of the field will
        # be performed _after_ this signal is sent (in `DateTimeField.pre_save`),
        # and no other fields are updated, there is guaranteed to be no difference
        # between the old and current states of the instance. Therefore, no events
        # will need be logged, so we can just exit immediately.
        return

    resource_name = instance.__class__.__name__.lower()

    try:
        old_instance = sender.objects.get(id=instance.id)
    except ObjectDoesNotExist:
        return

    scope = event_scope("update", resource_name)
    if scope not in (a[0] for a in EventScopeChoice.choices()):
        return

    handle_update(scope=scope, instance=instance, old_instance=old_instance, **kwargs)


@receiver(post_save, sender=Webhook, dispatch_uid="webhook:create_receiver")
@receiver(post_save, sender=Membership, dispatch_uid="membership:create_receiver")
@receiver(post_save, sender=Invitation, dispatch_uid="invitation:create_receiver")
@receiver(post_save, sender=Organization, dispatch_uid="organization:create_receiver")
@receiver(post_save, sender=Project, dispatch_uid="project:create_receiver")
@receiver(post_save, sender=Task, dispatch_uid="task:create_receiver")
@receiver(post_save, sender=Job, dispatch_uid="job:create_receiver")
@receiver(post_save, sender=User, dispatch_uid="user:create_receiver")
@receiver(post_save, sender=CloudStorage, dispatch_uid="cloudstorage:create_receiver")
@receiver(post_save, sender=Issue, dispatch_uid="issue:create_receiver")
@receiver(post_save, sender=Comment, dispatch_uid="comment:create_receiver")
@receiver(post_save, sender=Label, dispatch_uid="label:create_receiver")
def resource_create(sender, instance, created, **kwargs):
    if not created:
        return

    resource_name = instance.__class__.__name__.lower()

    scope = event_scope("create", resource_name)
    if scope not in (a[0] for a in EventScopeChoice.choices()):
        return

    handle_create(scope=scope, instance=instance, **kwargs)


@receiver(post_delete, sender=Webhook, dispatch_uid="webhook:delete_receiver")
@receiver(post_delete, sender=Membership, dispatch_uid="membership:delete_receiver")
@receiver(post_delete, sender=Invitation, dispatch_uid="invitation:delete_receiver")
@receiver(post_delete, sender=Organization, dispatch_uid="organization:delete_receiver")
@receiver(post_delete, sender=Project, dispatch_uid="project:delete_receiver")
@receiver(post_delete, sender=Task, dispatch_uid="task:delete_receiver")
@receiver(post_delete, sender=Job, dispatch_uid="job:delete_receiver")
@receiver(post_delete, sender=User, dispatch_uid="user:delete_receiver")
@receiver(post_delete, sender=CloudStorage, dispatch_uid="cloudstorage:delete_receiver")
@receiver(post_delete, sender=Issue, dispatch_uid="issue:delete_receiver")
@receiver(post_delete, sender=Comment, dispatch_uid="comment:delete_receiver")
@receiver(post_delete, sender=Label, dispatch_uid="label:delete_receiver")
def resource_delete(sender, instance, **kwargs):
    resource_name = instance.__class__.__name__.lower()
    scope = event_scope("delete", resource_name)
    if scope not in (a[0] for a in EventScopeChoice.choices()):
        return

    handle_delete(scope=scope, instance=instance, **kwargs)
