
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from collections import namedtuple
from enum import Enum
import numpy as np


AnnotationType = Enum('AnnotationType',
    [
        'label',
        'mask',
        'points',
        'polygon',
        'polyline',
        'bbox',
        'caption',
    ])

class Annotation:
    def __init__(self, id=None, type=None, attributes=None, group=None):
        if id is not None:
            id = int(id)
        self.id = id

        assert type in AnnotationType
        self.type = type

        if attributes is None:
            attributes = {}
        else:
            attributes = dict(attributes)
        self.attributes = attributes

        if group is not None:
            group = int(group)
        self.group = group

    def __eq__(self, other):
        if not isinstance(other, Annotation):
            return False
        return \
            (self.id == other.id) and \
            (self.type == other.type) and \
            (self.attributes == other.attributes) and \
            (self.group == other.group)

class Categories:
    def __init__(self, attributes=None):
        if attributes is None:
            attributes = set()
        self.attributes = attributes

    def __eq__(self, other):
        if not isinstance(other, Categories):
            return False
        return \
            (self.attributes == other.attributes)

class LabelCategories(Categories):
    Category = namedtuple('Category', ['name', 'parent'])

    def __init__(self, items=None, attributes=None):
        super().__init__(attributes=attributes)

        if items is None:
            items = []
        self.items = items

        self._indices = {}
        self._reindex()

    def _reindex(self):
        indices = {}
        for index, item in enumerate(self.items):
            assert item.name not in self._indices
            indices[item.name] = index
        self._indices = indices

    def add(self, name, parent=None):
        assert name not in self._indices

        index = len(self.items)
        self.items.append(self.Category(name, parent))
        self._indices[name] = index

    def find(self, name):
        index = self._indices.get(name)
        if index:
            return index, self.items[index]
        return index, None

    def __eq__(self, other):
        if not super().__eq__(other):
            return False
        return \
            (self.items == other.items)

class LabelObject(Annotation):
    def __init__(self, label=None,
            id=None, attributes=None, group=None):
        super().__init__(id=id, type=AnnotationType.label,
            attributes=attributes, group=group)
        self.label = label

    def __eq__(self, other):
        if not super().__eq__(other):
            return False
        return \
            (self.label == other.label)

class MaskCategories(Categories):
    def __init__(self, colormap=None, inverse_colormap=None, attributes=None):
        super().__init__(attributes=attributes)

        # colormap: label id -> color
        if colormap is None:
            colormap = {}
        self.colormap = colormap
        self._inverse_colormap = inverse_colormap

    @property
    def inverse_colormap(self):
        from datumaro.util.mask_tools import invert_colormap
        if self._inverse_colormap is None:
            if self.colormap is not None:
                try:
                    self._inverse_colormap = invert_colormap(self.colormap)
                except Exception:
                    pass
        return self._inverse_colormap

    def __eq__(self, other):
        if not super().__eq__(other):
            return False
        for label_id, my_color in self.colormap.items():
            other_color = other.colormap.get(label_id)
            if not np.array_equal(my_color, other_color):
                return False
        return True

class MaskObject(Annotation):
    def __init__(self, image=None, label=None,
            id=None, attributes=None, group=None):
        super().__init__(id=id, type=AnnotationType.mask,
            attributes=attributes, group=group)
        self._image = image
        self._label = label

    @property
    def label(self):
        return self._label

    @property
    def image(self):
        if callable(self._image):
            return self._image()
        return self._image

    def painted_data(self, colormap):
        raise NotImplementedError()

    def area(self):
        raise NotImplementedError()

    def extract(self, class_id):
        raise NotImplementedError()

    def bbox(self):
        raise NotImplementedError()

    def __eq__(self, other):
        if not super().__eq__(other):
            return False
        return \
            (self.label == other.label) and \
            (np.all(self.image == other.image))

