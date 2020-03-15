# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os.path as osp

from django.test import TestCase
from cvat.apps.engine.models import Task


class TaskModelTest(TestCase):
    def test_frame_id_path_conversions(self):
        task_id = 1
        task = Task(task_id)

        for i in [10 ** p for p in range(6)]:
            src_path_expected = osp.join(
                str(i // 10000), str(i // 100), '%s.jpg' % i)
            src_path = task.get_frame_path(i)

            dst_frame = task.get_image_frame(src_path)

            self.assertTrue(src_path.endswith(src_path_expected),
                '%s vs. %s' % (src_path, src_path_expected))
            self.assertEqual(i, dst_frame)
