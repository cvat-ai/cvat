
# Copyright (C) 2019-2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import logging as log
from lxml import etree as ET # lxml has proper XPath implementation
from datumaro.components.extractor import (Transform,
    Annotation, AnnotationType,
    Label, Mask, Points, Polygon, PolyLine, Bbox, Caption,
)


class DatasetItemEncoder:
    @classmethod
    def encode(cls, item, categories=None):
        item_elem = ET.Element('item')
        ET.SubElement(item_elem, 'id').text = str(item.id)
        ET.SubElement(item_elem, 'subset').text = str(item.subset)
        ET.SubElement(item_elem, 'path').text = str('/'.join(item.path))

        image = item.image
        if image is not None:
            item_elem.append(cls.encode_image(image))

        for ann in item.annotations:
            item_elem.append(cls.encode_annotation(ann, categories))

        return item_elem

    @classmethod
    def encode_image(cls, image):
        image_elem = ET.Element('image')

        size = image.size
        if size is not None:
            h, w = size
        else:
            h = 'unknown'
            w = h
        ET.SubElement(image_elem, 'width').text = str(w)
        ET.SubElement(image_elem, 'height').text = str(h)

        ET.SubElement(image_elem, 'has_data').text = '%d' % int(image.has_data)
        ET.SubElement(image_elem, 'path').text = image.path

        return image_elem

    @classmethod
    def encode_annotation_base(cls, annotation):
        assert isinstance(annotation, Annotation)
        ann_elem = ET.Element('annotation')
        ET.SubElement(ann_elem, 'id').text = str(annotation.id)
        ET.SubElement(ann_elem, 'type').text = str(annotation.type.name)

        for k, v in annotation.attributes.items():
            ET.SubElement(ann_elem, k.replace(' ', '-')).text = str(v)

        ET.SubElement(ann_elem, 'group').text = str(annotation.group)

        return ann_elem

    @staticmethod
    def _get_label(label_id, categories):
        label = ''
        if label_id is None:
            return ''
        if categories is not None:
            label_cat = categories.get(AnnotationType.label)
            if label_cat is not None:
                label = label_cat.items[label_id].name
        return label

    @classmethod
    def encode_label_object(cls, obj, categories):
        ann_elem = cls.encode_annotation_base(obj)

        ET.SubElement(ann_elem, 'label').text = \
            str(cls._get_label(obj.label, categories))
        ET.SubElement(ann_elem, 'label_id').text = str(obj.label)

        return ann_elem

    @classmethod
    def encode_mask_object(cls, obj, categories):
        ann_elem = cls.encode_annotation_base(obj)

        ET.SubElement(ann_elem, 'label').text = \
            str(cls._get_label(obj.label, categories))
        ET.SubElement(ann_elem, 'label_id').text = str(obj.label)

        return ann_elem

    @classmethod
    def encode_bbox_object(cls, obj, categories):
        ann_elem = cls.encode_annotation_base(obj)

        ET.SubElement(ann_elem, 'label').text = \
            str(cls._get_label(obj.label, categories))
        ET.SubElement(ann_elem, 'label_id').text = str(obj.label)
        ET.SubElement(ann_elem, 'x').text = str(obj.x)
        ET.SubElement(ann_elem, 'y').text = str(obj.y)
        ET.SubElement(ann_elem, 'w').text = str(obj.w)
        ET.SubElement(ann_elem, 'h').text = str(obj.h)
        ET.SubElement(ann_elem, 'area').text = str(obj.get_area())

        return ann_elem

    @classmethod
    def encode_points_object(cls, obj, categories):
        ann_elem = cls.encode_annotation_base(obj)

        ET.SubElement(ann_elem, 'label').text = \
            str(cls._get_label(obj.label, categories))
        ET.SubElement(ann_elem, 'label_id').text = str(obj.label)

        x, y, w, h = obj.get_bbox()
        area = w * h
        bbox_elem = ET.SubElement(ann_elem, 'bbox')
        ET.SubElement(bbox_elem, 'x').text = str(x)
        ET.SubElement(bbox_elem, 'y').text = str(y)
        ET.SubElement(bbox_elem, 'w').text = str(w)
        ET.SubElement(bbox_elem, 'h').text = str(h)
        ET.SubElement(bbox_elem, 'area').text = str(area)

        points = obj.points
        for i in range(0, len(points), 2):
            point_elem = ET.SubElement(ann_elem, 'point')
            ET.SubElement(point_elem, 'x').text = str(points[i])
            ET.SubElement(point_elem, 'y').text = str(points[i + 1])
            ET.SubElement(point_elem, 'visible').text = \
                str(obj.visibility[i // 2].name)

        return ann_elem

    @classmethod
    def encode_polygon_object(cls, obj, categories):
        ann_elem = cls.encode_annotation_base(obj)

        ET.SubElement(ann_elem, 'label').text = \
            str(cls._get_label(obj.label, categories))
        ET.SubElement(ann_elem, 'label_id').text = str(obj.label)

        x, y, w, h = obj.get_bbox()
        area = w * h
        bbox_elem = ET.SubElement(ann_elem, 'bbox')
        ET.SubElement(bbox_elem, 'x').text = str(x)
        ET.SubElement(bbox_elem, 'y').text = str(y)
        ET.SubElement(bbox_elem, 'w').text = str(w)
        ET.SubElement(bbox_elem, 'h').text = str(h)
        ET.SubElement(bbox_elem, 'area').text = str(area)

        points = obj.points
        for i in range(0, len(points), 2):
            point_elem = ET.SubElement(ann_elem, 'point')
            ET.SubElement(point_elem, 'x').text = str(points[i])
            ET.SubElement(point_elem, 'y').text = str(points[i + 1])

        return ann_elem

    @classmethod
    def encode_polyline_object(cls, obj, categories):
        ann_elem = cls.encode_annotation_base(obj)

        ET.SubElement(ann_elem, 'label').text = \
            str(cls._get_label(obj.label, categories))
        ET.SubElement(ann_elem, 'label_id').text = str(obj.label)

        x, y, w, h = obj.get_bbox()
        area = w * h
        bbox_elem = ET.SubElement(ann_elem, 'bbox')
        ET.SubElement(bbox_elem, 'x').text = str(x)
        ET.SubElement(bbox_elem, 'y').text = str(y)
        ET.SubElement(bbox_elem, 'w').text = str(w)
        ET.SubElement(bbox_elem, 'h').text = str(h)
        ET.SubElement(bbox_elem, 'area').text = str(area)

        points = obj.points
        for i in range(0, len(points), 2):
            point_elem = ET.SubElement(ann_elem, 'point')
            ET.SubElement(point_elem, 'x').text = str(points[i])
            ET.SubElement(point_elem, 'y').text = str(points[i + 1])

        return ann_elem

    @classmethod
    def encode_caption_object(cls, obj):
        ann_elem = cls.encode_annotation_base(obj)

        ET.SubElement(ann_elem, 'caption').text = str(obj.caption)

        return ann_elem

    @classmethod
    def encode_annotation(cls, o, categories=None):
        if isinstance(o, Label):
            return cls.encode_label_object(o, categories)
        if isinstance(o, Mask):
            return cls.encode_mask_object(o, categories)
        if isinstance(o, Bbox):
            return cls.encode_bbox_object(o, categories)
        if isinstance(o, Points):
            return cls.encode_points_object(o, categories)
        if isinstance(o, PolyLine):
            return cls.encode_polyline_object(o, categories)
        if isinstance(o, Polygon):
            return cls.encode_polygon_object(o, categories)
        if isinstance(o, Caption):
            return cls.encode_caption_object(o)
        raise NotImplementedError("Unexpected annotation object passed: %s" % o)

    @staticmethod
    def to_string(encoded_item):
        return ET.tostring(encoded_item, encoding='unicode', pretty_print=True)

def XPathDatasetFilter(extractor, xpath=None):
    if xpath is None:
        return extractor
    try:
        xpath = ET.XPath(xpath)
    except Exception:
        log.error("Failed to create XPath from expression '%s'", xpath)
        raise
    f = lambda item: bool(xpath(
        DatasetItemEncoder.encode(item, extractor.categories())))
    return extractor.select(f)

class XPathAnnotationsFilter(Transform):
    def __init__(self, extractor, xpath=None, remove_empty=False):
        super().__init__(extractor)

        if xpath is not None:
            try:
                xpath = ET.XPath(xpath)
            except Exception:
                log.error("Failed to create XPath from expression '%s'", xpath)
                raise
        self._filter = xpath

        self._remove_empty = remove_empty

    def __iter__(self):
        for item in self._extractor:
            item = self.transform_item(item)
            if item is not None:
                yield item

    def transform_item(self, item):
        if self._filter is None:
            return item

        encoded = DatasetItemEncoder.encode(item, self._extractor.categories())
        filtered = self._filter(encoded)
        filtered = [elem for elem in filtered if elem.tag == 'annotation']

        encoded = encoded.findall('annotation')
        annotations = [item.annotations[encoded.index(e)] for e in filtered]

        if self._remove_empty and len(annotations) == 0:
            return None
        return self.wrap_item(item, annotations=annotations)