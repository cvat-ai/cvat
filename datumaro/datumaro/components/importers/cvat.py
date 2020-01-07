
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from glob import glob
import logging as log
import os.path as osp

from datumaro.components.formats.cvat import CvatPath


class CvatImporter:
    EXTRACTOR_NAME = 'cvat'

    def __call__(self, path, **extra_params):
        from datumaro.components.project import Project # cyclic import
        project = Project()

        if path.endswith('.xml') and osp.isfile(path):
            subset_paths = [path]
        else:
            subset_paths = glob(osp.join(path, '*.xml'))

            if osp.basename(osp.normpath(path)) != CvatPath.ANNOTATIONS_DIR:
                path = osp.join(path, CvatPath.ANNOTATIONS_DIR)
            subset_paths += glob(osp.join(path, '*.xml'))

        if len(subset_paths) == 0:
            raise Exception("Failed to find 'cvat' dataset at '%s'" % path)

        for subset_path in subset_paths:
            if not osp.isfile(subset_path):
                continue

            log.info("Found a dataset at '%s'" % subset_path)

            subset_name = osp.splitext(osp.basename(subset_path))[0]

            project.add_source(subset_name, {
                'url': subset_path,
                'format': self.EXTRACTOR_NAME,
                'options': dict(extra_params),
            })

        return project
