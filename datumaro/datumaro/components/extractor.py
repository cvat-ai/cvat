
# Copyright (C) 2019-2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

from collections import namedtuple
from enum import Enum
import numpy as np

import attr
from attr import attrs, attrib

from datumaro.util.image import Image
from datumaro.util.attrs_util import not_empty, default_if_none


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

_COORDINATE_ROUNDING_DIGITS = 2

@attrs(kw_only=True)
class Annotation:
    id = attrib(default=0, validator=default_if_none(int))
    attributes = attrib(factory=dict, validator=default_if_none(dict))
    group = attrib(default=0, validator=default_if_none(int))

    def __attrs_post_init__(self):
        assert isinstance(self.type, AnnotationType)

    @property
    def type(self) -> AnnotationType:
        return self._type # must be set in subclasses

    def wrap(self, **kwargs):
        return attr.evolve(self, **kwargs)

@attrs(kw_only=True)
class Categories:
    attributes = attrib(factory=set, validator=default_if_none(set), eq=False)

@attrs
class LabelCategories(Categories):
    @attrs(repr_ns='LabelCategories')
    class Category:
        name = attrib(converter=str, validator=not_empty)
        parent = attrib(default='', validator=default_if_none(str))
        attributes = attrib(factory=set, validator=default_if_none(set))

    items = attrib(factory=list, validator=default_if_none(list))
    _indices = attrib(factory=dict, init=False, eq=False)

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

    def __attrs_post_init__(self):
        self._reindex()

    def _reindex(self):
        indices = {}
        for index, item in enumerate(self.items):
            assert item.name not in self._indices
            indices[item.name] = index
        self._indices = indices

    def add(self, name: str, parent: str = None, attributes: dict = None):
        assert name not in self._indices, name

        index = len(self.items)
        self.items.append(self.Category(name, parent, attributes))
        self._indices[name] = index
        return index

    def find(self, name: str):
        index = self._indices.get(name)
        if index is not None:
            return index, self.items[index]
        return index, None

@attrs
class Label(Annotation):
    _type = AnnotationType.label
    label = attrib(converter=int)

@attrs(eq=False)
class MaskCategories(Categories):
    colormap = attrib(factory=dict, validator=default_if_none(dict))
    _inverse_colormap = attrib(default=None,
        validator=attr.validators.optional(dict))

    @property
    def inverse_colormap(self):
        from datumaro.util.mask_tools import invert_colormap
        if self._inverse_colormap is None:
            if self.colormap is not None:
                self._inverse_colormap = invert_colormap(self.colormap)
        return self._inverse_colormap

    def __eq__(self, other):
        if not super().__eq__(other):
            return False
        if not isinstance(other, __class__):
            return False
        for label_id, my_color in self.colormap.items():
            other_color = other.colormap.get(label_id)
            if not np.array_equal(my_color, other_color):
                return False
        return True

@attrs(eq=False)
class Mask(Annotation):
    _type = AnnotationType.mask
    _image = attrib()
    label = attrib(converter=attr.converters.optional(int),
        default=None, kw_only=True)
    z_order = attrib(default=0, validator=default_if_none(int), kw_only=True)

    @property
    def image(self):
        if callable(self._image):
            return self._image()
        return self._image

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
        if not isinstance(other, __class__):
            return False
        return \
            (self.label == other.label) and \
            (self.z_order == other.z_order) and \
            (np.array_equal(self.image, other.image))

@attrs(eq=False)
class RleMask(Mask):
    rle = attrib()
    _image = attrib(default=attr.Factory(
        lambda self: self._lazy_decode(self.rle),
        takes_self=True), init=False)

    @staticmethod
    def _lazy_decode(rle):
        from pycocotools import mask as mask_utils
        return lambda: mask_utils.decode(rle).astype(np.bool)

    def get_area(self):
        from pycocotools import mask as mask_utils
        return mask_utils.area(self.rle)

    def get_bbox(self):
        from pycocotools import mask as mask_utils
        return mask_utils.toBbox(self.rle)

    def __eq__(self, other):
        if not isinstance(other, __class__):
            return super().__eq__(other)
        return self.rle == other.rle

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

@attrs
class _Shape(Annotation):
    points = attrib(converter=lambda x:
        [round(p, _COORDINATE_ROUNDING_DIGITS) for p in x])
    label = attrib(converter=attr.converters.optional(int),
        default=None, kw_only=True)
    z_order = attrib(default=0, validator=default_if_none(int), kw_only=True)

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

