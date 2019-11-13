
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os.path as osp


class DatumaroImporter:
    EXTRACTOR_NAME = 'datumaro'

    def __call__(self, path):
        from datumaro.components.project import Project # cyclic import
        project = Project()

        if not osp.exists(path):
            raise Exception("Failed to find 'datumaro' dataset at '%s'" % path)

        source_name = osp.splitext(osp.basename(path))[0]
        project.add_source(source_name, {
            'url': path,
            'format': self.EXTRACTOR_NAME,
        })

        return project