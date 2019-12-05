
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from collections import OrderedDict
import os.path as osp
import re

from datumaro.components.extractor import (Extractor, DatasetItem,
    AnnotationType, LabelObject, BboxObject, LabelCategories
)
from datumaro.components.formats.yolo import YoloPath
from datumaro.util.image import lazy_image


class YoloExtractor(Extractor):
    class Subset(Extractor):
        def __init__(self, name, parent):
            super().__init__()
            self._name = name
            self._parent = parent
            self.items = OrderedDict()

        def __iter__(self):
            for item in self.items.values():
                yield item

        def __len__(self):
            return len(self.items)

        def categories(self):
            return self._parent.categories()

    def __init__(self, config_path):
        super().__init__()

        if not osp.isfile(config_path):
            raise Exception("Can't read dataset descriptor file '%s'" % \
                config_path)

        rootpath = osp.dirname(config_path)
        self._path = rootpath

        with open(config_path, 'r') as f:
            config_lines = f.readlines()

        subsets = OrderedDict()
        names_path = None

        for line in config_lines:
            match = re.match(r'(.+)\s*=\s*(.+)$', line)
            if not match:
                continue

            key = match.group(1)
            value = match.group(2)
            if key == 'names':
                names_path = value
            elif key in YoloPath.SUBSET_NAMES:
                subsets[key] = value
            else:
                continue

        for subset_name, list_path in subsets.items():
            list_path = self._make_local_path(list_path)
            if not osp.isfile(list_path):
                raise Exception("Not found '%s' subset list file" % subset_name)
            with open(list_path, 'r') as f:
                subset_images = OrderedDict(
                    (osp.splitext(osp.basename(p))[0], p) for p in f)

            subset = YoloExtractor.Subset(subset_name, self)
            subsets[subset_name] = subset

            for item_id, image_path in subset_images.items():
                image_path = self._make_local_path(image_path)
                image = lazy_image(image_path)
                h, w, _ = image().shape
                anno_path = osp.splitext(image_path)[0] + '.txt'
                annotations = self._parse_annotations(anno_path, w, h)

                subset.items[item_id] = DatasetItem(id=item_id,
                    subset=subset_name, image=image, annotations=annotations)
        self._subsets = subsets

        self._categories = {
            AnnotationType.label_categories:
                self._load_categories(self._make_local_path(names_path))
        }

    def _make_local_path(self, path):
        default_base = osp.join('data', '')
        if path.startswith(default_base): # default path
            path = path[len(default_base) : ]
        return osp.join(self._path, path) # relative or absolute path

    @staticmethod
    def _parse_annotations(anno_path, image_width, image_height):
        with open(anno_path, 'r') as f:
            annotations = []
            for line in f:
                label_id, x, y, w, h = line.strip().split()
                annotations.append(BboxObject(
                    x * image_width, y * image_height,
                    w * image_width, h * image_height,
                    label=label_id
                ))
        return annotations

    @staticmethod
    def _load_categories(names_path):
        label_categories = LabelCategories()

        with open(names_path, 'r') as f:
            for label in f:
                label_categories.add(label)

        return label_categories

    def categories(self):
        return self._categories

    def __iter__(self):
        for subset in self._subsets.values():
            for item in subset.items.values():
                yield item

    def __len__(self):
        length = 0
        for subset in self._subsets.values():
            length += len(subset)
        return length

    def subsets(self):
        return list(self._subsets)

    def get_subset(self, name):
        return self._subsets[name]