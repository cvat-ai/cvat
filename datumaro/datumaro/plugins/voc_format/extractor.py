
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from collections import defaultdict
import logging as log
import numpy as np
import os.path as osp
from defusedxml import ElementTree

from datumaro.components.extractor import (SourceExtractor,
    DEFAULT_SUBSET_NAME, DatasetItem,
    AnnotationType, Label, Mask, Bbox, CompiledMask
)
from datumaro.util import dir_items
from datumaro.util.image import Image
from datumaro.util.mask_tools import lazy_mask, invert_colormap

from .format import (
    VocTask, VocPath, VocInstColormap, parse_label_map, make_voc_categories
)


_inverse_inst_colormap = invert_colormap(VocInstColormap)

class _VocExtractor(SourceExtractor):
    def __init__(self, path):
        super().__init__()

        assert osp.isfile(path), path
        self._path = path
        self._dataset_dir = osp.dirname(osp.dirname(osp.dirname(path)))

        subset = osp.splitext(osp.basename(path))[0]
        if subset == DEFAULT_SUBSET_NAME:
            subset = None
        self._subset = subset

        self._categories = self._load_categories(self._dataset_dir)
        log.debug("Loaded labels: %s", ', '.join("'%s'" % l.name
            for l in self._categories[AnnotationType.label].items))
        self._items = self._load_subset_list(path)

    def categories(self):
        return self._categories

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

    def _get_label_id(self, label):
        label_id, _ = self._categories[AnnotationType.label].find(label)
        assert label_id is not None, label
        return label_id

    @staticmethod
    def _load_categories(dataset_path):
        label_map = None
        label_map_path = osp.join(dataset_path, VocPath.LABELMAP_FILE)
        if osp.isfile(label_map_path):
            label_map = parse_label_map(label_map_path)
        return make_voc_categories(label_map)

    @staticmethod
    def _load_subset_list(subset_path):
        with open(subset_path) as f:
            return [line.split()[0] for line in f]

class VocClassificationExtractor(_VocExtractor):
    def __iter__(self):
        raw_anns = self._load_annotations()
        for item_id in self._items:
            image = osp.join(self._dataset_dir, VocPath.IMAGES_DIR,
                item_id + VocPath.IMAGE_EXT)
            anns = self._parse_annotations(raw_anns, item_id)
            yield DatasetItem(id=item_id, subset=self._subset,
                image=image, annotations=anns)

    def _load_annotations(self):
        annotations = defaultdict(list)
        task_dir = osp.dirname(self._path)
        anno_files = [s for s in dir_items(task_dir, '.txt')
            if s.endswith('_' + osp.basename(self._path))]
        for ann_filename in anno_files:
            with open(osp.join(task_dir, ann_filename)) as f:
                label = ann_filename[:ann_filename.rfind('_')]
                label_id = self._get_label_id(label)
                for line in f:
                    item, present = line.split()
                    if present == '1':
                        annotations[item].append(label_id)

        return dict(annotations)

    @staticmethod
    def _parse_annotations(raw_anns, item_id):
        return [Label(label_id) for label_id in raw_anns.get(item_id, [])]

