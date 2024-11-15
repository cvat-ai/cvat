# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) 2022-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os.path as osp

from datumaro.components.dataset import Dataset
from datumaro.plugins.kitti_format.format import KittiPath, write_label_map

from pyunpack import Archive

from cvat.apps.dataset_manager.bindings import (GetCVATDataExtractor, detect_dataset, import_dm_annotations)
from cvat.apps.dataset_manager.util import make_zip_archive

from .transformations import MaskToPolygonTransformation, RotatedBoxesToPolygons
from .registry import dm_env, exporter, importer
from .utils import make_colormap


@exporter(name='KITTI', ext='ZIP', version='1.0')
def _export(dst_file, temp_dir, instance_data, save_images=False):
    with GetCVATDataExtractor(instance_data, include_images=save_images) as extractor:
        dataset = Dataset.from_extractors(extractor, env=dm_env)

        dataset.transform(RotatedBoxesToPolygons)
        dataset.transform('polygons_to_masks')
        dataset.transform('merge_instance_segments')
        dataset.export(temp_dir, format='kitti',
            label_map={k: v[0] for k, v in make_colormap(instance_data).items()},
            apply_colormap=True, save_images=save_images
        )

    make_zip_archive(temp_dir, dst_file)

@importer(name='KITTI', ext='ZIP', version='1.0')
def _import(src_file, temp_dir, instance_data, load_data_callback=None, **kwargs):
    Archive(src_file.name).extractall(temp_dir)

    color_map = {k: v[0] for k, v in make_colormap(instance_data).items()}
    color_map_path = osp.join(temp_dir, KittiPath.LABELMAP_FILE)
    if not osp.isfile(color_map_path):
        write_label_map(color_map_path, color_map)

    detect_dataset(temp_dir, format_name='kitti', importer=dm_env.importers.get('kitti'))
    dataset = Dataset.import_from(temp_dir, format='kitti', env=dm_env)
    labels_meta = instance_data.meta[instance_data.META_FIELD]['labels']
    if 'background' not in [label['name'] for _, label in labels_meta]:
        dataset.filter('/item/annotation[label != "background"]',
            filter_annotations=True)
    dataset = MaskToPolygonTransformation.convert_dataset(dataset, **kwargs)

    if load_data_callback is not None:
        load_data_callback(dataset, instance_data)
    import_dm_annotations(dataset, instance_data)
