# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import unittest
from types import SimpleNamespace
from unittest import mock

from cvat.apps.quality_control.models import QualityReportTarget
from cvat.apps.quality_control.permissions import QualityReportPermission
from cvat.apps.quality_control.views import QualityReportViewSet


class TestQualityReportViewSet(unittest.TestCase):
    @staticmethod
    def _get_list_queryset(**query_params):
        view = QualityReportViewSet()
        view.action = "list"
        view.request = SimpleNamespace(query_params=query_params)
        view.check_object_permissions = mock.Mock()

        permission = mock.Mock()
        permission.filter.side_effect = lambda queryset: queryset

        with (
            mock.patch("cvat.apps.quality_control.views.db_utils.get_or_404"),
            mock.patch("cvat.apps.quality_control.views.get_iam_context"),
            mock.patch.object(
                QualityReportPermission,
                "create_scope_list",
                return_value=permission,
            ),
        ):
            return view.get_queryset()

    def test_task_target_uses_direct_task_filter(self) -> None:
        queryset = self._get_list_queryset(
            task_id=123,
            target=QualityReportTarget.TASK,
        )

        sql, _ = queryset.query.sql_with_params()

        self.assertIn('"quality_control_qualityreport"."task_id" = %s', sql)
        self.assertNotIn('"engine_segment"."task_id" = %s', sql)
        self.assertNotIn('JOIN "engine_job"', sql)

    def test_task_filter_without_target_includes_job_reports(self) -> None:
        queryset = self._get_list_queryset(task_id=123)

        sql, _ = queryset.query.sql_with_params()

        self.assertIn('"engine_segment"."task_id" = %s', sql)
        self.assertIn('"quality_control_qualityreport"."task_id" = %s', sql)
        self.assertIn('JOIN "engine_job"', sql)

    def test_project_target_uses_direct_project_filter(self) -> None:
        queryset = self._get_list_queryset(
            project_id=456,
            target=QualityReportTarget.PROJECT,
        )

        sql, _ = queryset.query.sql_with_params()

        self.assertIn('"quality_control_qualityreport"."project_id" = %s', sql)
        self.assertNotIn('JOIN "engine_project"', sql)

