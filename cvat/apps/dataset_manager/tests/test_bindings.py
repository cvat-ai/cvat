# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.test import TestCase

from cvat.apps.dataset_manager.bindings import ProjectData
from cvat.apps.engine import models


class SoftAttributeImportTest(TestCase):
    def setUp(self):
        self.project = models.Project.objects.create(name="project")
        self.label = models.Label.objects.create(name="car", project=self.project)

        self.project_data = ProjectData(annotation_irs={}, db_project=self.project)
        self.project_data.soft_attribute_import = True

    def _import_new_attribute(self, name, value):
        imported = self.project_data._import_attribute(
            self.label.id, ProjectData.Attribute(name=name, value=value)
        )
        return imported, models.AttributeSpec.objects.get(id=imported["spec_id"])

    def test_can_create_checkbox_attribute_from_bool_value(self):
        for value in (True, False):
            with self.subTest(value=value):
                imported, spec = self._import_new_attribute(f"truncated_{value}", value)

                self.assertEqual(spec.input_type, models.AttributeType.CHECKBOX)
                self.assertEqual(imported["value"], value)

    def test_can_create_number_attribute_from_numeric_value(self):
        for value in (5, 2.5):
            with self.subTest(value=value):
                _, spec = self._import_new_attribute(f"score_{value}", value)

                self.assertEqual(spec.input_type, models.AttributeType.NUMBER)
