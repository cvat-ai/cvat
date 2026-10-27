# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import logging
from types import SimpleNamespace
from unittest.mock import Mock, patch

from asgiref.sync import async_to_sync
from django.db import DatabaseError
from django.http import Http404, HttpResponse, QueryDict
from django.template.response import SimpleTemplateResponse
from django.test import AsyncClient, RequestFactory, SimpleTestCase, override_settings
from django.urls import NoReverseMatch, path
from django.utils.deprecation import MiddlewareMixin
from django.utils.functional import SimpleLazyObject
from psycopg2.errors import LockNotAvailable
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import (
    APIException,
    NotAuthenticated,
    NotFound,
    PermissionDenied,
    ValidationError,
)
from rest_framework.permissions import AllowAny
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from cvat.apps.access_tokens.models import AccessToken
from cvat.apps.dataset_manager.util import LockNotAvailableError
from cvat.apps.events import handlers
from cvat.apps.events.event import record_server_event


class ExceptionMetadataMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.uuid = "exception-test-request"
        request.iam_context = {"organization": SimpleNamespace(id=31, slug="test-org")}
        if request.GET.get("broken_user"):
            request.user = SimpleLazyObject(Mock(side_effect=DatabaseError("user unavailable")))
        return self.get_response(request)


class FailingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path == "/exceptions/middleware-request":
            raise RuntimeError("middleware request failed")
        response = self.get_response(request)
        if request.path == "/exceptions/middleware-response":
            raise RuntimeError("middleware response failed")
        return response


class RecoveringMiddleware(MiddlewareMixin):
    def process_exception(self, request, exception):
        if request.path == "/exceptions/recovered":
            return HttpResponse(status=int(request.GET.get("status", 200)))


class TestAuthentication(BaseAuthentication):
    def authenticate(self, request):
        token = AccessToken(id=71) if request.query_params.get("access_token") else None
        return SimpleNamespace(id=17, username="test-user", email="user@example.com"), token


class ExceptionViewSet(ViewSet):
    authentication_classes = [TestAuthentication]
    permission_classes = [AllowAny]
    renderer_classes = [JSONRenderer]
    throttle_classes = []

    def list(self, request, kind="ok"):
        exceptions = {
            "validation": ValidationError("invalid data"),
            "permission": PermissionDenied("not allowed"),
            "not-found": NotFound("missing resource"),
            "not-authenticated": NotAuthenticated(),
            "api-error": APIException("handled server error"),
            "unhandled": RuntimeError("unhandled API error"),
            "lock": LockNotAvailableError("lock unavailable"),
        }
        if kind == "database-lock":
            raise DatabaseError("lock timed out") from LockNotAvailable("lock unavailable")
        if kind in exceptions:
            raise exceptions[kind]
        return Response({"ok": True})


class InitializationFailureViewSet(ExceptionViewSet):
    def initialize_request(self, request, *args, **kwargs):
        raise RuntimeError("request initialization failed")


class FinalizationFailureViewSet(ExceptionViewSet):
    def finalize_response(self, *args, **kwargs):
        raise RuntimeError("response finalization failed")


class PropagationFailureViewSet(ExceptionViewSet):
    def raise_uncaught_exception(self, exc):
        raise RuntimeError("exception propagation failed") from exc


class FailingTemplateResponse(SimpleTemplateResponse):
    def render(self):
        raise RuntimeError("template rendering failed")


def django_failure(request):
    raise NoReverseMatch("missing view name")


async def async_django_failure(request):
    raise RuntimeError("async view failed")


def django_not_found(request):
    raise Http404("missing page")


urlpatterns = [
    path(
        "exceptions/drf/<str:kind>",
        ExceptionViewSet.as_view({"get": "list"}, basename="exception"),
    ),
    path("exceptions/initialize", InitializationFailureViewSet.as_view({"get": "list"})),
    path("exceptions/finalize", FinalizationFailureViewSet.as_view({"get": "list"})),
    path(
        "exceptions/second-failure",
        FinalizationFailureViewSet.as_view({"get": "list"}),
        {"kind": "validation"},
    ),
    path(
        "exceptions/propagation-failure",
        PropagationFailureViewSet.as_view({"get": "list"}, basename="exception"),
        {"kind": "unhandled"},
    ),
    path(
        "exceptions/recovered",
        ExceptionViewSet.as_view({"get": "list"}, basename="exception"),
        {"kind": "unhandled"},
    ),
    path("exceptions/django", django_failure),
    path("exceptions/async-django", async_django_failure),
    path("exceptions/render", lambda request: FailingTemplateResponse(template=None)),
    path("exceptions/middleware-request", lambda request: HttpResponse()),
    path("exceptions/middleware-response", lambda request: HttpResponse()),
    path("exceptions/not-found", django_not_found),
    path("exceptions/plain-500", lambda request: HttpResponse(status=500)),
]


