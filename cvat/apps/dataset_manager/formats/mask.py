# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import math
from itertools import chain
from tempfile import TemporaryDirectory

import datumaro.components.annotation as datum_annotation
from datumaro.components.extractor import ItemTransform
from datumaro.components.dataset import Dataset
from pyunpack import Archive

from cvat.apps.dataset_manager.bindings import (GetCVATDataExtractor,
    import_dm_annotations)
from cvat.apps.dataset_manager.util import make_zip_archive

from .registry import dm_env, exporter, importer
from .utils import make_colormap

class RotatedBoxesToPolygons(ItemTransform):
    def _rotate_point(self, p, angle, cx, cy):
        [x, y] = p
        rx = cx + math.cos(angle) * (x - cx) - math.sin(angle) * (y - cy)
        ry = cy + math.sin(angle) * (x - cx) + math.cos(angle) * (y - cy)
        return rx, ry

    def transform_item(self, item):
        annotations = item.annotations
        anns = [p for p in annotations if p.type == datum_annotation.AnnotationType.bbox and p.attributes['rotation']]
        for ann in anns:
            rotation = math.radians(ann.attributes['rotation'])
            x0, y0, x1, y1 = ann.points
            [cx, cy] = [(x0 + (x1 - x0) / 2), (y0 + (y1 - y0) / 2)]
            anno_points = list(chain.from_iterable(
                map(lambda p: self._rotate_point(p, rotation, cx, cy), [(x0, y0), (x1, y0), (x1, y1), (x0, y1)])
            ))

            annotations.remove(ann)
            annotations.append(datum_annotation.Polygon(anno_points,
                label=ann.label, attributes=ann.attributes, group=ann.group,
                z_order=ann.z_order))

        return item.wrap(annotations=annotations)

@exporter(name='Segmentation mask', ext='ZIP', version='1.1')
def _export(dst_file, instance_data, save_images=False):
    dataset = Dataset.from_extractors(GetCVATDataExtractor(
        instance_data, include_images=save_images), env=dm_env)
    dataset.transform(RotatedBoxesToPolygons)
    dataset.transform('polygons_to_masks')
    dataset.transform('boxes_to_masks')
    dataset.transform('merge_instance_segments')
    with TemporaryDirectory() as temp_dir:
        dataset.export(temp_dir, 'voc_segmentation', save_images=save_images,
            apply_colormap=True, label_map=make_colormap(instance_data))

        make_zip_archive(temp_dir, dst_file)

@importer(name='Segmentation mask', ext='ZIP', version='1.1')
def _import(src_file, instance_data):
    with TemporaryDirectory() as tmp_dir:
        Archive(src_file.name).extractall(tmp_dir)

        dataset = Dataset.import_from(tmp_dir, 'voc', env=dm_env)
        dataset.transform('masks_to_polygons')
        import_dm_annotations(dataset, instance_data)
