
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from glob import glob
import logging as log
import os.path as osp


class YoloImporter:
    def __call__(self, path, **extra_params):
        from datumaro.components.project import Project # cyclic import
        project = Project()

        if not osp.exists(path):
            raise Exception("Failed to find 'yolo' dataset at '%s'" % path)

        if path.endswith('.data') and osp.isfile(path):
            config_paths = [path]
        else:
            config_paths = glob(osp.join(path, '*.data'))

        for config_path in config_paths:
            log.info("Found a dataset at '%s'" % config_path)

            source_name = osp.splitext(osp.basename(config_path))[0]
            project.add_source(source_name, {
                'url': config_path,
                'format': 'yolo',
                'options': dict(extra_params),
            })

        return project