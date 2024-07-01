# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) 2023-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os.path as osp

import datumaro as dm
from datumaro.plugins.cityscapes_format import write_label_map
from pyunpack import Archive

from cvat.apps.dataset_manager.bindings import (GetCVATDataExtractor, detect_dataset,
                                                import_dm_annotations)
from cvat.apps.dataset_manager.util import make_zip_archive
from cvat.apps.engine.models import LabelType

from .transformations import MaskToPolygonTransformation, RotatedBoxesToPolygons
from .registry import dm_env, exporter, importer
from .utils import make_colormap


@exporter(name='Cityscapes', ext='ZIP', version='1.0')
class _Exporter:
    SUPPORTED_ANNOTATION_TYPES = [LabelType.BBOX, LabelType.POLYGON, LabelType.MASK]

    def __call__(self, dst_file, temp_dir, instance_data, save_images=False):
        with GetCVATDataExtractor(
            instance_data, include_images=save_images,
            included_label_types=self.SUPPORTED_ANNOTATION_TYPES
        ) as extractor:
            dataset = dm.Dataset.from_extractors(extractor, env=dm_env)
            dataset.transform(RotatedBoxesToPolygons)
            dataset.transform('polygons_to_masks')
            dataset.transform('boxes_to_masks')
            dataset.transform('merge_instance_segments')

            label_cat: dm.LabelCategories = dataset.categories()[dm.AnnotationType.label]

            dataset.export(
                temp_dir, 'cityscapes', save_images=save_images,
                apply_colormap=True,
                label_map={
                    label: info[0]
                    for label, info in make_colormap(instance_data).items()
                    if label_cat.find(label)[0]
                }
            )

        make_zip_archive(temp_dir, dst_file)

@importer(name='Cityscapes', ext='ZIP', version='1.0')
def _import(src_file, temp_dir, instance_data, load_data_callback=None, **kwargs):
    Archive(src_file.name).extractall(temp_dir)

    labelmap_file = osp.join(temp_dir, 'label_colors.txt')
    if not osp.isfile(labelmap_file):
        colormap = {label: info[0]
            for label, info in make_colormap(instance_data).items()}
        write_label_map(labelmap_file, colormap)

    detect_dataset(temp_dir, format_name='cityscapes', importer= dm_env.importers.get('cityscapes'))
    dataset = dm.Dataset.import_from(temp_dir, 'cityscapes', env=dm_env)
    dataset = MaskToPolygonTransformation.convert_dataset(dataset, **kwargs)
    if load_data_callback is not None:
        load_data_callback(dataset, instance_data)
    import_dm_annotations(dataset, instance_data)
