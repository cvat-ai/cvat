# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import zipfile
from tempfile import TemporaryDirectory

from datumaro.components.dataset import Dataset

from cvat.apps.dataset_manager.bindings import (GetCVATDataExtractor,
                                                import_dm_annotations)
from cvat.apps.dataset_manager.util import make_zip_archive
from cvat.apps.engine.models import DimensionType

from .registry import dm_env, exporter, importer


@exporter(name='Sly Point Cloud Format', ext='ZIP', version='1.0', dimension=DimensionType.DIM_3D)
def _export_images(dst_file, task_data, save_images=False):

    dataset = Dataset.from_extractors(GetCVATDataExtractor(
        task_data, include_images=save_images, format_type='sly_pointcloud', dimension=DimensionType.DIM_3D), env=dm_env)

    with TemporaryDirectory() as temp_dir:
        dataset.export(temp_dir, 'sly_pointcloud', save_images=save_images)

        make_zip_archive(temp_dir, dst_file)


@importer(name='Sly Point Cloud Format', ext='ZIP', version='1.0', dimension=DimensionType.DIM_3D)
def _import(src_file, instance_data, load_data_callback=None):

    with TemporaryDirectory() as tmp_dir:
        if zipfile.is_zipfile(src_file):
            zipfile.ZipFile(src_file).extractall(tmp_dir)

            dataset = Dataset.import_from(tmp_dir, 'sly_pointcloud', env=dm_env)
        else:
            dataset = Dataset.import_from(src_file.name,
                                        'sly_pointcloud', env=dm_env)
        if load_data_callback is not None:
            load_data_callback(dataset, instance_data)
        import_dm_annotations(dataset, instance_data)

