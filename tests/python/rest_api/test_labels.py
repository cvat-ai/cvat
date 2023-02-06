# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
from http import HTTPStatus
from typing import Any, Dict, List, Tuple

import pytest
from cvat_sdk.api_client.api_client import ApiClient, Endpoint
from deepdiff import DeepDiff

from shared.utils.config import make_api_client

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


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetLabels:
    def _test_get_ok(self, user, lid, data, **kwargs):
        with make_api_client(user) as client:
            (_, response) = client.labels_api.retrieve(lid, **kwargs)
            assert response.status == HTTPStatus.OK
            assert (
                DeepDiff(
                    data,
                    json.loads(response.data),
                    exclude_paths="root['updated_date']",
                    ignore_order=True,
                )
                == {}
            )

    def _test_get_denied(self, user, lid, **kwargs):
        with make_api_client(user) as client:
            (_, response) = client.labels_api.retrieve(
                lid, **kwargs, _check_status=False, _parse_response=False
            )
            assert response.status == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize("source", ["task", "project"])
    @pytest.mark.parametrize("is_staff", [True, False])
    def test_admin_get_sandbox_label(
        self,
        labels,
        tasks,
        projects,
        is_task_staff,
        is_project_staff,
        users_by_name,
        admin_user,
        source,
        is_staff,
    ):
        if source == "task":
            sources = tasks
            is_source_staff = is_task_staff
            label_source_key = "task_id"
        elif source == "project":
            sources = projects
            is_source_staff = is_project_staff
            label_source_key = "project_id"

        labels_by_source = {label.get(label_source_key): label for label in labels if label.get(label_source_key)}
        sources_with_labels = [s for s in sources if labels_by_source.get(s["id"])]

        user_id = users_by_name[admin_user]
        source_obj = next(filter(lambda s: is_source_staff(user_id, s["id"]) == is_staff, sources_with_labels))
        label = next(label for label in labels if label.get(label_source_key) == source_obj["id"])

        self._test_get_ok(admin_user, label["id"], label)

    @pytest.mark.parametrize("source", ["task", "project"])
    @pytest.mark.parametrize("org_id", [1])
    def test_admin_get_org_label(
        self,
        labels,
        tasks_by_org,
        projects_by_org,
        is_task_staff,
        is_project_staff,
        users_by_name,
        admin_user,
        source,
        org_id,
    ):
        if source == "task":
            sources = tasks_by_org
            is_source_staff = is_task_staff
            label_source_key = "task_id"
        elif source == "project":
            sources = projects_by_org
            is_source_staff = is_project_staff
            label_source_key = "project_id"

        labels_by_source = {label.get(label_source_key): label for label in labels if label.get(label_source_key)}
        sources = sources[org_id]
        sources_with_labels = [s for s in sources if labels_by_source.get(s["id"])]
        source_obj = sources_with_labels[0]
        label = next(label for label in labels if label.get(label_source_key) == source_obj["id"])

        user_id = users_by_name[admin_user]
        assert is_source_staff(user_id, source_obj["id"])

        self._test_get_ok(admin_user, label["id"], label)

    @pytest.mark.parametrize("source", ["task", "project"])
    @pytest.mark.parametrize("is_staff", [True, False])
    def test_non_admin_get_sandbox_label(
        self, labels, users, tasks, projects, is_task_staff, is_project_staff, source, is_staff
    ):
        if source == "task":
            sources = tasks
            is_source_staff = is_task_staff
            label_source_key = "task_id"
        elif source == "project":
            sources = projects
            is_source_staff = is_project_staff
            label_source_key = "project_id"

        labels_by_source = {label.get(label_source_key): label for label in labels if label.get(label_source_key)}
        sources_with_labels = [s for s in sources if labels_by_source.get(s["id"])]
        source_obj = sources_with_labels[0]
        label = labels_by_source[source_obj["id"]]
        user = next(u for u in users if is_source_staff(u["id"], source_obj["id"]) == is_staff)

        if is_staff:
            self._test_get_ok(user["username"], label["id"], label)
        else:
            self._test_get_denied(user["username"], label["id"])
