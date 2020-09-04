
# Copyright (C) 2019-2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import json
import os.path as osp

from datumaro.components.extractor import (SourceExtractor, DatasetItem,
    AnnotationType, Label, RleMask, Points, Polygon, PolyLine, Bbox, Caption,
    LabelCategories, MaskCategories, PointsCategories
)
from datumaro.util.image import Image

from .format import DatumaroPath


class DatumaroExtractor(SourceExtractor):
    def __init__(self, path):
        assert osp.isfile(path), path
        rootpath = ''
        if path.endswith(osp.join(DatumaroPath.ANNOTATIONS_DIR, osp.basename(path))):
            rootpath = path.rsplit(DatumaroPath.ANNOTATIONS_DIR, maxsplit=1)[0]
        images_dir = ''
        if rootpath and osp.isdir(osp.join(rootpath, DatumaroPath.IMAGES_DIR)):
            images_dir = osp.join(rootpath, DatumaroPath.IMAGES_DIR)
        self._images_dir = images_dir

        super().__init__(subset=osp.splitext(osp.basename(path))[0])

        with open(path, 'r') as f:
            parsed_anns = json.load(f)
        self._categories = self._load_categories(parsed_anns)
        self._items = self._load_items(parsed_anns)

    def categories(self):
        return self._categories

    def __iter__(self):
        for item in self._items:
            yield item

    def __len__(self):
        return len(self._items)

    @staticmethod
    def _load_categories(parsed):
        categories = {}

        parsed_label_cat = parsed['categories'].get(AnnotationType.label.name)
        if parsed_label_cat:
            label_categories = LabelCategories()
            for item in parsed_label_cat['labels']:
                label_categories.add(item['name'], parent=item['parent'])

            categories[AnnotationType.label] = label_categories

        parsed_mask_cat = parsed['categories'].get(AnnotationType.mask.name)
        if parsed_mask_cat:
            colormap = {}
            for item in parsed_mask_cat['colormap']:
                colormap[int(item['label_id'])] = \
                    (item['r'], item['g'], item['b'])

            mask_categories = MaskCategories(colormap=colormap)
            categories[AnnotationType.mask] = mask_categories

        parsed_points_cat = parsed['categories'].get(AnnotationType.points.name)
        if parsed_points_cat:
            point_categories = PointsCategories()
            for item in parsed_points_cat['items']:
                point_categories.add(int(item['label_id']),
                    item['labels'], joints=item['joints'])

            categories[AnnotationType.points] = point_categories

        return categories

    def _load_items(self, parsed):
        items = []
        for item_desc in parsed['items']:
            item_id = item_desc['id']

            image = None
            image_info = item_desc.get('image')
            if image_info:
                image_path = image_info.get('path') or \
                    item_id + DatumaroPath.IMAGE_EXT
                image_path = osp.join(self._images_dir, image_path)
                image = Image(path=image_path, size=image_info.get('size'))

            annotations = self._load_annotations(item_desc)

            item = DatasetItem(id=item_id, subset=self._subset,
                annotations=annotations, image=image,
                attributes=item_desc.get('attr'))

            items.append(item)

        return items

    @staticmethod
    def _load_annotations(item):
        parsed = item['annotations']
        loaded = []

        for ann in parsed:
            ann_id = ann.get('id')
            ann_type = AnnotationType[ann['type']]
            attributes = ann.get('attributes')
            group = ann.get('group')

            label_id = ann.get('label_id')
            z_order = ann.get('z_order')
            points = ann.get('points')

            if ann_type == AnnotationType.label:
                loaded.append(Label(label=label_id,
                    id=ann_id, attributes=attributes, group=group))

            elif ann_type == AnnotationType.mask:
                rle = ann['rle']
                rle['counts'] = rle['counts'].encode('ascii')
                loaded.append(RleMask(rle=rle, label=label_id,
                    id=ann_id, attributes=attributes, group=group,
                    z_order=z_order))

            elif ann_type == AnnotationType.polyline:
                loaded.append(PolyLine(points, label=label_id,
                    id=ann_id, attributes=attributes, group=group,
                    z_order=z_order))

            elif ann_type == AnnotationType.polygon:
                loaded.append(Polygon(points, label=label_id,
                    id=ann_id, attributes=attributes, group=group,
                    z_order=z_order))

            elif ann_type == AnnotationType.bbox:
                x, y, w, h = ann['bbox']
                loaded.append(Bbox(x, y, w, h, label=label_id,
                    id=ann_id, attributes=attributes, group=group,
                    z_order=z_order))

            elif ann_type == AnnotationType.points:
                loaded.append(Points(points, label=label_id,
                    id=ann_id, attributes=attributes, group=group,
                    z_order=z_order))

            elif ann_type == AnnotationType.caption:
                caption = ann.get('caption')
                loaded.append(Caption(caption,
                    id=ann_id, attributes=attributes, group=group))

            else:
                raise NotImplementedError()

        return loaded
