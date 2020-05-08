
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from glob import glob
import os.path as osp

from datumaro.components.extractor import Importer

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
        return len(cls.find_subsets(path)) != 0

    def __call__(self, path, **extra_params):
        from datumaro.components.project import Project # cyclic import
        project = Project()

        subset_paths = self.find_subsets(path)
        if len(subset_paths) == 0:
            raise Exception("Failed to find 'voc' dataset at '%s'" % path)

        for task, extractor_type, subset_path in subset_paths:
            project.add_source('%s-%s' %
                (task.name, osp.splitext(osp.basename(subset_path))[0]),
            {
                'url': subset_path,
                'format': extractor_type,
                'options': dict(extra_params),
            })

        return project

    @staticmethod
    def find_subsets(path):
        subset_paths = []
        for task, extractor_type, task_dir in __class__._TASKS:
            task_dir = osp.join(path, VocPath.SUBSETS_DIR, task_dir)
            if not osp.isdir(task_dir):
                continue
            task_subsets = [p for p in glob(osp.join(task_dir, '*.txt'))
                if '_' not in osp.basename(p)]
            subset_paths += [(task, extractor_type, p) for p in task_subsets]
        return subset_paths
