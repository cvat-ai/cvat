
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import json
import numpy as np
import os
import os.path as osp

import pycocotools.mask as mask_utils

from datumaro.components.converter import Converter
from datumaro.components.extractor import (
    DEFAULT_SUBSET_NAME, AnnotationType, PointsObject, BboxObject
)
from datumaro.components.formats.ms_coco import CocoTask, CocoPath
from datumaro.util import find
from datumaro.util.image import save_image
import datumaro.util.mask_tools as mask_tools


def _cast(value, type_conv, default=None):
    if value is None:
        return default
    try:
        return type_conv(value)
    except Exception:
        return default

class _TaskConverter:
    def __init__(self, context):
        self._min_ann_id = 1
        self._context = context

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
        return len(self._data['annotations']) == 0

    def save_image_info(self, item, filename):
        if item.has_image:
            h, w = item.image.shape[:2]
        else:
            h = 0
            w = 0

        self._data['images'].append({
            'id': _cast(item.id, int, 0),
            'width': int(w),
            'height': int(h),
            'file_name': _cast(filename, str, ''),
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
        next_id = self._min_ann_id
        for ann in self.annotations:
            if ann['id'] is None:
                ann['id'] = next_id
                next_id += 1

        with open(path, 'w') as outfile:
            json.dump(self._data, outfile)

    @property
    def annotations(self):
        return self._data['annotations']

    @property
    def categories(self):
        return self._data['categories']

    def _get_ann_id(self, annotation):
        ann_id = annotation.id
        if ann_id:
            self._min_ann_id = max(ann_id, self._min_ann_id)
        return ann_id

class _InstancesConverter(_TaskConverter):
    def save_categories(self, dataset):
        label_categories = dataset.categories().get(AnnotationType.label)
        if label_categories is None:
            return

        for idx, cat in enumerate(label_categories.items):
            self.categories.append({
                'id': 1 + idx,
                'name': _cast(cat.name, str, ''),
                'supercategory': _cast(cat.parent, str, ''),
            })

    def save_annotations(self, item):
        annotations = item.annotations.copy()

        while len(annotations) != 0:
            ann = annotations.pop()

            if ann.type == AnnotationType.bbox and ann.label is not None:
                pass
            elif ann.type == AnnotationType.polygon and ann.label is not None:
                pass
            elif ann.type == AnnotationType.mask and ann.label is not None:
                pass
            else:
                continue

            bbox = None
            segmentation = None

            if ann.type == AnnotationType.bbox:
                is_crowd = ann.attributes.get('is_crowd', False)
                bbox = ann.get_bbox()
            elif ann.type == AnnotationType.polygon:
                is_crowd = ann.attributes.get('is_crowd', False)
            elif ann.type == AnnotationType.mask:
                is_crowd = ann.attributes.get('is_crowd', True)
                if is_crowd:
                    segmentation = ann
            area = None

            # If ann in a group, try to find corresponding annotations in
            # this group, otherwise try to infer them.

            if bbox is None and ann.group is not None:
                bbox = find(annotations, lambda x: \
                    x.group == ann.group and \
                    x.type == AnnotationType.bbox and \
                    x.label == ann.label)
                if bbox is not None:
                    bbox = bbox.get_bbox()

            if is_crowd:
                # is_crowd=True means there should be a mask
                if segmentation is None and ann.group is not None:
                    segmentation = find(annotations, lambda x: \
                        x.group == ann.group and \
                        x.type == AnnotationType.mask and \
                        x.label == ann.label)
                if segmentation is not None:
                    binary_mask = np.array(segmentation.image, dtype=np.bool)
                    binary_mask = np.asfortranarray(binary_mask, dtype=np.uint8)
                    segmentation = mask_utils.encode(binary_mask)
                    area = mask_utils.area(segmentation)
                    segmentation = mask_tools.convert_mask_to_rle(binary_mask)
            else:
                # is_crowd=False means there are some polygons
                polygons = []
                if ann.type == AnnotationType.polygon:
                    polygons = [ ann ]
                if ann.group is not None:
                    # A single object can consist of several polygons
                    polygons += [p for p in annotations
                        if p.group == ann.group and \
                           p.type == AnnotationType.polygon and \
                           p.label == ann.label]
                if polygons:
                    segmentation = [p.get_points() for p in polygons]
                    h, w = item.image.shape[:2]
                    rles = mask_utils.frPyObjects(segmentation, h, w)
                    rle = mask_utils.merge(rles)
                    area = mask_utils.area(rle)

                    if self._context._merge_polygons:
                        binary_mask = mask_utils.decode(rle).astype(np.bool)
                        binary_mask = np.asfortranarray(binary_mask, dtype=np.uint8)
                        segmentation = mask_tools.convert_mask_to_rle(binary_mask)
                        is_crowd = True
                        bbox = [int(i) for i in mask_utils.toBbox(rle)]

            if ann.group is not None:
                # Mark the group as visited to prevent repeats
                for a in annotations[:]:
                    if a.group == ann.group:
                        annotations.remove(a)

            if segmentation is None:
                is_crowd = False
                segmentation = [ann.get_polygon()]
                area = ann.area()

                if self._context._merge_polygons:
                    h, w = item.image.shape[:2]
                    rles = mask_utils.frPyObjects(segmentation, h, w)
                    rle = mask_utils.merge(rles)
                    area = mask_utils.area(rle)
                    binary_mask = mask_utils.decode(rle).astype(np.bool)
                    binary_mask = np.asfortranarray(binary_mask, dtype=np.uint8)
                    segmentation = mask_tools.convert_mask_to_rle(binary_mask)
                    is_crowd = True
                    bbox = [int(i) for i in mask_utils.toBbox(rle)]

            if bbox is None:
                bbox = ann.get_bbox()

            elem = {
                'id': self._get_ann_id(ann),
                'image_id': _cast(item.id, int, 0),
                'category_id': _cast(ann.label, int, -1) + 1,
                'segmentation': segmentation,
                'area': float(area),
                'bbox': bbox,
                'iscrowd': int(is_crowd),
            }
            if 'score' in ann.attributes:
                elem['score'] = float(ann.attributes['score'])

            self.annotations.append(elem)

class _ImageInfoConverter(_TaskConverter):
    def is_empty(self):
        return len(self._data['images']) == 0

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
                'id': self._get_ann_id(ann),
                'image_id': _cast(item.id, int, 0),
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

        for idx, kp_cat in points_categories.items.items():
            label_cat = label_categories.items[idx]

            cat = {
                'id': 1 + idx,
                'name': _cast(label_cat.name, str, ''),
                'supercategory': _cast(label_cat.parent, str, ''),
                'keypoints': [str(l) for l in kp_cat.labels],
                'skeleton': [int(i) for i in kp_cat.adjacent],
            }
            self.categories.append(cat)

    def save_annotations(self, item):
        for ann in item.annotations:
            if ann.type != AnnotationType.points:
                continue

            elem = {
                'id': self._get_ann_id(ann),
                'image_id': _cast(item.id, int, 0),
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

        for idx, cat in enumerate(label_categories.items):
            self.categories.append({
                'id': 1 + idx,
                'name': _cast(cat.name, str, ''),
                'supercategory': _cast(cat.parent, str, ''),
            })

    def save_annotations(self, item):
        for ann in item.annotations:
            if ann.type != AnnotationType.label:
                continue

            elem = {
                'id': self._get_ann_id(ann),
                'image_id': _cast(item.id, int, 0),
                'category_id': int(ann.label) + 1,
            }
            if 'score' in ann.attributes:
                elem['score'] = float(ann.attributes['score'])

            self.annotations.append(elem)

class _Converter:
    _TASK_CONVERTER = {
        CocoTask.image_info: _ImageInfoConverter,
        CocoTask.instances: _InstancesConverter,
        CocoTask.person_keypoints: _KeypointsConverter,
        CocoTask.captions: _CaptionsConverter,
        CocoTask.labels: _LabelsConverter,
    }

    def __init__(self, extractor, save_dir,
            tasks=None, save_images=False, merge_polygons=False):
        assert tasks is None or isinstance(tasks, (CocoTask, list))
        if tasks is None:
            tasks = list(self._TASK_CONVERTER)
        elif isinstance(tasks, CocoTask):
            tasks = [tasks]
        else:
            for t in tasks:
                assert t in CocoTask
        self._tasks = tasks

        self._extractor = extractor
        self._save_dir = save_dir

        self._save_images = save_images
        self._merge_polygons = merge_polygons

    def make_dirs(self):
        self._images_dir = osp.join(self._save_dir, CocoPath.IMAGES_DIR)
        os.makedirs(self._images_dir, exist_ok=True)

        self._ann_dir = osp.join(self._save_dir, CocoPath.ANNOTATIONS_DIR)
        os.makedirs(self._ann_dir, exist_ok=True)

    def make_task_converter(self, task):
        if task not in self._TASK_CONVERTER:
            raise NotImplementedError()
        return self._TASK_CONVERTER[task](self)

    def make_task_converters(self):
        return {
            task: self.make_task_converter(task) for task in self._tasks
        }

    def save_image(self, item, filename):
        path = osp.join(self._images_dir, filename)
        save_image(path, item.image)

        return path

    def convert(self):
        self.make_dirs()

        subsets = self._extractor.subsets()
        if len(subsets) == 0:
            subsets = [ None ]

        for subset_name in subsets:
            if subset_name:
                subset = self._extractor.get_subset(subset_name)
            else:
                subset_name = DEFAULT_SUBSET_NAME
                subset = self._extractor

            task_converters = self.make_task_converters()
            for task_conv in task_converters.values():
                task_conv.save_categories(subset)
            for item in subset:
                filename = ''
                if item.has_image:
                    filename = str(item.id) + CocoPath.IMAGE_EXT
                    if self._save_images:
                        self.save_image(item, filename)
                for task_conv in task_converters.values():
                    task_conv.save_image_info(item, filename)
                    task_conv.save_annotations(item)

            for task, task_conv in task_converters.items():
                if not task_conv.is_empty():
                    task_conv.write(osp.join(self._ann_dir,
                        '%s_%s.json' % (task.name, subset_name)))

class CocoConverter(Converter):
    def __init__(self,
            tasks=None, save_images=False, merge_polygons=False,
            cmdline_args=None):
        super().__init__()

        self._options = {
            'tasks': tasks,
            'save_images': save_images,
            'merge_polygons': merge_polygons,
        }

        if cmdline_args is not None:
            self._options.update(self._parse_cmdline(cmdline_args))

    @staticmethod
    def _split_tasks_string(s):
        return [CocoTask[i.strip()] for i in s.split(',')]

    @classmethod
    def build_cmdline_parser(cls, parser=None):
        import argparse
        if not parser:
            parser = argparse.ArgumentParser()

        parser.add_argument('--save-images', action='store_true',
            help="Save images (default: %(default)s)")
        parser.add_argument('--merge-polygons', action='store_true',
            help="Merge instance polygons into a mask (default: %(default)s)")
        parser.add_argument('--tasks', type=cls._split_tasks_string,
            default=None,
            help="COCO task filter, comma-separated list of {%s} "
                "(default: all)" % ', '.join([t.name for t in CocoTask]))

        return parser

    def __call__(self, extractor, save_dir):
        converter = _Converter(extractor, save_dir, **self._options)
        converter.convert()

def CocoInstancesConverter(**kwargs):
    return CocoConverter(CocoTask.instances, **kwargs)

def CocoImageInfoConverter(**kwargs):
    return CocoConverter(CocoTask.image_info, **kwargs)

def CocoPersonKeypointsConverter(**kwargs):
    return CocoConverter(CocoTask.person_keypoints, **kwargs)

def CocoCaptionsConverter(**kwargs):
    return CocoConverter(CocoTask.captions, **kwargs)

def CocoLabelsConverter(**kwargs):
    return CocoConverter(CocoTask.labels, **kwargs)