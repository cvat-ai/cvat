# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import MagicMock, patch

from rest_framework import status
from rest_framework.test import APIRequestFactory
from rq.job import JobStatus as RQJobStatus

from cvat.apps.engine.models import RequestAction, RequestSubresource
from cvat.apps.redis_handler.views import RequestViewSet


class TestRequestViewSetCancel(TestCase):
    def _make_started_job(
        self,
        *,
        action: RequestAction = RequestAction.EXPORT,
        subresource: RequestSubresource = RequestSubresource.DATASET,
        can_stop_started_jobs: bytes | None = b"1",
    ):
        connection = MagicMock()
        connection.hget.return_value = can_stop_started_jobs

        job = MagicMock()
        job.id = "test-request-id"
        job.origin = "export"
        job.worker_name = "test-worker"
        job.connection = connection
        job.parsed_id = SimpleNamespace(action=action, subresource=subresource)
        job.get_status.return_value = RQJobStatus.STARTED

        return job

    def _cancel(self, job):
        request = APIRequestFactory().post(f"/api/requests/{job.id}/cancel")
        view = RequestViewSet()

        queue = MagicMock()
        queue.connection = MagicMock()
        queue.serializer = MagicMock()

        with (
            patch.object(RequestViewSet, "_get_rq_job_by_id", return_value=job),
            patch.object(RequestViewSet, "check_object_permissions"),
            patch("cvat.apps.redis_handler.views.django_rq.get_queue", return_value=queue),
            patch("cvat.apps.redis_handler.views.send_stop_job_command") as send_stop_command,
        ):
            response = view.cancel(request, pk=job.id)

        return response, queue, send_stop_command

    def test_cancel_started_export_request_sends_stop_command(self):
        job = self._make_started_job()

        response, queue, send_stop_command = self._cancel(job)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        send_stop_command.assert_called_once_with(
            queue.connection,
            job.id,
            serializer=queue.serializer,
        )

    def test_cancel_started_non_export_request_returns_bad_request(self):
        job = self._make_started_job(action=RequestAction.IMPORT)

        response, _, send_stop_command = self._cancel(job)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        send_stop_command.assert_not_called()

    def test_cancel_started_export_request_from_simple_worker_returns_bad_request(self):
        job = self._make_started_job(can_stop_started_jobs=b"0")

        response, _, send_stop_command = self._cancel(job)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        send_stop_command.assert_not_called()
