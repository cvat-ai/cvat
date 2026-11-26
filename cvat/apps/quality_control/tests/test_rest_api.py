# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import Any

from django.contrib.auth.models import Group
from rest_framework import status

from cvat.apps.engine.models import Data, Job, JobType, Segment, Task
from cvat.apps.engine.tests.utils import ApiTestBase
from cvat.apps.iam.models import User
from cvat.apps.quality_control import models


def create_image_gt(task_id):
    data = Data.objects.create(size=1, chunk_size=1, image_quality=100)
    Task.objects.filter(pk=task_id).update(dimension="2d", media_type="image", data=data)
    segment = Segment.objects.create(task_id=task_id, start_frame=0, stop_frame=0)
    return Job.objects.create(segment=segment, type=JobType.GROUND_TRUTH)


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
        create_image_gt(task_id)

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


class TestQualityRequirementSimilarityMetricApi(ApiTestBase):
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
            data={"name": "similarity metrics", "labels": [{"name": "car", "type": "any"}]},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)

        create_image_gt(response.json()["id"])
        response = self._get_request(
            "/api/quality/settings", self.admin, query_params={"task_id": response.json()["id"]}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.settings = response.json()["results"][0]
        self.task_default_base_requirements = {
            r["annotation_type"]: r for r in self.settings["requirements"] if r["is_base"]
        }

    def _create_child_requirement(self, name: str, annotation_type: str, **fields):
        return self._post_request(
            "/api/quality/settings/requirements",
            self.admin,
            data={
                "name": name,
                "settings_id": self.settings["id"],
                "parent_requirement": self.task_default_base_requirements[annotation_type]["id"],
                **fields,
            },
        )

    def test_settings_access_does_not_initialize_requirements_in_any_dimension(self):
        for dimension, media_type, expected_count in (("2d", "image", 9), ("3d", "point_cloud", 1)):
            with self.subTest(dimension=dimension):
                data = Data.objects.create(size=1, chunk_size=1, image_quality=100)
                task = Task.objects.create(
                    name=dimension,
                    dimension=dimension,
                    media_type=media_type,
                    owner=self.admin,
                    data=data,
                )
                settings = task.quality_settings
                before = settings.updated_date
                response = self._get_request(
                    "/api/quality/settings", self.admin, query_params={"task_id": task.id}
                )
                self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
                self.assertEqual(response.json()["results"][0]["requirements"], [])
                settings.refresh_from_db()
                self.assertEqual(settings.updated_date, before)
                response = self._patch_request(
                    f"/api/quality/settings/{settings.id}", self.admin, data={"inherit": False}
                )
                self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
                self.assertEqual(response.json()["requirements"], [])
                self.assertFalse(settings.requirements.exists())

                segment = Segment.objects.create(task=task, start_frame=0, stop_frame=0)
                Job.objects.create(segment=segment, type=JobType.GROUND_TRUTH)
                self.assertEqual(settings.requirements.count(), expected_count)

                # A read or an ordinary settings update must not repair missing bases.
                settings.requirements.all().delete()
                response = self._get_request(
                    "/api/quality/settings", self.admin, query_params={"task_id": task.id}
                )
                self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
                self.assertEqual(response.json()["results"][0]["requirements"], [])
                response = self._patch_request(
                    f"/api/quality/settings/{settings.id}", self.admin, data={"inherit": True}
                )
                self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
                self.assertEqual(response.json()["requirements"], [])
                self.assertFalse(settings.requirements.exists())

    def test_similarity_metrics_cover_all_base_requirements(self):
        self.assertEqual(
            set(self.task_default_base_requirements),
            {
                t
                for t in models.QualityRequirementAnnotationType
                if t != models.QualityRequirementAnnotationType.CUBOID
            },
        )

    def test_can_use_all_supported_metrics(self):
        for (
            annotation_type,
            metrics,
        ) in models.QualityRequirement.get_supported_similarity_metrics().items():
            if annotation_type not in self.task_default_base_requirements:
                continue
            for metric in metrics:
                with self.subTest(annotation_type=annotation_type, metric=metric):
                    response = self._create_child_requirement(
                        f"{annotation_type}-{metric}", annotation_type, similarity_metric=metric
                    )
                    self.assertEqual(
                        response.status_code, status.HTTP_201_CREATED, response.content
                    )
                    self.assertEqual(response.json()["similarity_metric"], metric)

    def test_cannot_use_unsupported_metrics(self):
        for (
            annotation_type,
            metrics,
        ) in models.QualityRequirement.get_supported_similarity_metrics().items():
            if annotation_type not in self.task_default_base_requirements:
                continue
            for metric in set(models.ShapeSimilarityMetricType).difference(metrics):
                with self.subTest(annotation_type=annotation_type, metric=metric):
                    response = self._create_child_requirement(
                        f"{annotation_type}-{metric}", annotation_type, similarity_metric=metric
                    )
                    self.assertEqual(
                        response.status_code, status.HTTP_400_BAD_REQUEST, response.content
                    )
                    self.assertIn("similarity_metric", response.json())

                    response = self._patch_request(
                        "/api/quality/settings/requirements/"
                        f"{self.task_default_base_requirements[annotation_type]['id']}",
                        self.admin,
                        data={"similarity_metric": metric},
                    )
                    self.assertEqual(
                        response.status_code, status.HTTP_400_BAD_REQUEST, response.content
                    )
                    self.assertIn("similarity_metric", response.json())

    def test_base_requirement_cannot_inherit_metric(self):
        response = self._patch_request(
            "/api/quality/settings/requirements/"
            f"{self.task_default_base_requirements['rectangle']['id']}",
            self.admin,
            data={"similarity_metric": None},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.content)
        self.assertEqual(
            response.json()["similarity_metric"], ["Root requirements cannot inherit."]
        )

    def test_cannot_use_unknown_metric(self):
        response = self._create_child_requirement(
            "unknown metric", "rectangle", similarity_metric="unknown"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.content)
        self.assertEqual(response.json()["similarity_metric"], ['"unknown" is not a valid choice.'])

    def test_child_requirement_inherits_metric(self):
        response = self._create_child_requirement("inherited metric", "rectangle")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        self.assertIsNone(response.json()["similarity_metric"])
        self.assertEqual(
            response.json()["effective"]["similarity_metric"],
            self.task_default_base_requirements["rectangle"]["similarity_metric"],
        )

    def test_base_requirement_name_cannot_be_changed(self):
        base = self.task_default_base_requirements["rectangle"]
        url = f"/api/quality/settings/requirements/{base['id']}"
        response = self._patch_request(url, self.admin, data={"name": "Renamed base"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.content)
        self.assertEqual(
            response.json()["name"], ["Base quality requirement names cannot be changed."]
        )
        self.assertEqual(models.QualityRequirement.objects.get(pk=base["id"]).name, base["name"])

        response = self._patch_request(
            url, self.admin, data={"name": base["name"], "enabled": True}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertTrue(response.json()["enabled"])

    def test_custom_requirements_cannot_use_reserved_base_names(self):
        response = self._create_child_requirement("Cars", "rectangle")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        child_id = response.json()["id"]
        for annotation_type in models.QualityRequirementAnnotationType:
            name = models.get_base_requirement_name(annotation_type)
            with self.subTest(name=name):
                response = self._create_child_requirement(name, "rectangle")
                self.assertEqual(
                    response.status_code, status.HTTP_400_BAD_REQUEST, response.content
                )
                self.assertEqual(
                    response.json()["name"],
                    ["This name is reserved for a base quality requirement."],
                )
                response = self._patch_request(
                    f"/api/quality/settings/requirements/{child_id}",
                    self.admin,
                    data={"name": name},
                )
                self.assertEqual(
                    response.status_code, status.HTTP_400_BAD_REQUEST, response.content
                )
        self.assertEqual(models.QualityRequirement.objects.get(pk=child_id).name, "Cars")

        response = self._patch_request(
            f"/api/quality/settings/requirements/{child_id}", self.admin, data={"name": "Trucks"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.json()["name"], "Trucks")

    def test_bulk_settings_update_cannot_rename_a_base_and_rolls_back_changes(self):
        before = list(
            models.QualityRequirement.objects.filter(settings_id=self.settings["id"])
            .order_by("id")
            .values()
        )
        requirements = [
            {"id": base["id"], "enabled": True} for base in self.settings["requirements"]
        ]
        requirements[1]["name"] = "Renamed base"
        response = self._patch_request(
            f"/api/quality/settings/{self.settings['id']}",
            self.admin,
            data={"requirements": requirements},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.content)
        self.assertEqual(
            list(
                models.QualityRequirement.objects.filter(settings_id=self.settings["id"])
                .order_by("id")
                .values()
            ),
            before,
        )

    def test_bulk_settings_update_cannot_create_a_child_with_a_reserved_name(self):
        response = self._patch_request(
            f"/api/quality/settings/{self.settings['id']}",
            self.admin,
            data={
                "requirements": [
                    *({"id": base["id"]} for base in self.settings["requirements"]),
                    {
                        "name": "Base cuboid",
                        "parent_requirement": self.task_default_base_requirements["rectangle"][
                            "id"
                        ],
                    },
                ]
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.content)
        self.assertFalse(
            models.QualityRequirement.objects.filter(
                settings_id=self.settings["id"], parent__isnull=False
            ).exists()
        )

    def test_bulk_creation_rejects_reserved_names_in_root_and_nested_children(self):
        parent_id = self.task_default_base_requirements["rectangle"]["id"]
        for requirement in (
            {"name": "Base cuboid", "parent_requirement": parent_id},
            {
                "name": "Cars",
                "parent_requirement": parent_id,
                "children": [{"name": "Base cuboid"}],
            },
        ):
            with self.subTest(requirement=requirement):
                response = self._post_request(
                    "/api/quality/settings/requirements/bulk",
                    self.admin,
                    data={"settings_id": self.settings["id"], "requirements": [requirement]},
                )
                self.assertEqual(
                    response.status_code, status.HTTP_400_BAD_REQUEST, response.content
                )
                self.assertIn("This name is reserved", str(response.json()))
                self.assertEqual(
                    models.QualityRequirement.objects.filter(
                        settings_id=self.settings["id"]
                    ).count(),
                    9,
                )
