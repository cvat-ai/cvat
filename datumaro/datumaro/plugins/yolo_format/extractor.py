
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from collections import OrderedDict
import os.path as osp
import re

from datumaro.components.extractor import (SourceExtractor, Extractor,
    DatasetItem, AnnotationType, Bbox, LabelCategories
)
from datumaro.util import split_path
from datumaro.util.image import Image

from .format import YoloPath


class YoloExtractor(SourceExtractor):
    class Subset(Extractor):
        def __init__(self, name, parent):
            super().__init__()
            self._name = name
            self._parent = parent
            self.items = OrderedDict()

        def __iter__(self):
            for item_id in self.items:
                yield self._parent._get(item_id, self._name)

        def __len__(self):
            return len(self.items)

        def categories(self):
            return self._parent.categories()

    def __init__(self, config_path, image_info=None):
        super().__init__()

        if not osp.isfile(config_path):
            raise Exception("Can't read dataset descriptor file '%s'" %
                config_path)

        rootpath = osp.dirname(config_path)
        self._path = rootpath

        assert image_info is None or isinstance(image_info, (str, dict))
        if image_info is None:
            image_info = osp.join(rootpath, YoloPath.IMAGE_META_FILE)
            if not osp.isfile(image_info):
                image_info = {}
        if isinstance(image_info, str):
            if not osp.isfile(image_info):
                raise Exception("Can't read image meta file '%s'" % image_info)
            with open(image_info) as f:
                image_info = {}
                for line in f:
                    image_name, h, w = line.strip().split()
                    image_info[image_name] = (int(h), int(w))
        self._image_info = image_info

        with open(config_path, 'r') as f:
            config_lines = f.readlines()

        subsets = OrderedDict()
        names_path = None

        for line in config_lines:
            match = re.match(r'(\w+)\s*=\s*(.+)$', line)
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

        if not names_path:
            raise Exception("Failed to parse labels path from '%s'" % \
                config_path)

        for subset_name, list_path in subsets.items():
            list_path = osp.join(self._path, self.localize_path(list_path))
            if not osp.isfile(list_path):
                raise Exception("Not found '%s' subset list file" % subset_name)

            subset = YoloExtractor.Subset(subset_name, self)
            with open(list_path, 'r') as f:
                subset.items = OrderedDict(
                    (self.name_from_path(p), self.localize_path(p))
                    for p in f
                )
            subsets[subset_name] = subset

        self._subsets = subsets

        self._categories = {
            AnnotationType.label:
                self._load_categories(
                    osp.join(self._path, self.localize_path(names_path)))
        }

    @staticmethod
    def localize_path(path):
        path = path.strip()
        default_base = osp.join('data', '')
        if path.startswith(default_base): # default path
            path = path[len(default_base) : ]
        return path

    @classmethod
    def name_from_path(cls, path):
        path = cls.localize_path(path)
        parts = split_path(path)
        if 1 < len(parts) and not osp.isabs(path):
            # NOTE: when path is like [data/]<subset_obj>/<image_name>
            # drop everything but <image name>
            # <image name> can be <a/b/c/filename.ext>, so no just basename()
            path = osp.join(*parts[1:])
        return osp.splitext(path)[0]

    def _get(self, item_id, subset_name):
        subset = self._subsets[subset_name]
        item = subset.items[item_id]

        if isinstance(item, str):
            image_size = self._image_info.get(item_id)
            image = Image(path=osp.join(self._path, item), size=image_size)

            anno_path = osp.splitext(image.path)[0] + '.txt'
            annotations = self._parse_annotations(anno_path, image)

            item = DatasetItem(id=item_id, subset=subset_name,
                image=image, annotations=annotations)
            subset.items[item_id] = item

        return item

    @staticmethod
    def _parse_annotations(anno_path, image):
        lines = []
        with open(anno_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line:
                    lines.append(line)

        annotations = []
        if lines:
            size = image.size # use image info as late as possible
            if size is None:
                raise Exception("Can't find image info for '%s'" % image.path)
            image_height, image_width = size
        for line in lines:
            label_id, xc, yc, w, h = line.split()
            label_id = int(label_id)
            w = float(w)
            h = float(h)
            x = float(xc) - w * 0.5
            y = float(yc) - h * 0.5
            annotations.append(Bbox(
                round(x * image_width, 1), round(y * image_height, 1),
                round(w * image_width, 1), round(h * image_height, 1),
                label=label_id
            ))

        return annotations

    @staticmethod
    def _load_categories(names_path):
        label_categories = LabelCategories()

        with open(names_path, 'r') as f:
            for label in f:
                label_categories.add(label.strip())

        return label_categories

    def categories(self):
        return self._categories

    def __iter__(self):
        for subset in self._subsets.values():
            for item in subset:
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