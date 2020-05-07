# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

# from cvat.apps.dataset_manager.bindings import TaskData

from unittest import TestCase

class TaskDataTest(TestCase):
    def test_frame_matching(self):
        task_paths = [
            'a.e',
            'a/a.e',
            'a/b.e',
            'b/a.e',
            'b/c.e',
            'a/b/c.e',
            'a/b/d.e',
        ]
        dataset_paths = {p: p for p in task_paths}

        for input_path, expected in [
            # input, match
            ('z.e', None), # unknown item
            ('z/a.e', None), # unknown item

            ('d.e', 'a/b/d.e'), # match for the longest input item
            ('b/d.e', 'a/b/d.e'), # match for the longest input item
        ] + list(zip(task_paths, task_paths)): # exact matches
            with self.subTest(input=input_path):
                longest_path = input_path
                longest_match = match_frame_fuzzy(dataset_paths, longest_path)
                root_hint = None
                if longest_match:
                    root_hint = longest_match[:-len(longest_path)]

                actual = match_frame(dataset_paths, input_path, root_hint)
                self.assertEqual(expected, actual)