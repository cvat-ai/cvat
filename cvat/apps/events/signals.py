# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.dispatch import receiver
from django.db.models.signals import pre_save, post_save, post_delete
from django.core.exceptions import ObjectDoesNotExist

from cvat.apps.engine.models import (
    Organization,
    Project,
    Task,
    Job,
    User,
    CloudStorage,
    Issue,
    Comment,
    Label,
)

from .handlers import handle_update, handle_create, handle_delete
from .event import EventScopeChoice, event_scope

@receiver(pre_save, sender=Organization)
@receiver(pre_save, sender=Project)
@receiver(pre_save, sender=Task)
@receiver(pre_save, sender=Job)
@receiver(pre_save, sender=User)
@receiver(pre_save, sender=CloudStorage)
@receiver(pre_save, sender=Issue)
@receiver(pre_save, sender=Comment)
@receiver(pre_save, sender=Label)
def resource_update(sender, instance, **kwargs):
    resource_name = instance.__class__.__name__.lower()

    try:
        old_instance = sender.objects.get(id=instance.id)
    except ObjectDoesNotExist:
        return

    scope = event_scope("update", resource_name)
    if scope not in map(lambda a: a[0], EventScopeChoice.choices()):
        return

    handle_update(scope=scope, instance=instance, old_instance=old_instance, **kwargs)

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
    if scope not in map(lambda a: a[0], EventScopeChoice.choices()):
        return

    handle_create(scope=scope, instance=instance, **kwargs)

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
    if scope not in map(lambda a: a[0], EventScopeChoice.choices()):
        return

    handle_delete(scope=scope, instance=instance, **kwargs)
