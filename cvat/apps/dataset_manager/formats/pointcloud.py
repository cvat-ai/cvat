# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import os.path as osp
import zipfile
from collections import OrderedDict
from tempfile import TemporaryDirectory

from datumaro.components.dataset import Dataset

from cvat.apps.dataset_manager.bindings import CvatTaskDataExtractor, \
    import_dm_annotations

from .registry import dm_env

from cvat.apps.dataset_manager.bindings import match_dm_item
from cvat.apps.dataset_manager.util import make_zip_archive
from cvat.apps.engine.frame_provider import FrameProvider
from datumaro.components.extractor import DatasetItem
from cvat.apps.engine.models import DimensionType, Image
import json

from .registry import exporter, importer

@exporter(name='Point Cloud Format', ext='ZIP', version='1.0', dimension=DimensionType.DIM_3D)
def _export_images(dst_file, task_data, save_images=False):

    dataset = Dataset.from_extractors(CvatTaskDataExtractor(
        task_data, include_images=save_images, format='point_cloud', dimensions=DimensionType.DIM_3D), env=dm_env)

    with TemporaryDirectory() as temp_dir:
        dataset.export(temp_dir, 'point_cloud', save_images=save_images)

        make_zip_archive(temp_dir, dst_file)

@importer(name='Point Cloud Format', ext='ZIP', version='1.0', dimension=DimensionType.DIM_3D)
def _import(src_file, task_data):

    if zipfile.is_zipfile(src_file):
        with TemporaryDirectory() as tmp_dir:
            zipfile.ZipFile(src_file).extractall(tmp_dir)

            dataset = Dataset.import_from(tmp_dir, 'point_cloud', env=dm_env)
            import_dm_annotations(dataset, task_data)
    else:
        dataset = Dataset.import_from(src_file.name,
                                      'point_cloud', env=dm_env)
        import_dm_annotations(dataset, task_data)

