# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import itertools
import json
from http import HTTPStatus
from typing import Any, Dict, List, Tuple

import pytest
from cvat_sdk import exceptions
from cvat_sdk.api_client.api_client import ApiClient, Endpoint
from deepdiff import DeepDiff

from shared.utils.config import make_api_client

from .utils import CollectionSimpleFilterTestBase


class TestLabelsListFilters(CollectionSimpleFilterTestBase):
    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_class, admin_user, labels, jobs, tasks, projects):
        self.user = admin_user
        self.samples = labels
        self.job_samples = jobs
        self.task_samples = tasks
        self.project_samples = projects

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
        elif field == "job_id":
            field_path = ["id"]
            field_value = self._find_valid_field_value(self.job_samples, field_path)
            job_sample = next(
                filter(lambda p: field_value == self._get_field(p, field_path), self.job_samples)
            )

            task_id = job_sample["task_id"]
            project_id = job_sample["project_id"]
            label_samples = filter(
                lambda p: task_id == p.get("task_id") or project_id == p.get("project_id"),
                self.samples,
            )
            return field_value, label_samples
        else:
            return super()._get_field_samples(field)

    @pytest.mark.parametrize(
        "field",
        ("name", "parent", "job_id", "task_id", "project_id", "type", "color", "parent_id"),
    )
    def test_can_use_simple_filter_for_object_list(self, field):
        return super().test_can_use_simple_filter_for_object_list(field)

    @pytest.mark.parametrize(
        "key1, key2", itertools.combinations(["job_id", "task_id", "project_id"], 2)
    )
    def test_cant_mix_job_task_project_filters(self, key1, key2):
        kwargs = {}
        for key in [key1, key2]:
            if key == "job_id":
                v = self._find_valid_field_value(self.job_samples, ["id"])
            elif key == "task_id":
                v = self._find_valid_field_value(self.task_samples, ["id"])
            elif key == "project_id":
                v = self._find_valid_field_value(self.project_samples, ["id"])
            else:
                assert False

            kwargs[key] = str(v)

        with pytest.raises(exceptions.ApiException) as capture:
            self._retrieve_collection(**kwargs)

        assert capture.value.status == 400
        assert "cannot be used together" in capture.value.body

    @pytest.mark.parametrize("org_id", [None, 2])
    @pytest.mark.parametrize("dst, src", itertools.combinations(["job", "task", "project"], 2))
    def test_can_list_inherited_labels(self, org_id, dst, src):
        kwargs = {}

        if src == "project":
            src_with_labels = next(
                p
                for p in self.project_samples
                if p["labels"]["count"] > 0
                and p["organization"] == org_id
                and p["tasks"]["count"] > 0
            )
        elif src == "task":
            src_with_labels = next(
                t
                for t in self.task_samples
                if t["labels"]["count"] > 0
                and t["organization"] == org_id
                and t["jobs"]["count"] > 0
                and not t.get("project_id")
            )
        else:
            assert False

        labels = [l for l in self.samples if l.get(f"{src}_id") == src_with_labels["id"]]

        if dst == "task":
            dst_obj = next(
                t for t in self.task_samples if t.get(f"{src}_id") == src_with_labels["id"]
            )
            kwargs["task_id"] = str(dst_obj["id"])
        elif dst == "job":
            dst_obj = next(
                j for j in self.job_samples if j.get(f"{src}_id") == src_with_labels["id"]
            )
            kwargs["job_id"] = str(dst_obj["id"])
        else:
            assert False

        if org_id:
            kwargs["org_id"] = org_id

        retrieved_data = self._retrieve_collection(**kwargs)
        self._compare_results(labels, retrieved_data)


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetLabels:
    @pytest.fixture(autouse=True)
    def setup(
        self,
        restore_db_per_class,
        labels,
        jobs,
        tasks,
        projects,
        is_task_staff,
        is_project_staff,
        users_by_name,
        tasks_by_org,
        projects_by_org,
        memberships,
    ):
        self.labels = labels
        self.jobs = jobs
        self.tasks = tasks
        self.projects = projects
        self.is_task_staff = is_task_staff
        self.is_project_staff = is_project_staff
        self.users_by_name = users_by_name
        self.tasks_by_org = tasks_by_org
        self.projects_by_org = projects_by_org
        self.memberships = memberships

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

    @staticmethod
    def _labels_by_source(labels: List[Dict], *, source_key: str) -> Dict[int, List[Dict]]:
        labels_by_source = {}
        for label in labels:
            label_source = label.get(source_key)
            if label_source:
                labels_by_source.setdefault(label_source, []).append(label)

        return labels_by_source

    @pytest.mark.parametrize("source", ["task", "project"])
    @pytest.mark.parametrize("is_staff", [True, False])
    @pytest.mark.parametrize("user", ["admin1"])
    def test_admin_get_sandbox_label(
        self,
        user,
        source,
        is_staff,
    ):
        if source == "task":
            sources = self.tasks
            is_source_staff = self.is_task_staff
            label_source_key = "task_id"
        elif source == "project":
            sources = self.projects
            is_source_staff = self.is_project_staff
            label_source_key = "project_id"
        else:
            assert False

        labels_by_source = self._labels_by_source(self.labels, source_key=label_source_key)
        sources_with_labels = [s for s in sources if labels_by_source.get(s["id"])]

        user_id = self.users_by_name[user]["id"]
        source_obj = next(
            filter(lambda s: is_source_staff(user_id, s["id"]) == is_staff, sources_with_labels)
        )
        label = next(
            label for label in self.labels if label.get(label_source_key) == source_obj["id"]
        )

        self._test_get_ok(user, label["id"], label)

    @pytest.mark.parametrize("source", ["task", "project"])
    @pytest.mark.parametrize("org_id", [2])
    @pytest.mark.parametrize("user", ["admin2"])
    def test_admin_get_org_label(
        self,
        user,
        source,
        org_id,
    ):
        if source == "task":
            sources = self.tasks_by_org
            is_source_staff = self.is_task_staff
            label_source_key = "task_id"
        elif source == "project":
            sources = self.projects_by_org
            is_source_staff = self.is_project_staff
            label_source_key = "project_id"
        else:
            assert False

        sources = sources[org_id]
        labels_by_source = self._labels_by_source(self.labels, source_key=label_source_key)
        sources_with_labels = [s for s in sources if labels_by_source.get(s["id"])]
        source_obj = sources_with_labels[0]
        label = labels_by_source[source_obj["id"]][0]

        user_id = self.users_by_name[user]["id"]
        assert not is_source_staff(user_id, source_obj["id"])

        self._test_get_ok(user, label["id"], label)

    @pytest.mark.parametrize("source", ["task", "project"])
    @pytest.mark.parametrize("is_staff", [True, False])
    def test_regular_user_get_sandbox_label(self, source, is_staff):
        if source == "task":
            sources = self.tasks
            label_source_key = "task_id"
        elif source == "project":
            sources = self.projects
            label_source_key = "project_id"

        users = {u["id"]: u for u in self.users if not u["is_superuser"]}
        regular_users_sources = [
            s for s in sources if s["owner"]["id"] in users and s["organization"] is None
        ]
        labels_by_source = self._labels_by_source(self.labels, source_key=label_source_key)
        source_obj = next(s for s in regular_users_sources if labels_by_source.get(s["id"]))
        label = labels_by_source[source_obj["id"]][0]
        user = next(u for u in users.values() if (u["id"] == source_obj["owner"]["id"]) == is_staff)

        if is_staff:
            self._test_get_ok(user["username"], label["id"], label)
        else:
            self._test_get_denied(user["username"], label["id"])

    @pytest.mark.parametrize("source", ["task", "project"])
    @pytest.mark.parametrize("org_id", [2])
    @pytest.mark.parametrize(
        "role",
        [
            "worker",
            "supervisor",
            "maintainer",
            "owner",
        ],
    )
    @pytest.mark.parametrize("is_staff", [True, False])
    def test_regular_user_get_org_label(
        self,
        source,
        is_staff,
        role,
        org_id,
    ):
        if source == "task":
            sources = self.tasks_by_org
            is_source_staff = self.is_task_staff
            label_source_key = "task_id"
        elif source == "project":
            sources = self.projects_by_org
            is_source_staff = self.is_project_staff
            label_source_key = "project_id"

        sources = sources[org_id]

        labels_by_source = self._labels_by_source(self.labels, source_key=label_source_key)

        users = {u["id"]: u for u in self.users_by_name.values() if not u["is_superuser"]}

        staff_by_role = {}
        for m in self.memberships:
            if m["organization"] == org_id:
                staff_by_role.setdefault(m["role"], []).append(
                    self.users_by_name[m["user"]["username"]]
                )

        for source_obj in (s for s in sources if labels_by_source.get(s["id"])):
            user = next(
                (
                    u
                    for u in users.values()
                    if is_source_staff(u["id"], source_obj["id"]) == is_staff
                    and (not is_staff or u in staff_by_role[role])
                ),
                None,
            )
            if user:
                break
        assert user

        label = labels_by_source[source_obj["id"]][0]

        kwargs = {"org_id": org_id}

        if is_staff:
            self._test_get_ok(user["username"], label["id"], label, **kwargs)
        else:
            self._test_get_denied(user["username"], label["id"], **kwargs)
