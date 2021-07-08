# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os.path as osp
import zipfile
from glob import glob
from tempfile import TemporaryDirectory

from datumaro.components.dataset import Dataset

from cvat.apps.dataset_manager.bindings import CvatTaskDataExtractor, \
    import_dm_annotations
from cvat.apps.dataset_manager.util import make_zip_archive

from .registry import dm_env, exporter, importer


@exporter(name='ImageNet', ext='ZIP', version='1.0')
def _export(dst_file, task_data, save_images=False):
    dataset = Dataset.from_extractors(CvatTaskDataExtractor(
        task_data, include_images=save_images), env=dm_env)
    with TemporaryDirectory() as temp_dir:
        if save_images:
            dataset.export(temp_dir, 'imagenet', save_images=save_images)
        else:
            dataset.export(temp_dir, 'imagenet_txt', save_images=save_images)

        make_zip_archive(temp_dir, dst_file)

@importer(name='ImageNet', ext='ZIP', version='1.0')
def _import(src_file, task_data):
    with TemporaryDirectory() as tmp_dir:
        zipfile.ZipFile(src_file).extractall(tmp_dir)
        if glob(osp.join(tmp_dir, '*.txt')):
            dataset = Dataset.import_from(tmp_dir, 'imagenet_txt', env=dm_env)
        else:
            dataset = Dataset.import_from(tmp_dir, 'imagenet', env=dm_env)
        import_dm_annotations(dataset, task_data)