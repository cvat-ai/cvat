
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from collections import namedtuple
from enum import Enum
import numpy as np

from datumaro.util.image import Image

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
    # pylint: disable=redefined-builtin
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

        if group is None:
            group = 0
        else:
            group = int(group)
        self.group = group
    # pylint: enable=redefined-builtin

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
        else:
            if not isinstance(attributes, set):
                attributes = set(attributes)
            for attr in attributes:
                assert isinstance(attr, str)
        self.attributes = attributes

    def __eq__(self, other):
        if not isinstance(other, Categories):
            return False
        return \
            (self.attributes == other.attributes)

class LabelCategories(Categories):
    Category = namedtuple('Category', ['name', 'parent', 'attributes'])

    @classmethod
    def from_iterable(cls, iterable):
        """Generation of LabelCategories from iterable object

        Args:
            iterable ([type]): This iterable object can be:
            1)simple str - will generate one Category with str as name
            2)list of str - will interpreted as list of Category names
            3)list of positional argumetns - will generate Categories
            with this arguments


        Returns:
            LabelCategories: LabelCategories object
        """
        temp_categories = cls()

        if isinstance(iterable, str):
            iterable = [[iterable]]

        for category in iterable:
            if isinstance(category, str):
                category = [category]
            temp_categories.add(*category)

        return temp_categories

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

    def add(self, name, parent=None, attributes=None):
        assert name not in self._indices
        if attributes is None:
            attributes = set()
        else:
            if not isinstance(attributes, set):
                attributes = set(attributes)
            for attr in attributes:
                assert isinstance(attr, str)
        if parent is None:
            parent = ''

        index = len(self.items)
        self.items.append(self.Category(name, parent, attributes))
        self._indices[name] = index
        return index

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

class Label(Annotation):
    # pylint: disable=redefined-builtin
    def __init__(self, label=None,
            id=None, attributes=None, group=None):
        super().__init__(id=id, type=AnnotationType.label,
            attributes=attributes, group=group)

        if label is not None:
            label = int(label)
        self.label = label
    # pylint: enable=redefined-builtin

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

class Mask(Annotation):
    # pylint: disable=redefined-builtin
    def __init__(self, image=None, label=None, z_order=None,
            id=None, attributes=None, group=None):
        super().__init__(type=AnnotationType.mask,
            id=id, attributes=attributes, group=group)

        self._image = image

        if label is not None:
            label = int(label)
        self._label = label

        if z_order is None:
            z_order = 0
        else:
            z_order = int(z_order)
        self._z_order = z_order
    # pylint: enable=redefined-builtin

    @property
    def image(self):
        if callable(self._image):
            return self._image()
        return self._image

    @property
    def label(self):
        return self._label

    @property
    def z_order(self):
        return self._z_order

    def as_class_mask(self, label_id=None):
        if label_id is None:
            label_id = self.label
        return self.image * label_id

    def as_instance_mask(self, instance_id):
        return self.image * instance_id

    def get_area(self):
        return np.count_nonzero(self.image)

    def get_bbox(self):
        from datumaro.util.mask_tools import find_mask_bbox
        return find_mask_bbox(self.image)

    def paint(self, colormap):
        from datumaro.util.mask_tools import paint_mask
        return paint_mask(self.as_class_mask(), colormap)

    def __eq__(self, other):
        if not super().__eq__(other):
            return False
        return \
            (self.label == other.label) and \
            (self.z_order == other.z_order) and \
            (self.image is not None and other.image is not None and \
                np.array_equal(self.image, other.image))

class RleMask(Mask):
    # pylint: disable=redefined-builtin
    def __init__(self, rle=None, label=None, z_order=None,
            id=None, attributes=None, group=None):
        lazy_decode = self._lazy_decode(rle)
        super().__init__(image=lazy_decode, label=label, z_order=z_order,
            id=id, attributes=attributes, group=group)

        self._rle = rle
    # pylint: enable=redefined-builtin

    @staticmethod
    def _lazy_decode(rle):
        from pycocotools import mask as mask_utils
        return lambda: mask_utils.decode(rle).astype(np.bool)

    def get_area(self):
        from pycocotools import mask as mask_utils
        return mask_utils.area(self._rle)

    def get_bbox(self):
        from pycocotools import mask as mask_utils
        return mask_utils.toBbox(self._rle)

    @property
    def rle(self):
        return self._rle

    def __eq__(self, other):
        if not isinstance(other, __class__):
            return super().__eq__(other)
        return self._rle == other._rle

