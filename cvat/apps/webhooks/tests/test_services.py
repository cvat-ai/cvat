# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from http import HTTPStatus
from unittest.mock import MagicMock, patch

from django.test import TestCase

from cvat.apps.webhooks.models import WebhookDelivery
from cvat.apps.webhooks.services import send_webhook

from .utils import make_webhook, payload


class TestSendWebhook(TestCase):
    @classmethod
    def setUpTestData(cls) -> None:
        cls.webhook = make_webhook()

    @patch("cvat.apps.webhooks.utils.perform_webhook_request")
    def test_creates_delivery_with_request_result(self, perform: MagicMock) -> None:
        perform.return_value = (HTTPStatus.INTERNAL_SERVER_ERROR, "consumer failed")

        delivery = send_webhook(webhook=self.webhook, payload=payload(), attempt=2, redelivery=True)

        assert delivery.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
        assert delivery.response == "consumer failed"
        assert delivery.redelivery is True
        assert delivery.event == "update:project"
        assert delivery.attempt == 2
        assert delivery.request_duration >= 0
        assert WebhookDelivery.objects.get() == delivery
