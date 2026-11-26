# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import zipfile

from cvat.apps.engine.tests.test_rest_api_3D import _DbTestBase
from cvat.apps.engine.tests.utils import ASSETS_DIR
from cvat.apps.quality_control import models


class TestCuboidGroundTruthMedia(_DbTestBase):
    def test_gt_created_during_upload_initializes_task_and_shared_project_requirements(self):
        response = self._post_request(
            "/api/projects",
            self.admin,
            data={"name": "3D project", "labels": [{"name": "car", "type": "cuboid"}]},
        )
        self.assertEqual(response.status_code, 201, response.content)
        project_id = response.data["id"]
        response = self._post_request(
            "/api/tasks", self.admin, data={"name": "3D with GT", "project_id": project_id}
        )
        self.assertEqual(response.status_code, 201, response.content)
        task_id = response.data["id"]
        self.assertFalse(models.QualityRequirement.objects.exists())
        with (ASSETS_DIR / "test_canvas3d.zip").open("rb") as source:
            response = self._post_request(
                f"/api/tasks/{task_id}/data",
                self.admin,
                format="multipart",
                data={
                    "client_files[0]": source,
                    "image_quality": 100,
                    "validation_params.mode": "gt",
                    "validation_params.frame_selection_method": "random_uniform",
                    "validation_params.frame_count": 1,
                },
            )
        self.assertEqual(response.status_code, 202, response.content)
        response = self._get_request(f"/api/requests/{response.data['rq_id']}", self.admin)
        self.assertEqual(response.data["status"], "finished", response.data)
        response = self._get_request(
            "/api/jobs", self.admin, query_params={"task_id": task_id, "type": "ground_truth"}
        )
        self.assertEqual(response.data["count"], 1)
        task_settings = models.QualitySettings.objects.get(task_id=task_id)
        project_settings = models.QualitySettings.objects.get(project_id=project_id)
        self.assertEqual(task_settings.requirements.get().annotation_type, "cuboid")
        self.assertEqual(project_settings.requirements.get().annotation_type, "cuboid")
        self.assertTrue(task_settings.inherit)

    def test_uploaded_point_cloud_gt_frames_and_quality_request(self):
        with (ASSETS_DIR / "test_canvas3d.zip").open("rb") as source:
            response = self._post_request(
                "/api/tasks",
                self.admin,
                data={
                    "name": "Point cloud ground truth",
                    "labels": [{"name": "car", "type": "cuboid"}],
                },
            )
            self.assertEqual(response.status_code, 201, response.content)
            task_id = response.data["id"]
            response = self._post_request(
                f"/api/tasks/{task_id}/data",
                self.admin,
                format="multipart",
                data={"client_files[0]": source, "image_quality": 100},
            )
            self.assertEqual(response.status_code, 202, response.content)
            response = self._get_request(f"/api/requests/{response.data['rq_id']}", self.admin)
            self.assertEqual(response.data["status"], "finished", response.data)
        self.assertFalse(
            models.QualityRequirement.objects.filter(settings__task_id=task_id).exists()
        )
        response = self._post_request(
            "/api/jobs",
            self.admin,
            data={
                "task_id": task_id,
                "type": "ground_truth",
                "frame_selection_method": "manual",
                "frames": [0, 1],
            },
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(
            models.QualityRequirement.objects.get(settings__task_id=task_id).annotation_type,
            "cuboid",
        )
        gt_id = response.data["id"]
        response = self._get_request(f"/api/jobs/{gt_id}/data/meta", self.admin)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["included_frames"], [0, 1])
        response = self._get_request(
            f"/api/jobs/{gt_id}/data",
            self.admin,
            query_params={"type": "frame", "number": 1, "quality": "original"},
        )
        self.assertEqual(response.status_code, 200)
        content = b"".join(response.streaming_content) if response.streaming else response.content
        self.assertGreater(len(content), 0)
        jobs = self._get_request(
            "/api/jobs", self.admin, query_params={"task_id": task_id, "type": "annotation"}
        ).data["results"]
        response = self._get_request(
            f"/api/jobs/{jobs[0]['id']}/data",
            self.admin,
            query_params={"type": "frame", "number": 0, "quality": "compressed"},
        )
        self.assertEqual(response.status_code, 200)
        if response.streaming:
            b"".join(response.streaming_content)
        response = self._get_request(
            f"/api/jobs/{gt_id}/data",
            self.admin,
            query_params={"type": "chunk", "number": 0, "quality": "compressed"},
        )
        self.assertEqual(response.status_code, 200)
        content = b"".join(response.streaming_content) if response.streaming else response.content
        with zipfile.ZipFile(io.BytesIO(content)) as chunk:
            self.assertTrue(chunk.namelist())
            for name in chunk.namelist():
                self.assertTrue(name.endswith(".pcd"))
                self.assertIn(b"FIELDS", chunk.read(name)[:500])
        response = self._patch_request(
            f"/api/tasks/{task_id}/validation_layout", self.admin, data={"disabled_frames": [1]}
        )
        self.assertEqual(response.status_code, 200, response.content)
        response = self._get_request(f"/api/tasks/{task_id}/validation_layout", self.admin)
        self.assertEqual(response.data["disabled_frames"], [1])
        response = self._get_request(
            "/api/quality/settings", self.admin, query_params={"task_id": task_id}
        )
        settings = response.data["results"][0]
        base = next(r for r in settings["requirements"] if r["annotation_type"] == "cuboid")
        response = self._patch_request(
            f"/api/quality/settings/requirements/{base['id']}", self.admin, data={"enabled": True}
        )
        self.assertEqual(response.status_code, 200, response.content)
        labels = self._get_request(
            "/api/labels", self.admin, query_params={"task_id": task_id}
        ).data["results"]
        response = self._put_api_v2_job_id_annotations(
            gt_id,
            {
                "version": 0,
                "tags": [],
                "tracks": [],
                "intervals": [],
                "shapes": [
                    {
                        "type": "cuboid",
                        "frame": 0,
                        "label_id": labels[0]["id"],
                        "points": [0, 0, 0, 0.31, -0.47, 0.83, 2, 3, 4, 0, 0, 0, 0, 0, 0, 0],
                        "occluded": False,
                        "outside": False,
                        "attributes": [],
                        "group": 0,
                        "source": "manual",
                        "z_order": 0,
                        "rotation": 0,
                    }
                ],
            },
        )
        self.assertEqual(response.status_code, 200, response.content)
        response = self._post_request("/api/quality/reports", self.admin, data={"task_id": task_id})
        self.assertEqual(response.status_code, 202, response.content)
        response = self._get_request(f"/api/requests/{response.data['rq_id']}", self.admin)
        self.assertEqual(response.data["status"], "finished", response.data)
        reports = self._get_request(
            "/api/quality/reports", self.admin, query_params={"task_id": task_id, "target": "task"}
        ).data["results"]
        response = self._get_request(
            "/api/quality/conflicts", self.admin, query_params={"report_id": reports[0]["id"]}
        )
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["annotation_ids"][0]["job_id"], gt_id)
        response = self._export_task_backup(
            self.admin, task_id, query_params={"lightweight": False}
        )
        backup = io.BytesIO(b"".join(response.streaming_content))
        backup.name = "3d-quality-backup.zip"
        restored_id = self._import_task_backup(self.admin, backup)
        self.assertEqual(
            models.QualityRequirement.objects.get(settings__task_id=restored_id).annotation_type,
            "cuboid",
        )
        response = self._get_request(f"/api/tasks/{restored_id}/validation_layout", self.admin)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["disabled_frames"], [1])
        restored_jobs = self._get_request(
            "/api/jobs", self.admin, query_params={"task_id": restored_id, "type": "ground_truth"}
        ).data["results"]
        response = self._get_request(f"/api/jobs/{restored_jobs[0]['id']}/annotations", self.admin)
        self.assertEqual(len(response.data["shapes"]), 1)
        self.assertEqual(response.data["shapes"][0]["type"], "cuboid")
