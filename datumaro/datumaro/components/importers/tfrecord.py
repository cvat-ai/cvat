
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from glob import glob
import os.path as osp


class DetectionApiImporter:
    EXTRACTOR_NAME = 'tf_detection_api'

    def __call__(self, path):
        from datumaro.components.project import Project # cyclic import
        project = Project()

        subset_paths = glob(osp.join(path, '*.tfrecord'))

        for subset_path in subset_paths:
            if not osp.isfile(subset_path):
                continue

            subset_name = osp.splitext(osp.basename(subset_path))[0]

            project.add_source(subset_name, {
                'url': subset_path,
                'format': self.EXTRACTOR_NAME,
            })

        if len(project.config.sources) == 0:
            raise Exception(
                "Failed to find 'tf_detection_api' dataset at '%s'" % path)

        return project

