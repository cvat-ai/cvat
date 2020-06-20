
# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

from collections import defaultdict
from defusedxml import ElementTree
import logging as log
import numpy as np
import os
import os.path as osp

from datumaro.components.extractor import (SourceExtractor, DEFAULT_SUBSET_NAME,
    DatasetItem, AnnotationType, Mask, Bbox, Polygon, LabelCategories
)
from datumaro.components.extractor import Importer
from datumaro.components.converter import Converter
from datumaro.components.cli_plugin import CliPlugin
from datumaro.util.image import Image, save_image
from datumaro.util.mask_tools import load_mask, find_mask_bbox


class LabelMePath:
    MASKS_DIR = 'Masks'
    IMAGE_EXT = '.jpg'

class LabelMeExtractor(SourceExtractor):
    def __init__(self, path, subset_name=None):
        assert osp.isdir(path), path
        super().__init__(subset=subset_name)

        items, categories = self._parse(path)
        self._categories = categories
        self._items = items

    def categories(self):
        return self._categories

    def __iter__(self):
        for item in self._items:
            yield item

    def __len__(self):
        return len(self._items)

    def _parse(self, path):
        categories = {
            AnnotationType.label: LabelCategories(attributes={
                'occluded', 'username'
            })
        }

        items = []
        for p in sorted(p for p in os.listdir(path) if p.endswith('.xml')):
            root = ElementTree.parse(osp.join(path, p))

            image_path = osp.join(path, root.find('filename').text)
            image_size = None
            imagesize_elem = root.find('imagesize')
            if imagesize_elem is not None:
                width_elem = imagesize_elem.find('ncols')
                height_elem = imagesize_elem.find('nrows')
                image_size = (int(height_elem.text), int(width_elem.text))
            image = Image(path=image_path, size=image_size)

            annotations = self._parse_annotations(root, path, categories)

            items.append(DatasetItem(id=osp.splitext(p)[0],
                subset=self._subset, image=image, annotations=annotations))
        return items, categories

    @classmethod
    def _parse_annotations(cls, xml_root, dataset_root, categories):
        def parse_attributes(attr_str):
            parsed = []
            if not attr_str:
                return parsed

            for attr in [a.strip() for a in attr_str.split(',') if a.strip()]:
                if '=' in attr:
                    name, value = attr.split('=', maxsplit=1)
                    if value.lower() in {'true', 'false'}:
                        value = value.lower() == 'true'
                    else:
                        try:
                            value = float(value)
                        except Exception:
                            pass
                    parsed.append((name, value))
                else:
                    parsed.append((attr, True))

            return parsed

        label_cat = categories[AnnotationType.label]
        def get_label_id(label):
            if not label:
                return None
            idx, _ = label_cat.find(label)
            if idx is None:
                idx = label_cat.add(label)
            return idx

        image_annotations = []

        parsed_annotations = dict()
        group_assignments = dict()
        root_annotations = set()
        for obj_elem in xml_root.iter('object'):
            obj_id = int(obj_elem.find('id').text)

            ann_items = []

            label = get_label_id(obj_elem.find('name').text)

            attributes = []
            attributes_elem = obj_elem.find('attributes')
            if attributes_elem is not None and attributes_elem.text:
                attributes = parse_attributes(attributes_elem.text)

            occluded = False
            occluded_elem = obj_elem.find('occluded')
            if occluded_elem is not None and occluded_elem.text:
                occluded = (occluded_elem.text == 'yes')
            attributes.append(('occluded', occluded))

            deleted = False
            deleted_elem = obj_elem.find('deleted')
            if deleted_elem is not None and deleted_elem.text:
                deleted = bool(int(deleted_elem.text))

            user = ''

            poly_elem = obj_elem.find('polygon')
            segm_elem = obj_elem.find('segm')
            type_elem = obj_elem.find('type') # the only value is 'bounding_box'
            if poly_elem is not None:
                user_elem = poly_elem.find('username')
                if user_elem is not None and user_elem.text:
                    user = user_elem.text
                attributes.append(('username', user))

                points = []
                for point_elem in poly_elem.iter('pt'):
                    x = float(point_elem.find('x').text)
                    y = float(point_elem.find('y').text)
                    points.append(x)
                    points.append(y)

                if type_elem is not None and type_elem.text == 'bounding_box':
                    xmin = min(points[::2])
                    xmax = max(points[::2])
                    ymin = min(points[1::2])
                    ymax = max(points[1::2])
                    ann_items.append(Bbox(xmin, ymin, xmax - xmin, ymax - ymin,
                        label=label, attributes=attributes, id=obj_id,
                    ))
                else:
                    ann_items.append(Polygon(points,
                        label=label, attributes=attributes, id=obj_id,
                    ))
            elif segm_elem is not None:
                user_elem = segm_elem.find('username')
                if user_elem is not None and user_elem.text:
                    user = user_elem.text
                attributes.append(('username', user))

                mask_path = osp.join(dataset_root, LabelMePath.MASKS_DIR,
                    segm_elem.find('mask').text)
                if not osp.isfile(mask_path):
                    raise Exception("Can't find mask at '%s'" % mask_path)
                mask = load_mask(mask_path)
                mask = np.any(mask, axis=2)
                ann_items.append(Mask(image=mask, label=label, id=obj_id,
                    attributes=attributes))

            if not deleted:
                parsed_annotations[obj_id] = ann_items

            # Find parents and children
            parts_elem = obj_elem.find('parts')
            if parts_elem is not None:
                children_ids = []
                hasparts_elem = parts_elem.find('hasparts')
                if hasparts_elem is not None and hasparts_elem.text:
                    children_ids = [int(c) for c in hasparts_elem.text.split(',')]

                parent_ids = []
                ispartof_elem = parts_elem.find('ispartof')
                if ispartof_elem is not None and ispartof_elem.text:
                    parent_ids = [int(c) for c in ispartof_elem.text.split(',')]

                if children_ids and not parent_ids and hasparts_elem.text:
                    root_annotations.add(obj_id)
                group_assignments[obj_id] = [None, children_ids]

        # assign single group to all grouped annotations
        current_group_id = 0
        annotations_to_visit = list(root_annotations)
        while annotations_to_visit:
            ann_id = annotations_to_visit.pop()
            ann_assignment = group_assignments[ann_id]
            group_id, children_ids = ann_assignment
            if group_id:
                continue

            if ann_id in root_annotations:
                current_group_id += 1 # start a new group

            group_id = current_group_id
            ann_assignment[0] = group_id

            # continue with children
            annotations_to_visit.extend(children_ids)

        assert current_group_id == len(root_annotations)

        for ann_id, ann_items in parsed_annotations.items():
            group_id = 0
            if ann_id in group_assignments:
                ann_assignment = group_assignments[ann_id]
                group_id = ann_assignment[0]

            for ann_item in ann_items:
                if group_id:
                    ann_item.group = group_id

                image_annotations.append(ann_item)

        return image_annotations


