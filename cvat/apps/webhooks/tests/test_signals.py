# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from unittest.mock import MagicMock, patch

from django.contrib.auth.models import User
from django.test import TestCase

from cvat.apps.engine.models import Project, Task
from cvat.apps.webhooks.models import (
    Webhook,
    WebhookContentTypeChoice,
    WebhookTypeChoice,
)


class TestDeleteResourceEvent(TestCase):
    @classmethod
    def setUpTestData(cls) -> None:
        cls.owner = User.objects.create_user(username="owner")
        cls.project = Project.objects.create(name="project", owner=cls.owner)

    def _make_task(self) -> Task:
        return Task.objects.create(name="task", project=self.project, owner=self.owner)

    def _make_project_webhook(self, event: str) -> Webhook:
        return Webhook.objects.create(
            target_url="http://example.invalid/payload",
            owner=self.owner,
            project=self.project,
            type=WebhookTypeChoice.PROJECT.value,
            content_type=WebhookContentTypeChoice.JSON.value,
            events=event,
        )

    @patch("cvat.apps.webhooks.signals.batch_add_to_queue")
    @patch("cvat.apps.webhooks.signals.get_serializer")
    def test_delete_without_matching_delete_webhooks_does_not_serialize_or_enqueue(
        self, get_serializer: MagicMock, batch_add_to_queue: MagicMock
    ) -> None:
        self._make_project_webhook("update:task")

        self._make_task().delete()

        get_serializer.assert_not_called()
        batch_add_to_queue.assert_not_called()

    @patch("cvat.apps.webhooks.signals.get_sender", return_value={})
    @patch("cvat.apps.webhooks.signals.batch_add_to_queue")
    @patch("cvat.apps.webhooks.signals.get_serializer")
    def test_delete_with_matching_webhook_serializes_and_enqueues_payload(
        self, get_serializer: MagicMock, batch_add_to_queue: MagicMock, _get_sender: MagicMock
    ) -> None:
        task = self._make_task()
        webhook = self._make_project_webhook("delete:task")
        serializer = MagicMock()
        serializer.data = {"id": task.id, "name": task.name}
        get_serializer.return_value = serializer

        with self.captureOnCommitCallbacks(execute=True):
            task.delete()

        get_serializer.assert_called_once()
        batch_add_to_queue.assert_called_once()
        assert batch_add_to_queue.call_args.kwargs == {
            "webhooks": [webhook],
            "data": {
                "event": "delete:task",
                "task": {"id": task.id, "name": task.name},
                "sender": {},
            },
        }
