# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import zipfile
from tempfile import TemporaryDirectory

from datumaro.components.dataset import Dataset

from cvat.apps.dataset_manager.bindings import CvatTaskDataExtractor, \
    import_dm_annotations
from cvat.apps.dataset_manager.util import make_zip_archive

from .registry import dm_env, exporter, importer


@exporter(name='COCO', ext='ZIP', version='1.0')
def _export(dst_file, task_data, save_images=False):
    dataset = Dataset.from_extractors(CvatTaskDataExtractor(
        task_data, include_images=save_images), env=dm_env)
    with TemporaryDirectory() as temp_dir:
        dataset.export(temp_dir, 'coco_instances', save_images=save_images)

        make_zip_archive(temp_dir, dst_file)

@importer(name='COCO', ext='JSON, ZIP', version='1.0')
def _import(src_file, task_data):
    if zipfile.is_zipfile(src_file):
        with TemporaryDirectory() as tmp_dir:
            zipfile.ZipFile(src_file).extractall(tmp_dir)

            dataset = Dataset.import_from(tmp_dir, 'coco', env=dm_env)
            import_dm_annotations(dataset, task_data)
    else:
        dataset = Dataset.import_from(src_file.name,
            'coco_instances', env=dm_env)
        import_dm_annotations(dataset, task_data)