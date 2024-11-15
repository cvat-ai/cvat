# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) 2023-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import zipfile

from datumaro.components.dataset import Dataset

from cvat.apps.dataset_manager.bindings import (GetCVATDataExtractor, detect_dataset,
                                                import_dm_annotations)
from cvat.apps.dataset_manager.util import make_zip_archive
from cvat.apps.engine.models import DimensionType

from .registry import dm_env, exporter, importer


@exporter(name='Sly Point Cloud Format', ext='ZIP', version='1.0', dimension=DimensionType.DIM_3D)
def _export_images(dst_file, temp_dir, task_data, save_images=False):
    with GetCVATDataExtractor(
        task_data, include_images=save_images, format_type='sly_pointcloud',
        dimension=DimensionType.DIM_3D,
    ) as extractor:
        dataset = Dataset.from_extractors(extractor, env=dm_env)
        dataset.export(temp_dir, 'sly_pointcloud', save_images=save_images, allow_undeclared_attrs=True)

    make_zip_archive(temp_dir, dst_file)


@importer(name='Sly Point Cloud Format', ext='ZIP', version='1.0', dimension=DimensionType.DIM_3D)
def _import(src_file, temp_dir, instance_data, load_data_callback=None, **kwargs):
    if zipfile.is_zipfile(src_file):
        zipfile.ZipFile(src_file).extractall(temp_dir)

        detect_dataset(temp_dir, format_name='sly_pointcloud', importer=dm_env.importers.get('sly_pointcloud'))
        dataset = Dataset.import_from(temp_dir, 'sly_pointcloud', env=dm_env)
    else:
        dataset = Dataset.import_from(src_file.name, 'sly_pointcloud', env=dm_env)
    if load_data_callback is not None:
        load_data_callback(dataset, instance_data)
    import_dm_annotations(dataset, instance_data)
