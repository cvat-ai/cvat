import django_rq
from requests import post
from django.dispatch import receiver, Signal
from .models import Webhook, WebhookDelivery
from cvat.apps.engine.serializers import BasicUserSerializer

signal_update = Signal()
signal_redelivery = Signal()
signal_ping = Signal()


def send_webhook(webhook, data, redelivery):
    response = post(webhook.target_url, json=data)
    WebhookDelivery.objects.create(
        webhook_id=webhook.id,
        event=data["event"],
        status_code=response.status_code,
        changed_fields=",".join(list(data.get("before_update", {}).keys())),
        redelivery=redelivery,
        request=data,
        response=response.text,
    )


def add_to_queue(webhook, payload, redelivery=False):
    queue = django_rq.get_queue("webhooks")
    queue.enqueue_call(
        func=send_webhook,
        args=(webhook, payload, redelivery)
    )


def payload(data, request):
    return {
        **data,
        "sender": BasicUserSerializer(
            request.user, context={"request": request}
        ).data
    }


@receiver(signal_update)
def update(sender, serializer=None, old_values=None, **kwargs):
    # Add validation for sender.basename
    oid = serializer.instance.segment.task.organization
    pid = serializer.data["project_id"]

    if oid is None and pid is None:
        return

    event_name = f"{sender.basename}_updated"
    data = {
        "event": event_name,
        sender.basename: serializer.data,
        "before_update": old_values,
    }

    if oid is not None:
        webhooks = Webhook.objects.filter(events__contains=event_name, organization=oid)
        for webhook in webhooks:
            data.update({"webhook_id": webhook.id})
            add_to_queue(webhook, payload(data, sender.request))

    if pid is not None:
        webhooks = Webhook.objects.filter(events__contains=event_name, project=pid)
        for webhook in webhooks:
            payload.update({"webhook_id": webhook.id})
            add_to_queue(webhook, payload(data, sender.request))


@receiver(signal_redelivery)
def redelivery(sender, data=None, **kwargs):
    add_to_queue(sender.get_object(), data, redelivery=True)


@receiver(signal_ping)
def ping(sender, serializer=None, **kwargs):
    data = {
        "event": "ping",
        "webhook": serializer.data,
    }
    add_to_queue(serializer.instance, payload(data, sender.request))