class _VocXmlExtractor(_VocExtractor):
    def __init__(self, path, task):
        super().__init__(path)
        self._task = task

    def __iter__(self):
        anno_dir = osp.join(self._dataset_dir, VocPath.ANNOTATIONS_DIR)

        for item_id in self._items:
            image = osp.join(self._dataset_dir, VocPath.IMAGES_DIR,
                item_id + VocPath.IMAGE_EXT)

            anns = []
            ann_file = osp.join(anno_dir, item_id + '.xml')
            if osp.isfile(ann_file):
                root_elem = ElementTree.parse(ann_file)
                height = root_elem.find('size/height')
                if height is not None:
                    height = int(height.text)
                width = root_elem.find('size/width')
                if width is not None:
                    width = int(width.text)
                if height and width:
                    image = Image(path=image, size=(height, width))

                anns = self._parse_annotations(root_elem)

            yield DatasetItem(id=item_id, subset=self._subset,
                image=image, annotations=anns)

    def _parse_annotations(self, root_elem):
        item_annotations = []

        for obj_id, object_elem in enumerate(root_elem.findall('object')):
            obj_id += 1
            attributes = {}
            group = obj_id

            obj_label_id = None
            label_elem = object_elem.find('name')
            if label_elem is not None:
                obj_label_id = self._get_label_id(label_elem.text)

            obj_bbox = self._parse_bbox(object_elem)

            if obj_label_id is None or obj_bbox is None:
                continue

            difficult_elem = object_elem.find('difficult')
            attributes['difficult'] = difficult_elem is not None and \
                difficult_elem.text == '1'

            truncated_elem = object_elem.find('truncated')
            attributes['truncated'] = truncated_elem is not None and \
                truncated_elem.text == '1'

            occluded_elem = object_elem.find('occluded')
            attributes['occluded'] = occluded_elem is not None and \
                occluded_elem.text == '1'

            pose_elem = object_elem.find('pose')
            if pose_elem is not None:
                attributes['pose'] = pose_elem.text

            point_elem = object_elem.find('point')
            if point_elem is not None:
                point_x = point_elem.find('x')
                point_y = point_elem.find('y')
                point = [float(point_x.text), float(point_y.text)]
                attributes['point'] = point

            actions_elem = object_elem.find('actions')
            actions = {a: False
                for a in self._categories[AnnotationType.label] \
                    .items[obj_label_id].attributes}
            if actions_elem is not None:
                for action_elem in actions_elem:
                    actions[action_elem.tag] = (action_elem.text == '1')
            for action, present in actions.items():
                attributes[action] = present

            has_parts = False
            for part_elem in object_elem.findall('part'):
                part = part_elem.find('name').text
                part_label_id = self._get_label_id(part)
                part_bbox = self._parse_bbox(part_elem)

                if self._task is not VocTask.person_layout:
                    break
                if part_bbox is None:
                    continue
                has_parts = True
                item_annotations.append(Bbox(*part_bbox, label=part_label_id,
                    group=group))

            if self._task is VocTask.person_layout and not has_parts:
                continue
            if self._task is VocTask.action_classification and not actions:
                continue

            item_annotations.append(Bbox(*obj_bbox, label=obj_label_id,
                attributes=attributes, id=obj_id, group=group))

        return item_annotations

    @staticmethod
    def _parse_bbox(object_elem):
        bbox_elem = object_elem.find('bndbox')
        xmin = float(bbox_elem.find('xmin').text)
        xmax = float(bbox_elem.find('xmax').text)
        ymin = float(bbox_elem.find('ymin').text)
        ymax = float(bbox_elem.find('ymax').text)
        return [xmin, ymin, xmax - xmin, ymax - ymin]

class VocDetectionExtractor(_VocXmlExtractor):
    def __init__(self, path):
        super().__init__(path, task=VocTask.detection)

class VocLayoutExtractor(_VocXmlExtractor):
    def __init__(self, path):
        super().__init__(path, task=VocTask.person_layout)

class VocActionExtractor(_VocXmlExtractor):
    def __init__(self, path):
        super().__init__(path, task=VocTask.action_classification)

class VocSegmentationExtractor(_VocExtractor):
    def __iter__(self):
        for item_id in self._items:
            image = osp.join(self._dataset_dir, VocPath.IMAGES_DIR,
                item_id + VocPath.IMAGE_EXT)
            anns = self._load_annotations(item_id)
            yield DatasetItem(id=item_id, subset=self._subset,
                image=image, annotations=anns)

    @staticmethod
    def _lazy_extract_mask(mask, c):
        return lambda: mask == c

    def _load_annotations(self, item_id):
        item_annotations = []

        class_mask = None
        segm_path = osp.join(self._dataset_dir, VocPath.SEGMENTATION_DIR,
            item_id + VocPath.SEGM_EXT)
        if osp.isfile(segm_path):
            inverse_cls_colormap = \
                self._categories[AnnotationType.mask].inverse_colormap
            class_mask = lazy_mask(segm_path, inverse_cls_colormap)

        instances_mask = None
        inst_path = osp.join(self._dataset_dir, VocPath.INSTANCES_DIR,
            item_id + VocPath.SEGM_EXT)
        if osp.isfile(inst_path):
            instances_mask = lazy_mask(inst_path, _inverse_inst_colormap)

        if instances_mask is not None:
            compiled_mask = CompiledMask(class_mask, instances_mask)

            if class_mask is not None:
                label_cat = self._categories[AnnotationType.label]
                instance_labels = compiled_mask.get_instance_labels(
                    class_count=len(label_cat.items))
            else:
                instance_labels = {i: None
                    for i in range(compiled_mask.instance_count)}

            for instance_id, label_id in instance_labels.items():
                image = compiled_mask.lazy_extract(instance_id)

                attributes = {}
                if label_id is not None:
                    actions = {a: False
                        for a in label_cat.items[label_id].attributes
                    }
                    attributes.update(actions)

                item_annotations.append(Mask(
                    image=image, label=label_id,
                    attributes=attributes, group=instance_id
                ))
        elif class_mask is not None:
            log.warn("item '%s': has only class segmentation, "
                "instance masks will not be available" % item_id)
            class_mask = class_mask()
            classes = np.unique(class_mask)
            for label_id in classes:
                image = self._lazy_extract_mask(class_mask, label_id)
                item_annotations.append(Mask(image=image, label=label_id))

        return item_annotations
