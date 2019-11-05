
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import cv2
import json
import os
import os.path as osp

from datumaro.components.converter import Converter
from datumaro.components.extractor import *
from datumaro.components.formats.ms_coco import *
from datumaro.util import find


def _cast(value, type, default=None):
    try:
        return type(value)
    except Exception as e:
        return default

class _TaskConverter:
    def __init__(self):
        data = {
            'licenses': [],
            'info': {},
            'categories': [],
            'images': [],
            'annotations': []
            }

        data['licenses'].append({
            'name': '',
            'id': 0,
            'url': ''
        })

        data['info'] = {
            'contributor': '',
            'date_created': '',
            'description': '',
            'url': '',
            'version': '',
            'year': ''
        }
        self._data = data

    def is_empty(self):
        return len(self._data['images']) == 0

    def save_image_info(self, item, filename):
        if item.has_image:
            h, w, _ = item.image.shape
        else:
            h = 0
            w = 0

        self._data['images'].append({
            'id': str(item.id),
            'width': int(w),
            'height': int(h),
            'file_name': filename,
            'license': 0,
            'flickr_url': '',
            'coco_url': '',
            'date_captured': 0,
        })

    def save_categories(self, dataset):
        raise NotImplementedError()

    def save_annotations(self, item):
        raise NotImplementedError()

    def write(self, path):
        with open(path, 'w') as outfile:
            json.dump(self._data, outfile)

    @property
    def annotations(self):
        return self._data['annotations']

    @property
    def categories(self):
        return self._data['categories']

class _InstancesConverter(_TaskConverter):
    def save_categories(self, dataset):
        label_categories = dataset.categories().get(AnnotationType.label)
        if label_categories is None:
            return

        for id, cat in enumerate(label_categories.items):
            self.categories.append({
                'id': 1 + id,
                'name': cat.name,
                'supercategory': cat.parent,
            })

    def save_annotations(self, item):
        for ann in item.annotations:
            if ann.type != AnnotationType.bbox:
                continue

            elem = {
                'id': 1 + len(self.annotations),
                'image_id': str(item.id),
                'category_id': _cast(ann.label, int, -1) + 1,
                'segmentation': ann.get_polygon(),
                'area': ann.area(),
                'bbox': ann.get_bbox(),
                'iscrowd': 0,
            }
            if 'score' in ann.attributes:
                elem['score'] = float(ann.attributes['score'])

            self.annotations.append(elem)

class _ImageInfoConverter(_TaskConverter):
    def save_categories(self, dataset):
        pass

    def save_annotations(self, item):
        pass

class _CaptionsConverter(_TaskConverter):
    def save_categories(self, dataset):
        pass

    def save_annotations(self, item):
        for ann in item.annotations:
            if ann.type != AnnotationType.caption:
                continue

            elem = {
                'id': 1 + len(self.annotations),
                'image_id': str(item.id),
                'category_id': 0, # NOTE: workaround for a bug in cocoapi
                'caption': ann.caption,
            }
            if 'score' in ann.attributes:
                elem['score'] = float(ann.attributes['score'])

            self.annotations.append(elem)

