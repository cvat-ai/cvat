# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.test import TestCase
from rest_framework.exceptions import ValidationError

from cvat.apps.engine.models import Task
from cvat.apps.quality_control import models
from cvat.apps.quality_control.serializers import (
    QualityRequirementBulkCreateSerializer,
    QualityRequirementSerializer,
    QualitySettingsSerializer,
)


class TestReservedRequirementNames(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.settings = Task.objects.create(name="reserved requirement names").quality_settings
        cls.base = cls.settings.requirements.get(annotation_type="rectangle")
        cls.settings.requirements.filter(annotation_type="interval").update(name="Audio checks")
        cls.custom = models.QualityRequirement.objects.create(
            settings=cls.settings, parent=cls.base, name="Custom requirement"
        )

    def test_creation_and_renaming_reject_reserved_names(self):
        for annotation_type in models.QualityRequirementAnnotationType:
            name = models.get_base_requirement_name(annotation_type)
            for instance in (None, self.custom):
                with self.subTest(name=name, creating=instance is None):
                    serializer = QualityRequirementSerializer(
                        instance,
                        data={
                            "settings_id": self.settings.id,
                            "parent_requirement": self.base.id,
                            "name": f" {name} ",
                        },
                        partial=instance is not None,
                    )
                    self.assertFalse(serializer.is_valid())
                    self.assertIn("reserved", str(serializer.errors["name"]))
        self.custom.refresh_from_db()
        self.assertEqual(self.custom.name, "Custom requirement")

    def test_base_can_be_renamed_and_restore_its_own_default_name(self):
        for name in ("Rectangle checks", "Base rectangle"):
            serializer = QualityRequirementSerializer(self.base, data={"name": name}, partial=True)
            self.assertTrue(serializer.is_valid(), serializer.errors)
            self.base = serializer.save()
            self.assertEqual(self.base.name, name)

        serializer = QualityRequirementSerializer(
            self.base, data={"name": "Base interval"}, partial=True
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("reserved", str(serializer.errors["name"]))

    def test_bulk_creation_rejects_reserved_names_at_any_depth(self):
        nodes = [
            {"name": "Base interval", "parent_requirement": self.base.id},
            {
                "name": "Custom parent",
                "parent_requirement": self.base.id,
                "children": [{"name": "Base interval"}],
            },
        ]
        count = self.settings.requirements.count()
        for node in nodes:
            with self.subTest(node=node):
                serializer = QualityRequirementBulkCreateSerializer(
                    data={"settings_id": self.settings.id, "requirements": [node]}
                )
                self.assertFalse(serializer.is_valid())
                self.assertIn("reserved", str(serializer.errors))
                self.assertEqual(self.settings.requirements.count(), count)

    def test_settings_update_rejects_reserved_names_atomically(self):
        for creating in (True, False):
            with self.subTest(creating=creating):
                payload = QualitySettingsSerializer(self.settings).data["requirements"]
                if creating:
                    payload.append({"name": "Base interval", "parent_requirement": self.base.id})
                else:
                    next(item for item in payload if item["id"] == self.custom.id)[
                        "name"
                    ] = "Base interval"
                serializer = QualitySettingsSerializer(
                    self.settings, data={"requirements": payload}, partial=True
                )
                self.assertTrue(serializer.is_valid(), serializer.errors)
                count = self.settings.requirements.count()
                with self.assertRaisesRegex(ValidationError, "reserved"):
                    serializer.save()
                self.assertEqual(self.settings.requirements.count(), count)
                self.custom.refresh_from_db()
                self.assertEqual(self.custom.name, "Custom requirement")

    def test_custom_requirements_can_use_non_reserved_names(self):
        serializer = QualityRequirementSerializer(
            data={
                "settings_id": self.settings.id,
                "parent_requirement": self.base.id,
                "name": "Speech checks",
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.save().name, "Speech checks")