class CompiledMask:
    @staticmethod
    def from_instance_masks(instance_masks,
            instance_ids=None, instance_labels=None):
        from datumaro.util.mask_tools import merge_masks

        if instance_ids is not None:
            assert len(instance_ids) == len(instance_masks)
        else:
            instance_ids = [None] * len(instance_masks)

        if instance_labels is not None:
            assert len(instance_labels) == len(instance_masks)
        else:
            instance_labels = [None] * len(instance_masks)

        instance_masks = sorted(
            zip(instance_masks, instance_ids, instance_labels),
            key=lambda m: m[0].z_order)

        instance_mask = [m.as_instance_mask(id if id is not None else 1 + idx)
            for idx, (m, id, _) in enumerate(instance_masks)]
        instance_mask = merge_masks(instance_mask)

        cls_mask = [m.as_class_mask(c) for m, _, c in instance_masks]
        cls_mask = merge_masks(cls_mask)
        return __class__(class_mask=cls_mask, instance_mask=instance_mask)

    def __init__(self, class_mask=None, instance_mask=None):
        self._class_mask = class_mask
        self._instance_mask = instance_mask

    @staticmethod
    def _get_image(image):
        if callable(image):
            return image()
        return image

    @property
    def class_mask(self):
        return self._get_image(self._class_mask)

    @property
    def instance_mask(self):
        return self._get_image(self._instance_mask)

    @property
    def instance_count(self):
        return int(self.instance_mask.max())

    def get_instance_labels(self):
        class_shift = 16
        m = (self.class_mask.astype(np.uint32) << class_shift) \
            + self.instance_mask.astype(np.uint32)
        keys = np.unique(m)
        instance_labels = {k & ((1 << class_shift) - 1): k >> class_shift
            for k in keys if k & ((1 << class_shift) - 1) != 0
        }
        return instance_labels

    def extract(self, instance_id):
        return self.instance_mask == instance_id

    def lazy_extract(self, instance_id):
        return lambda: self.extract(instance_id)

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

class _Shape(Annotation):
    # pylint: disable=redefined-builtin
    def __init__(self, type, points=None, label=None, z_order=None,
            id=None, attributes=None, group=None):
        super().__init__(id=id, type=type,
            attributes=attributes, group=group)
        if points is None:
            points = []
        self._points = list(points)

        if label is not None:
            label = int(label)
        self._label = label

        if z_order is None:
            z_order = 0
        else:
            z_order = int(z_order)
        self._z_order = z_order
    # pylint: enable=redefined-builtin

    @property
    def points(self):
        return self._points

    @property
    def label(self):
        return self._label

    @property
    def z_order(self):
        return self._z_order

    def get_area(self):
        raise NotImplementedError()

    def get_bbox(self):
        points = self.points
        if not points:
            return None

        xs = [p for p in points[0::2]]
        ys = [p for p in points[1::2]]
        x0 = min(xs)
        x1 = max(xs)
        y0 = min(ys)
        y1 = max(ys)
        return [x0, y0, x1 - x0, y1 - y0]

    def __eq__(self, other):
        if not super().__eq__(other):
            return False
        return \
            (np.array_equal(self.points, other.points)) and \
            (self.z_order == other.z_order) and \
            (self.label == other.label)

class PolyLine(_Shape):
    # pylint: disable=redefined-builtin
    def __init__(self, points=None, label=None, z_order=None,
            id=None, attributes=None, group=None):
        super().__init__(type=AnnotationType.polyline,
            points=points, label=label, z_order=z_order,
            id=id, attributes=attributes, group=group)
    # pylint: enable=redefined-builtin

    def as_polygon(self):
        return self.points[:]

    def get_area(self):
        return 0

