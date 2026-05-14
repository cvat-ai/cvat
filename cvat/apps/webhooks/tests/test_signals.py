# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from http import HTTPStatus
from unittest.mock import MagicMock, patch

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rq import Retry

from cvat.apps.engine.models import Project
from cvat.apps.webhooks.exceptions import WebhookDeliveryError
from cvat.apps.webhooks.models import (
    Webhook,
    WebhookContentTypeChoice,
    WebhookDelivery,
    WebhookTypeChoice,
)
from cvat.apps.webhooks.dispatch import add_to_queue
from cvat.apps.webhooks.tasks import send_webhook


def _make_webhook(*, is_active: bool = True) -> Webhook:
    owner = User.objects.create(username="owner")
    project = Project.objects.create(name="p", owner=owner)
    return Webhook.objects.create(
        target_url="http://example.invalid/payload",
        owner=owner,
        project=project,
        type=WebhookTypeChoice.PROJECT.value,
        content_type=WebhookContentTypeChoice.JSON.value,
        events="update:project",
        is_active=is_active,
    )


def _payload() -> dict:
    return {"event": "update:project", "project": {}, "sender": {}}


class TestSendWebhook(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.webhook = _make_webhook()

    @patch("cvat.apps.webhooks.tasks._perform_webhook_request")
    def test_raises_on_5xx(self, perform):
        perform.return_value = (HTTPStatus.INTERNAL_SERVER_ERROR, "")

        with self.assertRaises(WebhookDeliveryError):
            send_webhook(self.webhook.id, _payload())

    @patch("cvat.apps.webhooks.tasks._perform_webhook_request")
    def test_raises_on_502_bad_gateway(self, perform):
        perform.return_value = (HTTPStatus.BAD_GATEWAY, "")

        with self.assertRaises(WebhookDeliveryError):
            send_webhook(self.webhook.id, _payload())

    @patch("cvat.apps.webhooks.tasks._perform_webhook_request")
    def test_raises_on_408_request_timeout(self, perform):
        perform.return_value = (HTTPStatus.REQUEST_TIMEOUT, "")

        with self.assertRaises(WebhookDeliveryError):
            send_webhook(self.webhook.id, _payload())

    @patch("cvat.apps.webhooks.tasks._perform_webhook_request")
    def test_raises_on_429_too_many_requests(self, perform):
        perform.return_value = (HTTPStatus.TOO_MANY_REQUESTS, "")

        with self.assertRaises(WebhookDeliveryError):
            send_webhook(self.webhook.id, _payload())

    @patch("cvat.apps.webhooks.tasks._perform_webhook_request")
    def test_does_not_raise_on_2xx(self, perform):
        perform.return_value = (HTTPStatus.OK, '{"echo":true}')

        delivery = send_webhook(self.webhook.id, _payload())

        assert delivery is not None
        assert delivery.status_code == HTTPStatus.OK

    @patch("cvat.apps.webhooks.tasks._perform_webhook_request")
    def test_does_not_raise_on_4xx_other_than_408_429(self, perform):
        perform.return_value = (HTTPStatus.BAD_REQUEST, "")

        delivery = send_webhook(self.webhook.id, _payload())

        assert delivery is not None
        assert delivery.status_code == HTTPStatus.BAD_REQUEST

    @patch("cvat.apps.webhooks.tasks._perform_webhook_request")
    def test_5xx_records_delivery_before_raising(self, perform):
        perform.return_value = (HTTPStatus.INTERNAL_SERVER_ERROR, "boom")

        with self.assertRaises(WebhookDeliveryError):
            send_webhook(self.webhook.id, _payload())

        delivery = WebhookDelivery.objects.get(webhook=self.webhook)
        assert delivery.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
        assert delivery.redelivery is False
        assert delivery.event == "update:project"

    @patch("cvat.apps.webhooks.tasks._perform_webhook_request")
    def test_inactive_webhook_returns_none_without_request_or_delivery(self, perform):
        Webhook.objects.filter(pk=self.webhook.id).update(is_active=False)

        result = send_webhook(self.webhook.id, _payload())

        assert result is None
        perform.assert_not_called()
        assert not WebhookDelivery.objects.filter(webhook=self.webhook).exists()


class TestAddToQueue(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.webhook = _make_webhook()

    @override_settings(SEND_WEBHOOK_TASK_RETRIES=[1, 2, 3])
    @patch("cvat.apps.webhooks.dispatch.django_rq.get_queue")
    def test_passes_send_webhook_with_retry_intervals(self, get_queue):
        queue = MagicMock()
        get_queue.return_value = queue

        add_to_queue(self.webhook, _payload())

        queue.enqueue_call.assert_called_once()
        kwargs = queue.enqueue_call.call_args.kwargs

        assert kwargs["func"] is send_webhook
        assert kwargs["args"] == (self.webhook.id, _payload(), False)

        retry: Retry = kwargs["retry"]
        assert isinstance(retry, Retry)
        assert retry.max == 3
        assert retry.intervals == [1, 2, 3]

    @override_settings(SEND_WEBHOOK_TASK_RETRIES=[5, 300, 1800])
    @patch("cvat.apps.webhooks.dispatch.django_rq.get_queue")
    def test_redelivery_flag_propagates_to_send_webhook_args(self, get_queue):
        queue = MagicMock()
        get_queue.return_value = queue

        add_to_queue(self.webhook, _payload(), redelivery=True)

        kwargs = queue.enqueue_call.call_args.kwargs
        assert kwargs["args"] == (self.webhook.id, _payload(), True)