@override_settings(
    DEBUG=False,
    ROOT_URLCONF=__name__,
    MIDDLEWARE=[
        f"{__name__}.FailingMiddleware",
        f"{__name__}.ExceptionMetadataMiddleware",
        f"{__name__}.RecoveringMiddleware",
    ],
    REST_FRAMEWORK={"EXCEPTION_HANDLER": "cvat.apps.events.handlers.handle_viewset_exception"},
)
class TestRequestExceptions(SimpleTestCase):
    def setUp(self):
        super().setUp()
        self.client.raise_request_exception = False
        self.async_client.raise_request_exception = False
        record_patch = patch.object(handlers, "record_server_event")
        self.record = record_patch.start()
        self.addCleanup(record_patch.stop)

    def _get(self, client, url):
        self.record.reset_mock()
        kwargs = {"headers": {"User-Agent": "exception-test", "Content-Type": "application/json"}}
        if isinstance(client, AsyncClient):
            return async_to_sync(client.get)(url, **kwargs)
        return client.get(url, **kwargs)

    def test_django_and_middleware_exceptions(self):
        cases = [
            ("django", "NoReverseMatch: missing view name"),
            ("async-django", "RuntimeError: async view failed"),
            ("middleware-request", "RuntimeError: middleware request failed"),
            ("middleware-response", "RuntimeError: middleware response failed"),
            ("render", "RuntimeError: template rendering failed"),
            ("initialize", "RuntimeError: request initialization failed"),
            ("finalize", "RuntimeError: response finalization failed"),
        ]
        for client in (self.client, self.async_client):
            for route, message in cases:
                with self.subTest(client=type(client).__name__, route=route):
                    response = self._get(client, f"/exceptions/{route}")
                    self.assertEqual(response.status_code, 500)
                    self.record.assert_called_once()
                    event = self.record.call_args.kwargs
                    self.assertEqual(event["scope"], "send:exception")
                    self.assertEqual(event["count"], 1)
                    self.assertEqual(event["payload"]["status_code"], 500)
                    self.assertTrue(event["payload"]["message"].endswith(message))
                    self.assertIn(message, event["payload"]["stack"])
                    self.assertEqual(event["payload"]["request"]["url"], f"/exceptions/{route}")
                    if route == "middleware-request":
                        self.assertIsNone(event["request_info"]["id"])
                        self.assertIsNone(event["user_id"])
                        self.assertIsNone(event["org_id"])
                    else:
                        self.assertEqual(event["request_info"]["id"], "exception-test-request")

    def test_drf_exception_payload_is_preserved(self):
        cases = [
            ("validation", 400, "ValidationError"),
            ("permission", 403, "PermissionDenied"),
            ("not-found", 404, "NotFound"),
            ("api-error", 500, "APIException"),
            ("unhandled", 500, "RuntimeError"),
            ("lock", 409, "LockNotAvailableError"),
        ]
        for client in (self.client, self.async_client):
            for kind, status_code, exception_name in cases:
                with self.subTest(client=type(client).__name__, kind=kind):
                    response = self._get(client, f"/exceptions/drf/{kind}?org=test-org")
                    self.assertEqual(response.status_code, status_code)
                    self.record.assert_called_once()
                    event = self.record.call_args.kwargs
                    self.assertEqual(event["scope"], "send:exception")
                    self.assertEqual(event["count"], 1)
                    self.assertEqual(event["user_id"], 17)
                    self.assertEqual(event["user_name"], "test-user")
                    self.assertEqual(event["user_email"], "user@example.com")
                    self.assertEqual(event["org_id"], 31)
                    self.assertEqual(event["org_slug"], "test-org")
                    self.assertEqual(
                        event["request_info"],
                        {
                            "id": "exception-test-request",
                            "user_agent": "exception-test",
                            "remote_addr": "127.0.0.1",
                        },
                    )
                    payload = event["payload"]
                    self.assertEqual(payload["basename"], "exception")
                    self.assertEqual(payload["action"], "list")
                    self.assertEqual(payload["status_code"], status_code)
                    self.assertIn(exception_name, payload["message"])
                    self.assertIn(exception_name, payload["stack"])
                    self.assertNotIn("raise_uncaught_exception", payload["stack"])
                    self.assertNotIn("django/core/handlers/", payload["stack"])
                    self.assertEqual(
                        payload["request"],
                        {
                            "url": f"/exceptions/drf/{kind}?org=test-org",
                            "query_params": QueryDict("org=test-org"),
                            "content_type": "application/json",
                            "method": "GET",
                        },
                    )

    def test_database_lock_error_is_still_a_conflict(self):
        for client in (self.client, self.async_client):
            with self.subTest(client=type(client).__name__):
                response = self._get(client, "/exceptions/drf/database-lock")
                self.assertEqual(response.status_code, 409)
                self.record.assert_called_once()
                event = self.record.call_args.kwargs
                self.assertEqual(event["payload"]["status_code"], 409)
                self.assertIn("DatabaseError: lock timed out", event["payload"]["message"])

    def test_access_token_id_is_preserved(self):
        for client in (self.client, self.async_client):
            with self.subTest(client=type(client).__name__):
                response = self._get(client, "/exceptions/drf/permission?access_token=1")
                self.assertEqual(response.status_code, 403)
                self.record.assert_called_once()
                self.assertEqual(
                    self.record.call_args.kwargs["request_info"]["access_token_id"], 71
                )

    def test_event_is_serialized_for_vector(self):
        self.record.side_effect = record_server_event
        for client in (self.client, self.async_client):
            with self.subTest(client=type(client).__name__):
                with patch("cvat.apps.events.event.vlogger.info") as write:
                    response = self._get(client, "/exceptions/drf/validation")
                self.assertEqual(response.status_code, 400)
                write.assert_called_once()
                event = json.loads(write.call_args.args[0])
                self.assertEqual(event["scope"], "send:exception")
                self.assertEqual(event["source"], "server")
                self.assertEqual(event["count"], 1)
                payload = json.loads(event["payload"])
                self.assertEqual(payload["status_code"], 400)
                self.assertEqual(payload["request"]["id"], "exception-test-request")
                self.assertIn("ValidationError", payload["message"])

    def test_ignored_responses_do_not_create_exception_events(self):
        cases = [
            ("drf/ok", 200),
            ("drf/not-authenticated", 403),
            ("not-found", 404),
            ("plain-500", 500),
        ]
        for client in (self.client, self.async_client):
            for route, status_code in cases:
                with self.subTest(client=type(client).__name__, route=route):
                    response = self._get(client, f"/exceptions/{route}")
                    self.assertEqual(response.status_code, status_code)
                    self.record.assert_not_called()

    def test_different_exceptions_in_one_request_are_both_recorded(self):
        cases = [
            (
                "second-failure",
                [400, 500],
                ["ValidationError", "RuntimeError: response finalization failed"],
            ),
            (
                "propagation-failure",
                [500, 500],
                ["RuntimeError: unhandled API error", "RuntimeError: exception propagation failed"],
            ),
        ]
        for client in (self.client, self.async_client):
            for route, status_codes, messages in cases:
                with self.subTest(client=type(client).__name__, route=route):
                    response = self._get(client, f"/exceptions/{route}")
                    self.assertEqual(response.status_code, 500)
                    self.assertEqual(self.record.call_count, 2)
                    events = [call.kwargs["payload"] for call in self.record.call_args_list]
                    self.assertEqual([event["status_code"] for event in events], status_codes)
                    for event, message in zip(events, messages):
                        self.assertIn(message, event["message"])

    def test_drf_exception_is_preserved_when_middleware_recovers(self):
        for client in (self.client, self.async_client):
            for status_code in (200, 302, 403):
                with self.subTest(client=type(client).__name__, status_code=status_code):
                    response = self._get(client, f"/exceptions/recovered?status={status_code}")
                    self.assertEqual(response.status_code, status_code)
                    self.record.assert_called_once()
                    event = self.record.call_args.kwargs
                    self.assertEqual(event["user_id"], 17)
                    self.assertEqual(event["org_id"], 31)
                    self.assertEqual(event["payload"]["basename"], "exception")
                    self.assertEqual(event["payload"]["action"], "list")
                    self.assertEqual(event["payload"]["status_code"], 500)
                    self.assertIn("RuntimeError: unhandled API error", event["payload"]["message"])

    def test_unavailable_user_does_not_hide_the_original_exception(self):
        for client in (self.client, self.async_client):
            with self.subTest(client=type(client).__name__):
                response = self._get(client, "/exceptions/django?broken_user=1")
                self.assertEqual(response.status_code, 500)
                self.record.assert_called_once()
                event = self.record.call_args.kwargs
                self.assertIsNone(event["user_id"])
                self.assertIn("NoReverseMatch", event["payload"]["message"])

    def test_same_exception_is_recorded_for_each_request(self):
        exc = RuntimeError("same exception instance")
        for _ in range(2):
            request = RequestFactory().get("/exceptions/django")
            handlers.record_request_exception(exc, request=request)
        self.assertEqual(self.record.call_count, 2)

    def test_events_are_recorded_when_request_logging_is_disabled(self):
        logger = logging.getLogger("django.request")
        self.addCleanup(setattr, logger, "disabled", logger.disabled)
        logger.disabled = True
        for client in (self.client, self.async_client):
            for route, status_code in (
                ("drf/validation", 400),
                ("drf/unhandled", 500),
                ("django", 500),
            ):
                with self.subTest(client=type(client).__name__, route=route):
                    response = self._get(client, f"/exceptions/{route}")
                    self.assertEqual(response.status_code, status_code)
                    self.record.assert_called_once()

    def test_event_recording_failure_does_not_change_the_response(self):
        self.record.side_effect = RuntimeError("event backend unavailable")
        for client in (self.client, self.async_client):
            for route, status_code in (("drf/validation", 400), ("django", 500)):
                with self.subTest(client=type(client).__name__, route=route):
                    with self.assertLogs("cvat.apps.events.handlers", level="ERROR"):
                        response = self._get(client, f"/exceptions/{route}")
                    self.assertEqual(response.status_code, status_code)
                    self.record.assert_called_once()
                    if status_code == 500:
                        self.assertIsInstance(response.exc_info[1], NoReverseMatch)
