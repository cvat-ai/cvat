
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from collections import OrderedDict
import os.path as osp
from defusedxml import ElementTree

from datumaro.components.extractor import (SourceExtractor,
    DEFAULT_SUBSET_NAME, DatasetItem,
    AnnotationType, Points, Polygon, PolyLine, Bbox, Label,
    LabelCategories
)
from datumaro.util.image import Image

from .format import CvatPath


class CvatExtractor(SourceExtractor):
    _SUPPORTED_SHAPES = ('box', 'polygon', 'polyline', 'points')

    def __init__(self, path):
        super().__init__()

        assert osp.isfile(path)
        rootpath = ''
        if path.endswith(osp.join(CvatPath.ANNOTATIONS_DIR, osp.basename(path))):
            rootpath = path.rsplit(CvatPath.ANNOTATIONS_DIR, maxsplit=1)[0]
        images_dir = ''
        if rootpath and osp.isdir(osp.join(rootpath, CvatPath.IMAGES_DIR)):
            images_dir = osp.join(rootpath, CvatPath.IMAGES_DIR)
        self._images_dir = images_dir
        self._path = path

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
        context = ElementTree.iterparse(path, events=("start", "end"))
        context = iter(context)

        categories, frame_size = cls._parse_meta(context)

        items = OrderedDict()

        track = None
        shape = None
        tag = None
        attributes = None
        image = None
        for ev, el in context:
            if ev == 'start':
                if el.tag == 'track':
                    track = {
                        'id': el.attrib.get('id'),
                        'label': el.attrib.get('label'),
                        'group': int(el.attrib.get('group_id', 0)),
                        'height': frame_size[0],
                        'width': frame_size[1],
                    }
                elif el.tag == 'image':
                    image = {
                        'name': el.attrib.get('name'),
                        'frame': el.attrib['id'],
                        'width': el.attrib.get('width'),
                        'height': el.attrib.get('height'),
                    }
                elif el.tag in cls._SUPPORTED_SHAPES and (track or image):
                    attributes = {}
                    shape = {
                        'type': None,
                        'attributes': attributes,
                    }
                    if track:
                        shape.update(track)
                    if image:
                        shape.update(image)
                elif el.tag == 'tag' and image:
                    attributes = {}
                    tag = {
                        'frame': image['frame'],
                        'attributes': attributes,
                        'group': int(el.attrib.get('group_id', 0)),
                        'label': el.attrib['label'],
                    }
            elif ev == 'end':
                if el.tag == 'attribute' and attributes is not None:
                    attr_value = el.text
                    if el.text in ['true', 'false']:
                        attr_value = attr_value == 'true'
                    else:
                        try:
                            attr_value = float(attr_value)
                        except Exception:
                            pass
                    attributes[el.attrib['name']] = attr_value
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

                    frame_desc = items.get(shape['frame'], {'annotations': []})
                    frame_desc['annotations'].append(
                        cls._parse_shape_ann(shape, categories))
                    items[shape['frame']] = frame_desc
                    shape = None

                elif el.tag == 'tag':
                    frame_desc = items.get(tag['frame'], {'annotations': []})
                    frame_desc['annotations'].append(
                        cls._parse_tag_ann(tag, categories))
                    items[tag['frame']] = frame_desc
                    tag = None
                elif el.tag == 'track':
                    track = None
                elif el.tag == 'image':
                    frame_desc = items.get(image['frame'], {'annotations': []})
                    frame_desc.update({
                        'name': image.get('name'),
                        'height': image.get('height'),
                        'width': image.get('width'),
                    })
                    items[image['frame']] = frame_desc
                    image = None
                el.clear()

        return items, categories

    @staticmethod
    def _parse_meta(context):
        ev, el = next(context)
        if not (ev == 'start' and el.tag == 'annotations'):
            raise Exception("Unexpected token ")

        categories = {}

        frame_size = None
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
                elif accepted('task', 'original_size'):
                    frame_size = [None, None]
                elif accepted('original_size', 'height', next_state='frame_height'): pass
                elif accepted('original_size', 'width', next_state='frame_width'): pass
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
                elif consumed('original_size', 'original_size'): pass
                elif consumed('frame_height', 'height'):
                    frame_size[0] = int(el.text)
                elif consumed('frame_width', 'width'):
                    frame_size[1] = int(el.text)
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

        return categories, frame_size

    @classmethod
    def _parse_shape_ann(cls, ann, categories):
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

        label = ann.get('label')
        label_id = categories[AnnotationType.label].find(label)[0]

        points = ann.get('points', [])

        if ann_type == 'polyline':
            return PolyLine(points, label=label_id,
                id=ann_id, attributes=attributes, group=group)

        elif ann_type == 'polygon':
            return Polygon(points, label=label_id,
                id=ann_id, attributes=attributes, group=group)

        elif ann_type == 'points':
            return Points(points, label=label_id,
                id=ann_id, attributes=attributes, group=group)

        elif ann_type == 'box':
            x, y = points[0], points[1]
            w, h = points[2] - x, points[3] - y
            return Bbox(x, y, w, h, label=label_id,
                id=ann_id, attributes=attributes, group=group)

        else:
            raise NotImplementedError("Unknown annotation type '%s'" % ann_type)

    @classmethod
    def _parse_tag_ann(cls, ann, categories):
        label = ann.get('label')
        label_id = categories[AnnotationType.label].find(label)[0]
        group = ann.get('group')
        attributes = ann.get('attributes')
        return Label(label_id, attributes=attributes, group=group)

    def _load_items(self, parsed):
        for frame_id, item_desc in parsed.items():
            filename = item_desc.get('name')
            if filename:
                filename = self._find_image(filename)
            if not filename:
                filename = item_desc.get('name')
            image_size = (item_desc.get('height'), item_desc.get('width'))
            if all(image_size):
                image_size = (int(image_size[0]), int(image_size[1]))
            else:
                image_size = None
            image = None
            if filename:
                image = Image(path=filename, size=image_size)

            parsed[frame_id] = DatasetItem(id=frame_id, subset=self._subset,
                image=image, annotations=item_desc.get('annotations'))
        return parsed

    def _find_image(self, file_name):
        search_paths = []
        if self._images_dir:
            search_paths += [
                osp.join(self._images_dir, file_name),
                osp.join(self._images_dir, self._subset or DEFAULT_SUBSET_NAME,
                    file_name),
            ]
        search_paths += [
            osp.join(osp.dirname(self._path), file_name)
        ]
        for image_path in search_paths:
            if osp.isfile(image_path):
                return image_path
        return None
