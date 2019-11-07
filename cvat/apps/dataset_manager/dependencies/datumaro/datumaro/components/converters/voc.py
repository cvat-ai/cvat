
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import cv2
from collections import OrderedDict, defaultdict
import os
import os.path as osp
from xml.etree import ElementTree as ET

from datumaro.components.converter import Converter
from datumaro.components.extractor import *
from datumaro.components.formats.voc import *
from datumaro.util import find
from datumaro.util.mask_tools import apply_colormap


def _write_xml_bbox(bbox, parent_elem):
    x, y, w, h = bbox
    bbox_elem = ET.SubElement(parent_elem, 'bndbox')
    ET.SubElement(bbox_elem, 'xmin').text = str(x)
    ET.SubElement(bbox_elem, 'ymin').text = str(y)
    ET.SubElement(bbox_elem, 'xmax').text = str(x + w)
    ET.SubElement(bbox_elem, 'ymax').text = str(y + h)
    return bbox_elem

class _Converter:
    _DEFAULT_SUBSET_NAME = 'default'
    _LABELS = set([entry.name for entry in VocLabel])
    _BODY_PARTS = set([entry.name for entry in VocBodyPart])
    _ACTIONS = set([entry.name for entry in VocAction])

    def __init__(self, task, extractor, save_dir,
            apply_colormap=True, save_images=False):

        assert not task or task in VocTask
        self._task = task
        self._extractor = extractor
        self._save_dir = save_dir
        self._apply_colormap = apply_colormap
        self._save_images = save_images

        self._label_categories = extractor.categories() \
            .get(AnnotationType.label)
        self._mask_categories = extractor.categories() \
            .get(AnnotationType.mask)

    def convert(self):
        self.init_dirs()
        self.save_subsets()

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
        return self._label_categories.items[label_id].name

    def save_subsets(self):
        for subset_name in self._extractor.subsets():
            subset = self._extractor.get_subset(subset_name)
            if not subset_name:
                subset_name = self._DEFAULT_SUBSET_NAME

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
                        cv2.imwrite(osp.join(self._images_dir,
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
                    ET.SubElement(root_elem, 'folder').text = \
                        item_id[ : item_id.find('_')]
                    ET.SubElement(root_elem, 'filename').text = \
                        item_id + VocPath.IMAGE_EXT

                    if item.has_image:
                        h, w, c = item.image.shape
                        size_elem = ET.SubElement(root_elem, 'size')
                        ET.SubElement(size_elem, 'width').text = str(w)
                        ET.SubElement(size_elem, 'height').text = str(h)
                        ET.SubElement(size_elem, 'depth').text = str(c)

                    item_segmented = 0 < len(masks)
                    if item_segmented:
                        ET.SubElement(root_elem, 'segmented').text = '1'

                    objects_with_parts = []
                    objects_with_actions = defaultdict(dict)

                    main_bboxes = []
                    layout_bboxes = []
                    for bbox in bboxes:
                        label = self.get_label(bbox.label)
                        if label in self._LABELS:
                            main_bboxes.append(bbox)
                        elif label in self._BODY_PARTS:
                            layout_bboxes.append(bbox)

                    for new_obj_id, obj in enumerate(main_bboxes):
                        attr = obj.attributes

                        obj_elem = ET.SubElement(root_elem, 'object')
                        ET.SubElement(obj_elem, 'name').text = self.get_label(obj.label)

                        pose = attr.get('pose')
                        if pose is not None:
                            ET.SubElement(obj_elem, 'pose').text = VocPose[pose].name

                        truncated = attr.get('truncated')
                        if truncated is not None:
                            ET.SubElement(obj_elem, 'truncated').text = '%d' % truncated

                        difficult = attr.get('difficult')
                        if difficult is not None:
                            ET.SubElement(obj_elem, 'difficult').text = '%d' % difficult

                        bbox = obj.get_bbox()
                        if bbox is not None:
                            _write_xml_bbox(bbox, obj_elem)

                        for part in VocBodyPart:
                            part_bbox = find(layout_bboxes, lambda x: \
                                obj.id == x.group and \
                                self.get_label(x.label) == part.name)
                            if part_bbox is not None:
                                part_elem = ET.SubElement(obj_elem, 'part')
                                ET.SubElement(part_elem, 'name').text = part.name
                                _write_xml_bbox(part_bbox.get_bbox(), part_elem)

                                objects_with_parts.append(new_obj_id)

                        actions = [x for x in labels
                            if obj.id == x.group and \
                               self.get_label(x.label) in self._ACTIONS]
                        if len(actions) != 0:
                            actions_elem = ET.SubElement(obj_elem, 'actions')
                            for action in VocAction:
                                presented = find(actions, lambda x: \
                                    self.get_label(x.label) == action.name) is not None
                                ET.SubElement(actions_elem, action.name).text = \
                                    '%d' % presented

                                objects_with_actions[new_obj_id][action] = presented

                    if self._task in [None,
                            VocTask.detection,
                            VocTask.person_layout,
                            VocTask.action_classification]:
                        with open(osp.join(self._ann_dir, item_id + '.xml'), 'w') as f:
                            f.write(ET.tostring(root_elem, encoding='unicode'))

                    clsdet_list[item_id] = True
                    layout_list[item_id] = objects_with_parts
                    action_list[item_id] = objects_with_actions

                for label_obj in labels:
                    label = self.get_label(label_obj.label)
                    if label not in self._LABELS:
                        continue
                    class_list = class_lists.get(item_id, set())
                    class_list.add(label_obj.label)
                    class_lists[item_id] = class_list

                    clsdet_list[item_id] = True

                for mask_obj in masks:
                    if mask_obj.attributes.get('class') == True:
                        self.save_segm(osp.join(self._segm_dir,
                                item_id + VocPath.SEGM_EXT),
                            mask_obj, self._mask_categories.colormap)
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

                if self._task in [None,
                        VocTask.classification,
                        VocTask.detection,
                        VocTask.action_classification,
                        VocTask.person_layout]:
                    self.save_clsdet_lists(subset_name, clsdet_list)
                    if self._task in [None, VocTask.classification]:
                        self.save_class_lists(subset_name, class_lists)
                if self._task in [None, VocTask.action_classification]:
                    self.save_action_lists(subset_name, action_list)
                if self._task in [None, VocTask.person_layout]:
                    self.save_layout_lists(subset_name, layout_list)
                if self._task in [None, VocTask.segmentation]:
                    self.save_segm_lists(subset_name, segm_list)

    def save_action_lists(self, subset_name, action_list):
        os.makedirs(self._action_subsets_dir, exist_ok=True)

        ann_file = osp.join(self._action_subsets_dir, subset_name + '.txt')
        with open(ann_file, 'w') as f:
            for item in action_list:
                f.write('%s\n' % item)

        if len(action_list) == 0:
            return

        for action in VocAction:
            ann_file = osp.join(self._action_subsets_dir,
                '%s_%s.txt' % (action.name, subset_name))
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

        for label in VocLabel:
            ann_file = osp.join(self._cls_subsets_dir,
                '%s_%s.txt' % (label.name, subset_name))
            with open(ann_file, 'w') as f:
                for item, item_labels in class_lists.items():
                    if not item_labels:
                        continue
                    presented = label.value in item_labels
                    f.write('%s % d\n' % \
                        (item, 1 if presented else -1))

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

    def save_segm(self, path, annotation, colormap):
        data = annotation.image
        if self._apply_colormap:
            if colormap is None:
                colormap = VocColormap
            data = apply_colormap(data, colormap)
        cv2.imwrite(path, data)

class VocConverter(Converter):
    def __init__(self, task=None, save_images=False, apply_colormap=False):
        super().__init__()
        self._task = task
        self._save_images = save_images
        self._apply_colormap = apply_colormap

    def __call__(self, extractor, save_dir):
        converter = _Converter(self._task, extractor, save_dir,
            apply_colormap=self._apply_colormap,
            save_images=self._save_images)
        converter.convert()

def VocClassificationConverter(save_images=False):
    return VocConverter(VocTask.classification,
        save_images=save_images)

def VocDetectionConverter(save_images=False):
    return VocConverter(VocTask.detection,
        save_images=save_images)

def VocLayoutConverter(save_images=False):
    return VocConverter(VocTask.person_layout,
        save_images=save_images)

def VocActionConverter(save_images=False):
    return VocConverter(VocTask.action_classification,
        save_images=save_images)

def VocSegmentationConverter(save_images=False, apply_colormap=True):
    return VocConverter(VocTask.segmentation,
        save_images=save_images, apply_colormap=apply_colormap)