class Polygon(_Shape):
    # pylint: disable=redefined-builtin
    def __init__(self, points=None, label=None,
            z_order=None, id=None, attributes=None, group=None):
        if points is not None:
            # keep the message on the single line to produce
            # informative output
            assert len(points) % 2 == 0 and 3 <= len(points) // 2, "Wrong polygon points: %s" % points
        super().__init__(type=AnnotationType.polygon,
            points=points, label=label, z_order=z_order,
            id=id, attributes=attributes, group=group)
    # pylint: enable=redefined-builtin

    def get_area(self):
        import pycocotools.mask as mask_utils

        _, _, w, h = self.get_bbox()
        rle = mask_utils.frPyObjects([self.points], h, w)
        area = mask_utils.area(rle)[0]
        return area

class Bbox(_Shape):
    # pylint: disable=redefined-builtin
    def __init__(self, x=0, y=0, w=0, h=0, label=None, z_order=None,
            id=None, attributes=None, group=None):
        super().__init__(type=AnnotationType.bbox,
            points=[x, y, x + w, y + h], label=label, z_order=z_order,
            id=id, attributes=attributes, group=group)
    # pylint: enable=redefined-builtin

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

    def get_area(self):
        return self.w * self.h

    def get_bbox(self):
        return [self.x, self.y, self.w, self.h]

    def as_polygon(self):
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
    Category = namedtuple('Category', ['labels', 'joints'])

    @classmethod
    def from_iterable(cls, iterable):
        """Generation of PointsCategories from iterable object

        Args:
            iterable ([type]): This iterable object can be:
            1)simple int - will generate one Category with int as label
            2)list of int - will interpreted as list of Category labels
            3)list of positional argumetns - will generate Categories
            with this arguments

        Returns:
            PointsCategories: PointsCategories object
        """
        temp_categories = cls()

        if isinstance(iterable, int):
            iterable = [[iterable]]

        for category in iterable:
            if isinstance(category, int):
                category = [category]
            temp_categories.add(*category)
        return temp_categories

    def __init__(self, items=None, attributes=None):
        super().__init__(attributes=attributes)

        if items is None:
            items = {}
        self.items = items

    def add(self, label_id, labels=None, joints=None):
        if labels is None:
            labels = []
        if joints is None:
            joints = []
        joints = set(map(tuple, joints))
        self.items[label_id] = self.Category(labels, joints)

    def __eq__(self, other):
        if not super().__eq__(other):
            return False
        return \
            (self.items == other.items)

