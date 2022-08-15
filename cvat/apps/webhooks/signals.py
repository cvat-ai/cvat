import django_rq
from django.dispatch import Signal, receiver
import requests

from cvat.apps.engine.serializers import BasicUserSerializer

from .event_type import EventTypeChoice
from .models import Webhook, WebhookDelivery

signal_update = Signal()
signal_create = Signal()
signal_redelivery = Signal()
signal_ping = Signal()


def send_webhook(webhook, data, redelivery):
    response = None
    try:
        response = requests.post(webhook.target_url, json=data)
        status_code = str(response.status_code)
    except requests.ConnectionError:
        status_code = "Failed to connect to target url"

    WebhookDelivery.objects.create(
        webhook_id=webhook.id,
        event=data["event"],
        status_code=status_code,
        changed_fields=",".join(list(data.get("before_update", {}).keys())),
        redelivery=redelivery,
        request=data,
        response="" if response is None else response.text,
    )


def add_to_queue(webhook, payload, redelivery=False):
    queue = django_rq.get_queue("webhooks")
    queue.enqueue_call(func=send_webhook, args=(webhook, payload, redelivery))


def payload(data, request):
    return {
        **data,
        "sender": BasicUserSerializer(request.user, context={"request": request}).data,
    }


@receiver(signal_update)
def update(sender, serializer=None, old_values=None, **kwargs):
    event_name = f"{sender.basename}_updated"
    pid = serializer.data["project_id"]
    if "organization" in serializer.data:
        oid = serializer.data["organization"]
    else:
        oid = serializer.instance.get_organization_id()

    if event_name not in map(lambda a: a[0], EventTypeChoice.choices()):
        return

    if oid is None and pid is None:
        return

    data = {
        "event": event_name,
        sender.basename: serializer.data,
        "before_update": old_values,
    }

    if oid is not None:
        webhooks = Webhook.objects.filter(is_active=True, events__contains=event_name, organization=oid)
        for webhook in webhooks:
            data.update({"webhook_id": webhook.id})
            add_to_queue(webhook, payload(data, sender.request))

    if pid is not None:
        webhooks = Webhook.objects.filter(is_active=True, events__contains=event_name, project=pid)
        for webhook in webhooks:
            data.update({"webhook_id": webhook.id})
            add_to_queue(webhook, payload(data, sender.request))

@receiver(signal_create)
def task_created(sender, serializer=None, **kwargs):
    event_name = f"{sender.basename}_created"
    pid = serializer.data["project_id"]
    oid = serializer.data["organization"]

    data = {
        "event": event_name,
        sender.basename: serializer.data,
    }

    if oid is not None:
        webhooks = Webhook.objects.filter(is_active=True, events__contains=event_name, organization=oid)
        for webhook in webhooks:
            data.update({"webhook_id": webhook.id})
            add_to_queue(webhook, payload(data, sender.request))

    if pid is not None:
        webhooks = Webhook.objects.filter(is_active=True, events__contains=event_name, project=pid)
        for webhook in webhooks:
            data.update({"webhook_id": webhook.id})
            add_to_queue(webhook, payload(data, sender.request))


@receiver(signal_redelivery)
def redelivery(sender, data=None, **kwargs):
    add_to_queue(sender.get_object(), data, redelivery=True)


@receiver(signal_ping)
def ping(sender, serializer=None, **kwargs):
    data = {"event": "ping", "webhook": serializer.data}
    add_to_queue(serializer.instance, payload(data, sender.request))
