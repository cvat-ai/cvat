
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from lxml import etree as ET
from datumaro.components.extractor import *


def _cast(value, type, default=None):
    try:
        return type(value)
    except Exception as e:
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

    def encode_image(self, image):
        image_elem = ET.Element('image')

        h, w, c = image.shape
        ET.SubElement(image_elem, 'width').text = str(w)
        ET.SubElement(image_elem, 'height').text = str(h)
        ET.SubElement(image_elem, 'depth').text = str(c)

        return image_elem

    def encode_annotation(self, annotation):
        ann_elem = ET.Element('annotation')
        ET.SubElement(ann_elem, 'id').text = str(annotation.id)
        ET.SubElement(ann_elem, 'type').text = str(annotation.type.name)

        for k, v in annotation.attributes.items():
            ET.SubElement(ann_elem, k).text = str(v)

        ET.SubElement(ann_elem, 'group').text = str(annotation.group)

        return ann_elem

    def encode_label_object(self, obj):
        assert isinstance(obj, Annotation)
        ann_elem = self.encode_annotation(obj)

        ET.SubElement(ann_elem, 'label_id').text = str(obj.label)

        return ann_elem

    def encode_mask_object(self, obj):
        assert isinstance(obj, Annotation)
        ann_elem = self.encode_annotation(obj)

        ET.SubElement(ann_elem, 'label_id').text = str(obj.label)

        mask = obj.image
        if mask is not None:
            ann_elem.append(self.encode_image(mask))

        return ann_elem

    def encode_bbox_object(self, obj):
        assert isinstance(obj, Annotation)
        ann_elem = self.encode_annotation(obj)

        ET.SubElement(ann_elem, 'label_id').text = str(obj.label)
        ET.SubElement(ann_elem, 'x').text = str(obj.x)
        ET.SubElement(ann_elem, 'y').text = str(obj.y)
        ET.SubElement(ann_elem, 'w').text = str(obj.w)
        ET.SubElement(ann_elem, 'h').text = str(obj.h)
        ET.SubElement(ann_elem, 'area').text = str(obj.area())

        return ann_elem

    def encode_keypoints_object(self, obj):
        assert isinstance(obj, Annotation)
        ann_elem = self.encode_annotation(obj)

        x, y, w, h = obj.get_bbox()
        area = w * h
        ET.SubElement(ann_elem, 'label_id').text = str(obj.label)
        ET.SubElement(ann_elem, 'x').text = str(x)
        ET.SubElement(ann_elem, 'y').text = str(y)
        ET.SubElement(ann_elem, 'w').text = str(w)
        ET.SubElement(ann_elem, 'h').text = str(h)
        ET.SubElement(ann_elem, 'area').text = str(area)

        for point in ann_elem.points:
            point_elem = ET.SubElement(ann_elem, 'point')
            ET.SubElement(point_elem, 'x').text = str(point[0])
            ET.SubElement(point_elem, 'y').text = str(point[1])
            ET.SubElement(point_elem, 'visible').text = str(point[2])

        return ann_elem

    def encode_caption_object(self, obj):
        assert isinstance(obj, Annotation)
        ann_elem = self.encode_annotation(obj)

        ET.SubElement(ann_elem, 'caption').text = str(obj.caption)

        return ann_elem

    def encode_object(self, o):
        if isinstance(o, LabelObject):
            return self.encode_label_object(o)
        if isinstance(o, MaskObject):
            return self.encode_mask_object(o)
        if isinstance(o, BboxObject):
            return self.encode_bbox_object(o)
        if isinstance(o, KeypointsObject):
            return self.encode_keypoints_object(o)
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