class Points(_Shape):
    Visibility = Enum('Visibility', [
        ('absent', 0),
        ('hidden', 1),
        ('visible', 2),
    ])

    # pylint: disable=redefined-builtin
    def __init__(self, points=None, visibility=None, label=None, z_order=None,
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
                    visibility.append(self.Visibility.visible)

        super().__init__(type=AnnotationType.points,
            points=points, label=label, z_order=z_order,
            id=id, attributes=attributes, group=group)

        self.visibility = visibility
    # pylint: enable=redefined-builtin

    def get_area(self):
        return 0

    def get_bbox(self):
        xs = [p for p, v in zip(self.points[0::2], self.visibility)
            if v != __class__.Visibility.absent]
        ys = [p for p, v in zip(self.points[1::2], self.visibility)
            if v != __class__.Visibility.absent]
        x0 = min(xs, default=0)
        x1 = max(xs, default=0)
        y0 = min(ys, default=0)
        y1 = max(ys, default=0)
        return [x0, y0, x1 - x0, y1 - y0]

    def __eq__(self, other):
        if not super().__eq__(other):
            return False
        return \
            (self.visibility == other.visibility)

class Caption(Annotation):
    # pylint: disable=redefined-builtin
    def __init__(self, caption=None,
            id=None, attributes=None, group=None):
        super().__init__(id=id, type=AnnotationType.caption,
            attributes=attributes, group=group)

        if caption is None:
            caption = ''
        else:
            caption = str(caption)
        self.caption = caption
    # pylint: enable=redefined-builtin

    def __eq__(self, other):
        if not super().__eq__(other):
            return False
        return \
            (self.caption == other.caption)

class DatasetItem:
    # pylint: disable=redefined-builtin
    def __init__(self, id=None, annotations=None,
            subset=None, path=None, image=None, attributes=None):
        assert id is not None
        self._id = str(id).replace('\\', '/')

        if subset is None:
            subset = ''
        else:
            subset = str(subset)
        self._subset = subset

        if path is None:
            path = []
        else:
            path = list(path)
        self._path = path

        if annotations is None:
            annotations = []
        else:
            annotations = list(annotations)
        self._annotations = annotations

        if callable(image) or isinstance(image, np.ndarray):
            image = Image(data=image)
        elif isinstance(image, str):
            image = Image(path=image)
        assert image is None or isinstance(image, Image)
        self._image = image

        if attributes is None:
            attributes = {}
        else:
            attributes = dict(attributes)
        self._attributes = attributes
    # pylint: enable=redefined-builtin

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
        return self._image

    @property
    def has_image(self):
        return self._image is not None

    @property
    def attributes(self):
        return self._attributes

    def __eq__(self, other):
        if not isinstance(other, __class__):
            return False
        return \
            (self.id == other.id) and \
            (self.subset == other.subset) and \
            (self.path == other.path) and \
            (self.annotations == other.annotations) and \
            (self.image == other.image) and \
            (self.attributes == other.attributes)

    def wrap(item, **kwargs):
        expected_args = {'id', 'annotations', 'subset',
            'path', 'image', 'attributes'}
        for k in expected_args:
            if k not in kwargs:
                kwargs[k] = getattr(item, k)
        return DatasetItem(**kwargs)

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

    def select(self, pred):
        raise NotImplementedError()

class _DatasetFilter:
    def __init__(self, iterable, predicate):
        self.iterable = iterable
        self.predicate = predicate

    def __iter__(self):
        return filter(self.predicate, self.iterable)

class _ExtractorBase(IExtractor):
    def __init__(self, length=None, subsets=None):
        self._length = length
        self._subsets = subsets

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

    def transform(self, method, *args, **kwargs):
        return method(self, *args, **kwargs)

class DatasetIteratorWrapper(_ExtractorBase):
    def __init__(self, iterable, categories, subsets=None):
        super().__init__(length=None, subsets=subsets)
        self._iterable = iterable
        self._categories = categories

    def __iter__(self):
        return iter(self._iterable)

    def categories(self):
        return self._categories

    def select(self, pred):
        return DatasetIteratorWrapper(
            _DatasetFilter(self, pred), self.categories(), self.subsets())

class Extractor(_ExtractorBase):
    def __init__(self, length=None):
        super().__init__(length=None)

    def categories(self):
        return {}

    def select(self, pred):
        return DatasetIteratorWrapper(
            _DatasetFilter(self, pred), self.categories(), self.subsets())

DEFAULT_SUBSET_NAME = 'default'


class SourceExtractor(Extractor):
    def __init__(self, length=None, subset=None):
        super().__init__(length=length)

        if subset == DEFAULT_SUBSET_NAME:
            subset = None
        self._subset = subset

    def subsets(self):
        return [self._subset]

    def get_subset(self, name):
        if name != self._subset:
            return None
        return self

class Importer:
    @classmethod
    def detect(cls, path):
        raise NotImplementedError()

    def __call__(self, path, **extra_params):
        raise NotImplementedError()

class Transform(Extractor):
    @staticmethod
    def wrap_item(item, **kwargs):
        return item.wrap(**kwargs)

    def __init__(self, extractor):
        super().__init__()

        self._extractor = extractor

    def __iter__(self):
        for item in self._extractor:
            yield self.transform_item(item)

    def categories(self):
        return self._extractor.categories()

    def transform_item(self, item):
        raise NotImplementedError()
