# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
from http import HTTPStatus
from io import BytesIO
from typing import Any
from zipfile import ZipFile

import pytest
from deepdiff import DeepDiff

from rest_api.utils import create_task
from shared.utils.config import (
    delete_method,
    get_method,
    make_api_client,
    patch_method,
    post_method,
)
from shared.utils.helpers import generate_image_files

from .test_quality_control import _PermissionTestBase


class _QualityRequirementsTestBase(_PermissionTestBase):
    _requirements_endpoint = "quality/settings/requirements"
    _settings_endpoint = "quality/settings"
    _max_requirements_per_settings = 100

    @staticmethod
    def _build_requirement_payload(
        name: str,
        *,
        settings_id: int | None = None,
        enabled: bool = True,
        required_score: float = 0.7,
        annotation_type: str = "rectangle",
        filter_expression: str | None = None,
        parent_requirement: int | None = None,
    ) -> dict[str, Any]:
        payload = {
            "name": name,
            "annotation_type": annotation_type,
            "metric": "accuracy",
            "required_score": required_score,
            "enabled": enabled,
        }
        if settings_id is not None:
            payload["settings_id"] = settings_id
        if filter_expression is not None:
            payload["filter"] = filter_expression
        if parent_requirement is not None:
            payload["parent_requirement"] = parent_requirement
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

    def _get_task_settings(self, user: str, *, task_id: int, **kwargs) -> dict[str, Any]:
        response = get_method(user, self._settings_endpoint, task_id=task_id, **kwargs)
        assert response.status_code == HTTPStatus.OK

        results = response.json()["results"]
        assert len(results) == 1
        return results[0]

    def _list_requirements(self, user: str, **kwargs):
        response = get_method(user, self._requirements_endpoint, **kwargs)
        return response.json()["results"] if response.ok else None, response

    def _create_requirement(self, user: str, data: dict[str, Any], **kwargs):
        response = post_method(user, self._requirements_endpoint, data, **kwargs)
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
        response = patch_method(user, f"{self._settings_endpoint}/{settings_id}", data, **kwargs)
        return response.json() if response.content else None, response

    def _get_report_data(self, user: str, report_id: int) -> dict[str, Any]:
        with make_api_client(user) as api_client:
            _, response = api_client.quality_api.retrieve_report_data(
                report_id, _parse_response=False
            )
            assert response.status == HTTPStatus.OK
            return json.loads(response.data)

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

    def test_settings_patch_can_replace_requirements(
        self, admin_user, find_sandbox_task_without_gt
    ):
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])

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
            {"inherit": False, "requirements": [first_payload, second_payload]},
        )
        assert response.status_code == HTTPStatus.OK
        assert patched_settings["inherit"] is False
        assert {requirement["name"] for requirement in patched_settings["requirements"]} == {
            first_payload["name"],
            second_payload["name"],
        }

        replacement_payload = self._build_requirement_payload(
            f"replace-{task['id']}-final",
            enabled=True,
            required_score=0.3,
        )
        patched_settings, response = self._patch_settings(
            admin_user,
            settings["id"],
            {"requirements": [replacement_payload]},
        )
        assert response.status_code == HTTPStatus.OK
        assert len(patched_settings["requirements"]) == 1
        assert patched_settings["requirements"][0]["name"] == replacement_payload["name"]

        listed_requirements, response = self._list_requirements(
            admin_user, settings_id=settings["id"]
        )
        assert response.status_code == HTTPStatus.OK
        assert [requirement["name"] for requirement in listed_requirements] == [
            replacement_payload["name"]
        ]

    def test_cannot_create_requirement_above_limit(self, admin_user, find_sandbox_task_without_gt):
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])

        filled_requirements = self._build_requirement_payloads(
            f"limit-fill-{task['id']}",
            self._max_requirements_per_settings,
        )
        patched_settings, response = self._patch_settings(
            admin_user,
            settings["id"],
            {"requirements": filled_requirements},
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

        _, response = self._patch_settings(
            admin_user,
            settings["id"],
            {
                "requirements": self._build_requirement_payloads(
                    f"limit-payload-{task['id']}",
                    self._max_requirements_per_settings + 1,
                )
            },
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert response.json()["requirements"] == self._get_requirement_limit_error_message()

    def test_cannot_delete_last_quality_requirement(self, admin_user, find_sandbox_task_without_gt):
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])

        requirement_payload = self._build_requirement_payload(
            f"last-{task['id']}", required_score=0.2
        )
        patched_settings, response = self._patch_settings(
            admin_user,
            settings["id"],
            {"requirements": [requirement_payload]},
        )
        assert response.status_code == HTTPStatus.OK
        assert len(patched_settings["requirements"]) == 1

        requirement_id = patched_settings["requirements"][0]["id"]
        response = self._delete_requirement(admin_user, requirement_id)
        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert "last quality requirement" in json.dumps(response.json()).lower()

    # TODO: Add parent skeleton information to the model
    def test_create_requirement_rejects_unimplemented_filter_terms(
        self, admin_user, find_sandbox_task_without_gt
    ):
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])

        _, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(
                f"unsupported-filter-{task['id']}",
                settings_id=settings["id"],
                annotation_type="skeleton_keypoint",
                filter_expression=json.dumps({"==": [{"var": "shape.skeleton.label"}, "person"]}),
            ),
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert "shape.skeleton.label" in json.dumps(response.json())

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

    def test_create_attribute_requirement_accepts_attribute_root_terms(
        self, admin_user, find_sandbox_task_without_gt
    ):
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])

        parent_requirement, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(
                f"parent-{task['id']}",
                settings_id=settings["id"],
                annotation_type="rectangle",
            ),
        )
        assert response.status_code == HTTPStatus.CREATED

        created_requirement, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(
                f"attribute-filter-{task['id']}",
                settings_id=settings["id"],
                annotation_type="attribute",
                parent_requirement=parent_requirement["id"],
                filter_expression=json.dumps({"==": [{"var": "attribute.name"}, "color"]}),
            ),
        )

        assert response.status_code == HTTPStatus.CREATED
        assert created_requirement["annotation_type"] == "attribute"
        assert created_requirement["parent_requirement"] == parent_requirement["id"]
        assert created_requirement["filter"] == json.dumps(
            {"==": [{"var": "attribute.name"}, "color"]}
        )

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


