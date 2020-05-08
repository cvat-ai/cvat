
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from collections import defaultdict
from glob import glob
import logging as log
import os.path as osp

from datumaro.components.extractor import Importer
from datumaro.util.log_utils import logging_disabled

from .format import CocoTask


class CocoImporter(Importer):
    _COCO_EXTRACTORS = {
        CocoTask.instances: 'coco_instances',
        CocoTask.person_keypoints: 'coco_person_keypoints',
        CocoTask.captions: 'coco_captions',
        CocoTask.labels: 'coco_labels',
        CocoTask.image_info: 'coco_image_info',
    }

    @classmethod
    def detect(cls, path):
        with logging_disabled(log.WARN):
            return len(cls.find_subsets(path)) != 0

    def __call__(self, path, **extra_params):
        from datumaro.components.project import Project # cyclic import
        project = Project()

        subsets = self.find_subsets(path)

        if len(subsets) == 0:
            raise Exception("Failed to find 'coco' dataset at '%s'" % path)

        for ann_files in subsets.values():
            for ann_type, ann_file in ann_files.items():
                log.info("Found a dataset at '%s'" % ann_file)

                source_name = osp.splitext(osp.basename(ann_file))[0]
                project.add_source(source_name, {
                    'url': ann_file,
                    'format': self._COCO_EXTRACTORS[ann_type],
                    'options': dict(extra_params),
                })

        return project

    @staticmethod
    def find_subsets(path):
        if path.endswith('.json') and osp.isfile(path):
            subset_paths = [path]
        else:
            subset_paths = glob(osp.join(path, '**', '*_*.json'),
                recursive=True)

        subsets = defaultdict(dict)
        for subset_path in subset_paths:
            name_parts = osp.splitext(osp.basename(subset_path))[0] \
                .rsplit('_', maxsplit=1)

            ann_type = name_parts[0]
            try:
                ann_type = CocoTask[ann_type]
            except KeyError:
                log.warn("Skipping '%s': unknown subset "
                    "type '%s', the only known are: %s" % \
                    (subset_path, ann_type,
                        ', '.join([e.name for e in CocoTask])))
            subset_name = name_parts[1]
            subsets[subset_name][ann_type] = subset_path
        return dict(subsets)