@attrs
class PolyLine(_Shape):
    _type = AnnotationType.polyline

    def as_polygon(self):
        return self.points[:]

    def get_area(self):
        return 0

@attrs
class Polygon(_Shape):
    _type = AnnotationType.polygon

    def __attrs_post_init__(self):
        super().__attrs_post_init__()
        # keep the message on a single line to produce informative output
        assert len(self.points) % 2 == 0 and 3 <= len(self.points) // 2, "Wrong polygon points: %s" % self.points

    def get_area(self):
        import pycocotools.mask as mask_utils

        x, y, w, h = self.get_bbox()
        rle = mask_utils.frPyObjects([self.points], y + h, x + w)
        area = mask_utils.area(rle)[0]
        return area

@attrs
class Bbox(_Shape):
    _type = AnnotationType.bbox

    # will be overridden by attrs, then will be overridden again by us
    # attrs' method will be renamed to __attrs_init__
    def __init__(self, x, y, w, h, *args, **kwargs):
        kwargs.pop('points', None) # comes from wrap()
        self.__attrs_init__([x, y, x + w, y + h], *args, **kwargs)
    __actual_init__ = __init__ # save pointer

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
        from datumaro.util.annotation_util import bbox_iou
        return bbox_iou(self.get_bbox(), other.get_bbox())

    def wrap(item, **kwargs):
        d = {'x': item.x, 'y': item.y, 'w': item.w, 'h': item.h}
        d.update(kwargs)
        return attr.evolve(item, **d)

assert not hasattr(Bbox, '__attrs_init__') # hopefully, it will be supported
setattr(Bbox, '__attrs_init__', Bbox.__init__)
setattr(Bbox, '__init__', Bbox.__actual_init__)

@attrs
class PointsCategories(Categories):
    @attrs(repr_ns="PointsCategories")
    class Category:
        labels = attrib(factory=list, validator=default_if_none(list))
        joints = attrib(factory=set, validator=default_if_none(set))

    items = attrib(factory=dict, validator=default_if_none(dict))

    @classmethod
    def from_iterable(cls, iterable):
        """Generation of PointsCategories from iterable object

        Args:
            iterable ([type]): This iterable object can be:
            1) list of positional argumetns - will generate Categories
                with these arguments

        Returns:
            PointsCategories: PointsCategories object
        """
        temp_categories = cls()

        for category in iterable:
            temp_categories.add(*category)
        return temp_categories

    def add(self, label_id, labels=None, joints=None):
        if joints is None:
            joints = []
        joints = set(map(tuple, joints))
        self.items[label_id] = self.Category(labels, joints)

@attrs
class Points(_Shape):
    Visibility = Enum('Visibility', [
        ('absent', 0),
        ('hidden', 1),
        ('visible', 2),
    ])
    _type = AnnotationType.points

    visibility = attrib(type=list, default=None)
    @visibility.validator
    def _visibility_validator(self, attribute, visibility):
        if visibility is None:
            visibility = [self.Visibility.visible] * (len(self.points) // 2)
        else:
            for i, v in enumerate(visibility):
                if not isinstance(v, self.Visibility):
                    visibility[i] = self.Visibility(v)
        assert len(visibility) == len(self.points) // 2
        self.visibility = visibility

    def __attrs_post_init__(self):
        super().__attrs_post_init__()
        assert len(self.points) % 2 == 0, self.points

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

@attrs
class Caption(Annotation):
    _type = AnnotationType.caption
    caption = attrib(converter=str)

@attrs
class DatasetItem:
    id = attrib(converter=lambda x: str(x).replace('\\', '/'),
        type=str, validator=not_empty)
    annotations = attrib(factory=list, validator=default_if_none(list))
    subset = attrib(default='', validator=default_if_none(str))
    path = attrib(factory=list, validator=default_if_none(list))

    image = attrib(type=Image, default=None)
    @image.validator
    def _image_validator(self, attribute, image):
        if callable(image) or isinstance(image, np.ndarray):
            image = Image(data=image)
        elif isinstance(image, str):
            image = Image(path=image)
        assert image is None or isinstance(image, Image)
        self.image = image

    attributes = attrib(factory=dict, validator=default_if_none(dict))

    @property
    def has_image(self):
        return self.image is not None

    def wrap(item, **kwargs):
        return attr.evolve(item, **kwargs)

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
            raise Exception("Unknown subset '%s' requested" % name)
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

    def transform_item(self, item: DatasetItem) -> DatasetItem:
        raise NotImplementedError()
