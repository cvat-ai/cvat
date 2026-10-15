# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import csv
import json
import math
from copy import deepcopy
from http import HTTPStatus
from io import BytesIO, StringIO
from pathlib import Path
from typing import Any
from zipfile import ZipFile

import numpy as np
import pytest
from cvat_sdk.core.helpers import get_paginated_collection
from cvat_sdk.masks import encode_mask
from deepdiff import DeepDiff

from rest_api.utils import create_gt_job, create_quality_report, create_task
from shared.utils.config import (
    delete_method,
    get_method,
    make_api_client,
    patch_method,
    post_method,
)
from shared.utils.helpers import generate_image_files

from .test_quality_control import _PermissionTestBase

_IOU_LINEAR_POLICY = {
    "type": "iou",
    "mode": "linear",
    "input": "gt.shape_area",
    "extrapolation": "clamp",
    "points": [{"x": 100, "y": 0.4}, {"x": 1000, "y": 0.9}],
}
_IOU_POLICY_FIXTURES = json.loads(
    (Path(__file__).parents[1] / "shared/assets/iou_threshold_policies.json").read_text()
)


class _QualityRequirementsTestBase(_PermissionTestBase):
    _requirements_endpoint = "quality/settings/requirements"
    _settings_endpoint = "quality/settings"
    _max_requirements_per_settings = 100
    _base_standalone_annotation_types = {
        "tag",
        "rectangle",
        "skeleton",
        "skeleton_keypoint",
        "points",
        "polyline",
        "mask",
        "polygon",
        "ellipse",
    }

    @staticmethod
    def _as_report_data_requirements_summary(summary: dict[str, Any]) -> dict[str, Any]:
        return {
            "total_count": summary["total"],
            "enabled_count": summary["enabled"],
            "completed_count": summary["completed"],
            "not_computed_count": summary["not_computed"],
            "items": summary["items"],
        }

    @staticmethod
    def _base_requirement_name(annotation_type: str) -> str:
        return f"Base {annotation_type.replace('_', ' ')}"

    @staticmethod
    def _build_requirement_payload(
        name: str,
        *,
        settings_id: int | None = None,
        enabled: bool = True,
        required_score: float = 0.7,
        metric: str = "accuracy",
        annotation_type: str | None = "rectangle",
        filter_expression: str | None = None,
        parent_requirement: int | None = None,
        sort_order: int | None = None,
        point_size: float | None = None,
        point_size_base: str | None = None,
        match_orientation: bool | None = None,
        match_groups: bool | None = None,
        attribute_comparison: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        payload = {
            "name": name,
            "metric": metric,
            "required_score": required_score,
            "enabled": enabled,
        }
        if annotation_type is not None:
            payload["annotation_type"] = annotation_type
        if settings_id is not None:
            payload["settings_id"] = settings_id
        if filter_expression is not None:
            payload["filter"] = filter_expression
        if parent_requirement is not None:
            payload["parent_requirement"] = parent_requirement
        if sort_order is not None:
            payload["sort_order"] = sort_order
        if point_size is not None:
            payload["point_size"] = point_size
        if point_size_base is not None:
            payload["point_size_base"] = point_size_base
        if match_orientation is not None:
            payload["match_orientation"] = match_orientation
        if match_groups is not None:
            payload["match_groups"] = match_groups
        if attribute_comparison is not None:
            payload["attribute_comparison"] = attribute_comparison
        return payload

    @classmethod
    def _build_requirement_payloads(
        cls,
        prefix: str,
        count: int,
        *,
        annotation_type: str = "rectangle",
    ) -> list[dict[str, Any]]:
        return [
            cls._build_requirement_payload(
                f"{prefix}-{index}",
                annotation_type=annotation_type,
            )
            for index in range(count)
        ]

    @classmethod
    def _get_requirement_limit_error_message(cls) -> str:
        return (
            f"No more than {cls._max_requirements_per_settings} quality requirements "
            "are allowed per task or project."
        )

    def _remember_settings(self, settings: dict[str, Any]) -> None:
        settings_by_id = self.__dict__.setdefault("_quality_settings_by_id", {})
        settings_by_id[settings["id"]] = settings

    def _add_default_requirement_parent(
        self,
        payload: dict[str, Any],
        *,
        settings_id: int,
    ) -> dict[str, Any]:
        if "id" in payload or "parent_requirement" in payload:
            return payload

        annotation_type = payload.get("annotation_type", "rectangle")
        if annotation_type is None:
            return payload

        settings = self.__dict__.get("_quality_settings_by_id", {}).get(settings_id)
        if settings is None:
            return payload

        base_requirement = next(
            (
                requirement
                for requirement in settings["requirements"]
                if requirement["is_base"] and requirement["annotation_type"] == annotation_type
            ),
            None,
        )
        if base_requirement is None:
            return payload

        return {
            **payload,
            "parent_requirement": base_requirement["id"],
        }

    def _get_task_settings(self, user: str, *, task_id: int, **kwargs) -> dict[str, Any]:
        kwargs.setdefault("parent_type", "task")
        response = get_method(user, self._settings_endpoint, task_id=task_id, **kwargs)
        assert response.status_code == HTTPStatus.OK

        results = response.json()["results"]
        assert len(results) == 1
        settings = results[0]
        self._remember_settings(settings)
        return settings

    def _get_project_settings(self, user: str, *, project_id: int, **kwargs) -> dict[str, Any]:
        kwargs.setdefault("parent_type", "project")
        response = get_method(user, self._settings_endpoint, project_id=project_id, **kwargs)
        assert response.status_code == HTTPStatus.OK

        results = response.json()["results"]
        assert len(results) == 1
        settings = results[0]
        self._remember_settings(settings)
        return settings

    def _list_requirements(self, user: str, **kwargs):
        kwargs.setdefault("page_size", 500)
        response = get_method(user, self._requirements_endpoint, **kwargs)
        return response.json()["results"] if response.ok else None, response

    def _create_requirement(self, user: str, data: dict[str, Any], **kwargs):
        if settings_id := data.get("settings_id"):
            data = self._add_default_requirement_parent(data, settings_id=settings_id)

        response = post_method(user, self._requirements_endpoint, data, **kwargs)
        return response.json() if response.content else None, response

    def _bulk_create_requirements(self, user: str, data: dict[str, Any], **kwargs):
        response = post_method(user, f"{self._requirements_endpoint}/bulk", data, **kwargs)
        return response.json() if response.content else None, response

    def _retrieve_requirement(self, user: str, requirement_id: int, **kwargs):
        response = get_method(user, f"{self._requirements_endpoint}/{requirement_id}", **kwargs)
        return response.json() if response.content else None, response

    def _patch_requirement(self, user: str, requirement_id: int, data: dict[str, Any], **kwargs):
        response = patch_method(
            user, f"{self._requirements_endpoint}/{requirement_id}", data, **kwargs
        )
        return response.json() if response.content else None, response

    def _delete_requirement(self, user: str, requirement_id: int, **kwargs):
        return delete_method(user, f"{self._requirements_endpoint}/{requirement_id}", **kwargs)

    def _patch_settings(self, user: str, settings_id: int, data: dict[str, Any], **kwargs):
        if requirements := data.get("requirements"):
            data = {
                **data,
                "requirements": [
                    self._add_default_requirement_parent(
                        requirement,
                        settings_id=settings_id,
                    )
                    for requirement in requirements
                ],
            }

        response = patch_method(user, f"{self._settings_endpoint}/{settings_id}", data, **kwargs)
        response_data = response.json() if response.content else None
        if response.ok and response_data:
            self._remember_settings(response_data)
        return response_data, response

    @staticmethod
    def _retained_base_requirement_payloads(
        settings: dict[str, Any],
    ) -> list[dict[str, Any]]:
        return [
            {"id": requirement["id"]}
            for requirement in settings["requirements"]
            if requirement["is_base"]
        ]

    def _get_report_data(self, user: str, report_id: int) -> dict[str, Any]:
        with make_api_client(user) as api_client:
            _, response = api_client.quality_api.retrieve_report_data(
                report_id, _parse_response=False
            )
            assert response.status == HTTPStatus.OK
            return json.loads(response.data)

    def _get_report_conflicts(self, user: str, report_id: int) -> list[dict[str, Any]]:
        response = get_method(user, "quality/conflicts", report_id=report_id)
        assert response.status_code == HTTPStatus.OK
        return response.json()["results"]

    def _get_task_labels_by_name(self, user: str, *, task_id: int) -> dict[str, Any]:
        with make_api_client(user) as api_client:
            labels, response = api_client.labels_api.list(task_id=task_id)
            assert response.status == HTTPStatus.OK
            return {label.name: label for label in labels.results}

    def _complete_job(self, user: str, job_id: int) -> None:
        with make_api_client(user) as api_client:
            _, response = api_client.jobs_api.partial_update(
                job_id,
                patched_job_write_request={
                    "stage": "acceptance",
                    "state": "completed",
                },
                _parse_response=False,
            )
            assert response.status == HTTPStatus.OK

    def _create_attribute_quality_task(
        self, user: str, *, name: str
    ) -> tuple[int, dict[str, Any], Any, Any, dict[str, int]]:
        task_id, _ = create_task(
            user,
            spec={
                "name": name,
                "labels": [
                    {
                        "name": "car",
                        "type": "rectangle",
                        "attributes": [
                            {
                                "name": "color",
                                "mutable": False,
                                "input_type": "select",
                                "default_value": "red",
                                "values": ["red", "blue"],
                            },
                            {
                                "name": "size",
                                "mutable": False,
                                "input_type": "select",
                                "default_value": "large",
                                "values": ["large", "small"],
                            },
                        ],
                    }
                ],
            },
            data={
                "image_quality": 70,
                "client_files": generate_image_files(1),
            },
        )
        settings = self._get_task_settings(user, task_id=task_id)
        gt_job = create_gt_job(user, task_id, complete=False)
        labels_by_name = self._get_task_labels_by_name(user, task_id=task_id)
        car_label = labels_by_name["car"]
        attribute_ids = {attribute.name: attribute.id for attribute in car_label.attributes}
        return task_id, settings, gt_job, car_label, attribute_ids

    def _create_attribute_comparison_example_task(
        self, user: str, *, name: str
    ) -> tuple[int, dict[str, Any], dict[str, int]]:
        task_id, _ = create_task(
            user,
            spec={
                "name": name,
                "labels": [
                    {
                        "name": "car",
                        "type": "rectangle",
                        "attributes": [
                            {
                                "name": "color",
                                "mutable": False,
                                "input_type": "select",
                                "default_value": "red",
                                "values": ["red", "blue"],
                            },
                            {
                                "name": "size",
                                "mutable": False,
                                "input_type": "select",
                                "default_value": "large",
                                "values": ["large", "small"],
                            },
                        ],
                    },
                    {
                        "name": "person",
                        "type": "rectangle",
                        "attributes": [
                            {
                                "name": "age",
                                "mutable": False,
                                "input_type": "number",
                                "default_value": "30",
                                "values": ["0", "120", "1"],
                            },
                        ],
                    },
                ],
            },
            data={
                "image_quality": 70,
                "client_files": generate_image_files(1),
            },
        )
        settings = self._get_task_settings(user, task_id=task_id)
        labels_by_name = self._get_task_labels_by_name(user, task_id=task_id)
        attribute_ids = {
            "Car.color": next(
                attribute.id
                for attribute in labels_by_name["car"].attributes
                if attribute.name == "color"
            ),
            "Car.size": next(
                attribute.id
                for attribute in labels_by_name["car"].attributes
                if attribute.name == "size"
            ),
            "Person.age": next(
                attribute.id
                for attribute in labels_by_name["person"].attributes
                if attribute.name == "age"
            ),
        }
        return task_id, settings, attribute_ids

    def _set_attribute_quality_annotations(
        self,
        user: str,
        *,
        task_id: int,
        gt_job_id: int,
        label_id: int,
        gt_attributes: list[dict[str, Any]],
        ds_attributes: list[dict[str, Any]],
    ) -> None:
        with make_api_client(user) as api_client:
            api_client.jobs_api.update_annotations(
                gt_job_id,
                labeled_data_request={
                    "shapes": [
                        self._build_rectangle_shape(
                            frame=0,
                            label_id=label_id,
                            points=[0, 0, 10, 10],
                            attributes=gt_attributes,
                        )
                    ]
                },
            )
            api_client.tasks_api.update_annotations(
                task_id,
                labeled_data_request={
                    "shapes": [
                        self._build_rectangle_shape(
                            frame=0,
                            label_id=label_id,
                            points=[0, 0, 10, 10],
                            attributes=ds_attributes,
                        )
                    ]
                },
            )

    @staticmethod
    def _build_rectangle_shape(
        *,
        frame: int,
        label_id: int,
        points: list[float],
        attributes: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        return {
            "frame": frame,
            "label_id": label_id,
            "points": points,
            "rotation": 0,
            "type": "rectangle",
            "occluded": False,
            "outside": False,
            "attributes": attributes or [],
        }


@pytest.mark.usefixtures("restore_db_per_function")
class TestQualityRequirementsApi(_QualityRequirementsTestBase):
    def test_all_target_metrics_can_be_created_updated_and_inherited(
        self, admin_user, find_sandbox_task_without_gt
    ):
        metrics = [
            "accuracy",
            "precision",
            "recall",
            "jaccard_index",
            "dice",
            "mean_accuracy",
            "mean_precision",
            "mean_recall",
            "mean_jaccard_index",
            "mean_dice",
            "label_accuracy",
            "label_precision",
            "label_recall",
            "label_jaccard_index",
            "label_dice",
        ]
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])

        created_requirements = []
        for metric in metrics:
            requirement, response = self._create_requirement(
                admin_user,
                self._build_requirement_payload(
                    f"metric-{metric}-{task['id']}",
                    settings_id=settings["id"],
                    metric=metric,
                ),
            )
            assert response.status_code == HTTPStatus.CREATED
            assert requirement["metric"] == metric
            created_requirements.append(requirement)

        updated_requirement, response = self._patch_requirement(
            admin_user,
            created_requirements[0]["id"],
            {"metric": "label_dice"},
        )
        assert response.status_code == HTTPStatus.OK
        assert updated_requirement["metric"] == "label_dice"

        child_payload = self._build_requirement_payload(
            f"inherited-metric-{task['id']}",
            settings_id=settings["id"],
            annotation_type=None,
            parent_requirement=created_requirements[3]["id"],
        )
        child_payload.pop("metric")
        child_requirement, response = self._create_requirement(admin_user, child_payload)

        assert response.status_code == HTTPStatus.CREATED
        assert child_requirement["metric"] is None
        assert child_requirement["effective"]["metric"] == "jaccard_index"

    def test_can_bulk_create_requirement_hierarchy(self, admin_user, find_sandbox_task_without_gt):
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])
        base_requirement = next(
            requirement
            for requirement in settings["requirements"]
            if requirement["annotation_type"] == "rectangle"
        )
        root_name = f"bulk-root-{task['id']}"
        child_name = f"bulk-child-{task['id']}"
        grandchild_name = f"bulk-grandchild-{task['id']}"
        sibling_name = f"bulk-sibling-{task['id']}"
        second_root_name = f"bulk-second-root-{task['id']}"

        created_requirements, response = self._bulk_create_requirements(
            admin_user,
            {
                "settings_id": settings["id"],
                "requirements": [
                    {
                        "name": root_name,
                        "parent_requirement": base_requirement["id"],
                        "unknown": True,
                        "children": [
                            {
                                "name": child_name,
                                "unknown": True,
                                "children": [{"name": grandchild_name, "unknown": True}],
                            },
                            {"name": sibling_name},
                        ],
                    },
                    {
                        "name": second_root_name,
                        "parent_requirement": base_requirement["id"],
                    },
                ],
            },
        )

        assert response.status_code == HTTPStatus.CREATED
        assert [requirement["name"] for requirement in created_requirements] == [
            root_name,
            child_name,
            grandchild_name,
            sibling_name,
            second_root_name,
        ]
        root, child, grandchild, sibling, second_root = created_requirements
        assert root["parent_requirement"] == base_requirement["id"]
        assert child["parent_requirement"] == root["id"]
        assert grandchild["parent_requirement"] == child["id"]
        assert sibling["parent_requirement"] == root["id"]
        assert second_root["parent_requirement"] == base_requirement["id"]
        assert all(
            requirement["settings_id"] == settings["id"] for requirement in created_requirements
        )
        assert all(
            requirement["effective"]["annotation_type"] == "rectangle"
            for requirement in created_requirements
        )

    def test_bulk_create_rolls_back_hierarchy_if_descendant_is_invalid(
        self, admin_user, find_sandbox_task_without_gt
    ):
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])
        base_requirement = next(
            requirement
            for requirement in settings["requirements"]
            if requirement["annotation_type"] == "rectangle"
        )
        root_name = f"bulk-rollback-root-{task['id']}"
        child_name = f"bulk-rollback-child-{task['id']}"

        _, response = self._bulk_create_requirements(
            admin_user,
            {
                "settings_id": settings["id"],
                "requirements": [
                    {
                        "name": root_name,
                        "parent_requirement": base_requirement["id"],
                        "children": [
                            {
                                "name": child_name,
                                "annotation_type": "skeleton",
                            }
                        ],
                    }
                ],
            },
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert "annotation_type" in json.dumps(response.json())
        listed_requirements, response = self._list_requirements(
            admin_user, settings_id=settings["id"]
        )
        assert response.status_code == HTTPStatus.OK
        assert not {root_name, child_name} & {
            requirement["name"] for requirement in listed_requirements
        }

    def test_bulk_create_rejects_parent_from_other_settings(
        self,
        admin_user,
        find_sandbox_task_without_gt,
        find_sandbox_project_without_validation,
    ):
        task, _ = find_sandbox_task_without_gt(True)
        task_settings = self._get_task_settings(admin_user, task_id=task["id"])
        project, _ = find_sandbox_project_without_validation(True)
        project_settings = self._get_project_settings(admin_user, project_id=project["id"])
        foreign_parent = project_settings["requirements"][0]

        _, response = self._bulk_create_requirements(
            admin_user,
            {
                "settings_id": task_settings["id"],
                "requirements": [
                    {
                        "name": f"bulk-foreign-parent-{task['id']}",
                        "parent_requirement": foreign_parent["id"],
                    }
                ],
            },
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert "selected quality settings" in json.dumps(response.json())

    def test_bulk_create_rejects_explicit_parent_for_nested_requirement(
        self, admin_user, find_sandbox_task_without_gt
    ):
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])
        base_requirement = settings["requirements"][0]

        _, response = self._bulk_create_requirements(
            admin_user,
            {
                "settings_id": settings["id"],
                "requirements": [
                    {
                        "name": f"bulk-explicit-parent-root-{task['id']}",
                        "parent_requirement": base_requirement["id"],
                        "children": [
                            {
                                "name": f"bulk-explicit-parent-child-{task['id']}",
                                "parent_requirement": base_requirement["id"],
                            }
                        ],
                    }
                ],
            },
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert "inherit their parent from the hierarchy" in json.dumps(response.json())

    def test_bulk_create_rejects_invalid_hierarchy_structure(
        self, admin_user, find_sandbox_task_without_gt
    ):
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])
        base_requirement = settings["requirements"][0]
        duplicate_name = f"bulk-duplicate-{task['id']}"
        cases = [
            ([], "empty"),
            ([{"parent_requirement": base_requirement["id"]}], "name"),
            ([{"name": f"bulk-missing-parent-{task['id']}"}], "root requirements"),
            (
                [
                    {
                        "name": duplicate_name,
                        "parent_requirement": base_requirement["id"],
                    },
                    {
                        "name": duplicate_name,
                        "parent_requirement": base_requirement["id"],
                    },
                ],
                "names must be unique",
            ),
            (
                [
                    {
                        "name": base_requirement["name"],
                        "parent_requirement": base_requirement["id"],
                    }
                ],
                "already exists",
            ),
        ]

        for requirements, error_text in cases:
            _, response = self._bulk_create_requirements(
                admin_user,
                {
                    "settings_id": settings["id"],
                    "requirements": requirements,
                },
            )

            assert response.status_code == HTTPStatus.BAD_REQUEST
            assert error_text in json.dumps(response.json()).lower()

    def test_bulk_create_rejects_payload_above_requirement_limit(
        self, admin_user, find_sandbox_task_without_gt
    ):
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])
        base_requirement = settings["requirements"][0]
        available_count = self._max_requirements_per_settings - len(settings["requirements"])

        _, response = self._bulk_create_requirements(
            admin_user,
            {
                "settings_id": settings["id"],
                "requirements": [
                    {
                        "name": f"bulk-limit-{task['id']}-{index}",
                        "parent_requirement": base_requirement["id"],
                    }
                    for index in range(available_count + 1)
                ],
            },
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert self._get_requirement_limit_error_message() in json.dumps(response.json())

    def test_can_crud_quality_requirements_for_task_settings(
        self, admin_user, find_sandbox_task_without_gt
    ):
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])

        requirement_name = f"api-requirement-{task['id']}-a"
        another_requirement_name = f"api-requirement-{task['id']}-b"

        created_requirement, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(requirement_name, settings_id=settings["id"]),
        )
        assert response.status_code == HTTPStatus.CREATED
        assert created_requirement["settings_id"] == settings["id"]
        assert created_requirement["name"] == requirement_name
        assert created_requirement["metric"] == "accuracy"
        assert "empty_is_annotated" not in created_requirement

        retrieved_requirement, response = self._retrieve_requirement(
            admin_user, created_requirement["id"]
        )
        assert response.status_code == HTTPStatus.OK
        assert DeepDiff(created_requirement, retrieved_requirement, ignore_order=True) == {}

        updated_requirement, response = self._patch_requirement(
            admin_user,
            created_requirement["id"],
            {
                "enabled": False,
                "required_score": 0.25,
            },
        )
        assert response.status_code == HTTPStatus.OK
        assert updated_requirement["enabled"] is False
        assert updated_requirement["required_score"] == 0.25

        another_requirement, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(
                another_requirement_name,
                settings_id=settings["id"],
                required_score=0.9,
            ),
        )
        assert response.status_code == HTTPStatus.CREATED

        listed_requirements, response = self._list_requirements(
            admin_user, settings_id=settings["id"]
        )
        assert response.status_code == HTTPStatus.OK
        listed_requirements_by_name = {
            requirement["name"]: requirement for requirement in listed_requirements
        }
        assert requirement_name in listed_requirements_by_name
        assert another_requirement_name in listed_requirements_by_name

        response = self._delete_requirement(admin_user, another_requirement["id"])
        assert response.status_code == HTTPStatus.NO_CONTENT

        listed_requirements, response = self._list_requirements(
            admin_user, settings_id=settings["id"]
        )
        assert response.status_code == HTTPStatus.OK
        listed_requirements_by_name = {
            requirement["name"]: requirement for requirement in listed_requirements
        }
        assert requirement_name in listed_requirements_by_name

    def test_can_crud_quality_requirements_for_project_settings(
        self, admin_user, find_sandbox_project_without_validation
    ):
        project, _ = find_sandbox_project_without_validation(True)
        settings = self._get_project_settings(admin_user, project_id=project["id"])

        requirement_name = f"project-api-requirement-{project['id']}"
        created_requirement, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(requirement_name, settings_id=settings["id"]),
        )
        assert response.status_code == HTTPStatus.CREATED
        assert created_requirement["settings_id"] == settings["id"]
        assert created_requirement["project_id"] == project["id"]
        assert created_requirement["task_id"] is None

        updated_requirement, response = self._patch_requirement(
            admin_user,
            created_requirement["id"],
            {"enabled": False, "required_score": 0.25},
        )
        assert response.status_code == HTTPStatus.OK
        assert updated_requirement["enabled"] is False
        assert updated_requirement["required_score"] == 0.25

        response = self._delete_requirement(admin_user, created_requirement["id"])
        assert response.status_code == HTTPStatus.NO_CONTENT

    def test_create_requirement_requires_settings_id(self, admin_user):
        _, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload("missing-settings-id"),
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert "settings_id" in response.json()

    def test_create_custom_requirement_requires_parent(
        self, admin_user, find_sandbox_task_without_gt
    ):
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])
        payload = self._build_requirement_payload(
            f"missing-parent-{task['id']}",
            settings_id=settings["id"],
        )

        response = post_method(admin_user, self._requirements_endpoint, payload)

        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert "parent_requirement" in response.json()

    def test_list_requirements_by_project_includes_project_and_task_settings(
        self, admin_user, find_sandbox_project_without_validation, tasks
    ):
        project, _ = find_sandbox_project_without_validation(True)
        task = next(t for t in tasks if t["project_id"] == project["id"] and t["size"])

        project_settings = self._get_project_settings(admin_user, project_id=project["id"])
        task_settings = self._get_task_settings(admin_user, task_id=task["id"])

        project_requirement_name = f"project-list-requirement-{project['id']}"
        task_requirement_name = f"task-list-requirement-{task['id']}"
        _, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(
                project_requirement_name,
                settings_id=project_settings["id"],
            ),
        )
        assert response.status_code == HTTPStatus.CREATED
        _, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(task_requirement_name, settings_id=task_settings["id"]),
        )
        assert response.status_code == HTTPStatus.CREATED

        listed_requirements, response = self._list_requirements(
            admin_user, project_id=project["id"]
        )
        assert response.status_code == HTTPStatus.OK

        listed_requirement_names = {requirement["name"] for requirement in listed_requirements}
        assert project_requirement_name in listed_requirement_names
        assert task_requirement_name in listed_requirement_names

    def test_requirement_uses_hld_comparison_field_names(
        self, admin_user, find_sandbox_task_without_gt
    ):
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])

        created_requirement, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(
                f"hld-fields-{task['id']}",
                settings_id=settings["id"],
                annotation_type="polyline",
                point_size=0.25,
                match_orientation=False,
                match_groups=False,
            ),
        )
        assert response.status_code == HTTPStatus.CREATED
        assert created_requirement["point_size"] == 0.25
        assert created_requirement["match_orientation"] is False
        assert created_requirement["match_groups"] is False

        updated_requirement, response = self._patch_requirement(
            admin_user,
            created_requirement["id"],
            {
                "point_size": 0.5,
                "match_orientation": True,
                "unknown": True,
                "attribute_comparison": {
                    "unknown": True,
                    "default": {"enabled": True, "unknown": True},
                },
                "match_groups": True,
            },
        )
        assert response.status_code == HTTPStatus.OK
        assert updated_requirement["point_size"] == 0.5
        assert updated_requirement["match_orientation"] is True
        assert updated_requirement["match_groups"] is True
        assert updated_requirement["attribute_comparison"] == {
            "default": {"enabled": True},
        }

    @pytest.mark.parametrize(
        "attribute_comparison",
        [
            {
                "rules": [
                    {"spec_id": 1, "enabled": True},
                    {"spec_id": "1", "enabled": False},
                ]
            },
            {"default": {"comparator": "unsupported"}},
            {"default": {"threshold": -0.1}},
            {"rules": [{"spec_id": 1, "enabled": True, "threshold": 1.1}]},
        ],
        ids=[
            "duplicate-spec-id",
            "unsupported-comparator",
            "default-threshold-out-of-range",
            "rule-threshold-out-of-range",
        ],
    )
    def test_create_requirement_rejects_invalid_attribute_comparison(
        self,
        admin_user: str,
        find_sandbox_task_without_gt: Any,
        attribute_comparison: dict[str, Any],
    ) -> None:
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])

        response_data, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(
                f"invalid-attribute-comparison-{task['id']}",
                settings_id=settings["id"],
                attribute_comparison=attribute_comparison,
            ),
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert "attribute_comparison" in response_data

    def test_attribute_comparison_examples_resolve_effective_state(self, admin_user):
        task_id, settings, attribute_ids = self._create_attribute_comparison_example_task(
            admin_user,
            name="attribute-comparison-examples",
        )
        rectangle_root_id = next(
            requirement["id"]
            for requirement in settings["requirements"]
            if requirement["name"] == self._base_requirement_name("rectangle")
        )

        def assert_attribute_comparison_state(
            requirement: dict[str, Any],
            *,
            stored: dict[str, Any] | None,
            effective: dict[str, Any],
        ) -> None:
            assert requirement["attribute_comparison"] == stored
            assert requirement["effective"]["attribute_comparison"] == effective
            assert "match_attributes" not in requirement
            assert "match_attributes" not in requirement["effective"]

        root_requirement, response = self._retrieve_requirement(admin_user, rectangle_root_id)
        assert response.status_code == HTTPStatus.OK
        assert root_requirement["name"] == self._base_requirement_name("rectangle")
        assert_attribute_comparison_state(
            root_requirement,
            stored=None,
            effective={"default": {"enabled": False}, "rules": []},
        )

        root_requirement, response = self._patch_requirement(
            admin_user,
            rectangle_root_id,
            {"attribute_comparison": {"default": {"enabled": True}}},
        )
        assert response.status_code == HTTPStatus.OK
        assert_attribute_comparison_state(
            root_requirement,
            stored={"default": {"enabled": True}},
            effective={"default": {"enabled": True}, "rules": []},
        )

        root_requirement, response = self._patch_requirement(
            admin_user,
            rectangle_root_id,
            {
                "attribute_comparison": {
                    "default": {"enabled": False},
                    "rules": [{"spec_id": attribute_ids["Car.size"], "enabled": True}],
                }
            },
        )
        assert response.status_code == HTTPStatus.OK
        assert_attribute_comparison_state(
            root_requirement,
            stored={
                "default": {"enabled": False},
                "rules": [{"spec_id": attribute_ids["Car.size"], "enabled": True}],
            },
            effective={
                "default": {"enabled": False},
                "rules": [{"spec_id": attribute_ids["Car.size"], "enabled": True}],
            },
        )

        root_requirement, response = self._patch_requirement(
            admin_user,
            rectangle_root_id,
            {
                "attribute_comparison": {
                    "default": {"enabled": True},
                    "rules": [{"spec_id": attribute_ids["Car.size"], "enabled": False}],
                }
            },
        )
        assert response.status_code == HTTPStatus.OK
        assert_attribute_comparison_state(
            root_requirement,
            stored={
                "default": {"enabled": True},
                "rules": [{"spec_id": attribute_ids["Car.size"], "enabled": False}],
            },
            effective={
                "default": {"enabled": True},
                "rules": [{"spec_id": attribute_ids["Car.size"], "enabled": False}],
            },
        )

        root_requirement, response = self._patch_requirement(
            admin_user,
            rectangle_root_id,
            {
                "attribute_comparison": {
                    "default": {"enabled": False},
                    "rules": [{"spec_id": attribute_ids["Car.color"], "enabled": True}],
                }
            },
        )
        assert response.status_code == HTTPStatus.OK
        assert_attribute_comparison_state(
            root_requirement,
            stored={
                "default": {"enabled": False},
                "rules": [{"spec_id": attribute_ids["Car.color"], "enabled": True}],
            },
            effective={
                "default": {"enabled": False},
                "rules": [{"spec_id": attribute_ids["Car.color"], "enabled": True}],
            },
        )

        child_requirement, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(
                f"person-age-{task_id}",
                settings_id=settings["id"],
                annotation_type=None,
                parent_requirement=rectangle_root_id,
                attribute_comparison={
                    "rules": [{"spec_id": attribute_ids["Person.age"], "enabled": True}],
                },
            ),
        )
        assert response.status_code == HTTPStatus.CREATED
        assert_attribute_comparison_state(
            child_requirement,
            stored={"rules": [{"spec_id": attribute_ids["Person.age"], "enabled": True}]},
            effective={
                "default": {"enabled": False},
                "rules": [
                    {"spec_id": attribute_ids["Car.color"], "enabled": True},
                    {"spec_id": attribute_ids["Person.age"], "enabled": True},
                ],
            },
        )

    def test_settings_patch_can_replace_requirements(
        self, admin_user, find_sandbox_task_without_gt
    ):
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])
        retained_base_requirements = self._retained_base_requirement_payloads(settings)

        first_payload = self._build_requirement_payload(
            f"replace-{task['id']}-a",
            enabled=True,
            required_score=0.0,
        )
        second_payload = self._build_requirement_payload(
            f"replace-{task['id']}-b",
            enabled=False,
            required_score=1.0,
        )
        patched_settings, response = self._patch_settings(
            admin_user,
            settings["id"],
            {
                "inherit": False,
                "requirements": [*retained_base_requirements, first_payload, second_payload],
            },
        )
        assert response.status_code == HTTPStatus.OK
        assert patched_settings["inherit"] is False
        patched_requirement_names = {
            requirement["name"] for requirement in patched_settings["requirements"]
        }
        assert first_payload["name"] in patched_requirement_names
        assert second_payload["name"] in patched_requirement_names
        assert {
            requirement["name"]
            for requirement in patched_settings["requirements"]
            if requirement["is_base"]
        } == {
            self._base_requirement_name(annotation_type)
            for annotation_type in self._base_standalone_annotation_types
        }

        replacement_payload = self._build_requirement_payload(
            f"replace-{task['id']}-final",
            enabled=True,
            required_score=0.3,
        )
        patched_settings, response = self._patch_settings(
            admin_user,
            settings["id"],
            {
                "requirements": [
                    *self._retained_base_requirement_payloads(patched_settings),
                    replacement_payload,
                ]
            },
        )
        assert response.status_code == HTTPStatus.OK
        assert {
            requirement["name"]
            for requirement in patched_settings["requirements"]
            if not requirement["is_base"]
        } == {replacement_payload["name"]}

        listed_requirements, response = self._list_requirements(
            admin_user, settings_id=settings["id"]
        )
        assert response.status_code == HTTPStatus.OK
        assert {
            requirement["name"] for requirement in listed_requirements if not requirement["is_base"]
        } == {replacement_payload["name"]}

    def test_settings_patch_can_repeat_replacement_with_new_requirement(
        self, admin_user, find_sandbox_task_without_gt
    ):
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])
        requirement_name = f"repeat-replacement-{task['id']}"
        payload = {
            "requirements": [
                *self._retained_base_requirement_payloads(settings),
                self._build_requirement_payload(requirement_name),
            ]
        }

        first_result, first_response = self._patch_settings(
            admin_user,
            settings["id"],
            payload,
        )
        second_result, second_response = self._patch_settings(
            admin_user,
            settings["id"],
            payload,
        )

        assert first_response.status_code == HTTPStatus.OK
        assert second_response.status_code == HTTPStatus.OK
        assert (
            sum(
                requirement["name"] == requirement_name
                for requirement in first_result["requirements"]
            )
            == 1
        )
        assert (
            sum(
                requirement["name"] == requirement_name
                for requirement in second_result["requirements"]
            )
            == 1
        )

    def test_settings_patch_saves_parent_requirements_before_children(
        self, admin_user, find_sandbox_task_without_gt
    ):
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])
        skeleton_base = next(
            requirement
            for requirement in settings["requirements"]
            if requirement["annotation_type"] == "skeleton_keypoint"
        )

        parent_requirement, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(
                f"bulk-parent-{task['id']}",
                settings_id=settings["id"],
                annotation_type="rectangle",
            ),
        )
        assert response.status_code == HTTPStatus.CREATED

        child_requirement, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(
                f"bulk-child-{task['id']}",
                settings_id=settings["id"],
                annotation_type=None,
                parent_requirement=parent_requirement["id"],
            ),
        )
        assert response.status_code == HTTPStatus.CREATED

        patched_settings, response = self._patch_settings(
            admin_user,
            settings["id"],
            {
                "requirements": [
                    *self._retained_base_requirement_payloads(settings),
                    {
                        "id": child_requirement["id"],
                        "annotation_type": "skeleton_keypoint",
                        "parent_requirement": parent_requirement["id"],
                    },
                    {
                        "id": parent_requirement["id"],
                        "parent_requirement": skeleton_base["id"],
                    },
                ]
            },
        )

        assert response.status_code == HTTPStatus.OK
        patched_child_requirement = next(
            requirement
            for requirement in patched_settings["requirements"]
            if requirement["id"] == child_requirement["id"]
        )
        assert patched_child_requirement["annotation_type"] is None

        child_requirement, response = self._retrieve_requirement(
            admin_user, child_requirement["id"]
        )
        assert response.status_code == HTTPStatus.OK
        assert child_requirement["effective"]["annotation_type"] == "skeleton_keypoint"

    def test_cannot_change_base_requirement_parent_or_type(
        self, admin_user, find_sandbox_task_without_gt
    ):
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])
        rectangle_base = next(
            requirement
            for requirement in settings["requirements"]
            if requirement["annotation_type"] == "rectangle"
        )
        skeleton_base = next(
            requirement
            for requirement in settings["requirements"]
            if requirement["annotation_type"] == "skeleton"
        )

        _, response = self._patch_requirement(
            admin_user,
            rectangle_base["id"],
            {"parent_requirement": skeleton_base["id"]},
        )
        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert "parent_requirement" in response.json()

        _, response = self._patch_requirement(
            admin_user,
            rectangle_base["id"],
            {"annotation_type": "skeleton"},
        )
        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert "annotation_type" in response.json()

    def test_patch_requirement_preserves_overrides_when_reparenting_child(
        self, admin_user, find_sandbox_task_without_gt
    ):
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])

        parent_payload = self._build_requirement_payload(
            f"root-to-child-parent-{task['id']}",
            settings_id=settings["id"],
            annotation_type="rectangle",
            point_size=0.1,
            match_groups=True,
        )
        parent_payload["iou_threshold"] = 0.25
        parent_requirement, response = self._create_requirement(admin_user, parent_payload)
        assert response.status_code == HTTPStatus.CREATED

        requirement_payload = self._build_requirement_payload(
            f"root-to-child-{task['id']}",
            settings_id=settings["id"],
            annotation_type="rectangle",
            point_size=0.7,
            match_groups=False,
        )
        requirement_payload["iou_threshold"] = 0.9
        requirement, response = self._create_requirement(admin_user, requirement_payload)
        assert response.status_code == HTTPStatus.CREATED

        patched_requirement, response = self._patch_requirement(
            admin_user,
            requirement["id"],
            {"parent_requirement": parent_requirement["id"]},
        )
        assert response.status_code == HTTPStatus.OK

        assert patched_requirement["annotation_type"] is None
        assert patched_requirement["iou_threshold"] == requirement_payload["iou_threshold"]
        assert patched_requirement["point_size"] == requirement_payload["point_size"]
        assert patched_requirement["match_groups"] is False

    def test_cannot_detach_custom_requirement_from_parent(
        self, admin_user, find_sandbox_task_without_gt
    ):
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])

        parent_requirement, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(
                f"child-to-root-parent-{task['id']}",
                settings_id=settings["id"],
                annotation_type="rectangle",
            ),
        )
        assert response.status_code == HTTPStatus.CREATED

        child_requirement, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(
                f"child-to-root-{task['id']}",
                settings_id=settings["id"],
                annotation_type=None,
                parent_requirement=parent_requirement["id"],
            ),
        )
        assert response.status_code == HTTPStatus.CREATED
        assert child_requirement["iou_threshold"] is None
        assert child_requirement["point_size"] is None

        _, response = self._patch_requirement(
            admin_user,
            child_requirement["id"],
            {
                "parent_requirement": None,
                "annotation_type": "rectangle",
            },
        )
        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert "parent_requirement" in response.json()

    def test_settings_patch_cannot_delete_base_requirements(
        self, admin_user, find_sandbox_task_without_gt
    ):
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])

        _, response = self._patch_settings(
            admin_user,
            settings["id"],
            {
                "requirements": [
                    self._build_requirement_payload(
                        f"delete-bases-{task['id']}",
                        enabled=True,
                    )
                ]
            },
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert "base quality requirements" in json.dumps(response.json()).lower()

    def test_cannot_create_requirement_above_limit(self, admin_user, find_sandbox_task_without_gt):
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])
        retained_base_requirements = self._retained_base_requirement_payloads(settings)

        filled_requirements = self._build_requirement_payloads(
            f"limit-fill-{task['id']}",
            self._max_requirements_per_settings - len(retained_base_requirements),
        )
        patched_settings, response = self._patch_settings(
            admin_user,
            settings["id"],
            {"requirements": [*retained_base_requirements, *filled_requirements]},
        )
        assert response.status_code == HTTPStatus.OK
        assert len(patched_settings["requirements"]) == self._max_requirements_per_settings

        _, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(
                f"limit-overflow-{task['id']}",
                settings_id=settings["id"],
            ),
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert response.json()["settings_id"] == [self._get_requirement_limit_error_message()]

    def test_settings_patch_rejects_payload_above_limit(
        self, admin_user, find_sandbox_task_without_gt
    ):
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])
        retained_base_requirements = self._retained_base_requirement_payloads(settings)

        _, response = self._patch_settings(
            admin_user,
            settings["id"],
            {
                "requirements": [
                    *retained_base_requirements,
                    *self._build_requirement_payloads(
                        f"limit-payload-{task['id']}",
                        self._max_requirements_per_settings - len(retained_base_requirements) + 1,
                    ),
                ]
            },
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert response.json()["requirements"]["non_field_errors"] == [
            self._get_requirement_limit_error_message()
        ]

    def test_cannot_delete_base_quality_requirement(self, admin_user, find_sandbox_task_without_gt):
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])
        base_requirement = next(
            requirement for requirement in settings["requirements"] if requirement["is_base"]
        )

        response = self._delete_requirement(admin_user, base_requirement["id"])

        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert "base quality requirements" in json.dumps(response.json()).lower()

    def test_create_child_requirement_accepts_parent_filter_terms(
        self, admin_user, find_sandbox_task_without_gt
    ):
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])

        parent_requirement, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(
                f"skeleton-parent-{task['id']}",
                settings_id=settings["id"],
                annotation_type="skeleton_keypoint",
            ),
        )
        assert response.status_code == HTTPStatus.CREATED

        created_requirement, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(
                f"skeleton-child-filter-{task['id']}",
                settings_id=settings["id"],
                annotation_type=None,
                parent_requirement=parent_requirement["id"],
                filter_expression=json.dumps({"==": [{"var": "shape.skeleton.label"}, "person"]}),
            ),
        )

        assert response.status_code == HTTPStatus.CREATED
        assert created_requirement["annotation_type"] is None
        assert created_requirement["effective"]["annotation_type"] == "skeleton_keypoint"
        assert created_requirement["parent_requirement"] == parent_requirement["id"]
        assert created_requirement["filter"] == json.dumps(
            {"==": [{"var": "shape.skeleton.label"}, "person"]}
        )

        listed_requirements, response = self._list_requirements(
            admin_user, settings_id=settings["id"]
        )
        assert response.status_code == HTTPStatus.OK
        listed_child = next(
            requirement
            for requirement in listed_requirements
            if requirement["id"] == created_requirement["id"]
        )
        assert "effective" not in listed_child
        assert listed_child["annotation_type"] is None
        assert listed_child["parent_requirement"] == parent_requirement["id"]

        retrieved_requirement, response = self._retrieve_requirement(
            admin_user, created_requirement["id"]
        )
        assert response.status_code == HTTPStatus.OK
        assert retrieved_requirement["annotation_type"] is None
        assert retrieved_requirement["effective"]["annotation_type"] == "skeleton_keypoint"
        assert retrieved_requirement["effective"]["filter"] == json.dumps(
            {"==": [{"var": "shape.skeleton.label"}, "person"]}
        )

    def test_create_requirement_rejects_attribute_root_terms_for_shape_requirements(
        self, admin_user, find_sandbox_task_without_gt
    ):
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])

        _, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(
                f"invalid-shape-filter-{task['id']}",
                settings_id=settings["id"],
                annotation_type="rectangle",
                filter_expression=json.dumps({"==": [{"var": "attribute.name"}, "color"]}),
            ),
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert "attribute.name" in json.dumps(response.json())

    def test_create_attribute_requirement_is_rejected(
        self, admin_user, find_sandbox_task_without_gt
    ):
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])

        _, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(
                f"attribute-rejected-{task['id']}",
                settings_id=settings["id"],
                annotation_type="attribute",
            ),
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert "attribute" in json.dumps(response.json())

    def test_patch_requirement_validates_filter_using_existing_annotation_type(
        self, admin_user, find_sandbox_task_without_gt
    ):
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])

        created_requirement, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(
                f"patch-filter-{task['id']}",
                settings_id=settings["id"],
                annotation_type="rectangle",
            ),
        )
        assert response.status_code == HTTPStatus.CREATED

        _, response = self._patch_requirement(
            admin_user,
            created_requirement["id"],
            {
                "filter": json.dumps({"==": [{"var": "attribute.name"}, "color"]}),
            },
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert "attribute.name" in json.dumps(response.json())

    @pytest.mark.parametrize(*_PermissionTestBase._default_sandbox_cases)
    def test_user_list_requirements_in_sandbox(
        self, admin_user, find_sandbox_task_without_gt, is_staff, allow
    ):
        task, user = find_sandbox_task_without_gt(is_staff)
        settings = self._get_task_settings(admin_user, task_id=task["id"])
        requirement_name = f"list-permission-{task['id']}"
        _, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(requirement_name, settings_id=settings["id"]),
        )
        assert response.status_code == HTTPStatus.CREATED

        listed_requirements, response = self._list_requirements(
            user["username"], task_id=task["id"]
        )
        assert response.status_code == (HTTPStatus.OK if allow else HTTPStatus.FORBIDDEN)
        if allow:
            assert any(
                requirement["name"] == requirement_name for requirement in listed_requirements
            )

    @pytest.mark.parametrize(*_PermissionTestBase._default_sandbox_cases)
    def test_user_list_requirements_by_settings_in_sandbox(
        self, admin_user, find_sandbox_task_without_gt, is_staff, allow
    ):
        task, user = find_sandbox_task_without_gt(is_staff)
        settings = self._get_task_settings(admin_user, task_id=task["id"])
        requirement_name = f"list-settings-permission-{task['id']}"
        _, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(requirement_name, settings_id=settings["id"]),
        )
        assert response.status_code == HTTPStatus.CREATED

        listed_requirements, response = self._list_requirements(
            user["username"], settings_id=settings["id"]
        )
        assert response.status_code == (HTTPStatus.OK if allow else HTTPStatus.FORBIDDEN)
        if allow:
            assert any(
                requirement["name"] == requirement_name for requirement in listed_requirements
            )

    @pytest.mark.parametrize(*_PermissionTestBase._default_org_cases)
    def test_user_list_requirements_in_org_project(
        self,
        admin_user,
        find_org_project_without_validation,
        org_role,
        is_staff,
        allow,
    ):
        project, user = find_org_project_without_validation(is_staff, org_role)
        org_id = project["organization"]
        settings = self._get_project_settings(admin_user, project_id=project["id"], org_id=org_id)
        requirement_name = f"list-org-project-permission-{project['id']}-{user['id']}"
        _, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(requirement_name, settings_id=settings["id"]),
            org_id=org_id,
        )
        assert response.status_code == HTTPStatus.CREATED

        listed_requirements, response = self._list_requirements(
            user["username"], project_id=project["id"], org_id=org_id
        )
        assert response.status_code == (HTTPStatus.OK if allow else HTTPStatus.FORBIDDEN)
        if allow:
            assert any(
                requirement["name"] == requirement_name for requirement in listed_requirements
            )

    @pytest.mark.parametrize(*_PermissionTestBase._default_sandbox_cases)
    def test_user_create_requirement_in_sandbox(
        self, admin_user, find_sandbox_task_without_gt, is_staff, allow
    ):
        task, user = find_sandbox_task_without_gt(is_staff)
        settings = self._get_task_settings(admin_user, task_id=task["id"])
        payload = self._build_requirement_payload(
            f"create-permission-{task['id']}-{user['id']}",
            settings_id=settings["id"],
        )

        _, response = self._create_requirement(user["username"], payload)
        assert response.status_code == (HTTPStatus.CREATED if allow else HTTPStatus.FORBIDDEN)

    @pytest.mark.parametrize(*_PermissionTestBase._default_sandbox_cases)
    def test_user_bulk_create_requirements_in_sandbox(
        self, admin_user, find_sandbox_task_without_gt, is_staff, allow
    ):
        task, user = find_sandbox_task_without_gt(is_staff)
        settings = self._get_task_settings(admin_user, task_id=task["id"])
        base_requirement = settings["requirements"][0]

        _, response = self._bulk_create_requirements(
            user["username"],
            {
                "settings_id": settings["id"],
                "requirements": [
                    {
                        "name": f"bulk-permission-{task['id']}-{user['id']}",
                        "parent_requirement": base_requirement["id"],
                    }
                ],
            },
        )

        assert response.status_code == (HTTPStatus.CREATED if allow else HTTPStatus.FORBIDDEN)


