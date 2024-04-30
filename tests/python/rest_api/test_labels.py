# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import itertools
import json
from copy import deepcopy
from http import HTTPStatus
from types import SimpleNamespace
from typing import Any, Dict, List, Optional, Tuple

import pytest
from cvat_sdk import exceptions, models
from cvat_sdk.api_client.api_client import ApiClient, Endpoint
from cvat_sdk.core.helpers import get_paginated_collection
from dateutil.parser import isoparse as parse_datetime
from deepdiff import DeepDiff
from pytest_cases import fixture, fixture_ref, parametrize

from shared.utils.config import delete_method, get_method, make_api_client, patch_method

from .utils import CollectionSimpleFilterTestBase, build_exclude_paths_expr, get_attrs


class _TestLabelsPermissionsBase:
    @pytest.fixture
    def _base_setup(
        self,
        users,
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
        org_staff,
    ):
        self.users = users
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
        self.org_staff = org_staff

    @pytest.fixture(autouse=True)
    def setup(self, _base_setup):
        """
        This function only calls the _base_setup() fixture.
        It can be overridden in derived classes.
        """

    @staticmethod
    def _labels_by_source(labels: List[Dict], *, source_key: str) -> Dict[int, List[Dict]]:
        labels_by_source = {}
        for label in labels:
            label_source = label.get(source_key)
            if label_source:
                labels_by_source.setdefault(label_source, []).append(label)

        return labels_by_source

    def _get_source_info(self, source: str, *, org_id: Optional[int] = None):
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

        sources = sources[org_id or ""]

        return SimpleNamespace(
            sources=sources, is_source_staff=is_source_staff, label_source_key=label_source_key
        )

    source_types = ["task", "project"]
    org_roles = ["worker", "supervisor", "maintainer", "owner"]

    @fixture
    @parametrize("source", source_types)
    @parametrize("user", ["admin1"])
    @parametrize("is_staff", [True, False])
    def admin_sandbox_case(self, user, source, is_staff):
        sources, is_source_staff, label_source_key = get_attrs(
            self._get_source_info(source),
            ["sources", "is_source_staff", "label_source_key"],
        )

        labels_by_source = self._labels_by_source(self.labels, source_key=label_source_key)
        sources_with_labels = [s for s in sources if labels_by_source.get(s["id"])]

        user_id = self.users_by_name[user]["id"]
        source_obj = next(
            filter(lambda s: is_source_staff(user_id, s["id"]) == is_staff, sources_with_labels)
        )
        label = labels_by_source[source_obj["id"]][0]

        yield SimpleNamespace(label=label, user=user, source=source, is_staff=is_staff)

    @fixture
    @parametrize("source", source_types)
    @parametrize("org_id", [2])
    @parametrize("user", ["admin2"])
    @parametrize("is_staff", [False])
    def admin_org_case(self, user, source, org_id, is_staff):
        sources, is_source_staff, label_source_key = get_attrs(
            self._get_source_info(source, org_id=org_id),
            ["sources", "is_source_staff", "label_source_key"],
        )

        labels_by_source = self._labels_by_source(self.labels, source_key=label_source_key)
        sources_with_labels = [s for s in sources if labels_by_source.get(s["id"])]

        user_id = self.users_by_name[user]["id"]
        source_obj = next(
            filter(lambda s: is_source_staff(user_id, s["id"]) == is_staff, sources_with_labels)
        )
        label = labels_by_source[source_obj["id"]][0]

        yield SimpleNamespace(
            label=label, user=user, source=source, org_id=org_id, is_staff=is_staff
        )

    @fixture
    @parametrize("source", source_types)
    @parametrize("is_staff", [True, False])
    def user_sandbox_case(self, source, is_staff):
        sources, label_source_key = get_attrs(
            self._get_source_info(source),
            ["sources", "label_source_key"],
        )

        users = {u["id"]: u for u in self.users if not u["is_superuser"]}
        regular_users_sources = [
            s for s in sources if s["owner"]["id"] in users and s["organization"] is None
        ]
        labels_by_source = self._labels_by_source(self.labels, source_key=label_source_key)
        source_obj = next(s for s in regular_users_sources if labels_by_source.get(s["id"]))
        label = labels_by_source[source_obj["id"]][0]
        user = next(u for u in users.values() if (u["id"] == source_obj["owner"]["id"]) == is_staff)

        yield SimpleNamespace(label=label, user=user, is_staff=is_staff)

    @fixture
    @parametrize("source", source_types)
    @parametrize("org_id", [2])
    @parametrize(
        "role, src_staff", list(itertools.product(org_roles, [True, False])) + [(None, False)]
    )
    def user_org_case(self, source, src_staff, role, org_id):
        sources, is_source_staff, label_source_key = get_attrs(
            self._get_source_info(source, org_id=org_id),
            ["sources", "is_source_staff", "label_source_key"],
        )

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
                    if is_source_staff(u["id"], source_obj["id"]) == src_staff
                    or not role
                    or u["id"] in self.org_staff(org_id)
                    if not role or u in staff_by_role[role]
                ),
                None,
            )
            if user:
                break
        assert user

        label = labels_by_source[source_obj["id"]][0]

        yield SimpleNamespace(
            label=label,
            user=user,
            org_id=org_id,
            is_staff=src_staff or user["id"] in self.org_staff(org_id),
        )


