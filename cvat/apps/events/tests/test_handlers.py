# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.utils.functional import SimpleLazyObject
from rest_framework import serializers
from rest_framework.exceptions import NotFound, PermissionDenied

from cvat.apps.engine.serializers import JobReadSerializer
from cvat.apps.events import handlers


class TestHandleViewsetException(unittest.TestCase):
    def test_organization_context(self):
        org = SimpleNamespace(id=35127, slug="chaindetection")
        invalid_context = SimpleLazyObject(
            Mock(side_effect=NotFound("Organization does not exist"))
        )
        cases = [
            ("organization", {"organization": org}, 35127, "chaindetection"),
            ("personal workspace", {"organization": None}, None, None),
            ("invalid organization", invalid_context, None, None),
        ]

        for name, iam_context, expected_org_id, expected_org_slug in cases:
            with self.subTest(name=name):
                request = SimpleNamespace(
                    iam_context=iam_context,
                    user=SimpleNamespace(id=1, username="user", email="user@example.com"),
                    get_full_path=lambda: "/api/jobs/4592943/annotations",
                    query_params={},
                    content_type="application/json",
                    method="PATCH",
                )
                with (
                    patch.object(handlers, "record_server_event") as record,
                    patch.object(handlers, "request_info", return_value={}),
                ):
                    response = handlers.handle_viewset_exception(
                        PermissionDenied("Not enough permissions"),
                        {"request": request, "view": SimpleNamespace()},
                    )

                self.assertEqual(response.status_code, 403)
                record.assert_called_once()
                self.assertEqual(record.call_args.kwargs["org_id"], expected_org_id)
                self.assertEqual(record.call_args.kwargs["org_slug"], expected_org_slug)


class TestGetCleanedUpSerializer(unittest.TestCase):
    def setUp(self):
        super().setUp()

        class DummySerializer(serializers.Serializer):
            url = serializers.CharField(default="111")
            foo = serializers.CharField(default="222")
            bar = serializers.CharField(default="333")

        self.serializer_class = DummySerializer

        self._patch = patch.object(handlers, "SERIALIZERS", [(dict, DummySerializer)])
        self._patch.start()

    def tearDown(self):
        self._patch.stop()
        super().tearDown()

    def test_always_removes_url_field(self):
        assert "url" in self.serializer_class({}).data
        serializer = handlers.get_cleaned_up_serializer({})
        assert "url" not in serializer.data, serializer.data

    def test_removes_specified_fields(self):
        for fields_to_clean in [[], ["foo"], ["bar"], ["foo", "bar"]]:
            with self.subTest(fields_to_clean=fields_to_clean):
                with patch.object(
                    handlers,
                    "SERIALIZER_CLEAN_UP_FIELDS",
                    [(self.serializer_class, fields_to_clean)],
                ):
                    serializer = handlers.get_cleaned_up_serializer({})
                    for field in ["foo", "bar"]:
                        assert (field not in serializer.data) == (field in fields_to_clean)


class TestCleanUp(unittest.TestCase):
    def test_summary_fields_are_to_be_cleaned_up(self):
        for _, serializer_class in handlers.SERIALIZERS:
            with self.subTest(serializer_class=serializer_class):
                serializer: JobReadSerializer = serializer_class()

                summary_fields = [
                    field_name
                    for field_name in serializer.fields.keys()
                    if "summary" in str(type(serializer.fields[field_name])).lower()
                ]

                if summary_fields:
                    fields_to_skip = dict(handlers.SERIALIZER_CLEAN_UP_FIELDS).get(
                        serializer_class, []
                    )
                    for summary_field in summary_fields:
                        assert summary_field in fields_to_skip, (
                            f"Summary field '{summary_field}' in serializer '{serializer_class.__name__}' "
                            f"should be included in SERIALIZER_CLEAN_UP_FIELDS to be cleaned up."
                        )
