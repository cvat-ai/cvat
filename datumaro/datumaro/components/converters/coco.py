
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from enum import Enum
from itertools import groupby
import json
import logging as log
import os
import os.path as osp

import pycocotools.mask as mask_utils

from datumaro.components.converter import Converter
from datumaro.components.extractor import (
    DEFAULT_SUBSET_NAME, AnnotationType, PointsObject, MaskObject
)
from datumaro.components.formats.coco import CocoTask, CocoPath
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


SegmentationMode = Enum('SegmentationMode', ['guess', 'polygons', 'mask'])

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
                try:
                    elem['score'] = float(ann.attributes['score'])
                except Exception as e:
                    log.warning("Failed to convert attribute 'score': %e" % e)

            self.annotations.append(elem)

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

    @classmethod
    def crop_segments(cls, instances, img_width, img_height):
        instances = sorted(instances, key=lambda x: x[0].z_order)

        segment_map = []
        segments = []
        for inst_idx, (_, polygons, mask, _) in enumerate(instances):
            if polygons:
                segment_map.extend(inst_idx for p in polygons)
                segments.extend(polygons)
            elif mask is not None:
                segment_map.append(inst_idx)
                segments.append(mask)

        segments = mask_tools.crop_covered_segments(
            segments, img_width, img_height)

        for inst_idx, inst in enumerate(instances):
            new_segments = [s for si_id, s in zip(segment_map, segments)
                if si_id == inst_idx]

            if not new_segments:
                inst[1] = []
                inst[2] = None
                continue

            if inst[1]:
                inst[1] = sum(new_segments, [])
            else:
                mask = cls.merge_masks(new_segments)
                inst[2] = mask_tools.mask_to_rle(mask)

        return instances

    def find_instance_parts(self, group, img_width, img_height):
        boxes = [a for a in group if a.type == AnnotationType.bbox]
        polygons = [a for a in group if a.type == AnnotationType.polygon]
        masks = [a for a in group if a.type == AnnotationType.mask]

        anns = boxes + polygons + masks
        leader = self.find_group_leader(anns)
        bbox = self.compute_bbox(anns)
        mask = None
        polygons = [p.get_polygon() for p in polygons]

        if self._context._segmentation_mode == SegmentationMode.guess:
            use_masks = True == leader.attributes.get('is_crowd',
                find(masks, lambda x: x.label == leader.label) is not None)
        elif self._context._segmentation_mode == SegmentationMode.polygons:
            use_masks = False
        elif self._context._segmentation_mode == SegmentationMode.mask:
            use_masks = True
        else:
            raise NotImplementedError("Unexpected segmentation mode '%s'" % \
                self._context._segmentation_mode)

        if use_masks:
            if polygons:
                mask = mask_tools.rles_to_mask(polygons, img_width, img_height)

            if masks:
                if mask is not None:
                    masks += [mask]
                mask = self.merge_masks(masks)

            if mask is not None:
                mask = mask_tools.mask_to_rle(mask)
            polygons = []
        else:
            if masks:
                mask = self.merge_masks(masks)
                polygons += mask_tools.mask_to_polygons(mask)
            mask = None

        return [leader, polygons, mask, bbox]

    @staticmethod
    def find_group_leader(group):
        return max(group, key=lambda x: x.area())

    @staticmethod
    def merge_masks(masks):
        if not masks:
            return None

        def get_mask(m):
            if isinstance(m, MaskObject):
                return m.image
            else:
                return m

        binary_mask = get_mask(masks[0])
        for m in masks[1:]:
            binary_mask |= get_mask(m)

        return binary_mask

    @staticmethod
    def compute_bbox(annotations):
        boxes = [ann.get_bbox() for ann in annotations]
        x0 = min((b[0] for b in boxes), default=0)
        y0 = min((b[1] for b in boxes), default=0)
        x1 = max((b[0] + b[2] for b in boxes), default=0)
        y1 = max((b[1] + b[3] for b in boxes), default=0)
        return [x0, y0, x1 - x0, y1 - y0]

    @staticmethod
    def find_instance_anns(annotations):
        return [a for a in annotations
            if a.type in { AnnotationType.bbox, AnnotationType.polygon } or \
                a.type == AnnotationType.mask and a.label is not None
        ]

    @classmethod
    def find_instances(cls, annotations):
        instance_anns = cls.find_instance_anns(annotations)

        ann_groups = []
        for g_id, group in groupby(instance_anns, lambda a: a.group):
            if g_id is None:
                ann_groups.extend(([a] for a in group))
            else:
                ann_groups.append(list(group))

        return ann_groups

    def save_annotations(self, item):
        instances = self.find_instances(item.annotations)
        if not instances:
            return

        if not item.has_image:
            log.warn("Skipping writing instances for "
                "item '%s' as it has no image info" % item.id)
            return
        h, w, _ = item.image.shape
        instances = [self.find_instance_parts(i, w, h) for i in instances]

        if self._context._crop_covered:
            instances = self.crop_segments(instances, w, h)

        for instance in instances:
            elem = self.convert_instance(instance, item)
            if elem:
                self.annotations.append(elem)

    def convert_instance(self, instance, item):
        ann, polygons, mask, bbox = instance

        is_crowd = mask is not None
        if is_crowd:
            segmentation = mask
        else:
            segmentation = [list(map(float, p)) for p in polygons]

        area = 0
        if segmentation:
            if item.has_image:
                h, w, _ = item.image.shape
            else:
                # NOTE: here we can guess the image size as
                # it is only needed for the area computation
                w = bbox[0] + bbox[2]
                h = bbox[1] + bbox[3]

            rles = mask_utils.frPyObjects(segmentation, h, w)
            if is_crowd:
                rles = [rles]
            else:
                rles = mask_utils.merge(rles)
            area = mask_utils.area(rles)
        else:
            x, y, w, h = bbox
            segmentation = [[x, y, x + w, y, x + w, y + h, x, y + h]]
            area = w * h

        elem = {
            'id': self._get_ann_id(ann),
            'image_id': _cast(item.id, int, 0),
            'category_id': _cast(ann.label, int, -1) + 1,
            'segmentation': segmentation,
            'area': float(area),
            'bbox': list(map(float, bbox)),
            'iscrowd': int(is_crowd),
        }
        if 'score' in ann.attributes:
            try:
                elem['score'] = float(ann.attributes['score'])
            except Exception as e:
                log.warning("Failed to convert attribute 'score': %e" % e)

        return elem

