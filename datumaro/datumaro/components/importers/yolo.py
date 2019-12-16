
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os.path as osp
from datumaro.util import dir_items


class YoloImporter:
    def __call__(self, path, **extra_params):
        from datumaro.components.project import Project # cyclic import
        project = Project()

        if not osp.exists(path):
            raise Exception("Failed to find 'yolo' dataset at '%s'" % path)

        configs = []
        if osp.isfile(path):
            configs = path
        elif osp.isdir(path):
            configs = [osp.join(path, p) for p in dir_items(path, '.data')]

        for config_path in configs:
            source_name = osp.splitext(osp.basename(config_path))[0]
            project.add_source(source_name, {
                'url': config_path,
                'format': 'yolo',
                'options': extra_params,
            })

        return project