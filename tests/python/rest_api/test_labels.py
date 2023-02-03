# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import Any, Dict, List, Tuple

import pytest
from cvat_sdk.api_client.api_client import ApiClient, Endpoint

from .utils import CollectionSimpleFilterTestBase


class TestLabelsListFilters(CollectionSimpleFilterTestBase):
    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_class, admin_user, labels):
        self.user = admin_user
        self.samples = labels

    def _get_endpoint(self, api_client: ApiClient) -> Endpoint:
        return api_client.labels_api.list_endpoint

    def _get_field_samples(self, field: str) -> Tuple[Any, List[Dict[str, Any]]]:
        if field == "parent":
            parent_id, gt_objects = self._get_field_samples("parent_id")
            parent_name = self._get_field(
                next(
                    filter(
                        lambda p: parent_id == self._get_field(p, self._map_field("id")),
                        self.samples,
                    )
                ),
                self._map_field("name"),
            )
            return parent_name, gt_objects
        else:
            return super()._get_field_samples(field)

    @pytest.mark.parametrize(
        "field",
        ("name", "parent", "job_id", "task_id", "project_id", "type", "color", "parent_id"),
    )
    def test_can_use_simple_filter_for_object_list(self, field):
        return super().test_can_use_simple_filter_for_object_list(field)
