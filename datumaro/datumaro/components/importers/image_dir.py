
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os.path as osp


class ImageDirImporter:
    EXTRACTOR_NAME = 'image_dir'

    def __call__(self, path, **extra_params):
        from datumaro.components.project import Project # cyclic import
        project = Project()

        if not osp.isdir(path):
            raise Exception("Can't find a directory at '%s'" % path)

        source_name = osp.basename(osp.normpath(path))
        project.add_source(source_name, {
            'url': source_name,
            'format': self.EXTRACTOR_NAME,
            'options': dict(extra_params),
        })

        return project
