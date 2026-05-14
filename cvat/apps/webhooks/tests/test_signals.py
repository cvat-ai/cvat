# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from http import HTTPStatus
from unittest.mock import MagicMock, patch

from django.contrib.auth.models import User
from django.test import TestCase

from cvat.apps.engine.models import Project
from cvat.apps.webhooks.exceptions import WebhookDeliveryError
from cvat.apps.webhooks.models import (
    Webhook,
    WebhookContentTypeChoice,
    WebhookDelivery,
    WebhookTypeChoice,
)
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
    def setUpTestData(cls) -> None:
        cls.webhook = _make_webhook()

    @patch("cvat.apps.webhooks.tasks._perform_webhook_request")
    def test_raises_on_5xx(self, perform: MagicMock) -> None:
        perform.return_value = (HTTPStatus.INTERNAL_SERVER_ERROR, "")

        with self.assertRaises(WebhookDeliveryError):
            send_webhook(self.webhook.id, _payload())

    @patch("cvat.apps.webhooks.tasks._perform_webhook_request")
    def test_raises_on_502_bad_gateway(self, perform: MagicMock) -> None:
        perform.return_value = (HTTPStatus.BAD_GATEWAY, "")

        with self.assertRaises(WebhookDeliveryError):
            send_webhook(self.webhook.id, _payload())

    @patch("cvat.apps.webhooks.tasks._perform_webhook_request")
    def test_raises_on_408_request_timeout(self, perform: MagicMock) -> None:
        perform.return_value = (HTTPStatus.REQUEST_TIMEOUT, "")

        with self.assertRaises(WebhookDeliveryError):
            send_webhook(self.webhook.id, _payload())

    @patch("cvat.apps.webhooks.tasks._perform_webhook_request")
    def test_raises_on_429_too_many_requests(self, perform: MagicMock) -> None:
        perform.return_value = (HTTPStatus.TOO_MANY_REQUESTS, "")

        with self.assertRaises(WebhookDeliveryError):
            send_webhook(self.webhook.id, _payload())

    @patch("cvat.apps.webhooks.tasks._perform_webhook_request")
    def test_does_not_raise_on_2xx(self, perform: MagicMock) -> None:
        perform.return_value = (HTTPStatus.OK, '{"echo":true}')

        delivery = send_webhook(self.webhook.id, _payload())

        assert delivery is not None
        assert delivery.status_code == HTTPStatus.OK

    @patch("cvat.apps.webhooks.tasks._perform_webhook_request")
    def test_does_not_raise_on_4xx_other_than_408_429(self, perform: MagicMock) -> None:
        perform.return_value = (HTTPStatus.BAD_REQUEST, "")

        delivery = send_webhook(self.webhook.id, _payload())

        assert delivery is not None
        assert delivery.status_code == HTTPStatus.BAD_REQUEST

    @patch("cvat.apps.webhooks.tasks._perform_webhook_request")
    def test_5xx_records_delivery_before_raising(self, perform: MagicMock) -> None:
        perform.return_value = (HTTPStatus.INTERNAL_SERVER_ERROR, "boom")

        with self.assertRaises(WebhookDeliveryError):
            send_webhook(self.webhook.id, _payload())

        delivery = WebhookDelivery.objects.get(webhook=self.webhook)
        assert delivery.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
        assert delivery.redelivery is False
        assert delivery.event == "update:project"

    @patch("cvat.apps.webhooks.tasks._perform_webhook_request")
    def test_inactive_webhook_returns_none_without_request_or_delivery(
        self, perform: MagicMock
    ) -> None:
        Webhook.objects.filter(pk=self.webhook.id).update(is_active=False)

        result = send_webhook(self.webhook.id, _payload())

        assert result is None
        perform.assert_not_called()
        assert not WebhookDelivery.objects.filter(webhook=self.webhook).exists()
