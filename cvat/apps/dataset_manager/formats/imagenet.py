# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os.path as osp
from glob import glob

import zipfile
from tempfile import TemporaryDirectory

from datumaro.components.project import Dataset
from cvat.apps.dataset_manager.bindings import CvatTaskDataExtractor, \
    import_dm_annotations
from cvat.apps.dataset_manager.util import make_zip_archive

from .registry import dm_env, exporter, importer


@exporter(name='ImageNet', ext='ZIP', version='1.0')
def _export(dst_file, task_data, save_images=False):
    extractor = CvatTaskDataExtractor(task_data, include_images=save_images)
    extractor = Dataset.from_extractors(extractor) # apply lazy transform
    with TemporaryDirectory() as temp_dir:
        if save_images:
            dm_env.converters.get('imagenet').convert(extractor,
                save_dir=temp_dir, save_images=save_images)
        else:
            dm_env.converters.get('imagenet_txt').convert(extractor,
                save_dir=temp_dir, save_images=save_images)

        make_zip_archive(temp_dir, dst_file)

@importer(name='ImageNet', ext='ZIP', version='1.0')
def _import(src_file, task_data):
    with TemporaryDirectory() as tmp_dir:
        zipfile.ZipFile(src_file).extractall(tmp_dir)
        if glob(osp.join(tmp_dir, '*.txt')):
            dataset = dm_env.make_importer('imagenet_txt')(tmp_dir).make_dataset()
        else:
            dataset = dm_env.make_importer('imagenet')(tmp_dir).make_dataset()
        import_dm_annotations(dataset, task_data)