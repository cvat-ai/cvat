
# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import logging as log
import os
import os.path as osp
from collections import OrderedDict, defaultdict
from enum import Enum
from itertools import chain

from lxml import etree as ET

from datumaro.components.converter import Converter
from datumaro.components.extractor import (DEFAULT_SUBSET_NAME, AnnotationType,
    CompiledMask, LabelCategories)
from datumaro.util import find, str_to_bool
from datumaro.util.image import save_image
from datumaro.util.mask_tools import paint_mask, remap_mask

from .format import (VocTask, VocPath, VocInstColormap,
    parse_label_map, make_voc_label_map, make_voc_categories, write_label_map
)


def _convert_attr(name, attributes, type_conv, default=None, warn=True):
    d = object()
    value = attributes.get(name, d)
    if value is d:
        return default

    try:
        return type_conv(value)
    except Exception as e:
        log.warning("Failed to convert attribute '%s'='%s': %s" % \
            (name, value, e))
        return default

def _write_xml_bbox(bbox, parent_elem):
    x, y, w, h = bbox
    bbox_elem = ET.SubElement(parent_elem, 'bndbox')
    ET.SubElement(bbox_elem, 'xmin').text = str(x)
    ET.SubElement(bbox_elem, 'ymin').text = str(y)
    ET.SubElement(bbox_elem, 'xmax').text = str(x + w)
    ET.SubElement(bbox_elem, 'ymax').text = str(y + h)
    return bbox_elem


LabelmapType = Enum('LabelmapType', ['voc', 'source'])

