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
    def _get_list_queryset(*, parent_report: QualityReport | None = None, **query_params):
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

    @classmethod
    def _get_parent_list_queryset(
        cls, *, parent_target: QualityReportTarget, target: QualityReportTarget | str | None
    ):
        parent_report = QualityReport(
            id=456,
            **{f"{parent_target.value}_id": 123},
        )
        query_params = {"parent_id": parent_report.id}
        if target is not None:
            query_params["target"] = target

        return cls._get_list_queryset(parent_report=parent_report, **query_params)

    def test_task_target_uses_direct_task_filter(self) -> None:
        queryset = self._get_list_queryset(
            task_id=123,
            target=QualityReportTarget.TASK,
        )

        sql, _ = queryset.query.sql_with_params()

        self.assertIn('"quality_control_qualityreport"."task_id" = %s', sql)
        self.assertNotIn('"engine_segment"."task_id" = %s', sql)
        self.assertNotIn('JOIN "engine_job"', sql)

    def test_invalid_task_report_target_is_rejected(self) -> None:
        for target in (None, "unknown"):
            with self.subTest(target=target), self.assertRaises(ValidationError):
                self._get_list_queryset(task_id=123, target=target)

    def test_project_target_uses_direct_project_filter(self) -> None:
        queryset = self._get_list_queryset(
            project_id=456,
            target=QualityReportTarget.PROJECT,
        )

        sql, _ = queryset.query.sql_with_params()

        self.assertIn('"quality_control_qualityreport"."project_id" = %s', sql)
        self.assertNotIn('JOIN "engine_project"', sql)

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
