# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os.path as osp
from pathlib import Path

# from cvat.apps.dataset_manager.bindings import TaskData

from unittest import TestCase


def match_frame(dataset_paths, path, root_hint=None):
    match = dataset_paths.get(path)
    if not match and root_hint and not path.startswith(root_hint):
        path = osp.join(root_hint, path)
        match = dataset_paths.get(path)
    return match

def match_frame_fuzzy(dataset_paths, path):
    # Preconditions:
    # - The input dataset is full, i.e. all items present. Partial dataset
    # matching can't be correct for all input cases.
    # - path is the longest path of input dataset in terms of path parts

    path = Path(path).parts
    for p, v in dataset_paths.items():
        if Path(p).parts[-len(path):] == path: # endswith() for paths
            return v
    return None



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