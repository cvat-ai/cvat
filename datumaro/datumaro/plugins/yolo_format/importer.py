
# Copyright (C) 2019-2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

from glob import glob
import logging as log
import os.path as osp

from datumaro.components.extractor import Importer


class YoloImporter(Importer):
    @classmethod
    def detect(cls, path):
        return len(cls.find_configs(path)) != 0

    def __call__(self, path, **extra_params):
        from datumaro.components.project import Project # cyclic import
        project = Project()

        config_paths = self.find_configs(path)
        if len(config_paths) == 0:
            raise Exception("Failed to find 'yolo' dataset at '%s'" % path)

        for config_path in config_paths:
            log.info("Found a dataset at '%s'" % config_path)

            source_name = '%s_%s' % (
                osp.basename(osp.dirname(config_path)),
                osp.splitext(osp.basename(config_path))[0])
            project.add_source(source_name, {
                'url': config_path,
                'format': 'yolo',
                'options': dict(extra_params),
            })

        return project

    @staticmethod
    def find_configs(path):
        if path.endswith('.data') and osp.isfile(path):
            config_paths = [path]
        else:
            config_paths = glob(osp.join(path, '**', '*.data'), recursive=True)
        return config_paths