@pytest.mark.usefixtures("restore_db_per_function")
class TestIoUThresholdPolicies(_QualityRequirementsTestBase):
    @pytest.fixture
    def root_requirement(self, admin_user, find_sandbox_task_without_gt):
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])
        return next(
            requirement
            for requirement in settings["requirements"]
            if requirement["is_base"] and requirement["annotation_type"] == "rectangle"
        )

    @pytest.mark.parametrize(
        "policy",
        [_IOU_LINEAR_POLICY, {"type": "iou", "mode": "constant", "value": 0.7}],
        ids=["linear", "constant"],
    )
    @pytest.mark.parametrize("legacy", [False, True], ids=["typed", "without-type"])
    def test_iou_policy_round_trip_and_inheritance(
        self, admin_user, root_requirement, policy, legacy
    ):
        request_policy = {
            key: value for key, value in policy.items() if not legacy or key != "type"
        }
        parent, response = self._patch_requirement(
            admin_user,
            root_requirement["id"],
            {"similarity_threshold_policy": request_policy},
        )
        assert response.status_code == HTTPStatus.OK
        expected_scalar = policy.get("value")
        retrieved, response = self._retrieve_requirement(admin_user, parent["id"])
        assert response.status_code == HTTPStatus.OK
        for requirement in [parent, retrieved]:
            assert requirement["similarity_threshold_policy"] == policy
            assert requirement["effective"]["similarity_threshold_policy"] == policy
            assert requirement["iou_threshold"] == expected_scalar

        local, response = self._create_requirement(
            admin_user,
            {
                **self._build_requirement_payload(
                    "local-iou-policy",
                    settings_id=parent["settings_id"],
                    parent_requirement=parent["id"],
                    annotation_type=None,
                ),
                "similarity_threshold_policy": request_policy,
            },
        )
        assert response.status_code == HTTPStatus.CREATED
        assert local["similarity_threshold_policy"] == policy
        assert local["effective"]["similarity_threshold_policy"] == policy

        child, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(
                "inherited-iou-policy",
                settings_id=parent["settings_id"],
                parent_requirement=parent["id"],
                annotation_type=None,
            ),
        )
        assert response.status_code == HTTPStatus.CREATED
        assert child["similarity_threshold_policy"] is None
        assert child["effective"]["similarity_threshold_policy"] == policy

        override = {"type": "iou", "mode": "constant", "value": 0.6}
        child, response = self._patch_requirement(
            admin_user, child["id"], {"similarity_threshold_policy": override}
        )
        assert response.status_code == HTTPStatus.OK
        assert child["iou_threshold"] == 0.6
        assert child["effective"]["similarity_threshold_policy"] == override
        child, response = self._patch_requirement(
            admin_user, child["id"], {"similarity_threshold_policy": None}
        )
        assert response.status_code == HTTPStatus.OK
        assert child["iou_threshold"] is None
        assert child["effective"]["similarity_threshold_policy"] == policy

    def test_iou_policy_constant_and_legacy_scalar_updates(self, admin_user, root_requirement):
        constant = {"type": "iou", "mode": "constant", "value": 0.6}
        requirement, response = self._patch_requirement(
            admin_user, root_requirement["id"], {"similarity_threshold_policy": constant}
        )
        assert response.status_code == HTTPStatus.OK
        assert requirement["iou_threshold"] == 0.6
        requirement, response = self._patch_requirement(
            admin_user, requirement["id"], {"iou_threshold": 0.3}
        )
        assert response.status_code == HTTPStatus.OK
        assert requirement["similarity_threshold_policy"] is None
        assert requirement["effective"]["similarity_threshold_policy"] == {
            "type": "iou",
            "mode": "constant",
            "value": 0.3,
        }

    def test_iou_policy_legacy_scalar_cannot_replace_curve(self, admin_user, root_requirement):
        requirement, response = self._patch_requirement(
            admin_user, root_requirement["id"], {"similarity_threshold_policy": _IOU_LINEAR_POLICY}
        )
        assert response.status_code == HTTPStatus.OK
        error, response = self._patch_requirement(
            admin_user, requirement["id"], {"iou_threshold": 0.5}
        )
        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert "iou_threshold" in error
        requirement, response = self._patch_requirement(
            admin_user, requirement["id"], {"enabled": True}
        )
        assert response.status_code == HTTPStatus.OK
        assert requirement["similarity_threshold_policy"] == _IOU_LINEAR_POLICY

    @pytest.mark.parametrize(
        "policy",
        [
            {},
            {"type": "iou", "mode": "step"},
            {"type": "iou", "mode": "constant", "value": True},
            {"type": "iou", "mode": "constant", "value": -0.1},
            {"type": "iou", "mode": "constant", "value": 1.1},
            {"type": "iou", "mode": "constant", "value": 10**500},
            {"type": "iou", "mode": "constant", "value": 0.7, "points": []},
            *[
                {**policy, "type": value}
                for policy in [_IOU_LINEAR_POLICY, {"mode": "constant", "value": 0.7}]
                for value in ["oks", "unknown", None, "", 1]
            ],
            {**_IOU_LINEAR_POLICY, "input": "ds.area"},
            {**_IOU_LINEAR_POLICY, "extrapolation": "continue"},
            {**_IOU_LINEAR_POLICY, "unexpected": 1},
            {**_IOU_LINEAR_POLICY, "points": []},
            {**_IOU_LINEAR_POLICY, "points": [{"x": 100, "y": 0.4}]},
            {**_IOU_LINEAR_POLICY, "points": [{"x": 100, "y": 0.4}, {"x": 100, "y": 0.9}]},
            {**_IOU_LINEAR_POLICY, "points": [{"x": 0, "y": 0.4}, {"x": 1000, "y": 0.9}]},
            {**_IOU_LINEAR_POLICY, "points": [{"x": 100, "y": -0.1}, {"x": 1000, "y": 1.1}]},
            {**_IOU_LINEAR_POLICY, "points": list(reversed(_IOU_LINEAR_POLICY["points"]))},
            {**_IOU_LINEAR_POLICY, "points": [{"x": i + 1, "y": 0.5} for i in range(201)]},
        ],
    )
    def test_iou_policy_rejects_invalid_json(self, admin_user, root_requirement, policy):
        error, response = self._patch_requirement(
            admin_user, root_requirement["id"], {"similarity_threshold_policy": policy}
        )
        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert "similarity_threshold_policy" in error

    def test_iou_policy_rejects_conflicting_scalar_and_root_reset(
        self, admin_user, root_requirement
    ):
        for payload in [
            {"similarity_threshold_policy": _IOU_LINEAR_POLICY, "iou_threshold": 0.7},
            {"similarity_threshold_policy": None},
        ]:
            error, response = self._patch_requirement(admin_user, root_requirement["id"], payload)
            assert response.status_code == HTTPStatus.BAD_REQUEST
            assert "similarity_threshold_policy" in error

    def test_iou_policy_rejects_unsupported_annotation_type(self, admin_user, root_requirement):
        requirements, response = self._list_requirements(
            admin_user, settings_id=root_requirement["settings_id"]
        )
        assert response.status_code == HTTPStatus.OK
        points = next(
            requirement
            for requirement in requirements
            if requirement["annotation_type"] == "points"
        )
        error, response = self._patch_requirement(
            admin_user, points["id"], {"similarity_threshold_policy": _IOU_LINEAR_POLICY}
        )
        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert "similarity_threshold_policy" in error

    def test_iou_policy_settings_replacement_preserves_curve(self, admin_user, root_requirement):
        settings, response = self._patch_settings(
            admin_user,
            root_requirement["settings_id"],
            {
                "requirements": [
                    {
                        "id": requirement["id"],
                        **(
                            {"similarity_threshold_policy": _IOU_LINEAR_POLICY}
                            if requirement["id"] == root_requirement["id"]
                            else {}
                        ),
                    }
                    for requirement in self._list_requirements(
                        admin_user, settings_id=root_requirement["settings_id"]
                    )[0]
                ]
            },
        )
        assert response.status_code == HTTPStatus.OK
        root = next(
            requirement
            for requirement in settings["requirements"]
            if requirement["id"] == root_requirement["id"]
        )
        assert root["similarity_threshold_policy"] == _IOU_LINEAR_POLICY

    @staticmethod
    def _shape(points, *, annotation_type="rectangle", label=0, frame=0, group=0, z_order=0):
        return {
            "frame": frame,
            "label_id": label,
            "type": annotation_type,
            "points": points,
            "rotation": 0,
            "occluded": False,
            "outside": False,
            "attributes": [],
            "group": group,
            "z_order": z_order,
        }

    def _report(self, user, gt, ds, *, annotation_type="rectangle", policy=None, panoptic=False):
        frame_count = max(shape["frame"] for shape in gt) + 1
        task_id, _ = create_task(
            user,
            spec={
                "name": "iou-interpolation-report",
                "labels": [
                    {"name": "object", "type": annotation_type},
                    {"name": "occluder", "type": annotation_type},
                ],
            },
            data={
                "image_quality": 70,
                "client_files": generate_image_files(frame_count, sizes=[(512, 512)] * frame_count),
            },
        )
        settings = self._get_task_settings(user, task_id=task_id)
        _, response = self._patch_settings(user, settings["id"], {"inherit": False})
        assert response.status_code == HTTPStatus.OK
        root = next(
            requirement
            for requirement in settings["requirements"]
            if requirement["annotation_type"] == annotation_type
        )
        root, response = self._patch_requirement(
            user,
            root["id"],
            {
                "enabled": True,
                "similarity_threshold_policy": policy or _IOU_LINEAR_POLICY,
                "panoptic_comparison": panoptic,
                "check_covered_annotations": False,
            },
        )
        assert response.status_code == HTTPStatus.OK
        labels = self._get_task_labels_by_name(user, task_id=task_id)
        label_ids = [labels["object"].id, labels["occluder"].id]
        with make_api_client(user) as client:
            if frame_count == 1:
                gt_job = create_gt_job(user, task_id, complete=False)
            else:
                gt_job, response = client.jobs_api.create(
                    {
                        "type": "ground_truth",
                        "task_id": task_id,
                        "frame_selection_method": "manual",
                        "frames": list(range(frame_count)),
                    }
                )
                assert response.status == HTTPStatus.CREATED
            for api, object_id, shapes in [
                (client.jobs_api, gt_job.id, gt),
                (client.tasks_api, task_id, ds),
            ]:
                _, response = api.update_annotations(
                    object_id,
                    labeled_data_request={
                        "shapes": [
                            {**shape, "label_id": label_ids[shape["label_id"]]} for shape in shapes
                        ],
                    },
                )
                assert response.status == HTTPStatus.OK
        self._complete_job(user, gt_job.id)
        report = create_quality_report(user=user, task_id=task_id)
        data = self._get_report_data(user, report["id"])
        return report, data["groups"][root["name"]]

    @pytest.mark.parametrize(
        "fixture", _IOU_POLICY_FIXTURES, ids=["constant", "linear", "decreasing", "zero-one"]
    )
    def test_iou_policy_report_interpolates_each_segment_and_clamps(self, admin_user, fixture):
        gt, ds = [], []
        for area, threshold in fixture["cases"]:
            side = math.sqrt(area if area is not None else 100)
            for accepted in [False, True]:
                index = len(gt)
                x, y = 5 + (index % 4) * 120, 5 + (index // 4) * 120
                gt.append(self._shape([x, y, x + side, y + side]))
                similarity = min(1, threshold + 0.02) if accepted else max(0, threshold - 0.02)
                ds.append(
                    self._shape(
                        [x, y, x + side * similarity, y + side]
                        if similarity
                        else [x + side + 5, y, x + side + 10, y + side]
                    )
                )
        report, group = self._report(admin_user, gt, ds, policy=fixture["policy"])
        count = len(fixture["cases"])
        assert group["comparison_summary"]["score_components"] == {
            "valid_count": count,
            "missing_count": count,
            "extra_count": count,
        }
        parameters = group["parameters"]
        assert parameters["similarity_threshold_policy"] == fixture["policy"]
        if fixture["policy"]["mode"] == "linear":
            assert parameters["similarity_threshold_input"] == {
                "name": "gt.shape_area",
                "units": "px²",
            }
        _, response = self._patch_requirement(
            admin_user,
            parameters["requirement_id"],
            {
                "similarity_threshold_policy": {"type": "iou", "mode": "constant", "value": 0.5},
            },
        )
        assert response.status_code == HTTPStatus.OK
        saved_group = self._get_report_data(admin_user, report["id"])["groups"][parameters["name"]]
        assert saved_group["parameters"]["similarity_threshold_policy"] == fixture["policy"]

    def test_iou_policy_report_matches_99_101_pair_and_counts_duplicate(self, admin_user):
        ds = self._shape([7.4, 5, 17.5, 15])
        _, group = self._report(admin_user, [self._shape([5, 5, 14.9, 15])], [ds, deepcopy(ds)])
        assert group["comparison_summary"]["score_components"] == {
            "valid_count": 1,
            "missing_count": 0,
            "extra_count": 1,
        }

    def test_iou_policy_report_accepts_small_gt_and_rejects_large_gt(self, admin_user):
        _, group = self._report(
            admin_user,
            [self._shape([0, 0, 10, 10]), self._shape([0, 25, 50, 45])],
            [self._shape([1, 0, 11, 10]), self._shape([5, 25, 45, 45])],
        )
        assert group["comparison_summary"]["score_components"] == {
            "valid_count": 1,
            "missing_count": 1,
            "extra_count": 1,
        }

    @pytest.mark.parametrize("annotation_type", ["polygon", "mask"])
    def test_iou_policy_report_uses_shape_area_instead_of_bbox(self, admin_user, annotation_type):
        if annotation_type == "polygon":
            gt, ds = [5, 5, 25, 5, 5, 25], [5, 5, 15.5, 5, 5, 25]
        else:
            gt_image = np.zeros((50, 50), dtype=bool)
            gt_image[5:10, 5:15] = gt_image[15:20, 5:15] = True
            ds_image = np.zeros_like(gt_image)
            ds_image[5:9, 5:15] = ds_image[9, 5] = True
            gt, ds = encode_mask(gt_image), encode_mask(ds_image)
        _, group = self._report(
            admin_user,
            [self._shape(gt, annotation_type=annotation_type)],
            [self._shape(ds, annotation_type=annotation_type)],
            annotation_type=annotation_type,
        )
        assert group["comparison_summary"]["score_components"] == {
            "valid_count": 1,
            "missing_count": 0,
            "extra_count": 0,
        }

    def test_iou_policy_report_uses_union_area_for_grouped_polygons(self, admin_user):
        _, group = self._report(
            admin_user,
            [
                self._shape(points, annotation_type="polygon", group=1)
                for points in [
                    [0, 0, 20, 0, 20, 10, 0, 10],
                    [10, 0, 30, 0, 30, 10, 10, 10],
                ]
            ],
            [self._shape([0, 0, 16, 0, 16, 10, 0, 10], annotation_type="polygon", group=1)],
            annotation_type="polygon",
            panoptic=True,
        )
        # Union area 300 requires 0.511; summing the two areas would require 0.567.
        assert group["comparison_summary"]["score"] == 1

    @pytest.mark.parametrize("annotation_type", ["polygon", "mask"])
    def test_iou_policy_report_uses_original_area_before_panoptic_occlusion(
        self, admin_user, annotation_type
    ):
        def shape(left, label, z_order):
            if annotation_type == "polygon":
                points = [left, 0, 20, 0, 20, 20, left, 20]
            else:
                image = np.zeros((50, 50), dtype=bool)
                image[:20, left:20] = True
                points = encode_mask(image)
            return self._shape(
                points, annotation_type=annotation_type, label=label, z_order=z_order
            )

        occluder = shape(2, 1, 1)
        _, group = self._report(
            admin_user,
            [shape(0, 0, 0), occluder],
            [shape(1, 0, 0), deepcopy(occluder)],
            annotation_type=annotation_type,
            panoptic=True,
        )
        assert group["comparison_summary"]["score_components"] == {
            "valid_count": 1,
            "missing_count": 1,
            "extra_count": 1,
        }

    def test_iou_policy_report_invalid_gt_area_prevents_completion(self, admin_user):
        valid = self._shape([5, 5, 15, 15], frame=1)
        report, group = self._report(
            admin_user, [self._shape([0, 0, 0, 10]), valid], [deepcopy(valid)]
        )
        assert group["frame_results"]["0"]["calculation"]["invalid_gt_count"] == 1
        assert group["frame_results"]["1"]["calculation"]["status"] == "computed"
        assert group["comparison_summary"]["calculation"]["reason"] == "invalid_gt_area"
        assert group["comparison_summary"]["score"] is None
        summary = report["summary"]["requirements"]
        assert summary["completed"] == 0
        assert summary["not_computed"] == 1


@pytest.mark.usefixtures("restore_db_per_function")
class TestBaseQualityRequirementsApi(_QualityRequirementsTestBase):
    def test_new_task_gets_disabled_base_requirements_for_all_supported_types(self, admin_user):
        task_id, _ = create_task(
            admin_user,
            spec={
                "name": "task-base-quality-requirements",
                "labels": [
                    {"name": "car", "type": "rectangle"},
                    {"name": "truck", "type": "rectangle"},
                    {"name": "scene", "type": "tag"},
                ],
            },
            data={
                "image_quality": 70,
                "client_files": generate_image_files(2),
            },
        )

        settings = self._get_task_settings(admin_user, task_id=task_id)
        requirements = settings["requirements"]

        assert {
            requirement["annotation_type"] for requirement in requirements
        } == self._base_standalone_annotation_types
        assert {requirement["name"] for requirement in requirements} == {
            self._base_requirement_name(annotation_type)
            for annotation_type in self._base_standalone_annotation_types
        }
        assert all(requirement["enabled"] is False for requirement in requirements)
        assert all(requirement["is_base"] is True for requirement in requirements)
        assert all("empty_is_annotated" not in requirement for requirement in requirements)
        assert all("effective" not in requirement for requirement in requirements)
        expected_defaults = {
            "metric": "accuracy",
            "required_score": 0.7,
            "iou_threshold": 0.4,
            "point_size": 0.09,
            "point_size_base": "group_bbox_size",
            "line_thickness": 0.01,
            "match_orientation": True,
            "line_orientation_threshold": 0.1,
            "match_groups": True,
            "group_match_threshold": 0.5,
            "check_covered_annotations": True,
            "object_visibility_threshold": 0.05,
            "panoptic_comparison": True,
            "attribute_comparison": None,
        }
        assert all(
            all(requirement[field_name] == value for field_name, value in expected_defaults.items())
            for requirement in requirements
        )

    def test_new_project_gets_disabled_base_requirements_for_all_supported_types(self, admin_user):
        with make_api_client(admin_user) as api_client:
            project, response = api_client.projects_api.create(
                {
                    "name": "project-base-quality-requirements",
                    "labels": [
                        {"name": "car", "type": "rectangle"},
                        {"name": "scene", "type": "tag"},
                    ],
                }
            )
            assert response.status == HTTPStatus.CREATED

        settings = self._get_project_settings(admin_user, project_id=project.id)
        requirements = settings["requirements"]

        assert {
            requirement["annotation_type"] for requirement in requirements
        } == self._base_standalone_annotation_types
        assert {requirement["name"] for requirement in requirements} == {
            self._base_requirement_name(annotation_type)
            for annotation_type in self._base_standalone_annotation_types
        }
        assert all(requirement["enabled"] is False for requirement in requirements)
        assert all(requirement["is_base"] is True for requirement in requirements)
        assert all("empty_is_annotated" not in requirement for requirement in requirements)

    def test_new_project_task_inherits_project_quality_settings_by_default(self, admin_user):
        with make_api_client(admin_user) as api_client:
            project, response = api_client.projects_api.create(
                {
                    "name": "project-base-quality-requirements",
                    "labels": [
                        {"name": "car", "type": "rectangle"},
                        {"name": "pose", "type": "skeleton"},
                    ],
                }
            )
            assert response.status == HTTPStatus.CREATED

        task_id, _ = create_task(
            admin_user,
            spec={
                "name": "project-task-base-quality-requirements",
                "project_id": project.id,
            },
            data={
                "image_quality": 70,
                "client_files": generate_image_files(2),
            },
        )

        settings = self._get_task_settings(admin_user, task_id=task_id)

        assert settings["task_id"] == task_id
        assert settings["project_id"] is None
        assert settings["inherit"] is True


@pytest.mark.usefixtures("restore_db_per_function")
class TestGeneralizedQualityReportData(_QualityRequirementsTestBase):
    def test_task_report_computes_all_target_metric_aggregations(self, admin_user):
        task_id, _ = create_task(
            admin_user,
            spec={
                "name": "all-target-metrics-report",
                "labels": [
                    {"name": "car", "type": "rectangle"},
                    {"name": "bus", "type": "rectangle"},
                ],
            },
            data={
                "image_quality": 70,
                "client_files": generate_image_files(1),
            },
        )
        settings = self._get_task_settings(admin_user, task_id=task_id)
        expected_scores = {
            "accuracy": 1 / 2,
            "precision": 1 / 2,
            "recall": 1 / 2,
            "jaccard_index": 1 / 3,
            "dice": 1 / 2,
            "mean_accuracy": 1 / 2,
            "mean_precision": 1 / 4,
            "mean_recall": 1 / 2,
            "mean_jaccard_index": 1 / 4,
            "mean_dice": 1 / 3,
            "label_accuracy": 1 / 2,
            "label_precision": 0,
            "label_recall": 0,
            "label_jaccard_index": 0,
            "label_dice": 0,
        }
        requirement_names = {metric: f"target-{metric}-{task_id}" for metric in expected_scores}
        updated_settings, response = self._patch_settings(
            admin_user,
            settings["id"],
            {
                "inherit": False,
                "requirements": [
                    *self._retained_base_requirement_payloads(settings),
                    *[
                        self._build_requirement_payload(
                            requirement_names[metric],
                            enabled=True,
                            required_score=0.4,
                            metric=metric,
                        )
                        for metric in expected_scores
                    ],
                ],
            },
        )
        assert response.status_code == HTTPStatus.OK

        gt_job = create_gt_job(admin_user, task_id, complete=False)
        labels_by_name = self._get_task_labels_by_name(admin_user, task_id=task_id)
        with make_api_client(admin_user) as api_client:
            api_client.jobs_api.update_annotations(
                gt_job.id,
                labeled_data_request={
                    "shapes": [
                        self._build_rectangle_shape(
                            frame=0,
                            label_id=labels_by_name["car"].id,
                            points=[0, 0, 10, 10],
                        ),
                        self._build_rectangle_shape(
                            frame=0,
                            label_id=labels_by_name["bus"].id,
                            points=[20, 20, 30, 30],
                        ),
                    ]
                },
            )
            api_client.tasks_api.update_annotations(
                task_id,
                labeled_data_request={
                    "shapes": [
                        self._build_rectangle_shape(
                            frame=0,
                            label_id=labels_by_name["car"].id,
                            points=[0, 0, 10, 10],
                        ),
                        self._build_rectangle_shape(
                            frame=0,
                            label_id=labels_by_name["car"].id,
                            points=[20, 20, 30, 30],
                        ),
                    ]
                },
            )
        self._complete_job(admin_user, gt_job.id)

        report = create_quality_report(user=admin_user, task_id=task_id)
        report_data = self._get_report_data(admin_user, report["id"])
        summary_items = {
            item["metric"]: item for item in report["summary"]["requirements"]["items"]
        }

        assert report["summary"]["requirements"]["completed"] == 7
        for metric, expected_score in expected_scores.items():
            assert summary_items[metric]["score"] == pytest.approx(expected_score)
            assert summary_items[metric]["threshold"] == 0.4

            requirement_report = report_data["groups"][requirement_names[metric]]
            assert requirement_report["comparison_summary"]["score"] == pytest.approx(
                expected_score
            )
            assert requirement_report["frame_results"]["0"]["score"] == pytest.approx(
                expected_score
            )

        assert len(updated_settings["requirements"]) == len(settings["requirements"]) + len(
            expected_scores
        )

    def test_empty_frames_do_not_affect_requirement_metrics(self, admin_user):
        task_id, _ = create_task(
            admin_user,
            spec={
                "name": "empty-frames-do-not-affect-quality",
                "labels": [{"name": "car", "type": "rectangle"}],
            },
            data={
                "image_quality": 70,
                "client_files": generate_image_files(2),
            },
        )
        settings = self._get_task_settings(admin_user, task_id=task_id)
        requirement_name = f"empty-frame-check-{task_id}"
        _, response = self._patch_settings(
            admin_user,
            settings["id"],
            {
                "inherit": False,
                "requirements": [
                    *self._retained_base_requirement_payloads(settings),
                    self._build_requirement_payload(requirement_name, required_score=1.0),
                ],
            },
        )
        assert response.status_code == HTTPStatus.OK

        gt_job = create_gt_job(admin_user, task_id, complete=False)
        car_label = self._get_task_labels_by_name(admin_user, task_id=task_id)["car"]
        matching_shape = self._build_rectangle_shape(
            frame=0,
            label_id=car_label.id,
            points=[0, 0, 10, 10],
        )
        with make_api_client(admin_user) as api_client:
            api_client.jobs_api.update_annotations(
                gt_job.id,
                labeled_data_request={"shapes": [matching_shape]},
            )
            api_client.tasks_api.update_annotations(
                task_id,
                labeled_data_request={"shapes": [matching_shape]},
            )
        self._complete_job(admin_user, gt_job.id)

        report = create_quality_report(user=admin_user, task_id=task_id)
        report_data = self._get_report_data(admin_user, report["id"])
        group = report_data["groups"][requirement_name]

        assert group["comparison_summary"]["score"] == 1.0
        assert group["comparison_summary"]["score_components"] == {
            "valid_count": 1,
            "missing_count": 0,
            "extra_count": 0,
        }
        confusion_matrix = group["comparison_summary"]["confusion_matrix"]
        assert confusion_matrix["labels"] == ["car", "unmatched"]
        assert confusion_matrix["rows"] == [[1, 0], [0, 0]]

        assert "1" not in group["frame_results"]

    def test_skeleton_keypoint_point_size_base_affects_matching(self, admin_user):
        task_id, _ = create_task(
            admin_user,
            spec={
                "name": "skeleton-keypoint-point-size-base",
                "labels": [
                    {
                        "name": "pose",
                        "type": "skeleton",
                        "sublabels": [
                            {"name": "first", "type": "points"},
                            {"name": "second", "type": "points"},
                        ],
                        "svg": (
                            '<circle data-type="element node" data-element-id="1" '
                            'data-node-id="1" data-label-name="first"></circle>'
                            '<circle data-type="element node" data-element-id="2" '
                            'data-node-id="2" data-label-name="second"></circle>'
                        ),
                    }
                ],
            },
            data={
                "image_quality": 70,
                "client_files": generate_image_files(1),
            },
        )
        settings = self._get_task_settings(admin_user, task_id=task_id)
        image_size_requirement_name = f"skeleton-keypoints-image-size-{task_id}"
        group_bbox_requirement_name = f"skeleton-keypoints-group-bbox-{task_id}"
        _, response = self._patch_settings(
            admin_user,
            settings["id"],
            {
                "inherit": False,
                "requirements": [
                    *self._retained_base_requirement_payloads(settings),
                    self._build_requirement_payload(
                        image_size_requirement_name,
                        annotation_type="skeleton_keypoint",
                        point_size=0.09,
                        point_size_base="image_size",
                        match_groups=False,
                    ),
                    self._build_requirement_payload(
                        group_bbox_requirement_name,
                        annotation_type="skeleton_keypoint",
                        point_size=0.09,
                        point_size_base="group_bbox_size",
                        match_groups=False,
                    ),
                ],
            },
        )
        assert response.status_code == HTTPStatus.OK

        pose_label = self._get_task_labels_by_name(admin_user, task_id=task_id)["pose"]
        sublabels = {sublabel.name: sublabel for sublabel in pose_label.sublabels}

        def build_skeleton(first_point: list[int], second_point: list[int]) -> dict[str, Any]:
            return {
                "type": "skeleton",
                "frame": 0,
                "label_id": pose_label.id,
                "points": [],
                "occluded": False,
                "outside": False,
                "elements": [
                    {
                        "type": "points",
                        "frame": 0,
                        "label_id": sublabels["first"].id,
                        "points": first_point,
                        "occluded": False,
                        "outside": False,
                    },
                    {
                        "type": "points",
                        "frame": 0,
                        "label_id": sublabels["second"].id,
                        "points": second_point,
                        "occluded": False,
                        "outside": False,
                    },
                ],
            }

        gt_job = create_gt_job(admin_user, task_id, complete=False)
        with make_api_client(admin_user) as api_client:
            api_client.jobs_api.update_annotations(
                gt_job.id,
                labeled_data_request={"shapes": [build_skeleton([10, 10], [20, 20])]},
            )
            api_client.tasks_api.update_annotations(
                task_id,
                labeled_data_request={"shapes": [build_skeleton([15, 15], [25, 25])]},
            )
        self._complete_job(admin_user, gt_job.id)

        report = create_quality_report(user=admin_user, task_id=task_id)
        report_data = self._get_report_data(admin_user, report["id"])
        image_size_summary = report_data["groups"][image_size_requirement_name][
            "comparison_summary"
        ]
        group_bbox_summary = report_data["groups"][group_bbox_requirement_name][
            "comparison_summary"
        ]

        assert image_size_summary["score"] == 1.0
        assert image_size_summary["score_components"] == {
            "valid_count": 2,
            "missing_count": 0,
            "extra_count": 0,
        }
        assert group_bbox_summary["score"] == 0.0
        assert group_bbox_summary["score_components"] == {
            "valid_count": 0,
            "missing_count": 2,
            "extra_count": 2,
        }

    def test_confusion_matrix_only_contains_labels_compatible_with_requirement_type(
        self, admin_user
    ):
        task_id, _ = create_task(
            admin_user,
            spec={
                "name": "type-specific-confusion-matrix",
                "labels": [
                    {"name": "car", "type": "rectangle"},
                    {"name": "generic", "type": "any"},
                    {"name": "scene", "type": "tag"},
                    {"name": "region", "type": "polygon"},
                    {
                        "name": "pose",
                        "type": "skeleton",
                        "sublabels": [
                            {"name": "nose", "type": "points"},
                            {"name": "eye", "type": "points"},
                        ],
                        "svg": (
                            '<circle data-type="element node" data-element-id="1" '
                            'data-node-id="1" data-label-name="nose"></circle>'
                            '<circle data-type="element node" data-element-id="2" '
                            'data-node-id="2" data-label-name="eye"></circle>'
                        ),
                    },
                ],
            },
            data={
                "image_quality": 70,
                "client_files": generate_image_files(1),
            },
        )
        settings = self._get_task_settings(admin_user, task_id=task_id)
        requirement_names = {
            "rectangle": f"rectangle-matrix-{task_id}",
            "skeleton": f"skeleton-matrix-{task_id}",
            "skeleton_keypoint": f"keypoint-matrix-{task_id}",
        }
        updated_settings, response = self._patch_settings(
            admin_user,
            settings["id"],
            {
                "inherit": False,
                "requirements": [
                    *self._retained_base_requirement_payloads(settings),
                    self._build_requirement_payload(
                        requirement_names["rectangle"],
                        annotation_type="rectangle",
                        filter_expression=json.dumps({"==": [{"var": "shape.label"}, "car"]}),
                    ),
                    self._build_requirement_payload(
                        requirement_names["skeleton"],
                        annotation_type="skeleton",
                    ),
                    self._build_requirement_payload(
                        requirement_names["skeleton_keypoint"],
                        annotation_type="skeleton_keypoint",
                    ),
                ],
            },
        )
        assert response.status_code == HTTPStatus.OK
        requirement_ids = {
            annotation_type: next(
                requirement["id"]
                for requirement in updated_settings["requirements"]
                if requirement["name"] == requirement_name
            )
            for annotation_type, requirement_name in requirement_names.items()
        }

        gt_job = create_gt_job(admin_user, task_id, complete=False)
        car_label = self._get_task_labels_by_name(admin_user, task_id=task_id)["car"]
        matching_shape = self._build_rectangle_shape(
            frame=0,
            label_id=car_label.id,
            points=[0, 0, 10, 10],
        )
        with make_api_client(admin_user) as api_client:
            api_client.jobs_api.update_annotations(
                gt_job.id,
                labeled_data_request={"shapes": [matching_shape]},
            )
            api_client.tasks_api.update_annotations(
                task_id,
                labeled_data_request={"shapes": [matching_shape]},
            )
        self._complete_job(admin_user, gt_job.id)

        report = create_quality_report(user=admin_user, task_id=task_id)
        report_data = self._get_report_data(admin_user, report["id"])
        matrices = {
            annotation_type: report_data["groups"][requirement_name]["comparison_summary"][
                "confusion_matrix"
            ]
            for annotation_type, requirement_name in requirement_names.items()
        }
        assert matrices["rectangle"]["labels"] == ["car", "generic", "unmatched"]
        assert matrices["rectangle"]["rows"] == [
            [1, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
        ]
        assert matrices["skeleton"]["labels"] == ["pose", "unmatched"]
        assert matrices["skeleton_keypoint"]["labels"] == [
            "pose.nose",
            "pose.eye",
            "unmatched",
        ]

        response = get_method(
            admin_user,
            f"quality/reports/{report['id']}/confusion/matrix",
            requirement=requirement_ids["rectangle"],
        )
        assert response.status_code == HTTPStatus.OK
        assert response.json()["labels"] == matrices["rectangle"]["labels"]

        response = get_method(admin_user, f"quality/reports/{report['id']}/confusion")
        assert response.status_code == HTTPStatus.OK
        with ZipFile(BytesIO(response.content)) as archive:
            manifest = json.loads(archive.read("manifest.json"))
            rectangle_export = next(
                matrix
                for matrix in manifest["matrices"]
                if matrix["scope"] == "group"
                and matrix["requirement_id"] == requirement_ids["rectangle"]
            )
            assert rectangle_export["labels"] == matrices["rectangle"]["labels"]
            csv_reader = csv.DictReader(StringIO(archive.read(rectangle_export["path"]).decode()))
            assert csv_reader.fieldnames == [
                "DS (row) \\ GT (col) label",
                "car",
                "generic",
                "unmatched",
                "precision",
            ]

    def test_task_report_data_applies_shape_requirement_filter_to_metrics(self, admin_user):
        task_id, _ = create_task(
            admin_user,
            spec={
                "name": "shape-filter-report",
                "labels": [
                    {"name": "car", "type": "rectangle"},
                    {"name": "person", "type": "rectangle"},
                ],
            },
            data={
                "image_quality": 70,
                "client_files": generate_image_files(1),
            },
        )
        settings = self._get_task_settings(admin_user, task_id=task_id)

        requirement_name = f"cars-only-{task_id}"
        _, response = self._patch_settings(
            admin_user,
            settings["id"],
            {
                "inherit": False,
                "requirements": [
                    *self._retained_base_requirement_payloads(settings),
                    self._build_requirement_payload(
                        requirement_name,
                        enabled=True,
                        required_score=1.0,
                        annotation_type="rectangle",
                        filter_expression=json.dumps({"==": [{"var": "shape.label"}, "car"]}),
                    ),
                ],
            },
        )
        assert response.status_code == HTTPStatus.OK

        gt_job = create_gt_job(admin_user, task_id, complete=False)
        labels_by_name = self._get_task_labels_by_name(admin_user, task_id=task_id)

        with make_api_client(admin_user) as api_client:
            api_client.jobs_api.update_annotations(
                gt_job.id,
                labeled_data_request={
                    "shapes": [
                        self._build_rectangle_shape(
                            frame=0,
                            label_id=labels_by_name["car"].id,
                            points=[0, 0, 10, 10],
                        ),
                        self._build_rectangle_shape(
                            frame=0,
                            label_id=labels_by_name["person"].id,
                            points=[20, 20, 30, 30],
                        ),
                    ]
                },
            )
            api_client.tasks_api.update_annotations(
                task_id,
                labeled_data_request={
                    "shapes": [
                        self._build_rectangle_shape(
                            frame=0,
                            label_id=labels_by_name["car"].id,
                            points=[0, 0, 10, 10],
                        ),
                    ]
                },
            )

        self._complete_job(admin_user, gt_job.id)

        report = create_quality_report(user=admin_user, task_id=task_id)
        report_data = self._get_report_data(admin_user, report["id"])

        group_summary = report_data["groups"][requirement_name]["comparison_summary"]
        assert "annotations" not in group_summary
        assert group_summary["score"] == 1.0
        assert group_summary["score_components"] == {
            "valid_count": 1,
            "missing_count": 0,
            "extra_count": 0,
        }

        assert "annotations" not in report_data["comparison_summary"]
        assert report_data["comparison_summary"]["conflict_count"] == 0

    def test_label_free_requirement_matching_prefers_same_label_shapes(self, admin_user):
        task_id, _ = create_task(
            admin_user,
            spec={
                "name": "label-aware-matching-report",
                "labels": [
                    {"name": "car", "type": "rectangle"},
                    {"name": "person", "type": "rectangle"},
                ],
            },
            data={
                "image_quality": 70,
                "client_files": generate_image_files(1),
            },
        )
        settings = self._get_task_settings(admin_user, task_id=task_id)
        _, response = self._patch_settings(admin_user, settings["id"], {"inherit": False})
        assert response.status_code == HTTPStatus.OK

        all_requirement_name = f"all-overlapping-rectangles-{task_id}"
        _, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(
                all_requirement_name,
                settings_id=settings["id"],
                required_score=1.0,
                annotation_type="rectangle",
            ),
        )
        assert response.status_code == HTTPStatus.CREATED

        car_requirement_name = f"car-overlapping-rectangles-{task_id}"
        _, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(
                car_requirement_name,
                settings_id=settings["id"],
                required_score=1.0,
                annotation_type="rectangle",
                filter_expression=json.dumps({"==": [{"var": "shape.label"}, "car"]}),
            ),
        )
        assert response.status_code == HTTPStatus.CREATED

        person_requirement_name = f"person-overlapping-rectangles-{task_id}"
        _, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(
                person_requirement_name,
                settings_id=settings["id"],
                required_score=1.0,
                annotation_type="rectangle",
                filter_expression=json.dumps({"==": [{"var": "shape.label"}, "person"]}),
            ),
        )
        assert response.status_code == HTTPStatus.CREATED

        gt_job = create_gt_job(admin_user, task_id, complete=False)
        labels_by_name = self._get_task_labels_by_name(admin_user, task_id=task_id)

        with make_api_client(admin_user) as api_client:
            api_client.jobs_api.update_annotations(
                gt_job.id,
                labeled_data_request={
                    "shapes": [
                        self._build_rectangle_shape(
                            frame=0,
                            label_id=labels_by_name["car"].id,
                            points=[0, 0, 10, 10],
                        ),
                        self._build_rectangle_shape(
                            frame=0,
                            label_id=labels_by_name["person"].id,
                            points=[0.1, 0, 10.1, 10],
                        ),
                    ]
                },
            )
            api_client.tasks_api.update_annotations(
                task_id,
                labeled_data_request={
                    "shapes": [
                        self._build_rectangle_shape(
                            frame=0,
                            label_id=labels_by_name["car"].id,
                            points=[0.1, 0, 10.1, 10],
                        ),
                        self._build_rectangle_shape(
                            frame=0,
                            label_id=labels_by_name["person"].id,
                            points=[0, 0, 10, 10],
                        ),
                    ]
                },
            )

        self._complete_job(admin_user, gt_job.id)

        report = create_quality_report(user=admin_user, task_id=task_id)
        report_data = self._get_report_data(admin_user, report["id"])

        all_summary = report_data["groups"][all_requirement_name]["comparison_summary"]
        car_summary = report_data["groups"][car_requirement_name]["comparison_summary"]
        person_summary = report_data["groups"][person_requirement_name]["comparison_summary"]

        assert "annotations" not in all_summary
        assert all_summary["score_components"] == {
            "valid_count": 2,
            "missing_count": 0,
            "extra_count": 0,
        }
        assert "annotations" not in car_summary
        assert car_summary["score_components"]["valid_count"] == 1
        assert "annotations" not in person_summary
        assert person_summary["score_components"]["valid_count"] == 1

    def test_task_report_metrics_change_after_gt_annotations_change(self, admin_user):
        task_id, _ = create_task(
            admin_user,
            spec={
                "name": "changed-gt-report",
                "labels": [{"name": "car", "type": "rectangle"}],
            },
            data={
                "image_quality": 70,
                "client_files": generate_image_files(1),
            },
        )
        settings = self._get_task_settings(admin_user, task_id=task_id)

        requirement_name = f"changed-gt-{task_id}"
        _, response = self._patch_settings(
            admin_user,
            settings["id"],
            {
                "inherit": False,
                "requirements": [
                    *self._retained_base_requirement_payloads(settings),
                    self._build_requirement_payload(
                        requirement_name,
                        enabled=True,
                        required_score=1.0,
                    ),
                ],
            },
        )
        assert response.status_code == HTTPStatus.OK

        gt_job = create_gt_job(admin_user, task_id, complete=False)
        car_label = self._get_task_labels_by_name(admin_user, task_id=task_id)["car"]
        matching_shape = self._build_rectangle_shape(
            frame=0,
            label_id=car_label.id,
            points=[0, 0, 10, 10],
        )
        with make_api_client(admin_user) as api_client:
            api_client.jobs_api.update_annotations(
                gt_job.id,
                labeled_data_request={"shapes": [matching_shape]},
            )
            api_client.tasks_api.update_annotations(
                task_id,
                labeled_data_request={"shapes": [matching_shape]},
            )
        self._complete_job(admin_user, gt_job.id)

        initial_report = create_quality_report(user=admin_user, task_id=task_id)
        assert initial_report["summary"]["conflict_count"] == 0
        assert "valid_count" not in initial_report["summary"]
        initial_item = next(
            item
            for item in initial_report["summary"]["requirements"]["items"]
            if item["name"] == requirement_name
        )
        assert initial_item["score_components"] == {
            "valid_count": 1,
            "missing_count": 0,
            "extra_count": 0,
        }

        with make_api_client(admin_user) as api_client:
            api_client.jobs_api.partial_update_annotations(
                "create",
                gt_job.id,
                patched_labeled_data_request={
                    "shapes": [
                        self._build_rectangle_shape(
                            frame=0,
                            label_id=car_label.id,
                            points=[20, 20, 30, 30],
                        )
                    ],
                },
            )

        changed_report = create_quality_report(user=admin_user, task_id=task_id)
        assert (
            changed_report["summary"]["conflict_count"]
            > initial_report["summary"]["conflict_count"]
        )
        changed_item = next(
            item
            for item in changed_report["summary"]["requirements"]["items"]
            if item["name"] == requirement_name
        )
        assert (
            changed_item["score_components"]["missing_count"]
            > initial_item["score_components"]["missing_count"]
        )

    def test_task_report_filter_does_not_match_attribute_name_and_value_from_different_attributes(
        self, admin_user
    ):
        (
            task_id,
            settings,
            gt_job,
            car_label,
            attribute_ids,
        ) = self._create_attribute_quality_task(
            admin_user,
            name="attribute-pair-filter-report",
        )

        requirement_name = f"color-small-{task_id}"
        _, response = self._patch_settings(
            admin_user,
            settings["id"],
            {
                "inherit": False,
                "requirements": [
                    *self._retained_base_requirement_payloads(settings),
                    self._build_requirement_payload(
                        requirement_name,
                        enabled=True,
                        required_score=1.0,
                        annotation_type="rectangle",
                        filter_expression=json.dumps(
                            {
                                "and": [
                                    {"==": [{"var": "shape.attribute.name"}, "color"]},
                                    {"==": [{"var": "shape.attribute.value"}, "small"]},
                                ]
                            }
                        ),
                    ),
                ],
            },
        )
        assert response.status_code == HTTPStatus.OK

        annotation_attributes = [
            {"spec_id": attribute_ids["color"], "value": "red"},
            {"spec_id": attribute_ids["size"], "value": "small"},
        ]
        self._set_attribute_quality_annotations(
            admin_user,
            task_id=task_id,
            gt_job_id=gt_job.id,
            label_id=car_label.id,
            gt_attributes=annotation_attributes,
            ds_attributes=annotation_attributes,
        )

        self._complete_job(admin_user, gt_job.id)

        report = create_quality_report(user=admin_user, task_id=task_id)
        report_data = self._get_report_data(admin_user, report["id"])

        group_summary = report_data["groups"][requirement_name]["comparison_summary"]
        assert "annotations" not in group_summary
        assert group_summary["score"] is None
        assert group_summary["score_components"] == {
            "valid_count": 0,
            "missing_count": 0,
            "extra_count": 0,
        }
        expected_calculation = {
            "status": "not_computed",
            "reason": "filter_no_matches",
            "annotations": {
                "candidate_count": 1,
                "selected_count": 0,
                "missing_attributes": [],
            },
            "ground_truth": {
                "candidate_count": 1,
                "selected_count": 0,
                "missing_attributes": [],
            },
        }
        assert group_summary["calculation"] == expected_calculation
        requirement_summary_item = next(
            item
            for item in report_data["comparison_summary"]["requirements"]["items"]
            if item["name"] == requirement_name
        )
        assert requirement_summary_item["score"] is None
        assert requirement_summary_item["calculation"] == {
            "status": "not_computed",
            "reason": "filter_no_matches",
        }
        assert report_data["comparison_summary"]["requirements"]["completed_count"] == 1
        assert report_data["comparison_summary"]["requirements"]["not_computed_count"] == 1
        assert "annotations" not in report_data["comparison_summary"]

    def test_task_report_data_applies_attribute_comparison_rules(self, admin_user):
        (
            task_id,
            settings,
            gt_job,
            car_label,
            attribute_ids,
        ) = self._create_attribute_quality_task(
            admin_user,
            name="attribute-comparison-report",
        )

        requirement_name = f"boxes-{task_id}"
        _, response = self._patch_settings(
            admin_user,
            settings["id"],
            {
                "inherit": False,
                "requirements": [
                    *self._retained_base_requirement_payloads(settings),
                    self._build_requirement_payload(
                        requirement_name,
                        enabled=True,
                        required_score=1.0,
                        annotation_type="rectangle",
                        attribute_comparison={
                            "default": {"enabled": False},
                            "rules": [
                                {
                                    "spec_id": attribute_ids["size"],
                                    "enabled": True,
                                    "comparator": "exact",
                                }
                            ],
                        },
                    ),
                ],
            },
        )
        assert response.status_code == HTTPStatus.OK

        self._set_attribute_quality_annotations(
            admin_user,
            task_id=task_id,
            gt_job_id=gt_job.id,
            label_id=car_label.id,
            gt_attributes=[
                {"spec_id": attribute_ids["color"], "value": "red"},
                {"spec_id": attribute_ids["size"], "value": "large"},
            ],
            ds_attributes=[
                {"spec_id": attribute_ids["color"], "value": "blue"},
                {"spec_id": attribute_ids["size"], "value": "small"},
            ],
        )

        self._complete_job(admin_user, gt_job.id)

        report = create_quality_report(user=admin_user, task_id=task_id)
        report_data = self._get_report_data(admin_user, report["id"])

        requirement_report = report_data["groups"][requirement_name]
        conflicts = requirement_report["frame_results"]["0"]["conflicts"]
        assert {conflict["type"] for conflict in conflicts} == {
            "missing_annotation",
            "extra_annotation",
        }
        assert requirement_report["comparison_summary"]["score"] == 0
        assert requirement_report["comparison_summary"]["score_components"] == {
            "valid_count": 0,
            "missing_count": 1,
            "extra_count": 1,
        }
        assert requirement_report["comparison_summary"]["confusion_matrix"]["labels"] == [
            "car",
            "unmatched",
        ]
        assert requirement_report["comparison_summary"]["confusion_matrix"]["rows"] == [
            [0, 1],
            [1, 0],
        ]
        assert report_data["groups"][requirement_name]["parameters"]["attribute_comparison"] == {
            "default": {"enabled": False},
            "rules": [{"spec_id": attribute_ids["size"], "enabled": True, "comparator": "exact"}],
        }

    def test_task_report_data_attribute_mismatch_affects_matching_and_score(self, admin_user):
        (
            task_id,
            settings,
            gt_job,
            car_label,
            attribute_ids,
        ) = self._create_attribute_quality_task(
            admin_user,
            name="attribute-conflict-names-report",
        )

        requirement_name = f"boxes-{task_id}"
        _, response = self._patch_settings(
            admin_user,
            settings["id"],
            {
                "inherit": False,
                "requirements": [
                    *self._retained_base_requirement_payloads(settings),
                    self._build_requirement_payload(
                        requirement_name,
                        enabled=True,
                        required_score=1.0,
                        annotation_type="rectangle",
                        attribute_comparison={"default": {"enabled": True}},
                    ),
                ],
            },
        )
        assert response.status_code == HTTPStatus.OK

        self._set_attribute_quality_annotations(
            admin_user,
            task_id=task_id,
            gt_job_id=gt_job.id,
            label_id=car_label.id,
            gt_attributes=[
                {"spec_id": attribute_ids["color"], "value": "red"},
                {"spec_id": attribute_ids["size"], "value": "large"},
            ],
            ds_attributes=[
                {"spec_id": attribute_ids["color"], "value": "blue"},
                {"spec_id": attribute_ids["size"], "value": "small"},
            ],
        )

        self._complete_job(admin_user, gt_job.id)

        report = create_quality_report(user=admin_user, task_id=task_id)
        report_data = self._get_report_data(admin_user, report["id"])

        conflicts = report_data["groups"][requirement_name]["frame_results"]["0"]["conflicts"]
        assert {conflict["type"] for conflict in conflicts} == {
            "missing_annotation",
            "extra_annotation",
        }
        assert all(conflict["severity"] == "error" for conflict in conflicts)
        assert report_data["comparison_summary"]["error_count"] == 2
        assert report_data["groups"][requirement_name]["comparison_summary"]["error_count"] == 2
        assert report_data["groups"][requirement_name]["comparison_summary"]["score"] == 0

    def test_task_report_counts_overlapping_leaf_requirements_independently(self, admin_user):
        (
            task_id,
            settings,
            gt_job,
            car_label,
            attribute_ids,
        ) = self._create_attribute_quality_task(
            admin_user,
            name="overlapping-leaf-report",
        )

        rectangle_root = next(
            requirement
            for requirement in settings["requirements"]
            if requirement["name"] == self._base_requirement_name("rectangle")
        )

        first_leaf_name = f"first-car-leaf-{task_id}"
        first_leaf, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(
                first_leaf_name,
                settings_id=settings["id"],
                annotation_type=None,
                parent_requirement=rectangle_root["id"],
                sort_order=1,
                filter_expression=json.dumps({"==": [{"var": "shape.label"}, "car"]}),
            ),
        )
        assert response.status_code == HTTPStatus.CREATED

        second_leaf_name = f"second-car-leaf-{task_id}"
        _, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(
                second_leaf_name,
                settings_id=settings["id"],
                annotation_type=None,
                parent_requirement=rectangle_root["id"],
                sort_order=2,
                filter_expression=json.dumps({"==": [{"var": "shape.label"}, "car"]}),
            ),
        )
        assert response.status_code == HTTPStatus.CREATED
        assert first_leaf["effective"]["annotation_type"] == "rectangle"

        self._set_attribute_quality_annotations(
            admin_user,
            task_id=task_id,
            gt_job_id=gt_job.id,
            label_id=car_label.id,
            gt_attributes=[
                {"spec_id": attribute_ids["color"], "value": "red"},
                {"spec_id": attribute_ids["size"], "value": "large"},
            ],
            ds_attributes=[
                {"spec_id": attribute_ids["color"], "value": "red"},
                {"spec_id": attribute_ids["size"], "value": "small"},
            ],
        )

        self._complete_job(admin_user, gt_job.id)

        report = create_quality_report(user=admin_user, task_id=task_id)
        report_data = self._get_report_data(admin_user, report["id"])

        assert "annotations" not in report_data["groups"][first_leaf_name]["comparison_summary"]
        assert (
            sum(
                report_data["groups"][first_leaf_name]["comparison_summary"][
                    "score_components"
                ].values()
            )
            == 1
        )
        assert "annotations" not in report_data["groups"][second_leaf_name]["comparison_summary"]
        assert (
            sum(
                report_data["groups"][second_leaf_name]["comparison_summary"][
                    "score_components"
                ].values()
            )
            == 1
        )
        assert "annotations" not in report_data["comparison_summary"]

    def test_task_report_counts_enabled_intermediate_requirements(self, admin_user):
        (
            task_id,
            settings,
            gt_job,
            car_label,
            attribute_ids,
        ) = self._create_attribute_quality_task(
            admin_user,
            name="intermediate-requirement-report",
        )

        rectangle_root = next(
            requirement
            for requirement in settings["requirements"]
            if requirement["name"] == self._base_requirement_name("rectangle")
        )

        parent_requirement_name = f"cars-parent-{task_id}"
        parent_requirement, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(
                parent_requirement_name,
                settings_id=settings["id"],
                enabled=True,
                required_score=1.0,
                annotation_type=None,
                parent_requirement=rectangle_root["id"],
                sort_order=1,
                filter_expression=json.dumps({"==": [{"var": "shape.label"}, "car"]}),
            ),
        )
        assert response.status_code == HTTPStatus.CREATED

        leaf_requirement_name = f"red-cars-leaf-{task_id}"
        leaf_requirement, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(
                leaf_requirement_name,
                settings_id=settings["id"],
                enabled=True,
                required_score=1.0,
                annotation_type=None,
                parent_requirement=parent_requirement["id"],
                sort_order=1,
                filter_expression=json.dumps({"==": [{"var": "shape.attribute.value"}, "red"]}),
            ),
        )
        assert response.status_code == HTTPStatus.CREATED

        annotation_attributes = [
            {"spec_id": attribute_ids["color"], "value": "red"},
            {"spec_id": attribute_ids["size"], "value": "large"},
        ]
        self._set_attribute_quality_annotations(
            admin_user,
            task_id=task_id,
            gt_job_id=gt_job.id,
            label_id=car_label.id,
            gt_attributes=annotation_attributes,
            ds_attributes=annotation_attributes,
        )

        self._complete_job(admin_user, gt_job.id)

        report = create_quality_report(user=admin_user, task_id=task_id)
        report_data = self._get_report_data(admin_user, report["id"])

        expected_requirements_summary = {
            "total": len(settings["requirements"]) + 2,
            "enabled": 2,
            "completed": 2,
            "not_computed": 0,
            "items": [
                {
                    "requirement_id": parent_requirement["id"],
                    "name": parent_requirement_name,
                    "metric": "accuracy",
                    "score": 1.0,
                    "score_components": {
                        "valid_count": 1,
                        "missing_count": 0,
                        "extra_count": 0,
                    },
                    "calculation": {"status": "computed"},
                    "threshold": 1.0,
                },
                {
                    "requirement_id": leaf_requirement["id"],
                    "name": leaf_requirement_name,
                    "metric": "accuracy",
                    "score": 1.0,
                    "score_components": {
                        "valid_count": 1,
                        "missing_count": 0,
                        "extra_count": 0,
                    },
                    "calculation": {"status": "computed"},
                    "threshold": 1.0,
                },
            ],
        }
        assert report["summary"]["requirements"] == expected_requirements_summary
        assert report_data["comparison_summary"]["requirements"] == (
            self._as_report_data_requirements_summary(expected_requirements_summary)
        )
        assert (
            "annotations"
            not in report_data["groups"][parent_requirement_name]["comparison_summary"]
        )
        assert (
            sum(
                report_data["groups"][parent_requirement_name]["comparison_summary"][
                    "score_components"
                ].values()
            )
            == 1
        )
        assert (
            "annotations" not in report_data["groups"][leaf_requirement_name]["comparison_summary"]
        )
        assert (
            sum(
                report_data["groups"][leaf_requirement_name]["comparison_summary"][
                    "score_components"
                ].values()
            )
            == 1
        )
        assert "annotations" not in report_data["comparison_summary"]

    def test_task_report_data_contains_groups_and_requirements(self, admin_user):
        task_id, _ = create_task(
            admin_user,
            spec={
                "name": "requirements-summary-report",
                "labels": [{"name": "car", "type": "rectangle"}],
            },
            data={
                "image_quality": 70,
                "client_files": generate_image_files(1),
            },
        )
        settings = self._get_task_settings(admin_user, task_id=task_id)

        enabled_requirement_name = f"report-enabled-{task_id}"
        disabled_requirement_name = f"report-disabled-{task_id}"
        updated_settings, response = self._patch_settings(
            admin_user,
            settings["id"],
            {
                "inherit": False,
                "requirements": [
                    *self._retained_base_requirement_payloads(settings),
                    self._build_requirement_payload(
                        enabled_requirement_name,
                        enabled=True,
                        required_score=0.75,
                        point_size=0.25,
                        match_orientation=False,
                        match_groups=False,
                    ),
                    self._build_requirement_payload(
                        disabled_requirement_name,
                        enabled=False,
                        required_score=1.0,
                    ),
                ],
            },
        )
        assert response.status_code == HTTPStatus.OK
        enabled_requirement_id = next(
            requirement["id"]
            for requirement in updated_settings["requirements"]
            if requirement["name"] == enabled_requirement_name
        )
        disabled_requirement_id = next(
            requirement["id"]
            for requirement in updated_settings["requirements"]
            if requirement["name"] == disabled_requirement_name
        )

        gt_job = create_gt_job(admin_user, task_id, complete=False)
        labels_by_name = self._get_task_labels_by_name(admin_user, task_id=task_id)
        car_label = labels_by_name["car"]
        with make_api_client(admin_user) as api_client:
            api_client.jobs_api.update_annotations(
                gt_job.id,
                labeled_data_request={
                    "shapes": [
                        self._build_rectangle_shape(
                            frame=0,
                            label_id=car_label.id,
                            points=[0, 0, 10, 10],
                        )
                    ]
                },
            )
            api_client.tasks_api.update_annotations(
                task_id,
                labeled_data_request={
                    "shapes": [
                        self._build_rectangle_shape(
                            frame=0,
                            label_id=car_label.id,
                            points=[0, 0, 10, 10],
                        )
                    ]
                },
            )
        self._complete_job(admin_user, gt_job.id)

        expected_requirements_total = len(settings["requirements"]) + 2
        expected_requirements_summary = {
            "total": expected_requirements_total,
            "enabled": 1,
            "completed": 1,
            "not_computed": 0,
            "items": [
                {
                    "requirement_id": enabled_requirement_id,
                    "name": enabled_requirement_name,
                    "metric": "accuracy",
                    "score": 1.0,
                    "score_components": {
                        "valid_count": 1,
                        "missing_count": 0,
                        "extra_count": 0,
                    },
                    "calculation": {"status": "computed"},
                    "threshold": 0.75,
                }
            ],
        }
        report = create_quality_report(user=admin_user, task_id=task_id)
        assert report["summary"]["requirements"] == expected_requirements_summary

        with make_api_client(admin_user) as api_client:
            _, response = api_client.quality_api.retrieve_report_data(
                report["id"], _parse_response=False
            )
            assert response.status == HTTPStatus.OK
            report_data = json.loads(response.data)

        assert "groups" in report_data
        assert "frame_results" not in report_data
        assert "conflicts" not in report_data
        assert enabled_requirement_name in report_data["groups"]
        assert disabled_requirement_name in report_data["groups"]
        frame_summary = next(
            iter(report_data["groups"][enabled_requirement_name]["frame_results"].values())
        )
        assert "annotations" not in frame_summary
        assert set(frame_summary) == {
            "conflicts",
            "conflict_count",
            "error_count",
            "conflicts_by_type",
            "score",
            "score_components",
            "calculation",
            "confusion_matrix",
        }
        assert report_data["parameters"] == {
            "inherited": False,
            "job_filter": updated_settings["job_filter"],
        }
        with make_api_client(admin_user) as api_client:
            job_report = api_client.quality_api.list_reports(target="job", parent_id=report["id"])[
                0
            ].results[0]
        job_report_data = self._get_report_data(admin_user, job_report["id"])
        assert "frame_results" not in job_report_data
        assert "conflicts" not in job_report_data
        assert job_report_data["parameters"] == {
            "inherited": False,
            "job_filter": updated_settings["job_filter"],
        }
        assert report_data["comparison_summary"]["requirements"] == (
            self._as_report_data_requirements_summary(expected_requirements_summary)
        )
        report_level_summary_fields = {
            "frames",
            "total_frames",
            "validation_frames",
            "validation_frame_share",
            "mean_conflict_count",
            "tasks",
            "jobs",
            "requirements",
        }
        for group in report_data["groups"].values():
            assert not report_level_summary_fields & set(group["comparison_summary"])

        parameters = report_data["groups"][enabled_requirement_name]["parameters"]
        assert parameters["requirement_id"] == enabled_requirement_id
        assert "source_requirement_id" not in parameters
        assert parameters["metric"] == "accuracy"
        assert parameters["required_score"] == 0.75
        assert parameters["point_size"] == 0.25
        assert parameters["match_orientation"] is False
        assert parameters["match_groups"] is False
        disabled_group = report_data["groups"][disabled_requirement_name]
        assert disabled_group["parameters"]["requirement_id"] == disabled_requirement_id
        assert "source_requirement_id" not in disabled_group["parameters"]
        assert disabled_group["parameters"]["enabled"] is False
        assert disabled_group["parameters"]["metric"] == "accuracy"
        assert disabled_group["parameters"]["required_score"] == 1.0
        disabled_summary = disabled_group["comparison_summary"]
        assert disabled_summary["error_count"] == disabled_summary["conflict_count"] == 0
        assert "annotations" not in disabled_summary
        assert disabled_summary["score"] == 0.0
        assert disabled_summary["calculation"] == {"status": "computed"}
        assert disabled_summary["score_components"] == {
            "valid_count": 0,
            "missing_count": 0,
            "extra_count": 0,
        }
        assert disabled_summary["confusion_matrix"] is None
        assert disabled_group["frame_results"] == {}
        report_summary = report_data["comparison_summary"]
        assert report_summary["error_count"] == report_summary["conflict_count"]
        assert "annotations" not in report_summary

    def test_project_report_summary_counts_completed_jobs_and_tasks(self, admin_user):
        with make_api_client(admin_user) as api_client:
            project, response = api_client.projects_api.create(
                {
                    "name": "completed-requirements-summary",
                    "labels": [{"name": "car", "type": "rectangle"}],
                }
            )
            assert response.status == HTTPStatus.CREATED

        project_settings = self._get_project_settings(admin_user, project_id=project.id)
        requirement_name = f"completed-summary-{project.id}"
        _, response = self._patch_settings(
            admin_user,
            project_settings["id"],
            {
                "requirements": [
                    *self._retained_base_requirement_payloads(project_settings),
                    self._build_requirement_payload(
                        requirement_name,
                        enabled=True,
                        required_score=1.0,
                    ),
                ],
            },
        )
        assert response.status_code == HTTPStatus.OK

        passed_task_id, _ = create_task(
            admin_user,
            spec={
                "name": "completed-requirements-passed",
                "project_id": project.id,
            },
            data={
                "image_quality": 70,
                "client_files": generate_image_files(2),
            },
        )
        failed_task_id, _ = create_task(
            admin_user,
            spec={
                "name": "completed-requirements-failed",
                "project_id": project.id,
            },
            data={
                "image_quality": 70,
                "client_files": generate_image_files(2),
            },
        )

        passed_gt_job = create_gt_job(admin_user, passed_task_id, complete=False)
        failed_gt_job = create_gt_job(admin_user, failed_task_id, complete=False)
        passed_car_label = self._get_task_labels_by_name(admin_user, task_id=passed_task_id)["car"]
        failed_car_label = self._get_task_labels_by_name(admin_user, task_id=failed_task_id)["car"]

        with make_api_client(admin_user) as api_client:
            passed_shape = self._build_rectangle_shape(
                frame=0,
                label_id=passed_car_label.id,
                points=[0, 0, 10, 10],
            )
            api_client.jobs_api.update_annotations(
                passed_gt_job.id,
                labeled_data_request={"shapes": [passed_shape]},
            )
            api_client.tasks_api.update_annotations(
                passed_task_id,
                labeled_data_request={"shapes": [passed_shape]},
            )

            failed_gt_shape = self._build_rectangle_shape(
                frame=0,
                label_id=failed_car_label.id,
                points=[0, 0, 10, 10],
            )
            api_client.jobs_api.update_annotations(
                failed_gt_job.id,
                labeled_data_request={"shapes": [failed_gt_shape]},
            )

        self._complete_job(admin_user, passed_gt_job.id)
        self._complete_job(admin_user, failed_gt_job.id)

        project_report = create_quality_report(user=admin_user, project_id=project.id)

        assert project_report["summary"]["tasks"] == {
            "total": 2,
            "custom": 0,
            "not_configured": 0,
            "excluded": 0,
            "included": 2,
            "completed": 1,
        }
        assert project_report["summary"]["jobs"] == {
            "total": 2,
            "excluded": 0,
            "not_checkable": 0,
            "included": 2,
            "completed": 1,
        }

        with make_api_client(admin_user) as api_client:
            task_reports = get_paginated_collection(
                api_client.quality_api.list_reports_endpoint,
                parent_id=project_report["id"],
                target="task",
                return_json=True,
            )

        task_reports_by_task_id = {report["task_id"]: report for report in task_reports}
        assert task_reports_by_task_id[passed_task_id]["summary"]["jobs"]["completed"] == 1
        assert task_reports_by_task_id[passed_task_id]["summary"]["requirements"]["completed"] == 1
        assert task_reports_by_task_id[failed_task_id]["summary"]["jobs"]["completed"] == 0
        assert task_reports_by_task_id[failed_task_id]["summary"]["requirements"]["completed"] == 0

        project_report_data = self._get_report_data(admin_user, project_report["id"])
        assert "frame_results" not in project_report_data
        assert "conflicts" not in project_report_data
        project_requirement_summary = project_report_data["groups"][requirement_name][
            "comparison_summary"
        ]
        assert project_requirement_summary["confusion_matrix"]["labels"] == ["car", "unmatched"]
        assert project_requirement_summary["confusion_matrix"]["rows"] == [[1, 0], [1, 0]]
        assert project_requirement_summary["score_components"] == {
            "valid_count": 1,
            "missing_count": 1,
            "extra_count": 0,
        }

    def test_confusion_matrix_correct(self, admin_user, find_sandbox_task_without_gt):
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])

        enabled_requirement_name = f"confusion-enabled-{task['id']}"
        disabled_requirement_name = f"confusion-disabled-{task['id']}"
        updated_settings, response = self._patch_settings(
            admin_user,
            settings["id"],
            {
                "inherit": False,
                "requirements": [
                    *self._retained_base_requirement_payloads(settings),
                    self._build_requirement_payload(
                        enabled_requirement_name,
                        enabled=True,
                        required_score=0.0,
                        metric="mean_jaccard_index",
                    ),
                    self._build_requirement_payload(
                        disabled_requirement_name,
                        enabled=False,
                        required_score=1.0,
                    ),
                ],
            },
        )
        assert response.status_code == HTTPStatus.OK
        enabled_requirement_id = next(
            requirement["id"]
            for requirement in updated_settings["requirements"]
            if requirement["name"] == enabled_requirement_name
        )
        disabled_requirement_id = next(
            requirement["id"]
            for requirement in updated_settings["requirements"]
            if requirement["name"] == disabled_requirement_name
        )

        create_gt_job(admin_user, task["id"])
        report = create_quality_report(user=admin_user, task_id=task["id"])
        report_data = self._get_report_data(admin_user, report["id"])
        target_score = report_data["groups"][enabled_requirement_name]["comparison_summary"][
            "score"
        ]

        response = get_method(admin_user, f"quality/reports/{report['id']}/confusion")
        assert response.status_code == HTTPStatus.OK
        assert response.headers["Content-Type"].startswith("application/zip")

        with ZipFile(BytesIO(response.content)) as archive:
            archive_entries = set(archive.namelist())
            assert "manifest.json" in archive_entries
            assert "overall.csv" not in archive_entries

            manifest = json.loads(archive.read("manifest.json"))
            assert manifest["report_id"] == report["id"]

            group_matrices = {
                matrix["requirement_id"]: matrix
                for matrix in manifest["matrices"]
                if matrix["scope"] == "group"
            }
            assert enabled_requirement_id in group_matrices
            assert disabled_requirement_id not in group_matrices
            assert group_matrices[enabled_requirement_id]["name"] == enabled_requirement_name

            enabled_group_csv = archive.read(
                group_matrices[enabled_requirement_id]["path"]
            ).decode()
            csv_reader = csv.DictReader(StringIO(enabled_group_csv))
            label_names = set(group_matrices[enabled_requirement_id]["labels"][:-1])
            assert csv_reader.fieldnames
            assert csv_reader.fieldnames[0] == "DS (row) \\ GT (col) label"
            assert set(csv_reader.fieldnames[1:-2]) == label_names
            assert csv_reader.fieldnames[-2:] == ["unmatched", "precision"]

            rows = list(csv_reader)
            row_label_field = "DS (row) \\ GT (col) label"
            assert {row[row_label_field] for row in rows[: len(label_names)]} == label_names
            assert [row[row_label_field] for row in rows[len(label_names) :]] == [
                "unmatched",
                "recall",
                "dice coefficient",
                "jaccard index",
                "",
                "avg. accuracy (micro)",
                "avg. dice coefficient (macro)",
            ]

        response = get_method(
            admin_user,
            f"quality/reports/{report['id']}/confusion/matrix",
            requirement=enabled_requirement_id,
        )
        assert response.status_code == HTTPStatus.OK
        assert "json" in response.headers["Content-Type"]
        enabled_group_matrix = response.json()
        assert enabled_group_matrix["labels"] == group_matrices[enabled_requirement_id]["labels"]
        assert enabled_group_matrix["rows"]
        assert enabled_group_matrix["axes"] == {"cols": "gt", "rows": "ds"}
        assert set(enabled_group_matrix) == {
            "labels",
            "rows",
            "axes",
            "precision",
            "recall",
            "accuracy",
            "jaccard_index",
            "dice",
            "target_metric_summary",
        }
        for metric in ("precision", "recall", "accuracy", "jaccard_index", "dice"):
            assert enabled_group_matrix[metric][-1] is None
        target_metric_summary = enabled_group_matrix["target_metric_summary"]
        assert set(target_metric_summary) == {
            "metric",
            "aggregation",
            "values",
            "worst_labels",
        }
        assert target_metric_summary["metric"] == "jaccard_index"
        assert target_metric_summary["aggregation"] == "mean"
        assert set(target_metric_summary["values"]) == {"micro", "mean", "label"}
        assert target_metric_summary["values"]["mean"] == pytest.approx(target_score)
        assert 0 <= target_metric_summary["values"]["micro"] <= 1
        assert 0 <= target_metric_summary["values"]["label"] <= 1
        assert target_metric_summary["worst_labels"]

        response = get_method(
            admin_user,
            f"quality/reports/{report['id']}/confusion/matrix",
            requirement=enabled_requirement_name,
        )
        assert response.status_code == HTTPStatus.BAD_REQUEST

        response = get_method(
            admin_user,
            f"quality/reports/{report['id']}/confusion/matrix",
            requirement=enabled_requirement_id,
            format="csv",
        )
        assert response.status_code == HTTPStatus.OK
        assert response.headers["Content-Type"].startswith("text/csv")
        assert response.content.decode() == enabled_group_csv

        response = get_method(
            admin_user,
            f"quality/reports/{report['id']}/confusion/matrix",
            requirement=disabled_requirement_id,
            format="csv",
        )
        assert response.status_code == HTTPStatus.NOT_FOUND


