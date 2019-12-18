
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from collections import OrderedDict
import os.path as osp
import xml.etree as ET

from datumaro.components.extractor import (Extractor, DatasetItem,
    DEFAULT_SUBSET_NAME, AnnotationType,
    PointsObject, PolygonObject, PolyLineObject, BboxObject,
    LabelCategories
)
from datumaro.components.formats.cvat import CvatPath
from datumaro.util.image import lazy_image


class CvatExtractor(Extractor):
    _SUPPORTED_SHAPES = ('box', 'polygon', 'polyline', 'points')

    def __init__(self, path):
        super().__init__()

        assert osp.isfile(path)
        rootpath = path.rsplit(CvatPath.ANNOTATIONS_DIR, maxsplit=1)[0]
        self._path = rootpath

        subset = osp.splitext(osp.basename(path))[0]
        if subset == DEFAULT_SUBSET_NAME:
            subset = None
        self._subset = subset

        items, categories = self._parse(path)
        self._items = self._load_items(items)
        self._categories = categories

    def categories(self):
        return self._categories

    def __iter__(self):
        for item in self._items.values():
            yield item

    def __len__(self):
        return len(self._items)

    def subsets(self):
        if self._subset:
            return [self._subset]
        return None

    def get_subset(self, name):
        if name != self._subset:
            return None
        return self

    @classmethod
    def _parse(cls, path):
        context = ET.ElementTree.iterparse(path, events=("start", "end"))
        context = iter(context)

        categories = cls._parse_meta(context)

        items = OrderedDict()

        track = None
        shape = None
        image = None
        for ev, el in context:
            if ev == 'start':
                if el.tag == 'track':
                    track = {
                        'id': el.attrib.get('id'),
                        'label': el.attrib.get('label'),
                        'group': int(el.attrib.get('group_id', 0)),
                    }
                elif el.tag == 'image':
                    image = {
                        'name': el.attrib.get('name'),
                        'frame': el.attrib['id'],
                    }
                elif el.tag in cls._SUPPORTED_SHAPES and (track or image):
                    shape = {
                        'type': None,
                        'attributes': {},
                    }
                    if track:
                        shape.update(track)
                    if image:
                        shape.update(image)
            elif ev == 'end':
                if el.tag == 'attribute' and shape is not None:
                    shape['attributes'][el.attrib['name']] = el.text
                elif el.tag in cls._SUPPORTED_SHAPES:
                    if track is not None:
                        shape['frame'] = el.attrib['frame']
                        shape['outside'] = (el.attrib.get('outside') == '1')
                        shape['keyframe'] = (el.attrib.get('keyframe') == '1')
                    if image is not None:
                        shape['label'] = el.attrib.get('label')
                        shape['group'] = int(el.attrib.get('group_id', 0))

                    shape['type'] = el.tag
                    shape['occluded'] = (el.attrib.get('occluded') == '1')
                    shape['z_order'] = int(el.attrib.get('z_order', 0))

                    if el.tag == 'box':
                        shape['points'] = list(map(float, [
                            el.attrib['xtl'], el.attrib['ytl'],
                            el.attrib['xbr'], el.attrib['ybr'],
                        ]))
                    else:
                        shape['points'] = []
                        for pair in el.attrib['points'].split(';'):
                            shape['points'].extend(map(float, pair.split(',')))

                    frame_desc = items.get(shape['frame'], {
                        'name': shape.get('name'),
                        'annotations': [],
                    })
                    frame_desc['annotations'].append(
                        cls._parse_ann(shape, categories))
                    items[shape['frame']] = frame_desc
                    shape = None

                elif el.tag == 'track':
                    track = None
                elif el.tag == 'image':
                    image = None
                el.clear()

        return items, categories

    @staticmethod
    def _parse_meta(context):
        ev, el = next(context)
        if not (ev == 'start' and el.tag == 'annotations'):
            raise Exception("Unexpected token ")

        categories = {}

        has_z_order = False
        mode = 'annotation'
        labels = OrderedDict()
        label = None

        # Recursive descent parser
        el = None
        states = ['annotations']
        def accepted(expected_state, tag, next_state=None):
            state = states[-1]
            if state == expected_state and el is not None and el.tag == tag:
                if not next_state:
                    next_state = tag
                states.append(next_state)
                return True
            return False
        def consumed(expected_state, tag):
            state = states[-1]
            if state == expected_state and el is not None and el.tag == tag:
                states.pop()
                return True
            return False

        for ev, el in context:
            if ev == 'start':
                if accepted('annotations', 'meta'): pass
                elif accepted('meta', 'task'): pass
                elif accepted('task', 'z_order'): pass
                elif accepted('task', 'labels'): pass
                elif accepted('labels', 'label'):
                    label = { 'name': None, 'attributes': set() }
                elif accepted('label', 'name', next_state='label_name'): pass
                elif accepted('label', 'attributes'): pass
                elif accepted('attributes', 'attribute'): pass
                elif accepted('attribute', 'name', next_state='attr_name'): pass
                elif accepted('annotations', 'image') or \
                     accepted('annotations', 'track') or \
                     accepted('annotations', 'tag'):
                    break
                else:
                    pass
            elif ev == 'end':
                if consumed('meta', 'meta'):
                    break
                elif consumed('task', 'task'): pass
                elif consumed('z_order', 'z_order'):
                    has_z_order = (el.text == 'True')
                elif consumed('label_name', 'name'):
                    label['name'] = el.text
                elif consumed('attr_name', 'name'):
                    label['attributes'].add(el.text)
                elif consumed('attribute', 'attribute'): pass
                elif consumed('attributes', 'attributes'): pass
                elif consumed('label', 'label'):
                    labels[label['name']] = label['attributes']
                    label = None
                elif consumed('labels', 'labels'): pass
                else:
                    pass

        assert len(states) == 1 and states[0] == 'annotations', \
            "Expected 'meta' section in the annotation file, path: %s" % states

        common_attrs = ['occluded']
        if has_z_order:
            common_attrs.append('z_order')
        if mode == 'interpolation':
            common_attrs.append('keyframe')
            common_attrs.append('outside')

        label_cat = LabelCategories(attributes=common_attrs)
        for label, attrs in labels.items():
            label_cat.add(label, attributes=attrs)

        categories[AnnotationType.label] = label_cat

        return categories

    @classmethod
    def _parse_ann(cls, ann, categories):
        ann_id = ann.get('id')
        ann_type = ann['type']

        attributes = ann.get('attributes', {})
        if 'occluded' in categories[AnnotationType.label].attributes:
            attributes['occluded'] = ann.get('occluded', False)
        if 'z_order' in categories[AnnotationType.label].attributes:
            attributes['z_order'] = ann.get('z_order', 0)
        if 'outside' in categories[AnnotationType.label].attributes:
            attributes['outside'] = ann.get('outside', False)
        if 'keyframe' in categories[AnnotationType.label].attributes:
            attributes['keyframe'] = ann.get('keyframe', False)

        group = ann.get('group')
        if group == 0:
            group = None

        label = ann.get('label')
        label_id = categories[AnnotationType.label].find(label)[0]

        points = ann.get('points', [])

        if ann_type == 'polyline':
            return PolyLineObject(points, label=label_id,
                id=ann_id, attributes=attributes, group=group)

        elif ann_type == 'polygon':
            return PolygonObject(points, label=label_id,
                id=ann_id, attributes=attributes, group=group)

        elif ann_type == 'points':
            return PointsObject(points, label=label_id,
                id=ann_id, attributes=attributes, group=group)

        elif ann_type == 'box':
            x, y = points[0], points[1]
            w, h = points[2] - x, points[3] - y
            return BboxObject(x, y, w, h, label=label_id,
                id=ann_id, attributes=attributes, group=group)

        else:
            raise NotImplementedError("Unknown annotation type '%s'" % ann_type)

    def _load_items(self, parsed):
        for item_id, item_desc in parsed.items():
            file_name = item_desc.get('name')
            if not file_name:
                file_name = item_id
            file_name += CvatPath.IMAGE_EXT
            image = self._find_image(file_name)

            parsed[item_id] = DatasetItem(id=item_id, subset=self._subset,
                image=image, annotations=item_desc.get('annotations', None))
        return parsed

    def _find_image(self, file_name):
        images_dir = osp.join(self._path, CvatPath.IMAGES_DIR)
        search_paths = [
            osp.join(images_dir, file_name),
            osp.join(images_dir, self._subset or DEFAULT_SUBSET_NAME, file_name),
        ]
        for image_path in search_paths:
            if osp.exists(image_path):
                return lazy_image(image_path)