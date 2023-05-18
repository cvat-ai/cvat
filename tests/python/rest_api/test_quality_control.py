# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import Any, Dict, List, Tuple

import pytest
from cvat_sdk.api_client.api_client import ApiClient, Endpoint
from cvat_sdk.core.helpers import get_paginated_collection
from deepdiff import DeepDiff

from shared.utils.config import make_api_client

from .utils import CollectionSimpleFilterTestBase


class TestListQualityReports:
    def _test_list_200(self, user, task_id, data, **kwargs):
        with make_api_client(user) as api_client:
            results = get_paginated_collection(
                api_client.quality_api.list_reports_endpoint,
                return_json=True,
                task_id=task_id,
                **kwargs,
            )
            assert DeepDiff(data, results, ignore_order=True) == {}

    def test_can_list_quality_reports(self, admin_user, tasks, quality_reports):
        task_id = next(t for t in tasks if t["quality_reports"]["count"] > 0)["id"]
        reports = [r for r in quality_reports if r["target"] == "task" and r["task_id"] == task_id]

        self._test_list_200(admin_user, task_id, reports)


class TestSimpleQualityReportsFilters(CollectionSimpleFilterTestBase):
    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_class, admin_user, quality_reports, jobs):
        self.user = admin_user
        self.samples = quality_reports
        self.job_samples = jobs

    def _get_endpoint(self, api_client: ApiClient) -> Endpoint:
        return api_client.quality_api.list_reports_endpoint

    def _get_field_samples(self, field: str) -> Tuple[Any, List[Dict[str, Any]]]:
        if field == "task_id":
            # This filter includes both the task and nested job reports
            task_id, task_reports = super()._get_field_samples(field)
            task_job_ids = set(j["id"] for j in self.job_samples if j["task_id"] == task_id)
            task_reports = list(task_reports) + [
                r
                for r in self.samples
                if self._get_field(r, self._map_field("job_id")) in task_job_ids
            ]
            return task_id, task_reports
        else:
            return super()._get_field_samples(field)

    @pytest.mark.parametrize(
        "field",
        ("task_id", "job_id", "parent_id", "target"),
    )
    def test_can_use_simple_filter_for_object_list(self, field):
        return super().test_can_use_simple_filter_for_object_list(field)


class TestSimpleQualityConflictsFilters(CollectionSimpleFilterTestBase):
    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_class, admin_user, quality_conflicts, quality_reports):
        self.user = admin_user
        self.samples = quality_conflicts
        self.report_samples = quality_reports

    def _get_endpoint(self, api_client: ApiClient) -> Endpoint:
        return api_client.quality_api.list_conflicts_endpoint

    def _get_field_samples(self, field: str) -> Tuple[Any, List[Dict[str, Any]]]:
        if field == "job_id":
            # This field is not included in the response
            job_id = self._find_valid_field_value(self.report_samples, field_path=["job_id"])
            job_reports = set(r["id"] for r in self.report_samples if r["job_id"] == job_id)
            job_conflicts = [
                c
                for c in self.samples
                if self._get_field(c, self._map_field("report_id")) in job_reports
            ]
            return job_id, job_conflicts
        else:
            return super()._get_field_samples(field)

    @pytest.mark.parametrize(
        "field",
        ("report_id", "importance", "type", "frame", "job_id"),
    )
    def test_can_use_simple_filter_for_object_list(self, field):
        return super().test_can_use_simple_filter_for_object_list(field)