class TestLabelsListFilters(CollectionSimpleFilterTestBase):
    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_class, admin_user, labels, jobs_wlc, tasks_wlc, projects_wlc):
        self.user = admin_user
        self.samples = labels
        self.job_samples = jobs_wlc
        self.task_samples = tasks_wlc
        self.project_samples = projects_wlc

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
                lambda p: (task_id and task_id == p.get("task_id"))
                or (project_id and project_id == p.get("project_id")),
                self.samples,
            )
            return field_value, label_samples
        else:
            return super()._get_field_samples(field)

    @pytest.mark.parametrize(
        "field",
        ("name", "job_id", "task_id", "project_id", "type", "color"),
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

            kwargs[key] = v

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
            kwargs["task_id"] = dst_obj["id"]
        elif dst == "job":
            dst_obj = next(
                j for j in self.job_samples if j.get(f"{src}_id") == src_with_labels["id"]
            )
            kwargs["job_id"] = dst_obj["id"]
        else:
            assert False

        if org_id:
            kwargs["org_id"] = org_id

        retrieved_data = self._retrieve_collection(**kwargs)
        self._compare_results(labels, retrieved_data)


@pytest.mark.usefixtures("restore_db_per_class")
class TestListLabels(_TestLabelsPermissionsBase):
    def _test_list_ok(self, user, data, **kwargs):
        with make_api_client(user) as client:
            results = get_paginated_collection(
                client.labels_api.list_endpoint, **kwargs, return_json=True
            )
            assert (
                DeepDiff(
                    data,
                    results,
                    exclude_paths="root['updated_date']",
                    ignore_order=True,
                )
                == {}
            )

    def _test_list_denied(self, user, **kwargs):
        with make_api_client(user) as client:
            (_, response) = client.labels_api.list(
                **kwargs, _parse_response=False, _check_status=False
            )
            assert response.status == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize("org_id", [2])
    @pytest.mark.parametrize("source_type", ["job", "task", "project"])
    @pytest.mark.parametrize("role", ["worker", "supervisor"])
    @pytest.mark.parametrize("staff", [True, False])
    def test_staff_can_list_labels_in_org(
        self,
        org_id,
        source_type,
        role,
        staff,
        labels,
        jobs_wlc,
        tasks_wlc,
        projects_wlc,
        users,
        is_project_staff,
        is_task_staff,
        is_job_staff,
        memberships,
        users_by_name,
    ):
        labels_by_project = self._labels_by_source(labels, source_key="project_id")
        labels_by_task = self._labels_by_source(labels, source_key="task_id")
        if source_type == "project":
            sources = [
                p for p in projects_wlc if p["labels"]["count"] > 0 and p["organization"] == org_id
            ]
            labels_by_source = labels_by_project
            is_staff = is_project_staff
        elif source_type == "task":
            sources = [
                t for t in tasks_wlc if t["labels"]["count"] > 0 and t["organization"] == org_id
            ]
            labels_by_source = {
                task["id"]: (
                    labels_by_task.get(task["id"]) or labels_by_project.get(task.get("project_id"))
                )
                for task in sources
            }
            is_staff = is_task_staff
        elif source_type == "job":
            sources = [
                j
                for j in jobs_wlc
                if j["labels"]["count"] > 0
                if next(t for t in tasks_wlc if t["id"] == j["task_id"])["organization"] == org_id
            ]
            labels_by_source = {
                job["id"]: (
                    labels_by_task.get(job["task_id"]) or labels_by_project.get(job["project_id"])
                )
                for job in sources
            }
            is_staff = is_job_staff
        else:
            assert False

        staff_by_role = {}
        for m in memberships:
            if m["organization"] == org_id:
                staff_by_role.setdefault(m["role"], []).append(users_by_name[m["user"]["username"]])

        for source in sources:
            user = next(
                (
                    u
                    for u in users
                    if not u["is_superuser"]
                    if is_staff(u["id"], source["id"]) == staff
                    if u in staff_by_role[role]
                ),
                None,
            )
            if user:
                break

        assert source
        assert user

        labels = labels_by_source[source["id"]]

        kwargs = {
            "org_id": org_id,
            f"{source_type}_id": source["id"],
        }

        if staff:
            self._test_list_ok(user["username"], labels, **kwargs)
        else:
            self._test_list_denied(user["username"], **kwargs)

    @pytest.mark.parametrize("org_id", [2])
    @pytest.mark.parametrize("source_type", ["job", "task", "project"])
    def test_only_1st_level_labels_included(
        self, projects_wlc, tasks_wlc, jobs_wlc, labels, admin_user, source_type, org_id
    ):
        labels_by_project = self._labels_by_source(labels, source_key="project_id")
        labels_by_task = self._labels_by_source(labels, source_key="task_id")
        if source_type == "project":
            sources = [
                p for p in projects_wlc if p["labels"]["count"] > 0 and p["organization"] == org_id
            ]
            labels_by_source = labels_by_project
        elif source_type == "task":
            sources = [
                t for t in tasks_wlc if t["labels"]["count"] > 0 and t["organization"] == org_id
            ]
            labels_by_source = {
                task["id"]: (
                    labels_by_task.get(task["id"]) or labels_by_project.get(task.get("project_id"))
                )
                for task in sources
            }
        elif source_type == "job":
            sources = [
                j
                for j in jobs_wlc
                if j["labels"]["count"] > 0
                if next(t for t in tasks_wlc if t["id"] == j["task_id"])["organization"] == org_id
            ]
            labels_by_source = {
                job["id"]: (
                    labels_by_task.get(job["task_id"]) or labels_by_project.get(job["project_id"])
                )
                for job in sources
            }
        else:
            assert False

        source = next(
            s for s in sources if any(label["sublabels"] for label in labels_by_source[s["id"]])
        )
        source_labels = labels_by_source[source["id"]]
        assert not any(label["has_parent"] for label in source_labels)

        kwargs = {
            "org_id": org_id,
            f"{source_type}_id": source["id"],
        }

        self._test_list_ok(admin_user, source_labels, **kwargs)


class TestGetLabels(_TestLabelsPermissionsBase):
    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_class, _base_setup):  # pylint: disable=arguments-differ
        pass

    def _test_get_ok(self, user, lid, data):
        with make_api_client(user) as client:
            (_, response) = client.labels_api.retrieve(lid)
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

    def _test_get_denied(self, user, lid):
        with make_api_client(user) as client:
            (_, response) = client.labels_api.retrieve(
                lid, _check_status=False, _parse_response=False
            )
            assert response.status == HTTPStatus.FORBIDDEN

    def test_admin_get_sandbox_label(self, admin_sandbox_case):
        label, user = get_attrs(admin_sandbox_case, ["label", "user"])

        self._test_get_ok(user, label["id"], label)

    def test_admin_get_org_label(self, admin_org_case):
        label, user = get_attrs(admin_org_case, ["label", "user"])

        self._test_get_ok(user, label["id"], label)

    def test_regular_user_get_sandbox_label(self, user_sandbox_case):
        label, user, is_staff = get_attrs(user_sandbox_case, ["label", "user", "is_staff"])

        if is_staff:
            self._test_get_ok(user["username"], label["id"], label)
        else:
            self._test_get_denied(user["username"], label["id"])

    def test_regular_user_get_org_label(self, user_org_case):
        label, user, is_staff = get_attrs(user_org_case, ["label", "user", "is_staff"])

        if is_staff:
            self._test_get_ok(user["username"], label["id"], label)
        else:
            self._test_get_denied(user["username"], label["id"])


