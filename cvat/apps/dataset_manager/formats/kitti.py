# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os.path as osp
from tempfile import TemporaryDirectory

from datumaro.components.dataset import Dataset
from datumaro.plugins.kitti_format.format import (KittiPath, write_label_map,
                                                  write_labels_list)
from pyunpack import Archive

from cvat.apps.dataset_manager.bindings import (GetCVATDataExtractor,
                                                import_dm_annotations)
from cvat.apps.dataset_manager.util import make_zip_archive

from .registry import dm_env, exporter, importer
from .utils import make_colormap


@exporter(name='KITTI', ext='ZIP', version='1.0')
def _export(dst_file, instance_data, save_images=False):
    dataset = Dataset.from_extractors(GetCVATDataExtractor(instance_data,
        include_images=save_images), env=dm_env)

    with TemporaryDirectory() as tmp_dir:
        dataset.transform('polygons_to_masks')
        dataset.export(tmp_dir, format='kitti',
            label_map={k: v[0] for k, v in make_colormap(instance_data).items()},
            apply_colormap=True, save_images=save_images
        )

        make_zip_archive(tmp_dir, dst_file)

@importer(name='KITTI', ext='ZIP', version='1.0')
def _import(src_file, instance_data):
    with TemporaryDirectory() as tmp_dir:
        Archive(src_file.name).extractall(tmp_dir)

        color_map = {k: v[0] for k, v in make_colormap(instance_data).items()}
        color_map_path = osp.join(tmp_dir, KittiPath.LABELMAP_FILE)
        if not osp.isfile(color_map_path):
            write_label_map(color_map_path, color_map)

        labels_list_path = osp.join(tmp_dir, KittiPath.LABELS_LIST_FILE)
        if not osp.isfile(labels_list_path):
            labels = list(color_map.keys())
            write_labels_list(labels_list_path, labels)

        dataset = Dataset.import_from(tmp_dir, format='kitti', env=dm_env)
        dataset.filter('/item/annotation[label != "background"]',
            filter_annotations=True)
        dataset.transform('masks_to_polygons')

        import_dm_annotations(dataset, instance_data)
