# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import Any

from django.contrib.auth.models import Group
from rest_framework import status

from cvat.apps.engine.tests.utils import ApiTestBase
from cvat.apps.iam.models import User


class TestQualityRequirementApiForDeletedAttributes(ApiTestBase):
    """Tests for regressions on https://github.com/cvat-ai/cvat/pull/11369"""

    @classmethod
    def setUpTestData(cls):
        group_admin, _ = Group.objects.get_or_create(name="admin")
        cls.admin = User.objects.create_superuser(username="admin", email="", password="admin")
        cls.admin.groups.add(group_admin)

    def setUp(self):
        super().setUp()

        response = self._post_request(
            "/api/tasks",
            self.admin,
            data={
                "name": "deleted attribute rules",
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
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        task_id = response.json()["id"]

        response = self._get_request("/api/labels", self.admin, query_params={"task_id": task_id})
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        car_label = response.json()["results"][0]
        deleted_attribute = next(a for a in car_label["attributes"] if a["name"] == "size")
        self.stale_rule = {"spec_id": deleted_attribute["id"], "enabled": True}
        self.unknown_rule = {"spec_id": deleted_attribute["id"] + 1000, "enabled": True}

        self.settings = self._get_settings(task_id)
        self.base_rectangle = next(
            r for r in self.settings["requirements"] if r["annotation_type"] == "rectangle"
        )

        response = self._post_request(
            "/api/quality/settings/requirements",
            self.admin,
            data=self._make_requirement_payload(
                "deleted attribute rules", attribute_comparison={"rules": [self.stale_rule]}
            ),
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        self.requirement = response.json()

        response = self._patch_request(
            f"/api/labels/{car_label['id']}",
            self.admin,
            data={"attributes": [{**deleted_attribute, "deleted": True}]},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)

        self.settings = self._get_settings(task_id)

    def _get_settings(self, task_id: int) -> dict[str, Any]:
        response = self._get_request(
            "/api/quality/settings", self.admin, query_params={"task_id": task_id}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        return response.json()["results"][0]

    def _make_requirement_payload(self, name: str, **fields) -> dict[str, Any]:
        return {
            "name": name,
            "settings_id": self.settings["id"],
            "parent_requirement": self.base_rectangle["id"],
            "metric": "accuracy",
            "required_score": 0.7,
            **fields,
        }

    def _retained_base_requirements(self) -> list[dict[str, Any]]:
        return [{"id": r["id"]} for r in self.settings["requirements"] if r["is_base"]]

    def _patch_settings_requirements(self, requirements: list[dict[str, Any]]):
        return self._patch_request(
            f"/api/quality/settings/{self.settings['id']}",
            self.admin,
            data={"requirements": requirements},
        )

    def test_can_update_requirement_referencing_deleted_attributes(self):
        response = self._patch_request(
            f"/api/quality/settings/requirements/{self.requirement['id']}",
            self.admin,
            data={"enabled": False, "attribute_comparison": {"rules": [self.stale_rule]}},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.json()["attribute_comparison"], {"rules": [self.stale_rule]})

    def test_can_copy_requirement_referencing_deleted_attributes(self):
        response = self._post_request(
            "/api/quality/settings/requirements",
            self.admin,
            data=self._make_requirement_payload(
                f"Copy of {self.requirement['name']}",
                attribute_comparison={"rules": [self.stale_rule]},
            ),
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        self.assertEqual(response.json()["attribute_comparison"], {"rules": [self.stale_rule]})

    def test_cannot_add_rules_for_unknown_attributes(self):
        response = self._patch_request(
            f"/api/quality/settings/requirements/{self.requirement['id']}",
            self.admin,
            data={"attribute_comparison": {"rules": [self.stale_rule, self.unknown_rule]}},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Unknown attribute spec id(s)", response.content.decode())

        response = self._post_request(
            "/api/quality/settings/requirements",
            self.admin,
            data=self._make_requirement_payload(
                f"Unknown attribute {self.requirement['name']}",
                attribute_comparison={"rules": [self.unknown_rule]},
            ),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Unknown attribute spec id(s)", response.content.decode())

    def test_bulk_settings_update_can_add_rules_for_known_deleted_attributes(self):
        # The client can send all the requirements on save, including the stored rules
        # for the deleted attributes, e.g. when a requirement is enabled or copied
        response = self._patch_settings_requirements(
            [
                *(
                    {"id": r["id"], "enabled": not r["enabled"]}
                    for r in self.settings["requirements"]
                    if r["is_base"]
                ),
                {
                    # Keep the existing requirement
                    "id": self.requirement["id"],
                    "attribute_comparison": {"rules": [self.stale_rule]},
                },
                self._make_requirement_payload(
                    f"Copy of {self.requirement['name']}",
                    attribute_comparison={"rules": [self.stale_rule]},
                ),
            ]
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(
            {
                r["name"]: r["attribute_comparison"]
                for r in response.json()["requirements"]
                if not r["is_base"]
            },
            {
                self.requirement["name"]: {"rules": [self.stale_rule]},
                f"Copy of {self.requirement['name']}": {"rules": [self.stale_rule]},
            },
        )

    def test_bulk_settings_update_can_readd_rules_for_known_deleted_attributes(self):
        # A rule can be removed from a requirement and copied in the same request
        response = self._patch_settings_requirements(
            [
                *self._retained_base_requirements(),
                {"id": self.requirement["id"], "attribute_comparison": None},
                self._make_requirement_payload(
                    f"Copy of {self.requirement['name']}",
                    attribute_comparison={"rules": [self.stale_rule]},
                ),
            ]
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)

    def test_bulk_settings_update_cannot_add_rules_for_unknown_attributes(self):
        response = self._patch_settings_requirements(
            [
                *self._retained_base_requirements(),
                self._make_requirement_payload(
                    f"Unknown attribute {self.requirement['name']}",
                    attribute_comparison={"rules": [self.unknown_rule]},
                ),
            ]
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Unknown attribute spec id(s)", response.content.decode())
