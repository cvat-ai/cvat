# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json

from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase
from django.utils import timezone


class TestAudioQualityMigrations(TransactionTestCase):
    def test_reports_unchanged_and_interval_at_quota_with_name_collision(self):
        old_target = [("quality_control", "0013_alter_qualityrequirement_target_metric")]
        new_target = [("quality_control", "0014_audio_quality")]
        executor = MigrationExecutor(connection)
        other_targets = [
            node for node in executor.loader.graph.leaf_nodes() if node[0] != "quality_control"
        ]
        old_target = [*other_targets, *old_target]
        new_target = [*other_targets, *new_target]
        executor.migrate(old_target)
        try:
            apps = executor.loader.project_state(old_target).apps
            task = apps.get_model("engine", "Task").objects.create(
                name="historical task", media_type="audio", dimension="1d", mode="interpolation"
            )
            settings = apps.get_model("quality_control", "QualitySettings").objects.create(
                task_id=task.id
            )
            Requirement = apps.get_model("quality_control", "QualityRequirement")
            root = Requirement.objects.create(
                settings_id=settings.id, name="Base rectangle", annotation_type="rectangle"
            )
            occupied_names = ("Base interval", "Base interval (custom)", "Base interval (custom) 2")
            Requirement.objects.bulk_create(
                [
                    Requirement(
                        settings_id=settings.id,
                        parent_id=root.id,
                        name=(
                            occupied_names[index]
                            if index < len(occupied_names)
                            else f"custom {index}"
                        ),
                    )
                    for index in range(99)
                ]
            )
            conflicting = Requirement.objects.filter(settings_id=settings.id, name="Base interval")
            original = conflicting.values().get()
            Requirement.objects.filter(settings_id=settings.id, name="custom 98").update(
                parent_id=original["id"]
            )
            Report = apps.get_model("quality_control", "QualityReport")
            legacy_payload = json.dumps(
                {"parameters": {}, "comparison_summary": {}, "name": '"groups": {}'}
            )
            v1 = Report.objects.create(
                task_id=task.id, target_last_updated=timezone.now(), data=legacy_payload
            )
            v2 = Report.objects.create(
                task_id=task.id, target_last_updated=timezone.now(), data=json.dumps({"groups": {}})
            )
            created = v2.created_date
            executor = MigrationExecutor(connection)
            executor.migrate(new_target)
            apps = executor.loader.project_state(new_target).apps
            Report = apps.get_model("quality_control", "QualityReport")
            Requirement = apps.get_model("quality_control", "QualityRequirement")
            self.assertEqual(Report.objects.get(id=v1.id).data, legacy_payload)
            restored = Report.objects.get(id=v2.id)
            self.assertEqual(restored.data, v2.data)
            self.assertEqual(restored.created_date, created)
            self.assertEqual(Requirement.objects.filter(settings_id=settings.id).count(), 101)
            renamed = Requirement.objects.filter(id=original["id"]).values().get()
            self.assertGreater(renamed["updated_date"], original["updated_date"])
            self.assertEqual(
                renamed,
                {
                    **original,
                    "name": "Base interval (custom) 3",
                    "updated_date": renamed["updated_date"],
                },
            )
            self.assertEqual(
                Requirement.objects.get(settings_id=settings.id, name="custom 98").parent_id,
                original["id"],
            )
            base = Requirement.objects.get(settings_id=settings.id, annotation_type="interval")
            self.assertEqual(base.name, "Base interval")
            self.assertFalse(base.enabled)
            self.assertEqual((base.iou_threshold, base.target_metric_threshold), (0.4, 0.7))
            self.assertGreater(
                apps.get_model("quality_control", "QualitySettings")
                .objects.get(id=settings.id)
                .updated_date,
                settings.updated_date,
            )
        finally:
            MigrationExecutor(connection).migrate(new_target)