class TestPatchLabels(_TestLabelsPermissionsBase):
    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_function, _base_setup):  # pylint: disable=arguments-differ
        self.ignore_fields = ["updated_date"]

    def _build_exclude_paths_expr(self, ignore_fields=None):
        if ignore_fields is None:
            ignore_fields = self.ignore_fields
        return build_exclude_paths_expr(ignore_fields)

    def _test_update_ok(self, user, lid, data, *, expected_data=None, ignore_fields=None, **kwargs):
        with make_api_client(user) as client:
            (_, response) = client.labels_api.partial_update(
                lid, patched_label_request=models.PatchedLabelRequest(**deepcopy(data)), **kwargs
            )
            assert response.status == HTTPStatus.OK
            assert (
                DeepDiff(
                    expected_data if expected_data is not None else data,
                    json.loads(response.data),
                    exclude_regex_paths=self._build_exclude_paths_expr(ignore_fields),
                    ignore_order=True,
                )
                == {}
            )
        return response

    def _test_update_denied(self, user, lid, data, expected_status=HTTPStatus.FORBIDDEN, **kwargs):
        with make_api_client(user) as client:
            (_, response) = client.labels_api.partial_update(
                lid,
                patched_label_request=models.PatchedLabelRequest(**deepcopy(data)),
                **kwargs,
                _check_status=False,
                _parse_response=False,
            )
            assert response.status == expected_status
        return response

    def _get_patch_data(
        self, original_data: Dict[str, Any], **overrides
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        result = deepcopy(original_data)
        result.update(overrides)

        ignore_fields = self.ignore_fields.copy()
        if overrides:
            payload = deepcopy(overrides)

            if overrides.get("attributes"):
                payload["attributes"] = (original_data.get("attributes") or []) + overrides[
                    "attributes"
                ]
                result["attributes"] = deepcopy(payload["attributes"])
                ignore_fields.append("attributes.id")

            # Changing skeletons is not supported
            if overrides.get("type") == "skeleton":
                result["type"] = original_data["type"]

            if "name" in overrides:
                ignore_fields.append("color")
        else:
            payload = deepcopy(original_data)

        return result, payload, ignore_fields

    @parametrize(
        "param, newvalue",
        list(
            itertools.chain.from_iterable(
                itertools.product([k], values)
                for k, values in {
                    "attributes": [
                        [
                            {
                                "default_value": "mazda_new",
                                "input_type": "select",
                                "mutable": True,
                                "name": "model_new",
                                "values": ["mazda_new", "bmw"],
                            }
                        ],
                    ],
                    "color": ["#2000c0"],
                    "name": ["modified"],
                    "type": [
                        "bbox",
                        "ellipse",
                        "polygon",
                        "polyline",
                        "points",
                        "cuboid",
                        "cuboid_3d",
                        "skeleton",
                        "tag",
                        "any",
                    ],
                }.items()
            )
        ),
    )
    @parametrize("source", _TestLabelsPermissionsBase.source_types)
    def test_can_patch_label_field(self, source, admin_user, param, newvalue):
        user = admin_user
        label = next(
            iter(
                self._labels_by_source(
                    self.labels, source_key=self._get_source_info(source).label_source_key
                ).values()
            )
        )[0]

        expected_data, patch_data, ignore_fields = self._get_patch_data(label, **{param: newvalue})

        self._test_update_ok(
            user, label["id"], patch_data, expected_data=expected_data, ignore_fields=ignore_fields
        )

    @parametrize("source", _TestLabelsPermissionsBase.source_types)
    def test_cannot_patch_sublabel_directly(self, admin_user, source):
        user = admin_user
        label = next(
            sublabel
            for source_labels in self._labels_by_source(
                self.labels, source_key=self._get_source_info(source).label_source_key
            ).values()
            for label in source_labels
            for sublabel in label["sublabels"]
        )

        with make_api_client(user) as client:
            (_, response) = client.labels_api.partial_update(
                label["id"],
                patched_label_request=models.PatchedLabelRequest(**label),
                _parse_response=False,
                _check_status=False,
            )

        assert response.status == HTTPStatus.BAD_REQUEST
        assert "Sublabels cannot be modified this way." in response.data.decode()

    @parametrize("user", [fixture_ref("admin_user")])
    @parametrize("source_type", _TestLabelsPermissionsBase.source_types)
    def test_cannot_rename_label_to_duplicate_name(self, source_type, user):
        source_info = self._get_source_info(source_type)
        labels_by_source = self._labels_by_source(
            self.labels, source_key=source_info.label_source_key
        )
        labels = next(ls for ls in labels_by_source.values() if len(ls) >= 2)

        payload = {"name": labels[1]["name"]}

        response = self._test_update_denied(
            user, lid=labels[0]["id"], data=payload, expected_status=HTTPStatus.BAD_REQUEST
        )
        assert "All label names must be unique" in response.data.decode()

    def test_admin_patch_sandbox_label(self, admin_sandbox_case):
        label, user = get_attrs(admin_sandbox_case, ["label", "user"])

        expected_data, patch_data, *_ = self._get_patch_data(label)

        self._test_update_ok(user, label["id"], patch_data, expected_data=expected_data)

    def test_admin_patch_org_label(self, admin_org_case):
        label, user = get_attrs(admin_org_case, ["label", "user"])

        expected_data, patch_data, *_ = self._get_patch_data(label)

        self._test_update_ok(user, label["id"], patch_data, expected_data=expected_data)

    def test_regular_user_patch_sandbox_label(self, user_sandbox_case):
        label, user, is_staff = get_attrs(user_sandbox_case, ["label", "user", "is_staff"])

        expected_data, patch_data, *_ = self._get_patch_data(label)

        if is_staff:
            self._test_update_ok(
                user["username"], label["id"], patch_data, expected_data=expected_data
            )
        else:
            self._test_update_denied(user["username"], label["id"], patch_data)

    def test_regular_user_patch_org_label(self, user_org_case):
        label, user, is_staff = get_attrs(user_org_case, ["label", "user", "is_staff"])

        expected_data, patch_data, *_ = self._get_patch_data(label)

        if is_staff:
            self._test_update_ok(
                user["username"], label["id"], patch_data, expected_data=expected_data
            )
        else:
            self._test_update_denied(user["username"], label["id"], patch_data)


class TestDeleteLabels(_TestLabelsPermissionsBase):
    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_function, _base_setup):  # pylint: disable=arguments-differ
        pass

    def _test_delete_ok(self, user, lid, **kwargs):
        with make_api_client(user) as client:
            (_, response) = client.labels_api.destroy(lid, **kwargs)
            assert response.status == HTTPStatus.NO_CONTENT

    def _test_delete_denied(self, user, lid, **kwargs):
        with make_api_client(user) as client:
            (_, response) = client.labels_api.partial_update(
                lid,
                **kwargs,
                _check_status=False,
                _parse_response=False,
            )
            assert response.status == HTTPStatus.FORBIDDEN

    @parametrize("source", _TestLabelsPermissionsBase.source_types)
    def test_can_delete_label(self, admin_user, source):
        user = admin_user
        label = next(
            iter(
                self._labels_by_source(
                    self.labels, source_key=self._get_source_info(source).label_source_key
                ).values()
            )
        )[0]

        with make_api_client(user) as client:
            (_, response) = client.labels_api.destroy(label["id"])
            assert response.status == HTTPStatus.NO_CONTENT

            (_, response) = client.labels_api.retrieve(
                label["id"], _check_status=False, _parse_response=False
            )
            assert response.status == HTTPStatus.NOT_FOUND

    @parametrize("source", _TestLabelsPermissionsBase.source_types)
    def test_cannot_delete_sublabel_directly(self, admin_user, source):
        user = admin_user
        label = next(
            sublabel
            for source_labels in self._labels_by_source(
                self.labels, source_key=self._get_source_info(source).label_source_key
            ).values()
            for label in source_labels
            for sublabel in label["sublabels"]
        )

        with make_api_client(user) as client:
            (_, response) = client.labels_api.destroy(label["id"], _check_status=False)

        assert response.status == HTTPStatus.BAD_REQUEST
        assert "Sublabels cannot be deleted this way." in response.data.decode()

    def test_admin_delete_sandbox_label(self, admin_sandbox_case):
        label, user = get_attrs(admin_sandbox_case, ["label", "user"])

        self._test_delete_ok(user, label["id"])

    def test_admin_delete_org_label(self, admin_org_case):
        label, user = get_attrs(admin_org_case, ["label", "user"])

        self._test_delete_ok(user, label["id"])

    def test_regular_user_delete_sandbox_label(self, user_sandbox_case):
        label, user, is_staff = get_attrs(user_sandbox_case, ["label", "user", "is_staff"])

        if is_staff:
            self._test_delete_ok(user["username"], label["id"])
        else:
            self._test_delete_denied(user["username"], label["id"])

    def test_regular_user_delete_org_label(self, user_org_case):
        label, user, is_staff = get_attrs(user_org_case, ["label", "user", "is_staff"])

        if is_staff:
            self._test_delete_ok(user["username"], label["id"])
        else:
            self._test_delete_denied(user["username"], label["id"])


