# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from unittest.mock import MagicMock, patch

from django.test import TestCase, override_settings
from rq import Retry

from cvat.apps.webhooks.dispatch import add_to_queue
from cvat.apps.webhooks.tasks import send_webhook

from .utils import make_webhook, payload


class TestAddToQueue(TestCase):
    @classmethod
    def setUpTestData(cls) -> None:
        cls.webhook = make_webhook()

    @override_settings(SEND_WEBHOOK_TASK_RETRIES=[1, 2, 3])
    @patch("cvat.apps.webhooks.dispatch.django_rq.get_queue")
    def test_passes_send_webhook_with_retry_intervals(self, get_queue: MagicMock) -> None:
        queue = MagicMock()
        get_queue.return_value = queue

        add_to_queue(webhook=self.webhook, payload=payload())

        queue.enqueue_call.assert_called_once()
        kwargs = queue.enqueue_call.call_args.kwargs

        assert kwargs["func"] is send_webhook
        assert kwargs["args"] == (self.webhook.id, payload(), False)

        retry: Retry = kwargs["retry"]
        assert isinstance(retry, Retry)
        assert retry.max == 3
        assert retry.intervals == [1, 2, 3]

    @override_settings(SEND_WEBHOOK_TASK_RETRIES=[5, 300, 1800])
    @patch("cvat.apps.webhooks.dispatch.django_rq.get_queue")
    def test_redelivery_flag_propagates_to_send_webhook_args(self, get_queue: MagicMock) -> None:
        queue = MagicMock()
        get_queue.return_value = queue

        add_to_queue(webhook=self.webhook, payload=payload(), redelivery=True)

        kwargs = queue.enqueue_call.call_args.kwargs
        assert kwargs["args"] == (self.webhook.id, payload(), True)
