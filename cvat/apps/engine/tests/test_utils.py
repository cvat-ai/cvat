# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from unittest.mock import MagicMock, patch

from django.contrib.auth.models import User
from django.test import TestCase

from cvat.apps.engine.models import (
    Project,
    RequestAction,
    RequestSubresource,
    RequestTarget,
)
from cvat.apps.engine.rq import ExportRequestId, ImportRequestId
from cvat.apps.engine.utils import (
    enqueue_send_webhooks_for_failed_request,
    enqueue_send_webhooks_for_successful_request,
)
from cvat.apps.webhooks.models import (
    Webhook,
    WebhookContentTypeChoice,
    WebhookTypeChoice,
)


class TestEnqueueSendWebhookJobsRegardingExportCreation(TestCase):
    @classmethod
    def setUpTestData(cls) -> None:
        cls.owner = User.objects.create(username="owner")
        cls.project = Project.objects.create(name="project", owner=cls.owner)
        cls.webhook = Webhook.objects.create(
            target_url="http://example.invalid/payload",
            owner=cls.owner,
            project=cls.project,
            type=WebhookTypeChoice.PROJECT.value,
            content_type=WebhookContentTypeChoice.JSON.value,
            events="create:export",
            is_active=True,
        )

    def _make_export_request_id(self, *, subresource: RequestSubresource) -> ExportRequestId:
        return ExportRequestId(
            action=RequestAction.EXPORT,
            target=RequestTarget.PROJECT,
            target_id=self.project.id,
            user_id=self.owner.id,
            subresource=subresource,
            format="Datumaro 1.0",
        )

    def _test_enqueue_send_webhook_jobs_regarding_export_request_completion_builds_payload(
        self,
        subresource: RequestSubresource,
        batch_add_to_queue: MagicMock,
    ) -> None:
        export_request_id = self._make_export_request_id(subresource=subresource)
        rq_job = MagicMock(id=export_request_id.render())

        enqueue_send_webhooks_for_successful_request(
            rq_job=rq_job,
            _connection=MagicMock(),
            _result=MagicMock(),
        )

        batch_add_to_queue.assert_called_once()
        kwargs = batch_add_to_queue.call_args.kwargs
        assert [webhook.id for webhook in kwargs["webhooks"]] == [self.webhook.id]
        assert kwargs["data"] == {
            "event": "create:export",
            "status": "completed",
            "target": "project",
            "target_id": self.project.id,
            "rq_id": export_request_id.render(),
            "message": "",
            "format": "Datumaro 1.0",
        }

    @patch("cvat.apps.webhooks.dispatch.batch_add_to_queue")
    def test_enqueue_send_webhook_jobs_regarding_dataset_export_completion_builds_payload(
        self, batch_add_to_queue: MagicMock
    ) -> None:
        self._test_enqueue_send_webhook_jobs_regarding_export_request_completion_builds_payload(
            subresource=RequestSubresource.DATASET,
            batch_add_to_queue=batch_add_to_queue,
        )

    @patch("cvat.apps.webhooks.dispatch.batch_add_to_queue")
    def test_enqueue_send_webhook_jobs_regarding_annotations_export_completion_builds_payload(
        self, batch_add_to_queue: MagicMock
    ) -> None:
        self._test_enqueue_send_webhook_jobs_regarding_export_request_completion_builds_payload(
            subresource=RequestSubresource.ANNOTATIONS,
            batch_add_to_queue=batch_add_to_queue,
        )