@pytest.mark.usefixtures("restore_db_per_function")
class TestLabelUpdates:
    @pytest.mark.parametrize("update_kind", ["addition", "removal", "modification"])
    def test_project_label_update_triggers_nested_task_and_job_update(
        self, update_kind, admin_user, labels, projects_wlc, tasks, jobs
    ):
        # Checks for regressions against the issue https://github.com/cvat-ai/cvat/issues/6871

        project = next(p for p in projects_wlc if p["tasks"]["count"] and p["labels"]["count"])
        project_labels = [l for l in labels if l.get("project_id") == project["id"]]
        nested_tasks = [t for t in tasks if t["project_id"] == project["id"]]
        nested_task_ids = set(t["id"] for t in nested_tasks)
        nested_jobs = [j for j in jobs if j["task_id"] in nested_task_ids]

        if update_kind == "addition":
            response = patch_method(
                admin_user, f'projects/{project["id"]}', {"labels": [{"name": "dog2"}]}
            )
            updated_project = response.json()
        elif update_kind == "modification":
            label = project_labels[0]
            patch_method(admin_user, f'labels/{label["id"]}', {"name": label["name"] + "-updated"})

            response = get_method(admin_user, f'projects/{project["id"]}')
            updated_project = response.json()
        elif update_kind == "removal":
            label = project_labels[0]
            delete_method(admin_user, f'labels/{label["id"]}')

            response = get_method(admin_user, f'projects/{project["id"]}')
            updated_project = response.json()
        else:
            assert False

        with make_api_client(admin_user) as api_client:
            updated_tasks = get_paginated_collection(
                api_client.tasks_api.list_endpoint, project_id=project["id"], return_json=True
            )

            updated_jobs = [
                j
                for j in get_paginated_collection(
                    api_client.jobs_api.list_endpoint, return_json=True
                )
                if j["task_id"] in nested_task_ids
            ]

        assert parse_datetime(project["updated_date"]) < parse_datetime(
            updated_project["updated_date"]
        )
        assert len(updated_tasks) == len(nested_tasks)
        assert len(updated_jobs) == len(nested_jobs)
        for entity in updated_tasks + updated_jobs:
            assert updated_project["updated_date"] == entity["updated_date"]

    @pytest.mark.parametrize("update_kind", ["addition", "removal", "modification"])
    def test_task_label_update_triggers_nested_task_and_job_update(
        self, update_kind, admin_user, labels, tasks_wlc, jobs
    ):
        # Checks for regressions against the issue https://github.com/cvat-ai/cvat/issues/6871

        task = next(t for t in tasks_wlc if t["jobs"]["count"] and t["labels"]["count"])
        task_labels = [l for l in labels if l.get("task_id") == task["id"]]
        nested_jobs = [j for j in jobs if j["task_id"] == task["id"]]

        if update_kind == "addition":
            response = patch_method(
                admin_user, f'tasks/{task["id"]}', {"labels": [{"name": "dog2"}]}
            )
            updated_task = response.json()
        elif update_kind == "modification":
            label = task_labels[0]
            patch_method(admin_user, f'labels/{label["id"]}', {"name": label["name"] + "-updated"})

            response = get_method(admin_user, f'tasks/{task["id"]}')
            updated_task = response.json()
        elif update_kind == "removal":
            label = task_labels[0]
            delete_method(admin_user, f'labels/{label["id"]}')

            response = get_method(admin_user, f'tasks/{task["id"]}')
            updated_task = response.json()
        else:
            assert False

        with make_api_client(admin_user) as api_client:
            updated_jobs = get_paginated_collection(
                api_client.jobs_api.list_endpoint, task_id=task["id"], return_json=True
            )

        assert parse_datetime(task["updated_date"]) < parse_datetime(updated_task["updated_date"])
        assert len(updated_jobs) == len(nested_jobs)
        for job in updated_jobs:
            assert updated_task["updated_date"] == job["updated_date"]
