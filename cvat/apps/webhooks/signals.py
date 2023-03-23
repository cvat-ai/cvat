# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import hashlib
import hmac
import json
from http import HTTPStatus

import django_rq
import requests
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import Signal, receiver

from cvat.apps.engine.models import Comment, Issue, Job, Label, Project, Task
from cvat.apps.engine.serializers import BasicUserSerializer
from cvat.apps.events.handlers import (_get_current_request, get_instance_diff,
                                       _get_serializer, organization_id,
                                       project_id)
from cvat.apps.organizations.models import Invitation, Membership, Organization
from cvat.utils.http import make_requests_session

from .event_type import EventTypeChoice, event_name
from .models import Webhook, WebhookDelivery, WebhookTypeChoice

WEBHOOK_TIMEOUT = 10
RESPONSE_SIZE_LIMIT = 1 * 1024 * 1024  # 1 MB

signal_redelivery = Signal()
signal_ping = Signal()

def send_webhook(webhook, payload, delivery):
    headers = {}
    if webhook.secret:
        headers["X-Signature-256"] = (
            "sha256="
            + hmac.new(
                webhook.secret.encode("utf-8"),
                json.dumps(payload).encode("utf-8"),
                digestmod=hashlib.sha256,
            ).hexdigest()
        )

    response_body = None
    try:
        with make_requests_session() as session:
            response = session.post(
                webhook.target_url,
                json=payload,
                verify=webhook.enable_ssl,
                headers=headers,
                timeout=WEBHOOK_TIMEOUT,
                stream=True,
            )
            status_code = response.status_code
            response_body = response.raw.read(
                RESPONSE_SIZE_LIMIT + 1, decode_content=True
            )
    except requests.ConnectionError:
        status_code = HTTPStatus.BAD_GATEWAY
    except requests.Timeout:
        status_code = HTTPStatus.GATEWAY_TIMEOUT

    delivery.status_code = status_code
    if response_body is not None and len(response_body) < RESPONSE_SIZE_LIMIT + 1:
        delivery.response = response_body.decode("utf-8")

    delivery.save()


def add_to_queue(webhook, payload, redelivery=False):
    delivery = WebhookDelivery.objects.create(
        webhook_id=webhook.id,
        event=payload["event"],
        status_code=None,
        changed_fields=",".join(list(payload.get("before_update", {}).keys())),
        redelivery=redelivery,
        request=payload,
        response="",
    )

    queue = django_rq.get_queue(settings.CVAT_QUEUES.WEBHOOKS.value)
    queue.enqueue_call(func=send_webhook, args=(webhook, payload, delivery))

    return delivery


def batch_add_to_queue(webhooks, data):
    for webhook in webhooks:
        data.update({"webhook_id": webhook.id})
        add_to_queue(webhook, data)


def select_webhooks(instance, event):
    selected_webhooks = []
    pid = project_id(instance)
    oid = organization_id(instance)
    if oid is not None:
        webhooks = Webhook.objects.filter(
            is_active=True,
            events__contains=event,
            type=WebhookTypeChoice.ORGANIZATION,
            organization=oid,
        )
        selected_webhooks += list(webhooks)

    if pid is not None:
        webhooks = Webhook.objects.filter(
            is_active=True,
            events__contains=event,
            type=WebhookTypeChoice.PROJECT,
            project=pid,
        )
        selected_webhooks += list(webhooks)

    return selected_webhooks


def get_sender(instance):
    request = _get_current_request(instance)
    return BasicUserSerializer(request.user, context={"request": request}).data