class VocConverter(Converter):
    DEFAULT_IMAGE_EXT = VocPath.IMAGE_EXT

    @staticmethod
    def _split_tasks_string(s):
        return [VocTask[i.strip()] for i in s.split(',')]

    @staticmethod
    def _get_labelmap(s):
        if osp.isfile(s):
            return s
        try:
            return LabelmapType[s].name
        except KeyError:
            import argparse
            raise argparse.ArgumentTypeError()

    @classmethod
    def build_cmdline_parser(cls, **kwargs):
        parser = super().build_cmdline_parser(**kwargs)

        parser.add_argument('--apply-colormap', type=str_to_bool, default=True,
            help="Use colormap for class and instance masks "
                "(default: %(default)s)")
        parser.add_argument('--label-map', type=cls._get_labelmap, default=None,
            help="Labelmap file path or one of %s" % \
                ', '.join(t.name for t in LabelmapType))
        parser.add_argument('--allow-attributes',
            type=str_to_bool, default=True,
            help="Allow export of attributes (default: %(default)s)")
        parser.add_argument('--tasks', type=cls._split_tasks_string,
            help="VOC task filter, comma-separated list of {%s} "
                "(default: all)" % ', '.join(t.name for t in VocTask))

        return parser

    def __init__(self, extractor, save_dir,
            tasks=None, apply_colormap=True, label_map=None,
            allow_attributes=True, **kwargs):
        super().__init__(extractor, save_dir, **kwargs)

        assert tasks is None or isinstance(tasks, (VocTask, list, set))
        if tasks is None:
            tasks = set(VocTask)
        elif isinstance(tasks, VocTask):
            tasks = {tasks}
        else:
            tasks = set(t if t in VocTask else VocTask[t] for t in tasks)
        self._tasks = tasks

        self._apply_colormap = apply_colormap
        self._allow_attributes = allow_attributes

        if label_map is None:
            label_map = LabelmapType.source
        self._load_categories(label_map)

    def apply(self):
        self.make_dirs()
        self.save_subsets()
        self.save_label_map()

    def make_dirs(self):
        save_dir = self._save_dir
        subsets_dir = osp.join(save_dir, VocPath.SUBSETS_DIR)
        cls_subsets_dir = osp.join(subsets_dir,
            VocPath.TASK_DIR[VocTask.classification])
        action_subsets_dir = osp.join(subsets_dir,
            VocPath.TASK_DIR[VocTask.action_classification])
        layout_subsets_dir = osp.join(subsets_dir,
            VocPath.TASK_DIR[VocTask.person_layout])
        segm_subsets_dir = osp.join(subsets_dir,
            VocPath.TASK_DIR[VocTask.segmentation])
        ann_dir = osp.join(save_dir, VocPath.ANNOTATIONS_DIR)
        img_dir = osp.join(save_dir, VocPath.IMAGES_DIR)
        segm_dir = osp.join(save_dir, VocPath.SEGMENTATION_DIR)
        inst_dir = osp.join(save_dir, VocPath.INSTANCES_DIR)
        images_dir = osp.join(save_dir, VocPath.IMAGES_DIR)

        os.makedirs(subsets_dir, exist_ok=True)
        os.makedirs(ann_dir, exist_ok=True)
        os.makedirs(img_dir, exist_ok=True)
        os.makedirs(segm_dir, exist_ok=True)
        os.makedirs(inst_dir, exist_ok=True)
        os.makedirs(images_dir, exist_ok=True)

        self._subsets_dir = subsets_dir
        self._cls_subsets_dir = cls_subsets_dir
        self._action_subsets_dir = action_subsets_dir
        self._layout_subsets_dir = layout_subsets_dir
        self._segm_subsets_dir = segm_subsets_dir
        self._ann_dir = ann_dir
        self._img_dir = img_dir
        self._segm_dir = segm_dir
        self._inst_dir = inst_dir
        self._images_dir = images_dir

    def get_label(self, label_id):
        return self._extractor. \
            categories()[AnnotationType.label].items[label_id].name

    def save_subsets(self):
        for subset_name in self._extractor.subsets() or [None]:
            if subset_name:
                subset = self._extractor.get_subset(subset_name)
            else:
                subset_name = DEFAULT_SUBSET_NAME
                subset = self._extractor

            class_lists = OrderedDict()
            clsdet_list = OrderedDict()
            action_list = OrderedDict()
            layout_list = OrderedDict()
            segm_list = OrderedDict()

            for item in subset:
                log.debug("Converting item '%s'", item.id)

                image_filename = self._make_image_filename(item)
                if self._save_images:
                    if item.has_image and item.image.has_data:
                        self._save_image(item,
                            osp.join(self._images_dir, image_filename))
                    else:
                        log.debug("Item '%s' has no image", item.id)

                labels = []
                bboxes = []
                masks = []
                for a in item.annotations:
                    if a.type == AnnotationType.label:
                        labels.append(a)
                    elif a.type == AnnotationType.bbox:
                        bboxes.append(a)
                    elif a.type == AnnotationType.mask:
                        masks.append(a)

                if self._tasks is None and bboxes or \
                        self._tasks & {VocTask.detection, VocTask.person_layout,
                            VocTask.action_classification}:
                    root_elem = ET.Element('annotation')
                    if '_' in item.id:
                        folder = item.id[ : item.id.find('_')]
                    else:
                        folder = ''
                    ET.SubElement(root_elem, 'folder').text = folder
                    ET.SubElement(root_elem, 'filename').text = image_filename

                    source_elem = ET.SubElement(root_elem, 'source')
                    ET.SubElement(source_elem, 'database').text = 'Unknown'
                    ET.SubElement(source_elem, 'annotation').text = 'Unknown'
                    ET.SubElement(source_elem, 'image').text = 'Unknown'

                    if item.has_image:
                        h, w = item.image.size
                        if item.image.has_data:
                            image_shape = item.image.data.shape
                            c = 1 if len(image_shape) == 2 else image_shape[2]
                        else:
                            c = 3
                        size_elem = ET.SubElement(root_elem, 'size')
                        ET.SubElement(size_elem, 'width').text = str(w)
                        ET.SubElement(size_elem, 'height').text = str(h)
                        ET.SubElement(size_elem, 'depth').text = str(c)

                    item_segmented = 0 < len(masks)
                    ET.SubElement(root_elem, 'segmented').text = \
                        str(int(item_segmented))

                    objects_with_parts = []
                    objects_with_actions = defaultdict(dict)

                    main_bboxes = []
                    layout_bboxes = []
                    for bbox in bboxes:
                        label = self.get_label(bbox.label)
                        if self._is_part(label):
                            layout_bboxes.append(bbox)
                        elif self._is_label(label):
                            main_bboxes.append(bbox)

                    for new_obj_id, obj in enumerate(main_bboxes):
                        attr = obj.attributes

                        obj_elem = ET.SubElement(root_elem, 'object')

                        obj_label = self.get_label(obj.label)
                        ET.SubElement(obj_elem, 'name').text = obj_label

                        if 'pose' in attr:
                            ET.SubElement(obj_elem, 'pose').text = \
                                str(attr['pose'])

                        if 'truncated' in attr:
                            truncated = _convert_attr('truncated', attr, int, 0)
                            ET.SubElement(obj_elem, 'truncated').text = \
                                '%d' % truncated

                        if 'difficult' in attr:
                            difficult = _convert_attr('difficult', attr, int, 0)
                            ET.SubElement(obj_elem, 'difficult').text = \
                                '%d' % difficult

                        if 'occluded' in attr:
                            occluded = _convert_attr('occluded', attr, int, 0)
                            ET.SubElement(obj_elem, 'occluded').text = \
                                '%d' % occluded

                        bbox = obj.get_bbox()
                        if bbox is not None:
                            _write_xml_bbox(bbox, obj_elem)

                        for part_bbox in filter(
                                lambda x: obj.group and obj.group == x.group,
                                layout_bboxes):
                            part_elem = ET.SubElement(obj_elem, 'part')
                            ET.SubElement(part_elem, 'name').text = \
                                self.get_label(part_bbox.label)
                            _write_xml_bbox(part_bbox.get_bbox(), part_elem)

                            objects_with_parts.append(new_obj_id)

                        label_actions = self._get_actions(obj_label)
                        actions_elem = ET.Element('actions')
                        for action in label_actions:
                            present = 0
                            if action in attr:
                                present = _convert_attr(action, attr,
                                    lambda v: int(v == True), 0)
                                ET.SubElement(actions_elem, action).text = \
                                    '%d' % present

                            objects_with_actions[new_obj_id][action] = present
                        if len(actions_elem) != 0:
                            obj_elem.append(actions_elem)

                        if self._allow_attributes:
                            native_attrs = {'difficult', 'pose',
                                'truncated', 'occluded' }
                            native_attrs.update(label_actions)

                            attrs_elem = ET.Element('attributes')
                            for k, v in attr.items():
                                if k in native_attrs:
                                    continue
                                attr_elem = ET.SubElement(attrs_elem, 'attribute')
                                ET.SubElement(attr_elem, 'name').text = str(k)
                                ET.SubElement(attr_elem, 'value').text = str(v)
                            if len(attrs_elem):
                                obj_elem.append(attrs_elem)

                    if self._tasks & {VocTask.detection, VocTask.person_layout,
                            VocTask.action_classification}:
                        ann_path = osp.join(self._ann_dir, item.id + '.xml')
                        os.makedirs(osp.dirname(ann_path), exist_ok=True)
                        with open(ann_path, 'w') as f:
                            f.write(ET.tostring(root_elem,
                                encoding='unicode', pretty_print=True))

                    clsdet_list[item.id] = True
                    layout_list[item.id] = objects_with_parts
                    action_list[item.id] = objects_with_actions

                for label_ann in labels:
                    label = self.get_label(label_ann.label)
                    if not self._is_label(label):
                        continue
                    class_list = class_lists.get(item.id, set())
                    class_list.add(label_ann.label)
                    class_lists[item.id] = class_list

                    clsdet_list[item.id] = True

                if masks:
                    compiled_mask = CompiledMask.from_instance_masks(masks,
                        instance_labels=[self._label_id_mapping(m.label)
                            for m in masks])

                    self.save_segm(
                        osp.join(self._segm_dir, item.id + VocPath.SEGM_EXT),
                        compiled_mask.class_mask)
                    self.save_segm(
                        osp.join(self._inst_dir, item.id + VocPath.SEGM_EXT),
                        compiled_mask.instance_mask,
                        colormap=VocInstColormap)

                    segm_list[item.id] = True

                if len(item.annotations) == 0:
                    clsdet_list[item.id] = None
                    layout_list[item.id] = None
                    action_list[item.id] = None
                    segm_list[item.id] = None

                if self._tasks & {VocTask.classification, VocTask.detection,
                        VocTask.action_classification, VocTask.person_layout}:
                    self.save_clsdet_lists(subset_name, clsdet_list)
                    if self._tasks & {VocTask.classification}:
                        self.save_class_lists(subset_name, class_lists)
                if self._tasks & {VocTask.action_classification}:
                    self.save_action_lists(subset_name, action_list)
                if self._tasks & {VocTask.person_layout}:
                    self.save_layout_lists(subset_name, layout_list)
                if self._tasks & {VocTask.segmentation}:
                    self.save_segm_lists(subset_name, segm_list)

    def save_action_lists(self, subset_name, action_list):
        if not action_list:
            return

        os.makedirs(self._action_subsets_dir, exist_ok=True)

        ann_file = osp.join(self._action_subsets_dir, subset_name + '.txt')
        with open(ann_file, 'w') as f:
            for item in action_list:
                f.write('%s\n' % item)

        if len(action_list) == 0:
            return

        all_actions = set(chain(*(self._get_actions(l)
            for l in self._label_map)))
        for action in all_actions:
            ann_file = osp.join(self._action_subsets_dir,
                '%s_%s.txt' % (action, subset_name))
            with open(ann_file, 'w') as f:
                for item, objs in action_list.items():
                    if not objs:
                        continue
                    for obj_id, obj_actions in objs.items():
                        presented = obj_actions[action]
                        f.write('%s %s % d\n' % \
                            (item, 1 + obj_id, 1 if presented else -1))

    def save_class_lists(self, subset_name, class_lists):
        if not class_lists:
            return

        os.makedirs(self._cls_subsets_dir, exist_ok=True)

        for label in self._label_map:
            ann_file = osp.join(self._cls_subsets_dir,
                '%s_%s.txt' % (label, subset_name))
            with open(ann_file, 'w') as f:
                for item, item_labels in class_lists.items():
                    if not item_labels:
                        continue
                    item_labels = [self.get_label(l) for l in item_labels]
                    presented = label in item_labels
                    f.write('%s % d\n' % (item, 1 if presented else -1))

    def save_clsdet_lists(self, subset_name, clsdet_list):
        if not clsdet_list:
            return

        os.makedirs(self._cls_subsets_dir, exist_ok=True)

        ann_file = osp.join(self._cls_subsets_dir, subset_name + '.txt')
        with open(ann_file, 'w') as f:
            for item in clsdet_list:
                f.write('%s\n' % item)

    def save_segm_lists(self, subset_name, segm_list):
        if not segm_list:
            return

        os.makedirs(self._segm_subsets_dir, exist_ok=True)

        ann_file = osp.join(self._segm_subsets_dir, subset_name + '.txt')
        with open(ann_file, 'w') as f:
            for item in segm_list:
                f.write('%s\n' % item)

    def save_layout_lists(self, subset_name, layout_list):
        if not layout_list:
            return

        os.makedirs(self._layout_subsets_dir, exist_ok=True)

        ann_file = osp.join(self._layout_subsets_dir, subset_name + '.txt')
        with open(ann_file, 'w') as f:
            for item, item_layouts in layout_list.items():
                if item_layouts:
                    for obj_id in item_layouts:
                        f.write('%s % d\n' % (item, 1 + obj_id))
                else:
                    f.write('%s\n' % (item))

    def save_segm(self, path, mask, colormap=None):
        if self._apply_colormap:
            if colormap is None:
                colormap = self._categories[AnnotationType.mask].colormap
            mask = paint_mask(mask, colormap)
        save_image(path, mask, create_dir=True)

    def save_label_map(self):
        path = osp.join(self._save_dir, VocPath.LABELMAP_FILE)
        write_label_map(path, self._label_map)

    def _load_categories(self, label_map_source):
        if label_map_source == LabelmapType.voc.name:
            # use the default VOC colormap
            label_map = make_voc_label_map()

        elif label_map_source == LabelmapType.source.name and \
                AnnotationType.mask not in self._extractor.categories():
            # generate colormap for input labels
            labels = self._extractor.categories() \
                .get(AnnotationType.label, LabelCategories())
            label_map = OrderedDict((item.name, [None, [], []])
                for item in labels.items)

        elif label_map_source == LabelmapType.source.name and \
                AnnotationType.mask in self._extractor.categories():
            # use source colormap
            labels = self._extractor.categories()[AnnotationType.label]
            colors = self._extractor.categories()[AnnotationType.mask]
            label_map = OrderedDict()
            for idx, item in enumerate(labels.items):
                color = colors.colormap.get(idx)
                if color is not None:
                    label_map[item.name] = [color, [], []]

        elif isinstance(label_map_source, dict):
            label_map = OrderedDict(
                sorted(label_map_source.items(), key=lambda e: e[0]))

        elif isinstance(label_map_source, str) and osp.isfile(label_map_source):
            label_map = parse_label_map(label_map_source)

        else:
            raise Exception("Wrong labelmap specified, "
                "expected one of %s or a file path" % \
                ', '.join(t.name for t in LabelmapType))

        # There must always be a label with color (0, 0, 0) at index 0
        bg_label = find(label_map.items(), lambda x: x[1][0] == (0, 0, 0))
        if bg_label is not None:
            bg_label = bg_label[0]
        else:
            bg_label = 'background'
            if bg_label not in label_map:
                has_colors = any(v[0] is not None for v in label_map.values())
                color = (0, 0, 0) if has_colors else None
                label_map[bg_label] = [color, [], []]
        label_map.move_to_end(bg_label, last=False)

        self._categories = make_voc_categories(label_map)

        # Update colors with assigned values
        colormap = self._categories[AnnotationType.mask].colormap
        for label_id, color in colormap.items():
            label_desc = label_map[
                self._categories[AnnotationType.label].items[label_id].name]
            label_desc[0] = color

        self._label_map = label_map
        self._label_id_mapping = self._make_label_id_map()

    def _is_label(self, s):
        return self._label_map.get(s) is not None

    def _is_part(self, s):
        for label_desc in self._label_map.values():
            if s in label_desc[1]:
                return True
        return False

    def _is_action(self, label, s):
        return s in self._get_actions(label)

    def _get_actions(self, label):
        label_desc = self._label_map.get(label)
        if not label_desc:
            return []
        return label_desc[2]

    def _make_label_id_map(self):
        source_labels = {
            id: label.name for id, label in
            enumerate(self._extractor.categories().get(
                AnnotationType.label, LabelCategories()).items)
        }
        target_labels = {
            label.name: id for id, label in
            enumerate(self._categories[AnnotationType.label].items)
        }
        id_mapping = {
            src_id: target_labels.get(src_label, 0)
            for src_id, src_label in source_labels.items()
        }

        void_labels = [src_label for src_id, src_label in source_labels.items()
            if src_label not in target_labels]
        if void_labels:
            log.warning("The following labels are remapped to background: %s" %
                ', '.join(void_labels))
        log.debug("Saving segmentations with the following label mapping: \n%s" %
            '\n'.join(["#%s '%s' -> #%s '%s'" %
                (
                    src_id, src_label, id_mapping[src_id],
                    self._categories[AnnotationType.label] \
                        .items[id_mapping[src_id]].name
                )
                for src_id, src_label in source_labels.items()
            ])
        )

        def map_id(src_id):
            return id_mapping.get(src_id, 0)
        return map_id

    def _remap_mask(self, mask):
        return remap_mask(mask, self._label_id_mapping)

class VocClassificationConverter(VocConverter):
    def __init__(self, *args, **kwargs):
        kwargs['tasks'] = VocTask.classification
        super().__init__(*args, **kwargs)

class VocDetectionConverter(VocConverter):
    def __init__(self, *args, **kwargs):
        kwargs['tasks'] = VocTask.detection
        super().__init__(*args, **kwargs)

class VocLayoutConverter(VocConverter):
    def __init__(self, *args, **kwargs):
        kwargs['tasks'] = VocTask.person_layout
        super().__init__(*args, **kwargs)

class VocActionConverter(VocConverter):
    def __init__(self, *args, **kwargs):
        kwargs['tasks'] = VocTask.action_classification
        super().__init__(*args, **kwargs)

class VocSegmentationConverter(VocConverter):
    def __init__(self, *args, **kwargs):
        kwargs['tasks'] = VocTask.segmentation
        super().__init__(*args, **kwargs)
