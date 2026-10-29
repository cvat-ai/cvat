# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import asyncio
import json
from unittest.mock import patch

from asgiref.sync import async_to_sync
from asgiref.testing import ApplicationCommunicator
from django.test import SimpleTestCase, TestCase

from cvat.apps.test.annotation_events import schedule_annotation_counts_update
from cvat.apps.test.realtime import application


def _websocket_scope(*, origin="http://localhost:8080", path="/api/ws/tasks/7/annotation_counts"):
    return {
        "type": "websocket",
        "asgi": {"version": "3.0", "spec_version": "2.4"},
        "scheme": "ws",
        "path": path,
        "query_string": b"",
        "headers": [
            (b"host", b"localhost:8080"),
            (b"origin", origin.encode()),
        ],
    }


class FakePubSub:
    def __init__(self):
        self.messages = asyncio.Queue()

    async def subscribe(self, _channel):
        return None

    async def unsubscribe(self, _channel):
        return None

    async def get_message(self, *, ignore_subscribe_messages, timeout):
        try:
            return await asyncio.wait_for(self.messages.get(), timeout)
        except asyncio.TimeoutError:
            return None

    async def aclose(self):
        return None


class FakeRedis:
    def __init__(self, pubsub):
        self._pubsub = pubsub

    def pubsub(self):
        return self._pubsub

    async def aclose(self):
        return None


class AnnotationCountsWebSocketTests(SimpleTestCase):
    def test_rejects_cross_origin_connection(self):
        async_to_sync(self._assert_close_code)(
            _websocket_scope(origin="https://attacker.example"),
            4403,
        )

    def test_rejects_unknown_websocket_path(self):
        async_to_sync(self._assert_close_code)(
            _websocket_scope(path="/api/ws/unknown"), 4404
        )

    def test_rejects_unauthorized_task_connection(self):
        async_to_sync(self._assert_close_code)(
            _websocket_scope(),
            4401,
            authorize_close_code=4401,
        )

    def test_sends_annotation_change_events(self):
        async_to_sync(self._assert_annotation_event_is_sent)()

    async def _assert_close_code(self, scope, expected_code, *, authorize_close_code=None):
        communicator = ApplicationCommunicator(application, scope)
        with patch(
            "cvat.apps.test.realtime._authorize_task_socket",
            return_value=authorize_close_code,
        ):
            await communicator.send_input({"type": "websocket.connect"})
            output = await communicator.receive_output(timeout=5)
            self.assertEqual(output, {"type": "websocket.close", "code": expected_code})
            await communicator.wait(timeout=5)

    async def _assert_annotation_event_is_sent(self):
        scope = _websocket_scope()
        communicator = ApplicationCommunicator(application, scope)
        pubsub = FakePubSub()
        redis_client = FakeRedis(pubsub)
        with (
            patch("cvat.apps.test.realtime._authorize_task_socket", return_value=None),
            patch("cvat.apps.test.realtime.Redis", return_value=redis_client),
        ):
            await communicator.send_input({"type": "websocket.connect"})
            self.assertEqual(
                await communicator.receive_output(timeout=5),
                {"type": "websocket.accept"},
            )
            event = {"type": "message", "data": json.dumps({"type": "annotations_changed"})}
            await pubsub.messages.put(event)
            self.assertEqual(
                await communicator.receive_output(timeout=5),
                {"type": "websocket.send", "text": event["data"]},
            )
            await communicator.send_input({"type": "websocket.disconnect", "code": 1000})
            await communicator.wait(timeout=5)


class AnnotationCountUpdateSchedulingTests(TestCase):
    def test_publishes_only_after_annotation_transaction_commits(self):
        with (
            patch("cvat.apps.test.annotation_events.publish_annotation_change") as publish,
            self.captureOnCommitCallbacks(execute=True),
        ):
            schedule_annotation_counts_update(7)
            publish.assert_not_called()

        publish.assert_called_once_with(7)
