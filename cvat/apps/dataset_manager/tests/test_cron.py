# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
from datetime import timedelta
from pathlib import Path
from tempfile import TemporaryDirectory

from django.conf import settings
from django.test import SimpleTestCase
from django.utils import timezone

from cvat.apps.dataset_manager.cron import cleanup_instance_tmp_directories
from cvat.apps.dataset_manager.util import TmpDirManager


class CleanupInstanceTmpDirectoriesTest(SimpleTestCase):
    def _make_instance_dir(self, root: Path) -> Path:
        instance_dir = TemporaryDirectory(dir=root)
        self.addCleanup(instance_dir.cleanup)
        (Path(instance_dir.name) / "tmp").mkdir()
        return Path(instance_dir.name)

    @staticmethod
    def _make_outdated(path: Path) -> None:
        outdated_at = timezone.now() - timedelta(
            days=TmpDirManager.TMP_FILE_OR_DIR_RETENTION_DAYS + 1
        )
        os.utime(path, (outdated_at.timestamp(), outdated_at.timestamp()))

    def test_can_remove_outdated_file_from_task_tmp_dir(self):
        tmp_file = self._make_instance_dir(settings.TASKS_ROOT) / "tmp" / "annotations.zip"
        tmp_file.touch()
        self._make_outdated(tmp_file)

        cleanup_instance_tmp_directories()

        self.assertFalse(tmp_file.exists())

    def test_can_remove_outdated_file_from_project_tmp_dir(self):
        tmp_file = self._make_instance_dir(settings.PROJECTS_ROOT) / "tmp" / "dataset.zip"
        tmp_file.touch()
        self._make_outdated(tmp_file)

        cleanup_instance_tmp_directories()

        self.assertFalse(tmp_file.exists())

    def test_can_remove_outdated_directory_from_job_tmp_dir(self):
        tmp_subdir = self._make_instance_dir(settings.JOBS_ROOT) / "tmp" / "extracted"
        tmp_subdir.mkdir()
        (tmp_subdir / "annotations.xml").touch()
        self._make_outdated(tmp_subdir)

        cleanup_instance_tmp_directories()

        self.assertFalse(tmp_subdir.exists())

    def test_can_keep_recently_accessed_file(self):
        tmp_file = self._make_instance_dir(settings.TASKS_ROOT) / "tmp" / "annotations.zip"
        tmp_file.touch()

        cleanup_instance_tmp_directories()

        self.assertTrue(tmp_file.is_file())

    def test_can_keep_outdated_file_outside_of_tmp_dir(self):
        instance_dir = self._make_instance_dir(settings.TASKS_ROOT)
        persistent_file = instance_dir / "manifest.jsonl"
        persistent_file.touch()
        self._make_outdated(persistent_file)

        cleanup_instance_tmp_directories()

        self.assertTrue(persistent_file.is_file())
        self.assertTrue((instance_dir / "tmp").is_dir())