class LabelMeImporter(Importer):
    _EXTRACTOR_NAME = 'label_me'

    @classmethod
    def detect(cls, path):
        if not osp.isdir(path):
            return False
        return len(cls.find_subsets(path)) != 0

    def __call__(self, path, **extra_params):
        from datumaro.components.project import Project # cyclic import
        project = Project()

        subset_paths = self.find_subsets(path)
        if len(subset_paths) == 0:
            raise Exception("Failed to find 'label_me' dataset at '%s'" % path)

        for subset_path, subset_name in subset_paths:
            params = {}
            if subset_name:
                params['subset_name'] = subset_name
            params.update(extra_params)

            source_name = osp.splitext(osp.basename(subset_path))[0]
            project.add_source(source_name,
            {
                'url': subset_path,
                'format': self._EXTRACTOR_NAME,
                'options': params,
            })

        return project

    @staticmethod
    def find_subsets(path):
        subset_paths = []
        if not osp.isdir(path):
            raise Exception("Expected directory path, got '%s'" % path)

        path = osp.normpath(path)

        def has_annotations(d):
            return len([p for p in os.listdir(d) if p.endswith('.xml')]) != 0

        if has_annotations(path):
            subset_paths = [(path, None)]
        else:
            for d in os.listdir(path):
                subset = d
                d = osp.join(path, d)
                if osp.isdir(d) and has_annotations(d):
                    subset_paths.append((d, subset))
        return subset_paths