@receiver(pre_save, sender=Project, dispatch_uid="project:update")
@receiver(pre_save, sender=Task, dispatch_uid="task:update")
@receiver(pre_save, sender=Job, dispatch_uid="job:update")
@receiver(pre_save, sender=Label, dispatch_uid="label:update")
@receiver(pre_save, sender=Issue, dispatch_uid="issue:update")
@receiver(pre_save, sender=Comment, dispatch_uid="comment:update")
@receiver(pre_save, sender=Organization, dispatch_uid="organization:update")
@receiver(pre_save, sender=Invitation, dispatch_uid="invitation:update")
@receiver(pre_save, sender=Membership, dispatch_uid="membership:update")
def update_resource_event(sender, instance, **kwargs):
    resource_name = instance.__class__.__name__.lower()

    event_type = event_name("update", resource_name)
    if event_type not in map(lambda a: a[0], EventTypeChoice.choices()):
        return

    filtered_webhooks = select_webhooks(instance, event_type)
    if not filtered_webhooks:
        return

    try:
        old_instance = sender.objects.get(id=instance.id)
    except ObjectDoesNotExist:
        return

    old_serializer = _get_serializer(instance=old_instance)
    serializer = _get_serializer(instance=instance)
    diff = get_instance_diff(old_data=old_serializer.data, data=serializer.data)

    if not diff:
        return

    data = {
        "event": event_type,
        resource_name: serializer.data,
        "before_update": {
            attr: value["old_value"]
            for attr, value in diff.items()
        },
        "sender": get_sender(instance),
    }

    batch_add_to_queue(filtered_webhooks, data)



@receiver(post_save, sender=Project, dispatch_uid="project:create")
@receiver(post_save, sender=Task, dispatch_uid="task:create")
@receiver(post_save, sender=Job, dispatch_uid="job:create")
@receiver(post_save, sender=Label, dispatch_uid="label:create")
@receiver(post_save, sender=Issue, dispatch_uid="issue:create")
@receiver(post_save, sender=Comment, dispatch_uid="comment:create")
@receiver(post_save, sender=Organization, dispatch_uid="organization:create")
@receiver(post_save, sender=Invitation, dispatch_uid="invitation:create")
@receiver(post_save, sender=Membership, dispatch_uid="membership:create")
def resource_create(sender, instance, created, **kwargs):
    if not created:
        return

    resource_name = instance.__class__.__name__.lower()

    event_type = event_name("create", resource_name)
    if event_type not in map(lambda a: a[0], EventTypeChoice.choices()):
        return

    filtered_webhooks = select_webhooks(instance, event_type)
    if not filtered_webhooks:
        return

    serializer = _get_serializer(instance=instance)

    data = {
        "event": event_type,
        resource_name: serializer.data,
        "sender": get_sender(instance),
    }

    batch_add_to_queue(filtered_webhooks, data)


@receiver(post_delete, sender=Project, dispatch_uid="project:delete")
@receiver(post_delete, sender=Task, dispatch_uid="task:delete")
@receiver(post_delete, sender=Job, dispatch_uid="job:delete")
@receiver(post_delete, sender=Label, dispatch_uid="label:delete")
@receiver(post_delete, sender=Issue, dispatch_uid="issue:delete")
@receiver(post_delete, sender=Comment, dispatch_uid="comment:delete")
@receiver(post_delete, sender=Organization, dispatch_uid="organization:delete")
@receiver(post_delete, sender=Invitation, dispatch_uid="invitation:delete")
@receiver(post_delete, sender=Membership, dispatch_uid="membership:delete")
def resource_delete(sender, instance, **kwargs):
    resource_name = instance.__class__.__name__.lower()

    event_type = event_name("delete", resource_name)
    if event_type not in map(lambda a: a[0], EventTypeChoice.choices()):
        return

    filtered_webhooks = select_webhooks(instance, event_type)
    if not filtered_webhooks:
        return

    serializer = _get_serializer(instance=instance)

    data = {
        "event": event_type,
        resource_name: serializer.data,
        "sender": get_sender(instance),
    }

    batch_add_to_queue(filtered_webhooks, data)

    # Clean up webhook objects
    if resource_name == "project":
        for webhook in filtered_webhooks:
            if webhook.project_id == instance.id:
                webhook.delete()

    if resource_name == "organization":
        for webhook in filtered_webhooks:
            if webhook.organization_id == instance.id:
                webhook.delete()


@receiver(signal_redelivery)
def redelivery(sender, data=None, **kwargs):
    add_to_queue(sender.get_object(), data, redelivery=True)


@receiver(signal_ping)
def ping(sender, serializer, **kwargs):
    data = {"event": "ping", "webhook": serializer.data, "sender": get_sender(serializer.instance)}
    delivery = add_to_queue(serializer.instance, data)
    return delivery
