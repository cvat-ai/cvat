# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.core.exceptions import ObjectDoesNotExist
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from cvat.apps.access_tokens.models import AccessToken
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


@receiver(pre_save, sender=AccessToken)
@receiver(pre_save, sender=Webhook)
@receiver(pre_save, sender=Membership)
@receiver(pre_save, sender=Organization)
@receiver(pre_save, sender=Project)
@receiver(pre_save, sender=Task)
@receiver(pre_save, sender=Job)
@receiver(pre_save, sender=User)
@receiver(pre_save, sender=CloudStorage)
@receiver(pre_save, sender=Issue)
@receiver(pre_save, sender=Comment)
@receiver(pre_save, sender=Label)
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
    allowed_scopes = tuple(a[0] for a in EventScopeChoice.choices())
    if scope not in allowed_scopes:
        return

    if isinstance(instance, AccessToken) and instance.revoked:
        # Real model deletes are delayed for AccessToken.
        # The events should store user actions, not the DB actions.
        if old_instance and not old_instance.revoked:
            scope = event_scope("delete", resource_name)
            if scope not in allowed_scopes:
                return

            handle_delete(scope=scope, instance=instance, **kwargs)
    else:
        handle_update(scope=scope, instance=instance, old_instance=old_instance, **kwargs)


@receiver(post_save, sender=AccessToken)
@receiver(post_save, sender=Webhook)
@receiver(post_save, sender=Membership)
@receiver(post_save, sender=Invitation)
@receiver(post_save, sender=Organization)
@receiver(post_save, sender=Project)
@receiver(post_save, sender=Task)
@receiver(post_save, sender=Job)
@receiver(post_save, sender=User)
@receiver(post_save, sender=CloudStorage)
@receiver(post_save, sender=Issue)
@receiver(post_save, sender=Comment)
@receiver(post_save, sender=Label)
def resource_create(sender, instance, created, **kwargs):
    if not created:
        return

    resource_name = instance.__class__.__name__.lower()

    scope = event_scope("create", resource_name)
    if scope not in (a[0] for a in EventScopeChoice.choices()):
        return

    handle_create(scope=scope, instance=instance, **kwargs)


@receiver(post_delete, sender=Webhook)
@receiver(post_delete, sender=Membership)
@receiver(post_delete, sender=Invitation)
@receiver(post_delete, sender=Organization)
@receiver(post_delete, sender=Project)
@receiver(post_delete, sender=Task)
@receiver(post_delete, sender=Job)
@receiver(post_delete, sender=User)
@receiver(post_delete, sender=CloudStorage)
@receiver(post_delete, sender=Issue)
@receiver(post_delete, sender=Comment)
@receiver(post_delete, sender=Label)
def resource_delete(sender, instance, **kwargs):
    resource_name = instance.__class__.__name__.lower()
    scope = event_scope("delete", resource_name)
    if scope not in (a[0] for a in EventScopeChoice.choices()):
        return

    handle_delete(scope=scope, instance=instance, **kwargs)