def compute_iou(bbox_a, bbox_b):
    aX, aY, aW, aH = bbox_a
    bX, bY, bW, bH = bbox_b
    in_right = min(aX + aW, bX + bW)
    in_left = max(aX, bX)
    in_top = max(aY, bY)
    in_bottom = min(aY + aH, bY + bH)

    in_w = max(0, in_right - in_left)
    in_h = max(0, in_bottom - in_top)
    intersection = in_w * in_h

    a_area = aW * aH
    b_area = bW * bH
    union = a_area + b_area - intersection

    return intersection / max(1.0, union)

class ShapeObject(Annotation):
    def __init__(self, type, points=None, label=None,
            id=None, attributes=None, group=None):
        super().__init__(id=id, type=type,
            attributes=attributes, group=group)
        self.points = points
        self.label = label

    def area(self):
        raise NotImplementedError()

    def get_polygon(self):
        raise NotImplementedError()

    def get_bbox(self):
        points = self.get_points()
        if not self.points:
            return None

        xs = [p for p in points[0::2]]
        ys = [p for p in points[1::2]]
        x0 = min(xs)
        x1 = max(xs)
        y0 = min(ys)
        y1 = max(ys)
        return [x0, y0, x1 - x0, y1 - y0]

    def get_points(self):
        return self.points

    def get_mask(self):
        raise NotImplementedError()

    def __eq__(self, other):
        if not super().__eq__(other):
            return False
        return \
            (self.points == other.points) and \
            (self.label == other.label)

class PolyLineObject(ShapeObject):
    def __init__(self, points=None,
            label=None, id=None, attributes=None, group=None):
        super().__init__(type=AnnotationType.polyline,
            points=points, label=label,
            id=id, attributes=attributes, group=group)

    def get_polygon(self):
        return self.get_points()

    def area(self):
        return 0

class PolygonObject(ShapeObject):
    def __init__(self, points=None,
            label=None, id=None, attributes=None, group=None):
        super().__init__(type=AnnotationType.polygon,
            points=points, label=label,
            id=id, attributes=attributes, group=group)

    def get_polygon(self):
        return self.get_points()

class BboxObject(ShapeObject):
    def __init__(self, x=0, y=0, w=0, h=0,
            label=None, id=None, attributes=None, group=None):
        super().__init__(type=AnnotationType.bbox,
            points=[x, y, x + w, y + h], label=label,
            id=id, attributes=attributes, group=group)

    @property
    def x(self):
        return self.points[0]

    @property
    def y(self):
        return self.points[1]

    @property
    def w(self):
        return self.points[2] - self.points[0]

    @property
    def h(self):
        return self.points[3] - self.points[1]

    def area(self):
        return self.w * self.h

    def get_bbox(self):
        return [self.x, self.y, self.w, self.h]

    def get_polygon(self):
        x, y, w, h = self.get_bbox()
        return [
            x, y,
            x + w, y,
            x + w, y + h,
            x, y + h
        ]

    def iou(self, other):
        return compute_iou(self.get_bbox(), other.get_bbox())

class PointsCategories(Categories):
    Category = namedtuple('Category', ['labels', 'adjacent'])

    def __init__(self, items=None, attributes=None):
        super().__init__(attributes=attributes)

        if items is None:
            items = {}
        self.items = items

    def add(self, label_id, labels=None, adjacent=None):
        if labels is None:
            labels = []
        if adjacent is None:
            adjacent = []
        self.items[label_id] = self.Category(labels, set(adjacent))

    def __eq__(self, other):
        if not super().__eq__(other):
            return False
        return \
            (self.items == other.items)

