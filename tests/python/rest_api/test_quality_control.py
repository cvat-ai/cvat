# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
from copy import deepcopy
from http import HTTPStatus
from typing import List

import pytest
from cvat_sdk.api_client import models
from cvat_sdk.api_client.api_client import ApiClient, Endpoint
from cvat_sdk.core.helpers import get_paginated_collection
from deepdiff import DeepDiff

from shared.utils.config import BASE_URL, USER_PASS, make_api_client

from .utils import CollectionSimpleFilterTestBase, _test_create_task


class TestListQualityReports:
    def _test_list_200(self, user, task_id, data, **kwargs):
        with make_api_client(user) as api_client:
            results = get_paginated_collection(
                api_client.quality_reports_api.list_endpoint,
                return_json=True,
                task_id=task_id,
                **kwargs,
            )
            assert DeepDiff(data, results, ignore_order=True) == {}

    def test_can_list_quality_reports(self, admin_user, tasks, quality_reports):
        task_id = next(t for t in tasks if t["quality_reports"]["count"] > 0)["id"]
        reports = [r for r in quality_reports if r["target"] == "task" and r["task_id"] == task_id]

        self._test_list_200(admin_user, task_id, reports)

    # test the tree structure
    # test filter values


class TestSimpleQualityReportsFilters(CollectionSimpleFilterTestBase):
    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_class, admin_user, quality_reports):
        self.user = admin_user
        self.samples = quality_reports

    def _get_endpoint(self, api_client: ApiClient) -> Endpoint:
        return api_client.quality_reports_api.list_endpoint

    @pytest.mark.parametrize(
        "field",
        ("task_id", "job_id", "parent_id", "target"),
    )
    def test_can_use_simple_filter_for_object_list(self, field):
        return super().test_can_use_simple_filter_for_object_list(field)
