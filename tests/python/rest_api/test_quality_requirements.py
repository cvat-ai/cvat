# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
from io import BytesIO
from http import HTTPStatus
from typing import Any
from zipfile import ZipFile

import pytest
from deepdiff import DeepDiff

from shared.utils.config import delete_method, get_method, make_api_client, patch_method, post_method

from .test_quality_control import _PermissionTestBase


class _QualityRequirementsTestBase(_PermissionTestBase):
    _requirements_endpoint = "quality/settings/requirements"
    _settings_endpoint = "quality/settings"

    @staticmethod
    def _build_requirement_payload(
        name: str,
        *,
        settings_id: int | None = None,
        enabled: bool = True,
        required_score: float = 0.7,
    ) -> dict[str, Any]:
        payload = {
            "name": name,
            "annotation_type": "rectangle",
            "metric": "accuracy",
            "required_score": required_score,
            "enabled": enabled,
        }
        if settings_id is not None:
            payload["settings_id"] = settings_id
        return payload

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
        response = patch_method(user, f"{self._requirements_endpoint}/{requirement_id}", data, **kwargs)
        return response.json() if response.content else None, response

    def _delete_requirement(self, user: str, requirement_id: int, **kwargs):
        return delete_method(user, f"{self._requirements_endpoint}/{requirement_id}", **kwargs)

    def _patch_settings(self, user: str, settings_id: int, data: dict[str, Any], **kwargs):
        response = patch_method(user, f"{self._settings_endpoint}/{settings_id}", data, **kwargs)
        return response.json() if response.content else None, response


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

        listed_requirements, response = self._list_requirements(admin_user, settings_id=settings["id"])
        assert response.status_code == HTTPStatus.OK
        listed_requirements_by_name = {
            requirement["name"]: requirement for requirement in listed_requirements
        }
        assert requirement_name in listed_requirements_by_name
        assert another_requirement_name in listed_requirements_by_name

        response = self._delete_requirement(admin_user, another_requirement["id"])
        assert response.status_code == HTTPStatus.NO_CONTENT

        listed_requirements, response = self._list_requirements(admin_user, settings_id=settings["id"])
        assert response.status_code == HTTPStatus.OK
        listed_requirements_by_name = {
            requirement["name"]: requirement for requirement in listed_requirements
        }
        assert requirement_name in listed_requirements_by_name

    def test_settings_patch_can_replace_requirements(self, admin_user, find_sandbox_task_without_gt):
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

        listed_requirements, response = self._list_requirements(admin_user, settings_id=settings["id"])
        assert response.status_code == HTTPStatus.OK
        assert [requirement["name"] for requirement in listed_requirements] == [
            replacement_payload["name"]
        ]

    def test_cannot_delete_last_quality_requirement(self, admin_user, find_sandbox_task_without_gt):
        task, _ = find_sandbox_task_without_gt(True)
        settings = self._get_task_settings(admin_user, task_id=task["id"])

        requirement_payload = self._build_requirement_payload(f"last-{task['id']}", required_score=0.2)
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

        listed_requirements, response = self._list_requirements(user["username"], task_id=task["id"])
        assert response.status_code == (HTTPStatus.OK if allow else HTTPStatus.FORBIDDEN)
        if allow:
            assert any(requirement["name"] == requirement_name for requirement in listed_requirements)

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
class TestGeneralizedQualityReportData(_QualityRequirementsTestBase):
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
        assert report_data["groups"][enabled_requirement_name]["parameters"]["required_score"] == 0.0
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