class PointsObject(ShapeObject):
    Visibility = Enum('Visibility', [
        ('absent', 0),
        ('hidden', 1),
        ('visible', 2),
    ])

    def __init__(self, points=None, visibility=None, label=None,
            id=None, attributes=None, group=None):
        if points is not None:
            assert len(points) % 2 == 0

            if visibility is not None:
                assert len(visibility) == len(points) // 2
                for i, v in enumerate(visibility):
                    if not isinstance(v, self.Visibility):
                        visibility[i] = self.Visibility(v)
            else:
                visibility = []
                for _ in range(len(points) // 2):
                    visibility.append(self.Visibility.absent)

        super().__init__(type=AnnotationType.points,
            points=points, label=label,
            id=id, attributes=attributes, group=group)

        self.visibility = visibility

    def area(self):
        return 0

    def __eq__(self, other):
        if not super().__eq__(other):
            return False
        return \
            (self.visibility == other.visibility)

class CaptionObject(Annotation):
    def __init__(self, caption=None,
            id=None, attributes=None, group=None):
        super().__init__(id=id, type=AnnotationType.caption,
            attributes=attributes, group=group)

        if caption is None:
            caption = ''
        self.caption = caption

    def __eq__(self, other):
        if not super().__eq__(other):
            return False
        return \
            (self.caption == other.caption)

class DatasetItem:
    def __init__(self, id, annotations=None,
            subset=None, path=None, image=None):
        assert id is not None
        if not isinstance(id, str):
            id = str(id)
        assert len(id) != 0
        self._id = id

        if subset is None:
            subset = ''
        assert isinstance(subset, str)
        self._subset = subset

        if path is None:
            path = []
        self._path = path

        if annotations is None:
            annotations = []
        self._annotations = annotations

        self._image = image

    @property
    def id(self):
        return self._id

    @property
    def subset(self):
        return self._subset

    @property
    def path(self):
        return self._path

    @property
    def annotations(self):
        return self._annotations

    @property
    def image(self):
        if callable(self._image):
            return self._image()
        return self._image

    @property
    def has_image(self):
        return self._image is not None

    def __eq__(self, other):
        if not isinstance(other, __class__):
            return False
        return \
            (self.id == other.id) and \
            (self.subset == other.subset) and \
            (self.annotations == other.annotations) and \
            (self.image == other.image)

class IExtractor:
    def __iter__(self):
        raise NotImplementedError()

    def __len__(self):
        raise NotImplementedError()

    def subsets(self):
        raise NotImplementedError()

    def get_subset(self, name):
        raise NotImplementedError()

    def categories(self):
        raise NotImplementedError()

    def select(self, filter):
        raise NotImplementedError()

    def get(self, id, subset=None, path=None):
        raise NotImplementedError()

class _DatasetFilter:
    def __init__(self, iterable, predicate):
        self.iterable = iterable
        self.predicate = predicate

    def __iter__(self):
        return filter(self.predicate, self.iterable)

class _ExtractorBase(IExtractor):
    def __init__(self, length=None):
        self._length = length
        self._subsets = None

    def _init_cache(self):
        subsets = set()
        length = -1
        for length, item in enumerate(self):
            subsets.add(item.subset)
        length += 1

        if self._length is None:
            self._length = length
        if self._subsets is None:
            self._subsets = subsets

    def __len__(self):
        if self._length is None:
            self._init_cache()
        return self._length

    def subsets(self):
        if self._subsets is None:
            self._init_cache()
        return list(self._subsets)

    def get_subset(self, name):
        if name in self.subsets():
            return self.select(lambda item: item.subset == name)
        else:
            raise Exception("Unknown subset '%s' requested" % name)

class DatasetIteratorWrapper(_ExtractorBase):
    def __init__(self, iterable, categories):
        super().__init__(length=None)
        self._iterable = iterable
        self._categories = categories

    def __iter__(self):
        return iter(self._iterable)

    def categories(self):
        return self._categories

    def select(self, filter):
        return DatasetIteratorWrapper(
            _DatasetFilter(self, filter), self.categories())

class Extractor(_ExtractorBase):
    def __init__(self, length=None):
        super().__init__(length=None)

    def categories(self):
        return {}

    def select(self, filter):
        return DatasetIteratorWrapper(
            _DatasetFilter(self, filter), self.categories())
