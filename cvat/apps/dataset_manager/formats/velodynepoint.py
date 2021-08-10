# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import zipfile
from tempfile import TemporaryDirectory

from datumaro.components.dataset import Dataset

from cvat.apps.dataset_manager.bindings import CvatTaskDataExtractor, TaskData, \
    import_dm_annotations
from .registry import dm_env

from cvat.apps.dataset_manager.util import make_zip_archive
from cvat.apps.engine.models import DimensionType

from .registry import exporter, importer


@exporter(name='Kitti Raw Format', ext='ZIP', version='1.0', dimension=DimensionType.DIM_3D)
def _export_images(dst_file, task_data, save_images=False):

    if not isinstance(task_data, TaskData):
        raise Exception("Export to \"Kitti raw\" format is working only with tasks temporarily")

    dataset = Dataset.from_extractors(CvatTaskDataExtractor(
        task_data, include_images=save_images, format_type="kitti_raw", dimension=DimensionType.DIM_3D), env=dm_env)

    with TemporaryDirectory() as temp_dir:
        dataset.export(temp_dir, 'kitti_raw', save_images=save_images, reindex=True)

        make_zip_archive(temp_dir, dst_file)


@importer(name='Kitti Raw Format', ext='ZIP', version='1.0', dimension=DimensionType.DIM_3D)
def _import(src_file, task_data):
    if zipfile.is_zipfile(src_file):
        with TemporaryDirectory() as tmp_dir:
            zipfile.ZipFile(src_file).extractall(tmp_dir)

            dataset = Dataset.import_from(
                tmp_dir, 'kitti_raw', env=dm_env)
            import_dm_annotations(dataset, task_data)
    else:

        dataset = Dataset.import_from(
            src_file.name, 'kitti_raw', env=dm_env)
        import_dm_annotations(dataset, task_data)
