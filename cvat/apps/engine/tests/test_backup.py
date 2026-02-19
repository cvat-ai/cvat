# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from unittest.mock import patch

from django.test import TestCase

from cvat.apps.engine import backup
from cvat.apps.engine.models import Data, Job, Segment, Task


class TestTaskBackupBase(TestCase):
    def test_job_order(self):
        db_data = Data.objects.create(size=2, image_quality=100)
        db_task = Task.objects.create(data=db_data)
        seg1 = Segment.objects.create(task=db_task, start_frame=0, stop_frame=1)
        seg2 = Segment.objects.create(task=db_task, start_frame=1, stop_frame=2)
        job1 = Job.objects.create(segment=seg1)
        job2 = Job.objects.create(segment=seg2)
        job3 = Job.objects.create(segment=seg1)

        backup_base = backup._TaskBackupBase()
        backup_base._db_task = db_task

        expected_order = [job1.id, job3.id, job2.id]

        with patch.object(Job._meta, "ordering", ["-id"]):
            real_order = [j.id for j in backup_base._get_db_jobs()]

        assert (
            real_order == expected_order
        ), f"Expected order: {expected_order}, but got: {real_order}"