class _KeypointsConverter(_InstancesConverter):
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
        point_annotations = [a for a in item.annotations
            if a.type == AnnotationType.points]
        if not point_annotations:
            return

        # Create annotations for solitary keypoints annotations
        for points in self.find_solitary_points(item.annotations):
            instance = [points, [], None, points.get_bbox()]
            elem = super().convert_instance(instance, item)
            elem.update(self.convert_points_object(points))
            if elem:
                self.annotations.append(elem)

        # Create annotations for complete instance + keypoints annotations
        super().save_annotations(item)

    @classmethod
    def find_solitary_points(cls, annotations):
        solitary_points = []

        for g_id, group in groupby(annotations, lambda a: a.group):
            if g_id is not None and not cls.find_instance_anns(group):
                group = [a for a in group if a.type == AnnotationType.points]
            solitary_points.extend(group)

        return solitary_points

    @staticmethod
    def convert_points_object(ann):
        keypoints = []
        points = ann.get_points()
        visibility = ann.visibility
        for index in range(0, len(points), 2):
            kp = points[index : index + 2]
            state = visibility[index // 2].value
            keypoints.extend([*kp, state])

        num_annotated = len([v for v in visibility \
            if v != PointsObject.Visibility.absent])

        return {
            'keypoints': keypoints,
            'num_keypoints': num_annotated,
        }

    def convert_instance(self, instance, item):
        points_ann = find(item.annotations, lambda x: \
            x.type == AnnotationType.points and x.group == instance[0].group)
        if not points_ann:
            return None

        elem = super().convert_instance(instance, item)
        elem.update(self.convert_points_object(points_ann))

        return elem

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
                try:
                    elem['score'] = float(ann.attributes['score'])
                except Exception as e:
                    log.warning("Failed to convert attribute 'score': %e" % e)

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
            tasks=None, save_images=False, segmentation_mode=None,
            crop_covered=False):
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

        assert segmentation_mode is None or \
            segmentation_mode in SegmentationMode or \
            isinstance(segmentation_mode, str)
        if segmentation_mode is None:
            segmentation_mode = SegmentationMode.guess
        if isinstance(segmentation_mode, str):
            segmentation_mode = SegmentationMode[segmentation_mode]
        self._segmentation_mode = segmentation_mode

        self._crop_covered = crop_covered

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
            tasks=None, save_images=False, segmentation_mode=None,
            crop_covered=False,
            cmdline_args=None):
        super().__init__()

        self._options = {
            'tasks': tasks,
            'save_images': save_images,
            'segmentation_mode': segmentation_mode,
            'crop_covered': crop_covered,
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
            parser = argparse.ArgumentParser(prog='coco')

        parser.add_argument('--save-images', action='store_true',
            help="Save images (default: %(default)s)")
        parser.add_argument('--segmentation-mode',
            choices=[m.name for m in SegmentationMode],
            default=SegmentationMode.guess.name,
            help="Save mode for instance segmentation: "
                "- '{sm.guess.name}': guess the mode for each instance, "
                    "use 'is_crowd' attribute as hint; "
                "- '{sm.polygons.name}': save polygons, "
                    "merge and convert masks, prefer polygons; "
                "- '{sm.mask.name}': save masks, "
                    "merge and convert polygons, prefer masks; "
                "(default: %(default)s)".format(sm=SegmentationMode))
        parser.add_argument('--crop-covered', action='store_true',
            help="Crop covered segments so that background objects' "
                "segmentation was more accurate (default: %(default)s)")
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