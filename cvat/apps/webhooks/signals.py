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
from django.db.models.signals import pre_delete, post_save, pre_save, post_delete
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

def send_webhook(webhook, payload, redelivery=False):
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

    response = ""
    if response_body is not None and len(response_body) < RESPONSE_SIZE_LIMIT + 1:
        response = response_body.decode("utf-8")

    delivery = WebhookDelivery.objects.create(
        webhook_id=webhook.id,
        event=payload["event"],
        status_code=status_code,
        changed_fields=",".join(list(payload.get("before_update", {}).keys())),
        redelivery=redelivery,
        request=payload,
        response=response,
    )

    return delivery

def add_to_queue(webhook, payload, redelivery=False):
    queue = django_rq.get_queue(settings.CVAT_QUEUES.WEBHOOKS.value)
    queue.enqueue_call(func=send_webhook, args=(webhook, payload, redelivery))


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


@receiver(pre_save, sender=Project, dispatch_uid=__name__ + "project:pre_save")
@receiver(pre_save, sender=Task, dispatch_uid=__name__ + "task:pre_save")
@receiver(pre_save, sender=Job, dispatch_uid=__name__ + "job:pre_save")
@receiver(pre_save, sender=Label, dispatch_uid=__name__ + "label:pre_save")
@receiver(pre_save, sender=Issue, dispatch_uid=__name__ + "issue:pre_save")
@receiver(pre_save, sender=Comment, dispatch_uid=__name__ + "comment:pre_save")
@receiver(pre_save, sender=Organization, dispatch_uid=__name__ + "organization:pre_save")
@receiver(pre_save, sender=Invitation, dispatch_uid=__name__ + "invitation:pre_save")
@receiver(pre_save, sender=Membership, dispatch_uid=__name__ + "membership:pre_save")
def pre_save_resource_event(sender, instance, **kwargs):
    try:
        old_instance = sender.objects.get(pk=instance.pk)
    except ObjectDoesNotExist:
        return

    old_serializer = _get_serializer(instance=old_instance)
    serializer = _get_serializer(instance=instance)
    diff = get_instance_diff(old_data=old_serializer.data, data=serializer.data)

    if not diff:
        return

    before_update = {
        attr: value["old_value"]
        for attr, value in diff.items()
    }

    setattr(instance, "_before_update", before_update)


@receiver(post_save, sender=Project, dispatch_uid=__name__ + "project:post_save")
@receiver(post_save, sender=Task, dispatch_uid=__name__ + "task:post_save")
@receiver(post_save, sender=Job, dispatch_uid=__name__ + "job:post_save")
@receiver(post_save, sender=Label, dispatch_uid=__name__ + "label:post_save")
@receiver(post_save, sender=Issue, dispatch_uid=__name__ + "issue:post_save")
@receiver(post_save, sender=Comment, dispatch_uid=__name__ + "comment:post_save")
@receiver(post_save, sender=Organization, dispatch_uid=__name__ + "organization:post_save")
@receiver(post_save, sender=Invitation, dispatch_uid=__name__ + "invitation:post_save")
@receiver(post_save, sender=Membership, dispatch_uid=__name__ + "membership:post_save")
def post_save_resource_event(sender, instance, created, **kwargs):
    resource_name = instance.__class__.__name__.lower()

    event_type = event_name("create" * created + "update" * (not created), resource_name)
    if event_type not in map(lambda a: a[0], EventTypeChoice.choices()):
        return

    filtered_webhooks = select_webhooks(instance, event_type)
    if not filtered_webhooks:
        return

    data = {
        "event": event_type,
        resource_name: _get_serializer(instance=instance).data,
        "sender": get_sender(instance),
    }

    if not created and not getattr(instance, "_before_update", None):
        return
    elif not created and (before_update := getattr(instance, "_before_update", None)):
        data["before_update"] = before_update

    batch_add_to_queue(filtered_webhooks, data)


@receiver(pre_delete, sender=Project, dispatch_uid=__name__ + "project:pre_delete")
@receiver(pre_delete, sender=Task, dispatch_uid=__name__ + "task:pre_delete")
@receiver(pre_delete, sender=Job, dispatch_uid=__name__ + "job:pre_delete")
@receiver(pre_delete, sender=Label, dispatch_uid=__name__ + "label:pre_delete")
@receiver(pre_delete, sender=Issue, dispatch_uid=__name__ + "issue:pre_delete")
@receiver(pre_delete, sender=Comment, dispatch_uid=__name__ + "comment:pre_delete")
@receiver(pre_delete, sender=Organization, dispatch_uid=__name__ + "organization:pre_delete")
@receiver(pre_delete, sender=Invitation, dispatch_uid=__name__ + "invitation:pre_delete")
@receiver(pre_delete, sender=Membership, dispatch_uid=__name__ + "membership:pre_delete")
def pre_delete_resource_event(sender, instance, **kwargs):
    resource_name = instance.__class__.__name__.lower()

    related_webhooks = []
    if resource_name == "project":
        related_webhooks = Webhook.objects.filter(project_id=instance.id)
    elif resource_name == "organization":
        related_webhooks = Webhook.objects.filter(organization_id=instance.id)

    serializer =_get_serializer(instance=instance)
    setattr(instance, "_deleted_object", serializer.data)
    setattr(instance, "_related_webhooks", list(related_webhooks))


@receiver(post_delete, sender=Project, dispatch_uid=__name__ + "project:post_delete")
@receiver(post_delete, sender=Task, dispatch_uid=__name__ + "task:post_delete")
@receiver(post_delete, sender=Job, dispatch_uid=__name__ + "job:post_delete")
@receiver(post_delete, sender=Label, dispatch_uid=__name__ + "label:post_delete")
@receiver(post_delete, sender=Issue, dispatch_uid=__name__ + "issue:post_delete")
@receiver(post_delete, sender=Comment, dispatch_uid=__name__ + "comment:post_delete")
@receiver(post_delete, sender=Organization, dispatch_uid=__name__ + "organization:post_delete")
@receiver(post_delete, sender=Invitation, dispatch_uid=__name__ + "invitation:post_delete")
@receiver(post_delete, sender=Membership, dispatch_uid=__name__ + "membership:post_delete")
def post_delete_resource_event(sender, instance, **kwargs):
    resource_name = instance.__class__.__name__.lower()

    event_type = event_name("delete", resource_name)
    if event_type not in map(lambda a: a[0], EventTypeChoice.choices()):
        return

    filtered_webhooks = select_webhooks(instance, event_type)

    data = {
        "event": event_type,
        resource_name: getattr(instance, "_deleted_object", {}),
        "sender": get_sender(instance),
    }

    batch_add_to_queue(filtered_webhooks, data)
    batch_add_to_queue(getattr(instance, "_related_webhooks", []), data)


@receiver(signal_redelivery)
def redelivery(sender, data=None, **kwargs):
    add_to_queue(sender.get_object(), data, redelivery=True)


@receiver(signal_ping)
def ping(sender, serializer, **kwargs):
    data = {"event": "ping", "webhook": serializer.data, "sender": get_sender(serializer.instance)}
    delivery = send_webhook(serializer.instance, data, redelivery=False)
    return delivery
