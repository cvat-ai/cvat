
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import os.path as osp

from datumaro.components.extractor import Importer
from datumaro.util import find

from .format import VocTask, VocPath


class VocImporter(Importer):
    _TASKS = [
        (VocTask.classification, 'voc_classification', 'Main'),
        (VocTask.detection, 'voc_detection', 'Main'),
        (VocTask.segmentation, 'voc_segmentation', 'Segmentation'),
        (VocTask.person_layout, 'voc_layout', 'Layout'),
        (VocTask.action_classification, 'voc_action', 'Action'),
    ]

    @classmethod
    def detect(cls, path):
        return len(cls.find_tasks(path)) != 0

    def __call__(self, path, **extra_params):
        from datumaro.components.project import Project # cyclic import
        project = Project()

        task_paths = self.find_tasks(path)
        if len(task_paths) == 0:
            raise Exception("Failed to find 'voc' dataset at '%s'" % path)

        for task, extractor_type, _ in task_paths:
            project.add_source(task.name, {
                'url': path,
                'format': extractor_type,
                'options': dict(extra_params),
            })

        return project

    @staticmethod
    def find_tasks(path):
        task_paths = []
        for task, extractor_type, task_dir in __class__._TASKS:
            task_dir = osp.join(path, VocPath.SUBSETS_DIR, task_dir)
            if osp.isdir(task_dir):
                task_paths.append((task, extractor_type, task_dir))
        return task_paths


class VocResultsImporter:
    _TASKS = [
        ('comp1', 'voc_comp_1_2', 'Main'),
        ('comp2', 'voc_comp_1_2', 'Main'),
        ('comp3', 'voc_comp_3_4', 'Main'),
        ('comp4', 'voc_comp_3_4', 'Main'),
        ('comp5', 'voc_comp_5_6', 'Segmentation'),
        ('comp6', 'voc_comp_5_6', 'Segmentation'),
        ('comp7', 'voc_comp_7_8', 'Layout'),
        ('comp8', 'voc_comp_7_8', 'Layout'),
        ('comp9', 'voc_comp_9_10', 'Action'),
        ('comp10', 'voc_comp_9_10', 'Action'),
    ]

    def __call__(self, path, **extra_params):
        from datumaro.components.project import Project # cyclic import
        project = Project()

        for task_name, extractor_type, task_dir in self._TASKS:
            task_dir = osp.join(path, task_dir)
            if not osp.isdir(task_dir):
                continue
            dir_items = os.listdir(task_dir)
            if not find(dir_items, lambda x: x == task_name):
                continue

            project.add_source(task_name, {
                'url': task_dir,
                'format': extractor_type,
                'options': dict(extra_params),
            })

        if len(project.config.sources) == 0:
            raise Exception("Failed to find 'voc_results' dataset at '%s'" % \
                path)

        return project