class TestEnqueueSendWebhookJobsRegardingBackupCreation(TestCase):
    @classmethod
    def setUpTestData(cls) -> None:
        cls.owner = User.objects.create(username="owner")
        cls.project = Project.objects.create(name="project", owner=cls.owner)
        cls.webhook = Webhook.objects.create(
            target_url="http://example.invalid/payload",
            owner=cls.owner,
            project=cls.project,
            type=WebhookTypeChoice.PROJECT.value,
            content_type=WebhookContentTypeChoice.JSON.value,
            events="create:backup",
            is_active=True,
        )

    def _make_backup_request_id(self) -> ExportRequestId:
        return ExportRequestId(
            action=RequestAction.EXPORT,
            target=RequestTarget.PROJECT,
            target_id=self.project.id,
            user_id=self.owner.id,
            subresource=RequestSubresource.BACKUP,
            lightweight=False,
        )

    @patch("cvat.apps.webhooks.dispatch.batch_add_to_queue")
    def test_enqueue_send_webhook_jobs_regarding_backup_completion_builds_payload(
        self, batch_add_to_queue: MagicMock
    ) -> None:
        export_request_id = self._make_backup_request_id()
        rq_job = MagicMock(id=export_request_id.render())

        enqueue_send_webhooks_for_successful_request(
            rq_job=rq_job,
            _connection=MagicMock(),
            _result=MagicMock(),
        )

        batch_add_to_queue.assert_called_once()
        kwargs = batch_add_to_queue.call_args.kwargs
        assert [webhook.id for webhook in kwargs["webhooks"]] == [self.webhook.id]
        assert kwargs["data"] == {
            "event": "create:backup",
            "status": "completed",
            "target": "project",
            "target_id": self.project.id,
            "lightweight": False,
            "rq_id": export_request_id.render(),
            "message": "",
        }


class TestRequestCompletionWebhookCallbacks(TestCase):
    @classmethod
    def setUpTestData(cls) -> None:
        cls.owner = User.objects.create(username="owner")
        cls.project = Project.objects.create(name="project", owner=cls.owner)

    @patch("cvat.apps.webhooks.dispatch.batch_add_to_queue")
    def test_unsupported_request_completion_does_not_enqueue_delivery_jobs(
        self, batch_add_to_queue: MagicMock
    ) -> None:
        import_request_id = ImportRequestId(
            action=RequestAction.IMPORT,
            target=RequestTarget.PROJECT,
            target_id=self.project.id,
            user_id=self.owner.id,
            subresource=RequestSubresource.DATASET,
            format="Datumaro 1.0",
        )
        rq_job = MagicMock(id=import_request_id.render())

        enqueue_send_webhooks_for_successful_request(
            rq_job=rq_job,
            _connection=MagicMock(),
            _result=MagicMock(),
        )

        batch_add_to_queue.assert_not_called()

    @patch("cvat.apps.engine.utils._enqueue_send_webhooks_for_request_completion")
    def test_failed_request_completion_with_retries_left_does_not_enqueue_delivery_jobs(
        self, enqueue_send_webhooks: MagicMock
    ) -> None:
        rq_job = MagicMock(id="request-id", retries_left=1)

        enqueue_send_webhooks_for_failed_request(
            rq_job=rq_job,
            _connection=MagicMock(),
            exc_type=RuntimeError,
            exc_value=RuntimeError("boom"),
            _exc_traceback=MagicMock(),
        )

        enqueue_send_webhooks.assert_not_called()

    @patch(
        "cvat.apps.engine.utils._enqueue_send_webhooks_for_request_completion",
        side_effect=RuntimeError("boom"),
    )
    def test_successful_request_completion_logs_and_swallows_enqueue_errors(
        self, enqueue_send_webhooks: MagicMock
    ) -> None:
        rq_job = MagicMock(id="request-id")

        with self.assertLogs("cvat.apps.engine.utils", level="ERROR") as logs:
            enqueue_send_webhooks_for_successful_request(
                rq_job=rq_job,
                _connection=MagicMock(),
                _result=MagicMock(),
            )

        enqueue_send_webhooks.assert_called_once_with(
            request_id="request-id",
            status="completed",
            message="",
        )
        assert (
            "Could not enqueue webhook deliveries for finished request request-id" in logs.output[0]
        )
