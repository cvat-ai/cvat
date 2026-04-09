# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import hashlib
import hmac
import json
from copy import deepcopy
from datetime import timedelta
from http import HTTPStatus

import django_rq
import requests
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.db.models import Model
from django.db.models.signals import post_delete, post_save, pre_delete, pre_save
from django.dispatch import Signal, receiver
from django.utils import timezone

from cvat.apps.engine.models import Comment, Issue, Job, Project, Task
from cvat.apps.engine.serializers import BasicUserSerializer
from cvat.apps.events.handlers import (
    get_instance_diff,
    get_request,
    get_serializer,
    get_user,
    organization_id,
    project_id,
)
from cvat.apps.organizations.models import Invitation, Membership, Organization
from cvat.utils.http import PROXIES_FOR_UNTRUSTED_URLS, make_requests_session

from .event_type import EventTypeChoice, event_name
from .models import Webhook, WebhookDelivery, WebhookTypeChoice

WEBHOOK_TIMEOUT = 10
RESPONSE_SIZE_LIMIT = 1 * 1024 * 1024  # 1 MB

# Status codes that should trigger automatic retry
# 408 Request Timeout, 429 Too Many Requests, 5xx Server Errors
RETRYABLE_STATUS_CODES = {408, 429, 500, 502, 503, 504}

signal_redelivery = Signal()
signal_ping = Signal()


def should_retry(status_code, webhook):
    """Determine if a delivery should be retried based on status code and webhook config."""
    if webhook.max_retries == 0:
        return False

    # Retry on network errors (represented as 502 or 504) and retryable status codes
    return status_code in RETRYABLE_STATUS_CODES


def calculate_retry_delay(attempt_number, webhook):
    """Calculate delay before next retry using exponential backoff with jitter."""
    import random

    # Calculate exponential backoff: initial_delay * (backoff_factor ^ (attempt - 1))
    delay = webhook.retry_delay * (webhook.retry_backoff_factor ** (attempt_number - 1))

    # Add jitter (up to 10% of delay) to avoid thundering herd
    jitter = delay * 0.1 * random.random()
    delay += jitter

    # Cap maximum delay at 1 hour
    max_delay = 3600
    return min(delay, max_delay)


def send_webhook(webhook, payload, redelivery=False, attempt_number=1):
    """
    Send webhook delivery and handle retry logic.

    Args:
        webhook: Webhook model instance
        payload: JSON payload to send
        redelivery: Whether this is a manual redelivery
        attempt_number: Current attempt number (1 for first attempt)
    """
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
                proxies=PROXIES_FOR_UNTRUSTED_URLS,
            )
            status_code = response.status_code
            response_body = response.raw.read(RESPONSE_SIZE_LIMIT + 1, decode_content=True)
    except requests.ConnectionError:
        status_code = HTTPStatus.BAD_GATEWAY
    except requests.Timeout:
        status_code = HTTPStatus.GATEWAY_TIMEOUT

    response = ""
    if response_body is not None and len(response_body) < RESPONSE_SIZE_LIMIT + 1:
        response = response_body.decode("utf-8")

    # Determine if retry is needed
    next_retry_date = None
    if not redelivery and attempt_number <= webhook.max_retries and should_retry(status_code, webhook):
        delay_seconds = calculate_retry_delay(attempt_number, webhook)
        next_retry_date = timezone.now() + timedelta(seconds=delay_seconds)

    delivery = WebhookDelivery.objects.create(
        webhook_id=webhook.id,
        event=payload["event"],
        status_code=status_code,
        changed_fields=",".join(list(payload.get("before_update", {}).keys())),
        redelivery=redelivery,
        attempt_number=attempt_number,
        next_retry_date=next_retry_date,
        request=payload,
        response=response,
    )

    # Schedule retry if needed
    if next_retry_date and not redelivery:
        schedule_retry(webhook, payload, attempt_number + 1, delay_seconds)

    return delivery


def schedule_retry(webhook, payload, next_attempt_number, delay_seconds):
    """Schedule a retry attempt for a failed webhook delivery."""
    queue = django_rq.get_queue(settings.CVAT_QUEUES.WEBHOOKS.value)
    # Use RQ's job scheduling to delay the retry
    queue.enqueue_in(
        timedelta(seconds=delay_seconds),
        send_webhook,
        webhook=webhook,
        payload=payload,
        redelivery=False,
        attempt_number=next_attempt_number,
    )


def add_to_queue(webhook, payload, redelivery=False, attempt_number=1):
    """Add webhook delivery to the queue."""
    queue = django_rq.get_queue(settings.CVAT_QUEUES.WEBHOOKS.value)
    queue.enqueue_call(func=send_webhook, args=(webhook, payload, redelivery, attempt_number))


