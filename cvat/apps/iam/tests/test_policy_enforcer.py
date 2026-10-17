# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import unittest
from types import SimpleNamespace
from unittest import mock

from cvat.apps.iam.permissions import PolicyEnforcer


class TestPolicyEnforcerResolveDetailObject(unittest.TestCase):
    def test_returns_obj_when_already_expected_type(self):
        class Job:
            pass

        job = Job()
        view = SimpleNamespace(
            detail=True,
            iam_permission_class=SimpleNamespace(obj_model=Job),
            lookup_field="pk",
            lookup_url_kwarg=None,
            kwargs={"pk": 1},
        )

        self.assertIs(PolicyEnforcer._resolve_detail_object(view, job), job)

    def test_resolves_detail_object_when_serializer_instance_type_mismatches(self):
        # Regression helper for https://github.com/cvat-ai/cvat/issues/11182
        class Job:
            pass

        class Data:
            pass

        job = Job()
        data = Data()
        queryset = mock.Mock()
        queryset.get.return_value = job

        view = SimpleNamespace(
            detail=True,
            iam_permission_class=SimpleNamespace(obj_model=Job),
            lookup_field="pk",
            lookup_url_kwarg=None,
            kwargs={"pk": 7},
            get_queryset=mock.Mock(return_value=queryset),
            filter_queryset=mock.Mock(side_effect=lambda qs: qs),
        )

        resolved = PolicyEnforcer._resolve_detail_object(view, data)

        self.assertIs(resolved, job)
        view.filter_queryset.assert_called_once_with(queryset)
        queryset.get.assert_called_once_with(pk=7)

    def test_returns_obj_when_permission_class_has_no_obj_model(self):
        data = object()
        view = SimpleNamespace(
            detail=True,
            iam_permission_class=SimpleNamespace(),
            lookup_field="pk",
            lookup_url_kwarg=None,
            kwargs={"pk": 1},
        )

        self.assertIs(PolicyEnforcer._resolve_detail_object(view, data), data)