@pytest.mark.usefixtures("restore_db_per_function")
class TestProjectQualityRequirementInheritance(_QualityRequirementsTestBase):
    @pytest.mark.parametrize("inherit", [True, False])
    def test_task_report_uses_project_requirements_when_inherit_is_enabled(
        self, admin_user, inherit: bool
    ):
        with make_api_client(admin_user) as api_client:
            project, response = api_client.projects_api.create(
                {
                    "name": f"project-requirement-inheritance-{inherit}",
                    "labels": [{"name": "car", "type": "rectangle"}],
                }
            )
            assert response.status == HTTPStatus.CREATED

        task_id, _ = create_task(
            admin_user,
            spec={
                "name": f"task-requirement-inheritance-{inherit}",
                "project_id": project.id,
            },
            data={
                "image_quality": 70,
                "client_files": generate_image_files(1),
            },
        )

        project_settings = self._get_project_settings(admin_user, project_id=project.id)
        task_settings = self._get_task_settings(admin_user, task_id=task_id)

        project_requirement_name = f"project-requirement-{project.id}-{inherit}"
        project_requirement, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(
                project_requirement_name,
                settings_id=project_settings["id"],
                enabled=True,
                required_score=1.0,
            ),
        )
        assert response.status_code == HTTPStatus.CREATED

        task_requirement_name = f"task-requirement-{task_id}-{inherit}"
        task_requirement, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(
                task_requirement_name,
                settings_id=task_settings["id"],
                enabled=True,
                required_score=1.0,
            ),
        )
        assert response.status_code == HTTPStatus.CREATED

        patched_settings, response = self._patch_settings(
            admin_user,
            task_settings["id"],
            {"inherit": inherit},
        )
        assert response.status_code == HTTPStatus.OK
        assert patched_settings["inherit"] is inherit

        gt_job = create_gt_job(admin_user, task_id, complete=False)
        car_label = self._get_task_labels_by_name(admin_user, task_id=task_id)["car"]
        car_shape = self._build_rectangle_shape(
            frame=0,
            label_id=car_label.id,
            points=[0, 0, 10, 10],
        )
        with make_api_client(admin_user) as api_client:
            api_client.jobs_api.update_annotations(
                gt_job.id,
                labeled_data_request={"shapes": [car_shape]},
            )
            api_client.tasks_api.update_annotations(
                task_id,
                labeled_data_request={"shapes": [car_shape]},
            )
        self._complete_job(admin_user, gt_job.id)

        report = create_quality_report(user=admin_user, task_id=task_id)
        report_data = self._get_report_data(admin_user, report["id"])

        expected_requirement = project_requirement if inherit else task_requirement
        expected_name = expected_requirement["name"]
        unexpected_name = task_requirement_name if inherit else project_requirement_name

        assert expected_name in report_data["groups"]
        assert unexpected_name not in report_data["groups"]
        assert report_data["groups"][expected_name]["parameters"]["requirement_id"] == (
            expected_requirement["id"]
        )

        source_settings = project_settings if inherit else task_settings
        expected_requirements_summary = {
            "total": len(source_settings["requirements"]) + 1,
            "enabled": 1,
            "completed": 1,
            "not_computed": 0,
            "items": [
                {
                    "requirement_id": expected_requirement["id"],
                    "name": expected_name,
                    "metric": "accuracy",
                    "score": 1.0,
                    "score_components": {
                        "valid_count": 1,
                        "missing_count": 0,
                        "extra_count": 0,
                    },
                    "calculation": {"status": "computed"},
                    "threshold": 1.0,
                }
            ],
        }
        assert report["summary"]["requirements"] == expected_requirements_summary
        assert report_data["comparison_summary"]["requirements"] == (
            self._as_report_data_requirements_summary(expected_requirements_summary)
        )
        assert "annotations" not in report_data["comparison_summary"]
