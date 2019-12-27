
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from collections import OrderedDict, defaultdict
from enum import Enum
from itertools import chain
import logging as log
from lxml import etree as ET
import os
import os.path as osp

from datumaro.components.converter import Converter
from datumaro.components.extractor import (DEFAULT_SUBSET_NAME, AnnotationType,
    LabelCategories
)
from datumaro.components.formats.voc import (VocTask, VocPath,
    VocInstColormap, VocPose,
    parse_label_map, make_voc_label_map, make_voc_categories, write_label_map
)
from datumaro.util.image import save_image
from datumaro.util.mask_tools import apply_colormap, remap_mask


def _write_xml_bbox(bbox, parent_elem):
    x, y, w, h = bbox
    bbox_elem = ET.SubElement(parent_elem, 'bndbox')
    ET.SubElement(bbox_elem, 'xmin').text = str(x)
    ET.SubElement(bbox_elem, 'ymin').text = str(y)
    ET.SubElement(bbox_elem, 'xmax').text = str(x + w)
    ET.SubElement(bbox_elem, 'ymax').text = str(y + h)
    return bbox_elem


LabelmapType = Enum('LabelmapType', ['voc', 'source', 'guess'])

class _Converter:
    def __init__(self, extractor, save_dir,
            tasks=None, apply_colormap=True, save_images=False, label_map=None):
        assert tasks is None or isinstance(tasks, (VocTask, list))
        if tasks is None:
            tasks = list(VocTask)
        elif isinstance(tasks, VocTask):
            tasks = [tasks]
        else:
            for t in tasks:
                assert t in VocTask
        self._tasks = tasks

        self._extractor = extractor
        self._save_dir = save_dir
        self._apply_colormap = apply_colormap
        self._save_images = save_images

        self._load_categories(label_map)

    def convert(self):
        self.init_dirs()
        self.save_subsets()
        self.save_label_map()

    def init_dirs(self):
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
        return self._extractor.categories()[AnnotationType.label] \
            .items[label_id].name

    def save_subsets(self):
        subsets = self._extractor.subsets()
        if len(subsets) == 0:
            subsets = [ None ]

        for subset_name in subsets:
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
                item_id = str(item.id)
                if self._save_images:
                    data = item.image
                    if data is not None:
                        save_image(osp.join(self._images_dir,
                                str(item_id) + VocPath.IMAGE_EXT),
                            data)

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

                if len(bboxes) != 0:
                    root_elem = ET.Element('annotation')
                    if '_' in item_id:
                        folder = item_id[ : item_id.find('_')]
                    else:
                        folder = ''
                    ET.SubElement(root_elem, 'folder').text = folder
                    ET.SubElement(root_elem, 'filename').text = \
                        item_id + VocPath.IMAGE_EXT

                    source_elem = ET.SubElement(root_elem, 'source')
                    ET.SubElement(source_elem, 'database').text = 'Unknown'
                    ET.SubElement(source_elem, 'annotation').text = 'Unknown'
                    ET.SubElement(source_elem, 'image').text = 'Unknown'

                    if item.has_image:
                        image_shape = item.image.shape
                        h, w = image_shape[:2]
                        c = 1 if len(image_shape) == 2 else image_shape[2]
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

                        obj_label =  self.get_label(obj.label)
                        ET.SubElement(obj_elem, 'name').text = obj_label

                        pose = attr.get('pose')
                        if pose is not None:
                            pose = VocPose[pose]
                        else:
                            pose = VocPose.Unspecified
                        ET.SubElement(obj_elem, 'pose').text = pose.name

                        truncated = attr.get('truncated')
                        if truncated is not None:
                            truncated = int(truncated)
                        else:
                            truncated = 0
                        ET.SubElement(obj_elem, 'truncated').text = '%d' % truncated

                        difficult = attr.get('difficult')
                        if difficult is not None:
                            difficult = int(difficult)
                        else:
                            difficult = 0
                        ET.SubElement(obj_elem, 'difficult').text = '%d' % difficult

                        bbox = obj.get_bbox()
                        if bbox is not None:
                            _write_xml_bbox(bbox, obj_elem)

                        for part_bbox in filter(lambda x: obj.id == x.group,
                                layout_bboxes):
                            part_elem = ET.SubElement(obj_elem, 'part')
                            ET.SubElement(part_elem, 'name').text = \
                                self.get_label(part_bbox.label)
                            _write_xml_bbox(part_bbox.get_bbox(), part_elem)

                            objects_with_parts.append(new_obj_id)

                        actions = {k: v for k, v in obj.attributes.items()
                            if self._is_action(obj_label, k)}
                        actions_elem = ET.Element('actions')
                        for action in self._get_actions(obj_label):
                            presented = action in actions and actions[action]
                            ET.SubElement(actions_elem, action).text = \
                                '%d' % presented

                            objects_with_actions[new_obj_id][action] = presented
                        if len(actions) != 0:
                            obj_elem.append(actions_elem)

                    if set(self._tasks) & set([None,
                            VocTask.detection,
                            VocTask.person_layout,
                            VocTask.action_classification]):
                        with open(osp.join(self._ann_dir, item_id + '.xml'), 'w') as f:
                            f.write(ET.tostring(root_elem,
                                encoding='unicode', pretty_print=True))

                    clsdet_list[item_id] = True
                    layout_list[item_id] = objects_with_parts
                    action_list[item_id] = objects_with_actions

                for label_obj in labels:
                    label = self.get_label(label_obj.label)
                    if not self._is_label(label):
                        continue
                    class_list = class_lists.get(item_id, set())
                    class_list.add(label_obj.label)
                    class_lists[item_id] = class_list

                    clsdet_list[item_id] = True

                for mask_obj in masks:
                    if mask_obj.attributes.get('class') == True:
                        self.save_segm(osp.join(self._segm_dir,
                                item_id + VocPath.SEGM_EXT),
                            mask_obj)
                    if mask_obj.attributes.get('instances') == True:
                        self.save_segm(osp.join(self._inst_dir,
                                item_id + VocPath.SEGM_EXT),
                            mask_obj, VocInstColormap)

                    segm_list[item_id] = True

                if len(item.annotations) == 0:
                    clsdet_list[item_id] = None
                    layout_list[item_id] = None
                    action_list[item_id] = None
                    segm_list[item_id] = None

                if set(self._tasks) & set([None,
                        VocTask.classification,
                        VocTask.detection,
                        VocTask.action_classification,
                        VocTask.person_layout]):
                    self.save_clsdet_lists(subset_name, clsdet_list)
                    if set(self._tasks) & set([None, VocTask.classification]):
                        self.save_class_lists(subset_name, class_lists)
                if set(self._tasks) & set([None, VocTask.action_classification]):
                    self.save_action_lists(subset_name, action_list)
                if set(self._tasks) & set([None, VocTask.person_layout]):
                    self.save_layout_lists(subset_name, layout_list)
                if set(self._tasks) & set([None, VocTask.segmentation]):
                    self.save_segm_lists(subset_name, segm_list)

    def save_action_lists(self, subset_name, action_list):
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
        os.makedirs(self._cls_subsets_dir, exist_ok=True)

        if len(class_lists) == 0:
            return

        for label in self._label_map:
            ann_file = osp.join(self._cls_subsets_dir,
                '%s_%s.txt' % (label, subset_name))
            with open(ann_file, 'w') as f:
                for item, item_labels in class_lists.items():
                    if not item_labels:
                        continue
                    item_labels = [self._strip_label(self.get_label(l))
                        for l in item_labels]
                    presented = label in item_labels
                    f.write('%s % d\n' % (item, 1 if presented else -1))

    def save_clsdet_lists(self, subset_name, clsdet_list):
        os.makedirs(self._cls_subsets_dir, exist_ok=True)

        ann_file = osp.join(self._cls_subsets_dir, subset_name + '.txt')
        with open(ann_file, 'w') as f:
            for item in clsdet_list:
                f.write('%s\n' % item)

    def save_segm_lists(self, subset_name, segm_list):
        os.makedirs(self._segm_subsets_dir, exist_ok=True)

        ann_file = osp.join(self._segm_subsets_dir, subset_name + '.txt')
        with open(ann_file, 'w') as f:
            for item in segm_list:
                f.write('%s\n' % item)

    def save_layout_lists(self, subset_name, layout_list):
        os.makedirs(self._layout_subsets_dir, exist_ok=True)

        ann_file = osp.join(self._layout_subsets_dir, subset_name + '.txt')
        with open(ann_file, 'w') as f:
            for item, item_layouts in layout_list.items():
                if item_layouts:
                    for obj_id in item_layouts:
                        f.write('%s % d\n' % (item, 1 + obj_id))
                else:
                    f.write('%s\n' % (item))

    def save_segm(self, path, annotation, colormap=None):
        data = annotation.image
        if self._apply_colormap:
            if colormap is None:
                colormap = self._categories[AnnotationType.mask].colormap
            data = self._remap_mask(data)
            data = apply_colormap(data, colormap)
        save_image(path, data)

    def save_label_map(self):
        path = osp.join(self._save_dir, VocPath.LABELMAP_FILE)
        write_label_map(path, self._label_map)

    @staticmethod
    def _strip_label(label):
        return label.lower().strip()

    def _load_categories(self, label_map_source=None):
        if label_map_source == LabelmapType.voc.name:
            # strictly use VOC default labelmap
            label_map = make_voc_label_map()

        elif label_map_source == LabelmapType.source.name:
            # generate colormap from the input dataset
            labels = self._extractor.categories() \
                .get(AnnotationType.label, LabelCategories())
            label_map = OrderedDict(
                (item.name, [None, [], []]) for item in labels.items)

        elif label_map_source in [LabelmapType.guess.name, None]:
            # generate colormap for union of VOC and input dataset labels
            label_map = make_voc_label_map()

            rebuild_colormap = False
            source_labels = self._extractor.categories() \
                .get(AnnotationType.label, LabelCategories())
            for label in source_labels.items:
                label_name = self._strip_label(label.name)
                if label_name not in label_map:
                    rebuild_colormap = True
                if label.attributes or label_name not in label_map:
                    label_map[label_name] = [None, [], label.attributes]

            if rebuild_colormap:
                for item in label_map.values():
                    item[0] = None

        elif isinstance(label_map_source, dict):
            label_map = label_map_source

        elif isinstance(label_map_source, str) and osp.isfile(label_map_source):
            label_map = parse_label_map(label_map_source)

        else:
            raise Exception("Wrong labelmap specified, "
                "expected one of %s or a file path" % \
                ', '.join(t.name for t in LabelmapType))

        self._categories = make_voc_categories(label_map)

        self._label_map = label_map
        colormap = self._categories[AnnotationType.mask].colormap
        for label_id, color in colormap.items():
            label_desc = label_map[
                self._categories[AnnotationType.label].items[label_id].name]
            label_desc[0] = color

        self._label_id_mapping = self._make_label_id_map()

    def _is_label(self, s):
        return self._label_map.get(self._strip_label(s)) is not None

    def _is_part(self, s):
        s = self._strip_label(s)
        for label_desc in self._label_map.values():
            if s in label_desc[1]:
                return True
        return False

    def _is_action(self, label, s):
        return self._strip_label(s) in self._get_actions(label)

    def _get_actions(self, label):
        label_desc = self._label_map.get(self._strip_label(label))
        if not label_desc:
            return []
        return label_desc[2]

    def _make_label_id_map(self):
        source_labels = {
            id: label.name for id, label in
            enumerate(self._extractor.categories()[AnnotationType.label].items)
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
            log.warn("The following labels are remapped to background: %s" %
                ', '.join(void_labels))

        def map_id(src_id):
            return id_mapping[src_id]
        return map_id

    def _remap_mask(self, mask):
        return remap_mask(mask, self._label_id_mapping)

class VocConverter(Converter):
    def __init__(self,
            tasks=None, save_images=False, apply_colormap=False, label_map=None,
            cmdline_args=None):
        super().__init__()

        self._options = {
            'tasks': tasks,
            'save_images': save_images,
            'apply_colormap': apply_colormap,
            'label_map': label_map,
        }

        if cmdline_args is not None:
            self._options.update(self._parse_cmdline(cmdline_args))

    @staticmethod
    def _split_tasks_string(s):
        return [VocTask[i.strip()] for i in s.split(',')]

    @staticmethod
    def _get_labelmap(s):
        if osp.isfile(s):
            return s
        return LabelmapType[s].name

    @classmethod
    def build_cmdline_parser(cls, parser=None):
        import argparse
        if not parser:
            parser = argparse.ArgumentParser()

        parser.add_argument('--save-images', action='store_true',
            help="Save images (default: %(default)s)")
        parser.add_argument('--apply-colormap', type=bool, default=True,
            help="Use colormap for class and instance masks "
                "(default: %(default)s)")
        parser.add_argument('--label-map', type=cls._get_labelmap, default=None,
            help="Labelmap file path or one of %s" % \
                ', '.join(t.name for t in LabelmapType))
        parser.add_argument('--tasks', type=cls._split_tasks_string,
            default=None,
            help="VOC task filter, comma-separated list of {%s} "
                "(default: all)" % ', '.join([t.name for t in VocTask]))

        return parser

    def __call__(self, extractor, save_dir):
        converter = _Converter(extractor, save_dir, **self._options)
        converter.convert()

def VocClassificationConverter(**kwargs):
    return VocConverter(VocTask.classification, **kwargs)

def VocDetectionConverter(**kwargs):
    return VocConverter(VocTask.detection, **kwargs)

def VocLayoutConverter(**kwargs):
    return VocConverter(VocTask.person_layout, **kwargs)

def VocActionConverter(**kwargs):
    return VocConverter(VocTask.action_classification, **kwargs)

def VocSegmentationConverter(**kwargs):
    return VocConverter(VocTask.segmentation, **kwargs)
