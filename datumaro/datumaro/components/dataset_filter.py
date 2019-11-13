
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from lxml import etree as ET
from datumaro.components.extractor import (AnnotationType, Annotation,
    LabelObject, MaskObject, PointsObject, PolygonObject,
    PolyLineObject, BboxObject, CaptionObject,
)


def _cast(value, type_conv, default=None):
    if value is None:
        return default
    try:
        return type_conv(value)
    except Exception:
        return default

class DatasetItemEncoder:
    def encode_item(self, item):
        item_elem = ET.Element('item')
        ET.SubElement(item_elem, 'id').text = str(item.id)
        ET.SubElement(item_elem, 'subset').text = str(item.subset)

        # Dataset wrapper-specific
        ET.SubElement(item_elem, 'source').text = \
            str(getattr(item, 'source', None))
        ET.SubElement(item_elem, 'extractor').text = \
            str(getattr(item, 'extractor', None))

        image = item.image
        if image is not None:
            item_elem.append(self.encode_image(image))

        for ann in item.annotations:
            item_elem.append(self.encode_object(ann))

        return item_elem

    @classmethod
    def encode_image(cls, image):
        image_elem = ET.Element('image')

        h, w, c = image.shape
        ET.SubElement(image_elem, 'width').text = str(w)
        ET.SubElement(image_elem, 'height').text = str(h)
        ET.SubElement(image_elem, 'depth').text = str(c)

        return image_elem

    @classmethod
    def encode_annotation(cls, annotation):
        assert isinstance(annotation, Annotation)
        ann_elem = ET.Element('annotation')
        ET.SubElement(ann_elem, 'id').text = str(annotation.id)
        ET.SubElement(ann_elem, 'type').text = str(annotation.type.name)

        for k, v in annotation.attributes.items():
            ET.SubElement(ann_elem, k).text = str(v)

        ET.SubElement(ann_elem, 'group').text = str(annotation.group)

        return ann_elem

    @classmethod
    def encode_label_object(cls, obj):
        ann_elem = cls.encode_annotation(obj)

        ET.SubElement(ann_elem, 'label_id').text = str(obj.label)

        return ann_elem

    @classmethod
    def encode_mask_object(cls, obj):
        ann_elem = cls.encode_annotation(obj)

        ET.SubElement(ann_elem, 'label_id').text = str(obj.label)

        mask = obj.image
        if mask is not None:
            ann_elem.append(cls.encode_image(mask))

        return ann_elem

    @classmethod
    def encode_bbox_object(cls, obj):
        ann_elem = cls.encode_annotation(obj)

        ET.SubElement(ann_elem, 'label_id').text = str(obj.label)
        ET.SubElement(ann_elem, 'x').text = str(obj.x)
        ET.SubElement(ann_elem, 'y').text = str(obj.y)
        ET.SubElement(ann_elem, 'w').text = str(obj.w)
        ET.SubElement(ann_elem, 'h').text = str(obj.h)
        ET.SubElement(ann_elem, 'area').text = str(obj.area())

        return ann_elem

    @classmethod
    def encode_points_object(cls, obj):
        ann_elem = cls.encode_annotation(obj)

        ET.SubElement(ann_elem, 'label_id').text = str(obj.label)

        x, y, w, h = obj.get_bbox()
        area = w * h
        bbox_elem = ET.SubElement(ann_elem, 'bbox')
        ET.SubElement(bbox_elem, 'x').text = str(x)
        ET.SubElement(bbox_elem, 'y').text = str(y)
        ET.SubElement(bbox_elem, 'w').text = str(w)
        ET.SubElement(bbox_elem, 'h').text = str(h)
        ET.SubElement(bbox_elem, 'area').text = str(area)

        points = ann_elem.points
        for i in range(0, len(points), 2):
            point_elem = ET.SubElement(ann_elem, 'point')
            ET.SubElement(point_elem, 'x').text = str(points[i * 2])
            ET.SubElement(point_elem, 'y').text = str(points[i * 2 + 1])
            ET.SubElement(point_elem, 'visible').text = \
                str(ann_elem.visibility[i // 2].name)

        return ann_elem

    @classmethod
    def encode_polyline_object(cls, obj):
        ann_elem = cls.encode_annotation(obj)

        ET.SubElement(ann_elem, 'label_id').text = str(obj.label)

        x, y, w, h = obj.get_bbox()
        area = w * h
        bbox_elem = ET.SubElement(ann_elem, 'bbox')
        ET.SubElement(bbox_elem, 'x').text = str(x)
        ET.SubElement(bbox_elem, 'y').text = str(y)
        ET.SubElement(bbox_elem, 'w').text = str(w)
        ET.SubElement(bbox_elem, 'h').text = str(h)
        ET.SubElement(bbox_elem, 'area').text = str(area)

        points = ann_elem.points
        for i in range(0, len(points), 2):
            point_elem = ET.SubElement(ann_elem, 'point')
            ET.SubElement(point_elem, 'x').text = str(points[i * 2])
            ET.SubElement(point_elem, 'y').text = str(points[i * 2 + 1])

        return ann_elem

    @classmethod
    def encode_caption_object(cls, obj):
        ann_elem = cls.encode_annotation(obj)

        ET.SubElement(ann_elem, 'caption').text = str(obj.caption)

        return ann_elem

    def encode_object(self, o):
        if isinstance(o, LabelObject):
            return self.encode_label_object(o)
        if isinstance(o, MaskObject):
            return self.encode_mask_object(o)
        if isinstance(o, BboxObject):
            return self.encode_bbox_object(o)
        if isinstance(o, PointsObject):
            return self.encode_points_object(o)
        if isinstance(o, PolyLineObject):
            return self.encode_polyline_object(o)
        if isinstance(o, PolygonObject):
            return self.encode_polygon_object(o)
        if isinstance(o, CaptionObject):
            return self.encode_caption_object(o)
        if isinstance(o, Annotation): # keep after derived classes
            return self.encode_annotation(o)

        if isinstance(o, DatasetItem):
            return self.encode_item(o)

        return None

class XPathDatasetFilter:
    def __init__(self, filter_text=None):
        self._filter = None
        if filter_text is not None:
            self._filter = ET.XPath(filter_text)
        self._encoder = DatasetItemEncoder()

    def __call__(self, item):
        encoded_item = self._serialize_item(item)
        if self._filter is None:
            return True
        return bool(self._filter(encoded_item))

    def _serialize_item(self, item):
        return self._encoder.encode_item(item)