@pytest.mark.usefixtures("restore_db_per_function")
class TestDefaultQualityRequirementsApi(_QualityRequirementsTestBase):
    def test_new_task_gets_disabled_default_requirements_from_task_labels(self, admin_user):
        task_id, _ = create_task(
            admin_user,
            spec={
                "name": "task-default-quality-requirements",
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

        assert {requirement["annotation_type"] for requirement in requirements} == {
            "rectangle",
            "tag",
        }
        assert {requirement["name"] for requirement in requirements} == {
            "default:rectangle",
            "default:tag",
        }
        assert all(requirement["enabled"] is False for requirement in requirements)

    def test_new_project_task_gets_disabled_default_requirements_from_project_labels(
        self, admin_user
    ):
        with make_api_client(admin_user) as api_client:
            project, response = api_client.projects_api.create(
                {
                    "name": "project-default-quality-requirements",
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
                "name": "project-task-default-quality-requirements",
                "project_id": project.id,
            },
            data={
                "image_quality": 70,
                "client_files": generate_image_files(2),
            },
        )

        settings = self._get_task_settings(admin_user, task_id=task_id)
        requirements = settings["requirements"]

        assert {requirement["annotation_type"] for requirement in requirements} == {
            "rectangle",
            "skeleton",
        }
        assert {requirement["name"] for requirement in requirements} == {
            "default:rectangle",
            "default:skeleton",
        }
        assert all(requirement["enabled"] is False for requirement in requirements)


@pytest.mark.usefixtures("restore_db_per_function")
class TestGeneralizedQualityReportData(_QualityRequirementsTestBase):
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
                    self._build_requirement_payload(
                        requirement_name,
                        enabled=True,
                        required_score=1.0,
                        annotation_type="rectangle",
                        filter_expression=json.dumps({"==": [{"var": "shape.label"}, "car"]}),
                    )
                ],
            },
        )
        assert response.status_code == HTTPStatus.OK

        gt_job = self.create_gt_job(admin_user, task_id, complete=False)
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

        report = self.create_quality_report(user=admin_user, task_id=task_id)
        report_data = self._get_report_data(admin_user, report["id"])

        group_annotations = report_data["groups"][requirement_name]["comparison_summary"][
            "annotations"
        ]
        assert group_annotations["valid_count"] == 1
        assert group_annotations["missing_count"] == 0
        assert group_annotations["extra_count"] == 0
        assert group_annotations["total_count"] == 1

        total_annotations = report_data["comparison_summary"]["annotations"]
        assert total_annotations["valid_count"] == 1
        assert total_annotations["total_count"] == 1
        assert report_data["comparison_summary"]["conflict_count"] == 0

    @pytest.mark.parametrize(
        "filter_expression,expected_report",
        [
            pytest.param(
                json.dumps({"==": [{"var": "attribute.name"}, "color"]}),
                {
                    "valid_count": 1,
                    "missing_count": 0,
                    "extra_count": 0,
                    "total_count": 1,
                    "invalid_count": 0,
                    "conflict_count": 0,
                },
                id="color",
            ),
            pytest.param(
                json.dumps({"==": [{"var": "attribute.name"}, "size"]}),
                {
                    "valid_count": 0,
                    "missing_count": 0,
                    "extra_count": 0,
                    "total_count": 1,
                    "invalid_count": 1,
                    "conflict_count": 1,
                },
                id="size",
            ),
            pytest.param(
                json.dumps(
                    {
                        "or": [
                            {"==": [{"var": "attribute.name"}, "color"]},
                            {"==": [{"var": "attribute.name"}, "size"]},
                        ]
                    }
                ),
                {
                    "valid_count": 1,
                    "missing_count": 0,
                    "extra_count": 0,
                    "total_count": 2,
                    "invalid_count": 1,
                    "conflict_count": 1,
                },
                id="color-and-size",
            ),
        ],
    )
    def test_task_report_data_applies_attribute_requirement_filter_to_metrics(
        self,
        admin_user,
        filter_expression,
        expected_report,
    ):
        task_id, _ = create_task(
            admin_user,
            spec={
                "name": "attribute-filter-report",
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
        settings = self._get_task_settings(admin_user, task_id=task_id)

        parent_requirement_name = f"boxes-{task_id}"
        patched_settings, response = self._patch_settings(
            admin_user,
            settings["id"],
            {
                "inherit": False,
                "requirements": [
                    self._build_requirement_payload(
                        parent_requirement_name,
                        enabled=True,
                        required_score=1.0,
                        annotation_type="rectangle",
                    )
                ],
            },
        )
        assert response.status_code == HTTPStatus.OK
        parent_requirement = patched_settings["requirements"][0]

        attribute_requirement_name = f"attribute-filter-{task_id}"
        _, response = self._create_requirement(
            admin_user,
            self._build_requirement_payload(
                attribute_requirement_name,
                settings_id=settings["id"],
                enabled=True,
                required_score=1.0,
                annotation_type="attribute",
                parent_requirement=parent_requirement["id"],
                filter_expression=filter_expression,
            ),
        )
        assert response.status_code == HTTPStatus.CREATED

        gt_job = self.create_gt_job(admin_user, task_id, complete=False)
        labels_by_name = self._get_task_labels_by_name(admin_user, task_id=task_id)
        car_label = labels_by_name["car"]
        attribute_ids = {attribute.name: attribute.id for attribute in car_label.attributes}

        gt_attributes = [
            {"spec_id": attribute_ids["color"], "value": "red"},
            {"spec_id": attribute_ids["size"], "value": "large"},
        ]
        ds_attributes = [
            {"spec_id": attribute_ids["color"], "value": "red"},
            {"spec_id": attribute_ids["size"], "value": "small"},
        ]

        with make_api_client(admin_user) as api_client:
            api_client.jobs_api.update_annotations(
                gt_job.id,
                labeled_data_request={
                    "shapes": [
                        self._build_rectangle_shape(
                            frame=0,
                            label_id=car_label.id,
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
                            label_id=car_label.id,
                            points=[0, 0, 10, 10],
                            attributes=ds_attributes,
                        )
                    ]
                },
            )

        self._complete_job(admin_user, gt_job.id)

        report = self.create_quality_report(user=admin_user, task_id=task_id)
        report_data = self._get_report_data(admin_user, report["id"])

        attribute_group = report_data["groups"][attribute_requirement_name]["comparison_summary"]
        attribute_annotations = attribute_group["annotations"]
        assert attribute_annotations["valid_count"] == expected_report["valid_count"]
        assert attribute_annotations["missing_count"] == expected_report["missing_count"]
        assert attribute_annotations["extra_count"] == expected_report["extra_count"]
        assert attribute_annotations["total_count"] == expected_report["total_count"]
        assert (
            attribute_group["annotation_components"]["label"]["invalid_count"]
            == expected_report["invalid_count"]
        )
        assert attribute_group["conflict_count"] == expected_report["conflict_count"]

    def test_task_report_data_contains_groups_and_targets(
        self, admin_user, find_sandbox_task_without_gt
    ):
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])

        enabled_requirement_name = f"report-enabled-{task['id']}"
        disabled_requirement_name = f"report-disabled-{task['id']}"
        _, response = self._patch_settings(
            admin_user,
            settings["id"],
            {
                "inherit": False,
                "requirements": [
                    self._build_requirement_payload(
                        enabled_requirement_name,
                        enabled=True,
                        required_score=0.0,
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

        self.create_gt_job(admin_user, task["id"])
        report = self.create_quality_report(user=admin_user, task_id=task["id"])

        with make_api_client(admin_user) as api_client:
            _, response = api_client.quality_api.retrieve_report_data(
                report["id"], _parse_response=False
            )
            assert response.status == HTTPStatus.OK
            report_data = json.loads(response.data)

        assert "groups" in report_data
        assert enabled_requirement_name in report_data["groups"]
        assert disabled_requirement_name in report_data["groups"]
        assert report_data["comparison_summary"]["targets"] == {
            "total": 2,
            "enabled": 1,
            "completed": 1,
        }
        assert report_data["groups"][enabled_requirement_name]["parameters"]["metric"] == "accuracy"
        assert (
            report_data["groups"][enabled_requirement_name]["parameters"]["required_score"] == 0.0
        )
        assert (
            report_data["groups"][disabled_requirement_name]["comparison_summary"]["annotations"][
                "total_count"
            ]
            == 0
        )

    def test_task_report_confusion_endpoint_returns_zip_archive(
        self, admin_user, find_sandbox_task_without_gt
    ):
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])

        enabled_requirement_name = f"confusion-enabled-{task['id']}"
        disabled_requirement_name = f"confusion-disabled-{task['id']}"
        _, response = self._patch_settings(
            admin_user,
            settings["id"],
            {
                "inherit": False,
                "requirements": [
                    self._build_requirement_payload(
                        enabled_requirement_name,
                        enabled=True,
                        required_score=0.0,
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

        self.create_gt_job(admin_user, task["id"])
        report = self.create_quality_report(user=admin_user, task_id=task["id"])

        response = get_method(admin_user, f"quality/reports/{report['id']}/confusion")
        assert response.status_code == HTTPStatus.OK
        assert response.headers["Content-Type"].startswith("application/zip")

        with ZipFile(BytesIO(response.content)) as archive:
            archive_entries = set(archive.namelist())
            assert "manifest.json" in archive_entries
            assert "overall.csv" in archive_entries

            manifest = json.loads(archive.read("manifest.json"))
            assert manifest["report_id"] == report["id"]

            group_matrices = {
                matrix["name"]: matrix["path"]
                for matrix in manifest["matrices"]
                if matrix["scope"] == "group"
            }
            assert enabled_requirement_name in group_matrices
            assert disabled_requirement_name not in group_matrices

            overall_csv = archive.read("overall.csv").decode()
            enabled_group_csv = archive.read(group_matrices[enabled_requirement_name]).decode()
            assert "ds \\ gt" in overall_csv
            assert "ds \\ gt" in enabled_group_csv