def batch_add_to_queue(webhooks: list | dict, data: dict | None):
    # webhooks batch with different events; webhooks are grouped by them
    if isinstance(webhooks, dict):
        for event_type, webhooks_data in webhooks.items():
            payload = deepcopy(webhooks_data["event_data"])
            for webhook in webhooks_data["webhooks"]:
                add_to_queue(
                    webhook,
                    {
                        **payload,
                        "webhook_id": webhook.id,
                        "event": event_type,
                    },
                )
        return

    payload = deepcopy(data)
    for webhook in webhooks:
        payload["webhook_id"] = webhook.id
        add_to_queue(webhook, payload)


def select_webhooks(
    instance: Model,
    event: str,
    *,
    select_for_org: bool = True,
    select_for_project: bool = True,
):
    selected_webhooks = []

    if select_for_org and (oid := organization_id(instance)) is not None:
        webhooks = Webhook.objects.filter(
            is_active=True,
            events__contains=event,
            type=WebhookTypeChoice.ORGANIZATION,
            organization=oid,
        )
        selected_webhooks += list(webhooks)

    if select_for_project and (pid := project_id(instance)) is not None:
        webhooks = Webhook.objects.filter(
            is_active=True,
            events__contains=event,
            type=WebhookTypeChoice.PROJECT,
            project=pid,
        )
        selected_webhooks += list(webhooks)

    return selected_webhooks


def get_sender(instance):
    user = get_user(instance)
    if isinstance(user, dict):
        return user
    return BasicUserSerializer(user, context={"request": get_request(instance)}).data


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

    event_type = event_name("create" if created else "update", resource_name)
    if event_type not in (a[0] for a in EventTypeChoice.choices()):
        return

    # consider task and project transfers as deletion in one organization and creation in another
    if (
        isinstance(instance, (Project, Task))
        and not created
        and old_instance.organization_id != instance.organization_id
    ):
        instance._webhooks_selected_webhooks = {}
        for event_, filters in {
            event_type: {
                "instance": instance,
                "select_for_org": False,
            },
            event_name("delete", resource_name): {
                "instance": old_instance,
                "select_for_project": False,
            },
            event_name("create", resource_name): {
                "instance": instance,
                "select_for_project": False,
            },
        }.items():
            if webhooks := select_webhooks(event=event_, **filters):
                instance._webhooks_selected_webhooks[event_] = webhooks
    else:
        instance._webhooks_selected_webhooks = select_webhooks(instance, event_type)

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
    event_type = event_name("create" if created else "update", resource_name)
    only_one_event_type = not isinstance(selected_webhooks, dict)

    serializer = get_serializer(instance=instance)

    data = {
        resource_name: serializer.data,
        "sender": get_sender(instance),
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
        if (delete_event_type := event_name("delete", resource_name)) in selected_webhooks:
            assert old_data
            selected_webhooks[delete_event_type]["event_data"][resource_name] = old_data

    if not created and (diff := get_instance_diff(old_data=old_data, data=serializer.data)):
        before_update = {attr: value["old_value"] for attr, value in diff.items()}
        if only_one_event_type:
            data["before_update"] = before_update
        elif (update_event_type := event_name("update", resource_name)) in selected_webhooks:
            selected_webhooks[update_event_type]["event_data"]["before_update"] = before_update

    transaction.on_commit(
        lambda: batch_add_to_queue(selected_webhooks, data),
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
        related_webhooks = select_webhooks(instance, event_name("delete", resource_name))

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

    event_type = event_name("delete", resource_name)
    if event_type not in (a[0] for a in EventTypeChoice.choices()):
        return

    filtered_webhooks = select_webhooks(instance, event_type)

    data = {
        "event": event_type,
        resource_name: getattr(instance, "_deleted_object"),
        "sender": get_sender(instance),
    }

    related_webhooks = [
        webhook
        for webhook in getattr(instance, "_related_webhooks", [])
        if webhook.id not in (a.id for a in filtered_webhooks)
    ]

    transaction.on_commit(
        lambda: batch_add_to_queue(filtered_webhooks + related_webhooks, data),
        robust=True,
    )


@receiver(signal_redelivery)
def redelivery(sender, data=None, **kwargs):
    add_to_queue(sender.get_object(), data, redelivery=True)


@receiver(signal_ping)
def ping(sender, serializer, **kwargs):
    data = {"event": "ping", "webhook": serializer.data, "sender": get_sender(serializer.instance)}
    delivery = send_webhook(serializer.instance, data, redelivery=False)
    return delivery
