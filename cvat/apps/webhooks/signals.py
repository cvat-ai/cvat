from requests import post
from django.dispatch import receiver, Signal
from .models import Webhook, WebhookDelivery
from cvat.apps.engine.serializers import BasicUserSerializer

signal_update = Signal()
signal_redelivery = Signal()
signal_ping = Signal()


def send_webhooks(webhooks, data, request, redelivery=False):
    data["sender"] = BasicUserSerializer(
        request.user, context={"request": request}
    ).data

    for webhook in webhooks:
        data.update({"webhook_id": webhook.id})
        response = post(webhook.target_url, json=data)
        # TO-DO: process response more carefully
        WebhookDelivery.objects.create(
            webhook_id=webhook.id,
            event=data["event"],
            status_code=response.status_code,
            changed_fields=",".join(list(data.get("before_update", {}).keys())),
            redelivery=redelivery,
            request=data,
            response=response.text,
        )


@receiver(signal_update)
def update(sender, serializer=None, old_values=None, **kwargs):
    # TO-DO: generalize this to work with any model
    oid = serializer.instance.segment.task.organization
    pid = serializer.data["project_id"]

    if oid is None and pid is None:
        return

    event_name = f"{sender.basename}_updated"
    payload = {
        "event": event_name,
        sender.basename: serializer.data,
        "before_update": old_values,
    }

    if oid is not None:
        webhooks = Webhook.objects.filter(events__contains=event_name, organization=oid)
        send_webhooks(webhooks, payload, sender.request)

    if pid is not None:
        webhooks = Webhook.objects.filter(events__contains=event_name, project=pid)
        send_webhooks(webhooks, payload, sender.request)


@receiver(signal_redelivery)
def redelivery(sender, webhook_id=None, data=None, **kwargs):
    # TO-DO: replace Webhook.objects.get with sender.get_object()
    send_webhooks([Webhook.objects.get(id=webhook_id)], data, sender.request, redelivery=True)

@receiver(signal_ping)
def ping(sender, serializer=None, **kwargs):
    payload = {
        "event": "ping",
        "webhook": serializer.data,
    }
    send_webhooks([serializer.instance], payload, sender.request)