class _KeypointsConverter(_TaskConverter):
    def save_categories(self, dataset):
        label_categories = dataset.categories().get(AnnotationType.label)
        if label_categories is None:
            return
        points_categories = dataset.categories().get(AnnotationType.points)
        if points_categories is None:
            return

        for id, kp_cat in points_categories.items.items():
            label_cat = label_categories.items[id]

            cat = {
                'id': 1 + id,
                'name': label_cat.name,
                'supercategory': label_cat.parent,
                'keypoints': [str(l) for l in kp_cat.labels],
                'skeleton': [int(i) for i in kp_cat.adjacent],
            }
            self.categories.append(cat)

    def save_annotations(self, item):
        for ann in item.annotations:
            if ann.type != AnnotationType.points:
                continue

            elem = {
                'id': 1 + len(self.annotations),
                'image_id': str(item.id),
                'category_id': _cast(ann.label, int, -1) + 1,
            }
            if 'score' in ann.attributes:
                elem['score'] = float(ann.attributes['score'])

            keypoints = []
            points = ann.get_points()
            visibility = ann.visibility
            for index in range(0, len(points), 2):
                kp = points[index : index + 2]
                state = visibility[index // 2].value
                keypoints.extend([*kp, state])

            num_visible = len([v for v in visibility \
                if v == PointsObject.Visibility.visible])

            bbox = find(item.annotations, lambda x: \
                x.group == ann.group and \
                x.type == AnnotationType.bbox and
                x.label == ann.label)
            if bbox is None:
                bbox = BboxObject(*ann.get_bbox())
            elem.update({
                'segmentation': bbox.get_polygon(),
                'area': bbox.area(),
                'bbox': bbox.get_bbox(),
                'iscrowd': 0,
                'keypoints': keypoints,
                'num_keypoints': num_visible,
            })

            self.annotations.append(elem)

class _LabelsConverter(_TaskConverter):
    def save_categories(self, dataset):
        label_categories = dataset.categories().get(AnnotationType.label)
        if label_categories is None:
            return

        for id, cat in enumerate(label_categories.items):
            self.categories.append({
                'id': 1 + id,
                'name': cat.name,
                'supercategory': cat.parent,
            })

    def save_annotations(self, item):
        for ann in item.annotations:
            if ann.type != AnnotationType.label:
                continue

            elem = {
                'id': 1 + len(self.annotations),
                'image_id': str(item.id),
                'category_id': int(ann.label) + 1,
            }
            if 'score' in ann.attributes:
                elem['score'] = float(ann.attributes['score'])

            self.annotations.append(elem)

class _Converter:
    _TASK_CONVERTER = {
        CocoAnnotationType.image_info: _ImageInfoConverter,
        CocoAnnotationType.instances: _InstancesConverter,
        CocoAnnotationType.person_keypoints: _KeypointsConverter,
        CocoAnnotationType.captions: _CaptionsConverter,
        CocoAnnotationType.labels: _LabelsConverter,
    }

    def __init__(self, task, extractor, save_dir, save_images=False):
        self._task = task
        self._extractor = extractor
        self._save_dir = save_dir
        self._save_images = save_images

    def make_dirs(self):
        self._images_dir = osp.join(self._save_dir, CocoPath.IMAGES_DIR)
        os.makedirs(self._images_dir, exist_ok=True)

        self._ann_dir = osp.join(self._save_dir, CocoPath.ANNOTATIONS_DIR)
        os.makedirs(self._ann_dir, exist_ok=True)

    def make_task_converter(self):
        return self._TASK_CONVERTER[self._task]()

    def save_image(self, item, filename):
        path = osp.join(self._images_dir, filename)
        cv2.imwrite(path, item.image)

        return path

    def convert(self):
        self.make_dirs()

        for subset_name in self._extractor.subsets():
            subset = self._extractor.get_subset(subset_name)

            task_conv = self.make_task_converter()
            task_conv.save_categories(subset)
            for item in subset:
                filename = ''
                if item.has_image:
                    filename = str(item.id) + CocoPath.IMAGE_EXT
                    if self._save_images:
                        self.save_image(item, filename)
                task_conv.save_image_info(item, filename)
                task_conv.save_annotations(item)

            if not task_conv.is_empty():
                task_conv.write(osp.join(self._ann_dir,
                    '%s_%s.json' % (self._task.name, subset_name)))

class CocoConverter(Converter):
    def __init__(self, task, save_images=False):
        super().__init__()
        self._task = task
        self._save_images = save_images

    def __call__(self, extractor, save_dir):
        converter = _Converter(self._task, extractor, save_dir,
            save_images=self._save_images)
        converter.convert()

def CocoInstancesConverter(save_images=False):
    return CocoConverter(CocoAnnotationType.instances,
        save_images=save_images)

def CocoImageInfoConverter(save_images=False):
    return CocoConverter(CocoAnnotationType.image_info,
        save_images=save_images)

def CocoPersonKeypointsConverter(save_images=False):
    return CocoConverter(CocoAnnotationType.person_keypoints,
        save_images=save_images)

def CocoCaptionsConverter(save_images=False):
    return CocoConverter(CocoAnnotationType.captions,
        save_images=save_images)

def CocoLabelsConverter(save_images=False):
    return CocoConverter(CocoAnnotationType.labels,
        save_images=save_images)