# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from http import HTTPStatus
from unittest.mock import MagicMock, patch

from django.conf import settings
from django.test import TestCase

from cvat.apps.webhooks.exceptions import WebhookDeliveryError
from cvat.apps.webhooks.models import (
    Webhook,
    WebhookDelivery,
)
from cvat.apps.webhooks.tasks import send_webhook

from .utils import make_webhook, payload


class TestSendWebhook(TestCase):
    @classmethod
    def setUpTestData(cls) -> None:
        cls.webhook = make_webhook()

    def setUp(self) -> None:
        job = MagicMock()
        job.retry_intervals = list(settings.SEND_WEBHOOK_TASK_RETRIES)
        job.retries_left = len(settings.SEND_WEBHOOK_TASK_RETRIES)
        patcher = patch("cvat.apps.redis_handler.utils.rq.get_current_job", return_value=job)
        patcher.start()
        self.addCleanup(patcher.stop)

    @patch("cvat.apps.webhooks.utils.perform_webhook_request")
    def test_raises_on_5xx(self, perform: MagicMock) -> None:
        perform.return_value = (HTTPStatus.INTERNAL_SERVER_ERROR, "")

        with self.assertRaises(WebhookDeliveryError):
            send_webhook(webhook_id=self.webhook.id, payload=payload())

    @patch("cvat.apps.webhooks.utils.perform_webhook_request")
    def test_raises_on_502_bad_gateway(self, perform: MagicMock) -> None:
        perform.return_value = (HTTPStatus.BAD_GATEWAY, "")

        with self.assertRaises(WebhookDeliveryError):
            send_webhook(webhook_id=self.webhook.id, payload=payload())

    @patch("cvat.apps.webhooks.utils.perform_webhook_request")
    def test_raises_on_408_request_timeout(self, perform: MagicMock) -> None:
        perform.return_value = (HTTPStatus.REQUEST_TIMEOUT, "")

        with self.assertRaises(WebhookDeliveryError):
            send_webhook(webhook_id=self.webhook.id, payload=payload())

    @patch("cvat.apps.webhooks.utils.perform_webhook_request")
    def test_raises_on_429_too_many_requests(self, perform: MagicMock) -> None:
        perform.return_value = (HTTPStatus.TOO_MANY_REQUESTS, "")

        with self.assertRaises(WebhookDeliveryError):
            send_webhook(webhook_id=self.webhook.id, payload=payload())

    @patch("cvat.apps.webhooks.utils.perform_webhook_request")
    def test_does_not_raise_on_2xx(self, perform: MagicMock) -> None:
        perform.return_value = (HTTPStatus.OK, '{"echo":true}')

        delivery = send_webhook(webhook_id=self.webhook.id, payload=payload())

        assert delivery is not None
        assert delivery.status_code == HTTPStatus.OK
        assert delivery.attempt == 1
        assert delivery.request_duration >= 0

    @patch("cvat.apps.webhooks.utils.perform_webhook_request")
    def test_does_not_raise_on_4xx_other_than_408_429(self, perform: MagicMock) -> None:
        perform.return_value = (HTTPStatus.BAD_REQUEST, "")

        delivery = send_webhook(webhook_id=self.webhook.id, payload=payload())

        assert delivery is not None
        assert delivery.status_code == HTTPStatus.BAD_REQUEST

    @patch("cvat.apps.webhooks.utils.perform_webhook_request")
    def test_5xx_records_failed_delivery_before_raising(self, perform: MagicMock) -> None:
        perform.return_value = (HTTPStatus.INTERNAL_SERVER_ERROR, "boom")

        with self.assertRaises(WebhookDeliveryError):
            send_webhook(webhook_id=self.webhook.id, payload=payload())

        delivery = WebhookDelivery.objects.get(webhook=self.webhook)
        assert delivery.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
        assert delivery.redelivery is False
        assert delivery.event == "update:project"
        assert delivery.attempt == 1
        assert delivery.request_duration >= 0

    @patch("cvat.apps.webhooks.utils.perform_webhook_request")
    def test_inactive_webhook_returns_none_without_request_or_delivery(
        self, perform: MagicMock
    ) -> None:
        Webhook.objects.filter(pk=self.webhook.id).update(is_active=False)

        result = send_webhook(webhook_id=self.webhook.id, payload=payload())

        assert result is None
        perform.assert_not_called()
        assert not WebhookDelivery.objects.filter(webhook=self.webhook).exists()
