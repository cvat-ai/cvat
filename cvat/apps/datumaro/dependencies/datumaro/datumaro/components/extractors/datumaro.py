
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from collections import defaultdict
import json
import numpy as np
import os
import os.path as osp

from datumaro.components.extractor import *
from datumaro.components.formats.datumaro import *
from datumaro.util.image import lazy_image
from datumaro.util.mask_tools import lazy_mask
from datumaro.util import dir_items


class DatumaroExtractor(Extractor):
    class Subset(Extractor):
        def __init__(self, name, parent):
            super().__init__()
            self._parent = parent
            self._name = name
            self.items = []

        def __iter__(self):
            for item in self.items:
                yield self._parent._get(item, self._name)

        def __len__(self):
            return len(self.items)

        def categories(self):
            return self._parent.categories()

    def __init__(self, path):
        super().__init__()

        assert osp.isdir(path)
        self._path = path

        annotations = defaultdict(list)
        found_subsets = self._find_subsets(path)
        parsed_anns = None
        subsets = {}
        for subset_name, subset_path in found_subsets.items():
            if subset_name == DatumaroPath.DEFAULT_SUBSET:
                subset_name = None
            subset = self.Subset(subset_name, self)
            with open(subset_path, 'r') as f:
                parsed_anns = json.load(f)

            for index, item in enumerate(parsed_anns['items']):
                subset.items.append(index)

            annotations[subset_name] = parsed_anns
            subsets[subset_name] = subset
        self._annotations = dict(annotations)
        self._subsets = subsets

        self._categories = {}
        if parsed_anns is not None:
            self._categories = self._load_categories(parsed_anns)

    def _load_categories(self, parsed):
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
                    item['labels'], adjacent=item['adjacent'])

            categories[AnnotationType.points] = point_categories

        return categories

    def _get(self, index, subset_name):
        item = self._annotations[subset_name]['items'][index]

        id = item.get('id')

        image_path = osp.join(self._path, DatumaroPath.IMAGES_DIR,
            id + DatumaroPath.IMAGE_EXT)
        image = None
        if osp.isfile(image_path):
            image = lazy_image(image_path)

        annotations = self._load_annotations(item)

        return DatasetItem(id=id, subset=subset_name,
            annotations=annotations, image=image)

    def _load_annotations(self, item):
        parsed = item['annotations']
        loaded = []

        for ann in parsed:
            id = ann.get('id')
            type = AnnotationType[ann['type']]
            attributes = ann.get('attributes')
            group = ann.get('group')

            if type == AnnotationType.label:
                label_id = ann.get('label_id')
                loaded.append(LabelObject(label=label_id,
                    id=id, attributes=attributes, group=group))

            elif type == AnnotationType.mask:
                label_id = ann.get('label_id')
                mask_id = str(ann.get('mask_id'))

                mask_path = osp.join(self._path, DatumaroPath.ANNOTATIONS_DIR,
                    DatumaroPath.MASKS_DIR, mask_id + DatumaroPath.MASK_EXT)
                mask = None

                if osp.isfile(mask_path):
                    mask_cat = self._categories.get(AnnotationType.mask)
                    if mask_cat is not None:
                        mask = lazy_mask(mask_path, mask_cat.inverse_colormap)
                    else:
                        mask = lazy_image(mask_path)

                loaded.append(MaskObject(label=label_id, image=mask,
                    id=id, attributes=attributes, group=group))

            elif type == AnnotationType.polyline:
                label_id = ann.get('label_id')
                points = ann.get('points')
                loaded.append(PolyLineObject(points, label=label_id,
                    id=id, attributes=attributes, group=group))

            elif type == AnnotationType.polygon:
                label_id = ann.get('label_id')
                points = ann.get('points')
                loaded.append(PolygonObject(points, label=label_id,
                    id=id, attributes=attributes, group=group))

            elif type == AnnotationType.bbox:
                label_id = ann.get('label_id')
                x, y, w, h = ann.get('bbox')
                loaded.append(BboxObject(x, y, w, h, label=label_id,
                    id=id, attributes=attributes, group=group))

            elif type == AnnotationType.points:
                label_id = ann.get('label_id')
                points = ann.get('points')
                loaded.append(PointsObject(points, label=label_id,
                    id=id, attributes=attributes, group=group))

            elif type == AnnotationType.caption:
                caption = ann.get('caption')
                loaded.append(CaptionObject(caption,
                    id=id, attributes=attributes, group=group))

            else:
                raise NotImplementedError()

        return loaded

    def categories(self):
        return self._categories

    def __iter__(self):
        for subset_name, subset in self._subsets.items():
            for id in subset.items:
                yield self._get(id, subset_name)

    def __len__(self):
        length = 0
        for subset in self._subsets.values():
            length += len(subset)
        return length

    def subsets(self):
        return list(self._subsets)

    def get_subset(self, subset_name):
        return self._subsets[subset_name]

    def _find_subsets(self, path):
        anno_dir = osp.join(path, DatumaroPath.ANNOTATIONS_DIR)
        if not osp.isdir(anno_dir):
            raise Exception('Datumaro dataset not found at "%s"' % path)

        return { name: osp.join(anno_dir, name + '.json')
            for name in dir_items(anno_dir, '.json', truncate_ext=True)
        }