class LabelMeConverter(Converter, CliPlugin):
    @classmethod
    def build_cmdline_parser(cls, **kwargs):
        parser = super().build_cmdline_parser(**kwargs)
        parser.add_argument('--save-images', action='store_true',
            help="Save images (default: %(default)s)")
        return parser

    def __init__(self, save_images=False):
        super().__init__()

        self._save_images = save_images

    def __call__(self, extractor, save_dir):
        self._extractor = extractor

        subsets = extractor.subsets()
        if len(subsets) == 0:
            subsets = [ None ]

        for subset_name in subsets:
            if subset_name:
                subset = extractor.get_subset(subset_name)
            else:
                subset_name = DEFAULT_SUBSET_NAME
                subset = extractor

            subset_dir = osp.join(save_dir, subset_name)
            os.makedirs(subset_dir, exist_ok=True)
            os.makedirs(osp.join(subset_dir, LabelMePath.MASKS_DIR),
                exist_ok=True)

            for item in subset:
                self._save_item(item, subset_dir)

    def _get_label(self, label_id):
        if label_id is None:
            return ''
        return self._extractor.categories()[AnnotationType.label] \
            .items[label_id].name

    def _save_item(self, item, subset_dir):
        from lxml import etree as ET

        log.debug("Converting item '%s'", item.id)

        if '/' in item.id:
            raise Exception("Can't export item '%s': "
                "LabelMe format only supports flat image layout" % item.id)

        image_filename = item.id + LabelMePath.IMAGE_EXT
        if self._save_images:
            if item.has_image and item.image.has_data:
                save_image(osp.join(subset_dir, image_filename),
                    item.image.data, create_dir=True)
            else:
                log.debug("Item '%s' has no image" % item.id)

        root_elem = ET.Element('annotation')
        ET.SubElement(root_elem, 'filename').text = image_filename
        ET.SubElement(root_elem, 'folder').text = ''

        source_elem = ET.SubElement(root_elem, 'source')
        ET.SubElement(source_elem, 'sourceImage').text = ''
        ET.SubElement(source_elem, 'sourceAnnotation').text = 'Datumaro'

        if item.has_image:
            image_elem = ET.SubElement(root_elem, 'imagesize')
            image_size = item.image.size
            ET.SubElement(image_elem, 'nrows').text = str(image_size[0])
            ET.SubElement(image_elem, 'ncols').text = str(image_size[1])

        groups = defaultdict(list)

        obj_id = 0
        for ann in item.annotations:
            if not ann.type in { AnnotationType.polygon,
                    AnnotationType.bbox, AnnotationType.mask }:
                continue

            obj_elem = ET.SubElement(root_elem, 'object')
            ET.SubElement(obj_elem, 'name').text = self._get_label(ann.label)
            ET.SubElement(obj_elem, 'deleted').text = '0'
            ET.SubElement(obj_elem, 'verified').text = '0'
            ET.SubElement(obj_elem, 'occluded').text = \
                'yes' if ann.attributes.pop('occluded', '') == True else 'no'
            ET.SubElement(obj_elem, 'date').text = ''
            ET.SubElement(obj_elem, 'id').text = str(obj_id)

            parts_elem = ET.SubElement(obj_elem, 'parts')
            if ann.group:
                groups[ann.group].append((obj_id, parts_elem))
            else:
                ET.SubElement(parts_elem, 'hasparts').text = ''
                ET.SubElement(parts_elem, 'ispartof').text = ''

            if ann.type == AnnotationType.bbox:
                ET.SubElement(obj_elem, 'type').text = 'bounding_box'

                poly_elem = ET.SubElement(obj_elem, 'polygon')
                x0, y0, x1, y1 = ann.points
                points = [ (x0, y0), (x1, y0), (x1, y1), (x0, y1) ]
                for x, y in points:
                    point_elem = ET.SubElement(poly_elem, 'pt')
                    ET.SubElement(point_elem, 'x').text = '%.2f' % x
                    ET.SubElement(point_elem, 'y').text = '%.2f' % y

                ET.SubElement(poly_elem, 'username').text = \
                    str(ann.attributes.pop('username', ''))
            elif ann.type == AnnotationType.polygon:
                poly_elem = ET.SubElement(obj_elem, 'polygon')
                for x, y in zip(ann.points[::2], ann.points[1::2]):
                    point_elem = ET.SubElement(poly_elem, 'pt')
                    ET.SubElement(point_elem, 'x').text = '%.2f' % x
                    ET.SubElement(point_elem, 'y').text = '%.2f' % y

                ET.SubElement(poly_elem, 'username').text = \
                    str(ann.attributes.pop('username', ''))
            elif ann.type == AnnotationType.mask:
                mask_filename = '%s_mask_%s.png' % (item.id, obj_id)
                save_image(osp.join(subset_dir, LabelMePath.MASKS_DIR,
                        mask_filename),
                    self._paint_mask(ann.image))

                segm_elem = ET.SubElement(obj_elem, 'segm')
                ET.SubElement(segm_elem, 'mask').text = mask_filename

                bbox = find_mask_bbox(ann.image)
                box_elem = ET.SubElement(segm_elem, 'box')
                ET.SubElement(box_elem, 'xmin').text = '%.2f' % bbox[0]
                ET.SubElement(box_elem, 'ymin').text = '%.2f' % bbox[1]
                ET.SubElement(box_elem, 'xmax').text = \
                    '%.2f' % (bbox[0] + bbox[2])
                ET.SubElement(box_elem, 'ymax').text = \
                    '%.2f' % (bbox[1] + bbox[3])

                ET.SubElement(segm_elem, 'username').text = \
                    str(ann.attributes.pop('username', ''))
            else:
                raise NotImplementedError("Unknown shape type '%s'" % ann.type)

            attrs = []
            for k, v in ann.attributes.items():
                attrs.append('%s=%s' % (k, v))
            ET.SubElement(obj_elem, 'attributes').text = ', '.join(attrs)

            obj_id += 1

        for _, group in groups.items():
            leader_id, leader_parts_elem = group[0]
            leader_parts = [str(o_id) for o_id, _ in group[1:]]
            ET.SubElement(leader_parts_elem, 'hasparts').text = \
                ','.join(leader_parts)
            ET.SubElement(leader_parts_elem, 'ispartof').text = ''

            for obj_id, parts_elem in group[1:]:
                ET.SubElement(parts_elem, 'hasparts').text = ''
                ET.SubElement(parts_elem, 'ispartof').text = str(leader_id)

        xml_path = osp.join(subset_dir, '%s.xml' % item.id)
        with open(xml_path, 'w', encoding='utf-8') as f:
            xml_data = ET.tostring(root_elem, encoding='unicode',
                pretty_print=True)
            f.write(xml_data)

    @staticmethod
    def _paint_mask(mask):
        # TODO: check if mask colors are random
        return np.array([[0, 0, 0, 0], [255, 203, 0, 153]],
            dtype=np.uint8)[mask.astype(np.uint8)]