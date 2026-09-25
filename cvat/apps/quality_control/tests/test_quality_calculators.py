# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import unittest
from contextlib import ExitStack, nullcontext
from types import SimpleNamespace
from unittest import mock

from cvat.apps.quality_control import quality_calculators
from cvat.apps.quality_control.data_providers import JobDataProvider


class TestTaskQualityCalculatorCleanup(unittest.TestCase):
    def setUp(self):
        patches = ExitStack()
        self.addCleanup(patches.close)
        self.task = SimpleNamespace(
            id=1, updated_date=None, assignee_id=None, assignee_updated_date=None
        )
        self.jobs = [
            SimpleNamespace(
                id=job_id,
                segment=SimpleNamespace(task=self.task),
                updated_date=None,
                assignee_id=None,
                assignee_updated_date=None,
            )
            for job_id in (1, 2, 3)
        ]
        gt_job, *jobs = self.jobs
        queryset = mock.MagicMock()
        queryset.__iter__.return_value = self.jobs
        queryset.get.return_value = gt_job
        objects = patches.enter_context(mock.patch.object(quality_calculators.Job, "objects"))
        objects.filter.return_value.values_list.return_value.first.return_value = gt_job.id
        objects.filter.return_value.exclude.return_value.values_list.return_value = [
            j.id for j in jobs
        ]
        objects.select_related.return_value.filter.return_value = queryset
        patches.enter_context(
            mock.patch.object(JobDataProvider, "add_prefetch_info", return_value=queryset)
        )
        settings_manager = patches.enter_context(
            mock.patch.object(quality_calculators, "QualitySettingsManager")
        )
        settings = settings_manager.return_value.get_task_settings.return_value
        settings.job_filter = ""
        settings.requirements.select_related.return_value.all.return_value = []
        patches.enter_context(
            mock.patch.object(
                quality_calculators.db_utils,
                "transaction_with_repeatable_read",
                side_effect=nullcontext,
            )
        )
        patches.enter_context(
            mock.patch.object(quality_calculators.transaction, "atomic", side_effect=nullcontext)
        )

        self.calculator = quality_calculators.TaskQualityCalculator()
        for method in ("get_report_parameters", "_compute_task_report", "_save_reports"):
            patches.enter_context(mock.patch.object(self.calculator, method))
        self.get_frames = patches.enter_context(
            mock.patch.object(self.calculator, "get_active_validation_frames", return_value={0})
        )
        self.providers = [mock.Mock(spec=JobDataProvider) for _ in self.jobs]
        self.make_provider = patches.enter_context(
            mock.patch.object(
                quality_calculators, "make_job_data_provider", side_effect=self.providers
            )
        )
        self.events = []
        for job, provider in zip(self.jobs, self.providers):
            provider.close.side_effect = lambda job_id=job.id: self.events.append(("close", job_id))

        self.generate_report = mock.Mock()
        self.generate_report.return_value.get_conflicts.return_value = []

        def estimator(provider, gt_provider, **kwargs):
            self.assertIs(gt_provider, self.providers[0])
            gt_provider.close.assert_not_called()
            provider.close.assert_not_called()
            self.events.append(("compare", self.jobs[self.providers.index(provider)].id))
            return SimpleNamespace(generate_report=self.generate_report)

        patches.enter_context(
            mock.patch.object(quality_calculators, "DatasetQualityEstimator", side_effect=estimator)
        )

    def test_closes_each_job_and_keeps_ground_truth_until_all_comparisons_finish(self):
        self.calculator.compute_report(self.task)
        self.assertEqual(
            self.events, [("compare", 2), ("close", 2), ("compare", 3), ("close", 3), ("close", 1)]
        )
        for provider in self.providers:
            provider.close.assert_called_once_with()

    def test_report_error_closes_active_providers_without_loading_the_next_job(self):
        self.generate_report.side_effect = RuntimeError("comparison failed")
        with self.assertRaisesRegex(RuntimeError, "comparison failed"):
            self.calculator.compute_report(self.task)
        self.assertEqual(self.events, [("compare", 2), ("close", 2), ("close", 1)])
        self.assertEqual(self.make_provider.call_count, 2)
        self.calculator._save_reports.assert_not_called()

    def test_frame_loading_error_closes_ground_truth_before_any_dataset_is_used(self):
        self.get_frames.side_effect = RuntimeError("frame loading failed")
        with self.assertRaisesRegex(RuntimeError, "frame loading failed"):
            self.calculator.compute_report(self.task)
        self.assertEqual(self.events, [("close", 1)])
        self.make_provider.assert_called_once()

    def test_job_loading_error_closes_ground_truth(self):
        self.make_provider.side_effect = [self.providers[0], RuntimeError("job loading failed")]
        with self.assertRaisesRegex(RuntimeError, "job loading failed"):
            self.calculator.compute_report(self.task)
        self.assertEqual(self.events, [("close", 1)])
