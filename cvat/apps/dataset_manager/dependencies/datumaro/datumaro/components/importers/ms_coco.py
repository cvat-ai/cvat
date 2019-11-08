
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from collections import defaultdict
import os
import os.path as osp

from datumaro.components.formats.ms_coco import *


class CocoImporter:
    _COCO_EXTRACTORS = {
        CocoAnnotationType.instances: 'coco_instances',
        CocoAnnotationType.person_keypoints: 'coco_person_kp',
        CocoAnnotationType.captions: 'coco_captions',
        CocoAnnotationType.labels: 'coco_labels',
        CocoAnnotationType.image_info: 'coco_images',
    }

    def __init__(self, task_filter=None):
        self._task_filter = task_filter

    def __call__(self, path):
        from datumaro.components.project import Project # cyclic import
        project = Project()

        subsets = self.find_subsets(path)

        for subset_name, anns in subsets.items():
            for ann_type, ann_file in anns.items():
                source_name = osp.splitext(osp.basename(ann_file))[0]
                project.add_source(source_name, {
                    'url': ann_file,
                    'format': self._COCO_EXTRACTORS[ann_type],
                })

        return project

    @staticmethod
    def find_subsets(dataset_dir):
        ann_dir = os.path.join(dataset_dir, CocoPath.ANNOTATIONS_DIR)
        if not osp.isdir(ann_dir):
            raise NotADirectoryError(
                'COCO annotations directory not found at "%s"' % \
                ann_dir)

        subsets = defaultdict(dict)
        for ann_file in os.listdir(ann_dir):
            subset_path = osp.join(ann_dir, ann_file)
            if not subset_path.endswith('.json'):
                continue

            name_parts = osp.splitext(ann_file)[0].rsplit('_', maxsplit=1)
            ann_type = name_parts[0]
            try:
                ann_type = CocoAnnotationType[ann_type]
            except KeyError:
                raise Exception(
                    'Unknown subset type %s, only known are: %s' % \
                    (ann_type,
                     ', '.join([e.name for e in CocoAnnotationType])
                    ))
            subset_name = name_parts[1]
            subsets[subset_name][ann_type] = subset_path
        return dict(subsets)