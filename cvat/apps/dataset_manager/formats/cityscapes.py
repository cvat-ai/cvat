# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os.path as osp
from tempfile import TemporaryDirectory

from datumaro.components.dataset import Dataset
from datumaro.plugins.cityscapes_format import write_label_map
from pyunpack import Archive

from cvat.apps.dataset_manager.bindings import (GetCVATDataExtractor,
                                                import_dm_annotations)
from cvat.apps.dataset_manager.util import make_zip_archive

from .transformations import RotatedBoxesToPolygons
from .registry import dm_env, exporter, importer
from .utils import make_colormap


@exporter(name='Cityscapes', ext='ZIP', version='1.0')
def _export(dst_file, instance_data, save_images=False):
    dataset = Dataset.from_extractors(GetCVATDataExtractor(
        instance_data, include_images=save_images), env=dm_env)
    dataset.transform(RotatedBoxesToPolygons)
    dataset.transform('polygons_to_masks')
    dataset.transform('boxes_to_masks')
    dataset.transform('merge_instance_segments')
    with TemporaryDirectory() as temp_dir:
        dataset.export(temp_dir, 'cityscapes', save_images=save_images,
            apply_colormap=True, label_map={label: info[0]
                for label, info in make_colormap(instance_data).items()})

        make_zip_archive(temp_dir, dst_file)

@importer(name='Cityscapes', ext='ZIP', version='1.0')
def _import(src_file, instance_data, load_data_callback=None):
    with TemporaryDirectory() as tmp_dir:
        Archive(src_file.name).extractall(tmp_dir)

        labelmap_file = osp.join(tmp_dir, 'label_colors.txt')
        if not osp.isfile(labelmap_file):
            colormap = {label: info[0]
                for label, info in make_colormap(instance_data).items()}
            write_label_map(labelmap_file, colormap)

        dataset = Dataset.import_from(tmp_dir, 'cityscapes', env=dm_env)
        dataset.transform('masks_to_polygons')
        if load_data_callback is not None:
            load_data_callback(dataset, instance_data)
        import_dm_annotations(dataset, instance_data)
