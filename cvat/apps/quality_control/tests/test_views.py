# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import unittest
from types import SimpleNamespace
from unittest import mock

from rest_framework.exceptions import ValidationError

from cvat.apps.quality_control.models import QualityReport, QualityReportTarget
from cvat.apps.quality_control.permissions import QualityReportPermission
from cvat.apps.quality_control.views import QualityReportViewSet


class TestQualityReportViewSet(unittest.TestCase):
    @staticmethod
    def _get_parent_list_queryset(
        *, parent_target: QualityReportTarget, target: QualityReportTarget | str | None
    ):
        parent_report_kwargs = {
            f"{parent_target.value}_id": 123,
            "id": 456,
        }
        parent_report = QualityReport(**parent_report_kwargs)

        query_params = {"parent_id": parent_report.id}
        if target is not None:
            query_params["target"] = target

        view = QualityReportViewSet()
        view.action = "list"
        view.request = SimpleNamespace(query_params=query_params)
        view.check_object_permissions = mock.Mock()

        permission = mock.Mock()
        permission.filter.side_effect = lambda queryset: queryset

        with (
            mock.patch(
                "cvat.apps.quality_control.views.db_utils.get_or_404",
                return_value=parent_report,
            ),
            mock.patch("cvat.apps.quality_control.views.get_iam_context"),
            mock.patch.object(
                QualityReportPermission,
                "create_scope_list",
                return_value=permission,
            ),
        ):
            return view.get_queryset()

    def test_task_parent_job_target_uses_direct_parent_filter(self) -> None:
        queryset = self._get_parent_list_queryset(
            parent_target=QualityReportTarget.TASK,
            target=QualityReportTarget.JOB.value,
        )

        sql, _ = queryset.query.sql_with_params()

        self.assertNotIn(" OR ", sql)
        self.assertEqual(sql.count('JOIN "quality_control_qualityreport_parents"'), 1)

    def test_project_parent_task_target_uses_direct_parent_filter(self) -> None:
        queryset = self._get_parent_list_queryset(
            parent_target=QualityReportTarget.PROJECT,
            target=QualityReportTarget.TASK.value,
        )

        sql, _ = queryset.query.sql_with_params()

        self.assertNotIn(" OR ", sql)
        self.assertEqual(sql.count('JOIN "quality_control_qualityreport_parents"'), 1)

    def test_project_parent_job_target_uses_nested_parent_filter(self) -> None:
        queryset = self._get_parent_list_queryset(
            parent_target=QualityReportTarget.PROJECT,
            target=QualityReportTarget.JOB.value,
        )

        sql, _ = queryset.query.sql_with_params()

        self.assertNotIn(" OR ", sql)
        self.assertEqual(sql.count('JOIN "quality_control_qualityreport_parents"'), 2)

    def test_invalid_parent_target_combinations_are_rejected(self) -> None:
        invalid_combinations = {
            QualityReportTarget.JOB: (None, "unknown", "job", "task", "project"),
            QualityReportTarget.TASK: (None, "unknown", "task", "project"),
            QualityReportTarget.PROJECT: (None, "unknown", "project"),
        }

        for parent_target, targets in invalid_combinations.items():
            for target in targets:
                with self.subTest(parent_target=parent_target, target=target):
                    with self.assertRaises(ValidationError):
                        self._get_parent_list_queryset(
                            parent_target=parent_target,
                            target=target,
                        )
