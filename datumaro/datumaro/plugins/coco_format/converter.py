
# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import json
import logging as log
import os
import os.path as osp
from enum import Enum
from itertools import groupby

import pycocotools.mask as mask_utils

import datumaro.util.annotation_util as anno_tools
import datumaro.util.mask_tools as mask_tools
from datumaro.components.converter import Converter
from datumaro.components.extractor import (_COORDINATE_ROUNDING_DIGITS,
    DEFAULT_SUBSET_NAME, AnnotationType, Points)
from datumaro.util import cast, find, str_to_bool

from .format import CocoPath, CocoTask

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

    def _get_image_id(self, item):
        return self._context._get_image_id(item)

    def save_image_info(self, item, filename):
        if item.has_image:
            h, w = item.image.size
        else:
            h = 0
            w = 0

        self._data['images'].append({
            'id': self._get_image_id(item),
            'width': int(w),
            'height': int(h),
            'file_name': cast(filename, str, ''),
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

    @staticmethod
    def _convert_attributes(ann):
        return { k: v for k, v in ann.attributes.items()
            if k not in {'is_crowd', 'score'}
        }

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
        for ann_idx, ann in enumerate(item.annotations):
            if ann.type != AnnotationType.caption:
                continue

            elem = {
                'id': self._get_ann_id(ann),
                'image_id': self._get_image_id(item),
                'category_id': 0, # NOTE: workaround for a bug in cocoapi
                'caption': ann.caption,
            }
            if 'score' in ann.attributes:
                try:
                    elem['score'] = float(ann.attributes['score'])
                except Exception as e:
                    log.warning("Item '%s', ann #%s: failed to convert "
                        "attribute 'score': %e" % (item.id, ann_idx, e))
            if self._context._allow_attributes:
                elem['attributes'] = self._convert_attributes(ann)

            self.annotations.append(elem)

class _InstancesConverter(_TaskConverter):
    def save_categories(self, dataset):
        label_categories = dataset.categories().get(AnnotationType.label)
        if label_categories is None:
            return

        for idx, cat in enumerate(label_categories.items):
            self.categories.append({
                'id': 1 + idx,
                'name': cast(cat.name, str, ''),
                'supercategory': cast(cat.parent, str, ''),
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
                mask = mask_tools.merge_masks(new_segments)
                inst[2] = mask_tools.mask_to_rle(mask)

        return instances

    def find_instance_parts(self, group, img_width, img_height):
        boxes = [a for a in group if a.type == AnnotationType.bbox]
        polygons = [a for a in group if a.type == AnnotationType.polygon]
        masks = [a for a in group if a.type == AnnotationType.mask]

        anns = boxes + polygons + masks
        leader = anno_tools.find_group_leader(anns)
        bbox = anno_tools.max_bbox(anns)
        mask = None
        polygons = [p.points for p in polygons]

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
                mask = mask_tools.merge_masks([m.image for m in masks])

            if mask is not None:
                mask = mask_tools.mask_to_rle(mask)
            polygons = []
        else:
            if masks:
                mask = mask_tools.merge_masks([m.image for m in masks])
                polygons += mask_tools.mask_to_polygons(mask)
            mask = None

        return [leader, polygons, mask, bbox]

    @staticmethod
    def find_instance_anns(annotations):
        return [a for a in annotations
            if a.type in { AnnotationType.bbox,
                AnnotationType.polygon, AnnotationType.mask }
        ]

    @classmethod
    def find_instances(cls, annotations):
        return anno_tools.find_instances(cls.find_instance_anns(annotations))

    def save_annotations(self, item):
        instances = self.find_instances(item.annotations)
        if not instances:
            return

        if not item.has_image:
            log.warn("Item '%s': skipping writing instances "
                "since no image info available" % item.id)
            return
        h, w = item.image.size
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
            segmentation = {
                'counts': list(int(c) for c in mask['counts']),
                'size': list(int(c) for c in mask['size'])
            }
        else:
            segmentation = [list(map(float, p)) for p in polygons]

        area = 0
        if segmentation:
            if item.has_image:
                h, w = item.image.size
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
            _, _, w, h = bbox
            segmentation = []
            area = w * h

        elem = {
            'id': self._get_ann_id(ann),
            'image_id': self._get_image_id(item),
            'category_id': cast(ann.label, int, -1) + 1,
            'segmentation': segmentation,
            'area': float(area),
            'bbox': [round(float(n), _COORDINATE_ROUNDING_DIGITS) for n in bbox],
            'iscrowd': int(is_crowd),
        }
        if 'score' in ann.attributes:
            try:
                elem['score'] = float(ann.attributes['score'])
            except Exception as e:
                log.warning("Item '%s': failed to convert attribute "
                    "'score': %e" % (item.id, e))
        if self._context._allow_attributes:
                elem['attributes'] = self._convert_attributes(ann)

        return elem

class _KeypointsConverter(_InstancesConverter):
    def save_categories(self, dataset):
        label_categories = dataset.categories().get(AnnotationType.label)
        if label_categories is None:
            return
        point_categories = dataset.categories().get(AnnotationType.points)

        for idx, label_cat in enumerate(label_categories.items):
            cat = {
                'id': 1 + idx,
                'name': cast(label_cat.name, str, ''),
                'supercategory': cast(label_cat.parent, str, ''),
                'keypoints': [],
                'skeleton': [],
            }

            if point_categories is not None:
                kp_cat = point_categories.items.get(idx)
                if kp_cat is not None:
                    cat.update({
                        'keypoints': [str(l) for l in kp_cat.labels],
                        'skeleton': [list(map(int, j)) for j in kp_cat.joints],
                    })
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
            self.annotations.append(elem)

        # Create annotations for complete instance + keypoints annotations
        super().save_annotations(item)

    @classmethod
    def find_solitary_points(cls, annotations):
        annotations = sorted(annotations, key=lambda a: a.group)
        solitary_points = []

        for g_id, group in groupby(annotations, lambda a: a.group):
            if not g_id or g_id and not cls.find_instance_anns(group):
                group = [a for a in group if a.type == AnnotationType.points]
                solitary_points.extend(group)

        return solitary_points

    @staticmethod
    def convert_points_object(ann):
        keypoints = []
        points = ann.points
        visibility = ann.visibility
        for index in range(0, len(points), 2):
            kp = points[index : index + 2]
            state = visibility[index // 2].value
            keypoints.extend([*kp, state])

        num_annotated = len([v for v in visibility \
            if v != Points.Visibility.absent])

        return {
            'keypoints': keypoints,
            'num_keypoints': num_annotated,
        }

    def convert_instance(self, instance, item):
        points_ann = find(item.annotations, lambda x: \
            x.type == AnnotationType.points and \
            instance[0].group and x.group == instance[0].group)
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
                'name': cast(cat.name, str, ''),
                'supercategory': cast(cat.parent, str, ''),
            })

    def save_annotations(self, item):
        for ann in item.annotations:
            if ann.type != AnnotationType.label:
                continue

            elem = {
                'id': self._get_ann_id(ann),
                'image_id': self._get_image_id(item),
                'category_id': int(ann.label) + 1,
            }
            if 'score' in ann.attributes:
                try:
                    elem['score'] = float(ann.attributes['score'])
                except Exception as e:
                    log.warning("Item '%s': failed to convert attribute "
                        "'score': %e" % (item.id, e))
            if self._context._allow_attributes:
                elem['attributes'] = self._convert_attributes(ann)

            self.annotations.append(elem)

class CocoConverter(Converter):
    @staticmethod
    def _split_tasks_string(s):
        return [CocoTask[i.strip()] for i in s.split(',')]

    @classmethod
    def build_cmdline_parser(cls, **kwargs):
        parser = super().build_cmdline_parser(**kwargs)
        parser.add_argument('--segmentation-mode',
            choices=[m.name for m in SegmentationMode],
            default=SegmentationMode.guess.name,
            help="""
                Save mode for instance segmentation:|n
                - '{sm.guess.name}': guess the mode for each instance,|n
                |s|suse 'is_crowd' attribute as hint|n
                - '{sm.polygons.name}': save polygons,|n
                |s|smerge and convert masks, prefer polygons|n
                - '{sm.mask.name}': save masks,|n
                |s|smerge and convert polygons, prefer masks|n
                Default: %(default)s.
                """.format(sm=SegmentationMode))
        parser.add_argument('--crop-covered', action='store_true',
            help="Crop covered segments so that background objects' "
                "segmentation was more accurate (default: %(default)s)")
        parser.add_argument('--allow-attributes',
            type=str_to_bool, default=True,
            help="Allow export of attributes (default: %(default)s)")
        parser.add_argument('--tasks', type=cls._split_tasks_string,
            help="COCO task filter, comma-separated list of {%s} "
                "(default: all)" % ', '.join(t.name for t in CocoTask))
        return parser

    DEFAULT_IMAGE_EXT = CocoPath.IMAGE_EXT

    _TASK_CONVERTER = {
        CocoTask.image_info: _ImageInfoConverter,
        CocoTask.instances: _InstancesConverter,
        CocoTask.person_keypoints: _KeypointsConverter,
        CocoTask.captions: _CaptionsConverter,
        CocoTask.labels: _LabelsConverter,
    }

    def __init__(self, extractor, save_dir,
            tasks=None, segmentation_mode=None, crop_covered=False,
            allow_attributes=True, **kwargs):
        super().__init__(extractor, save_dir, **kwargs)

        assert tasks is None or isinstance(tasks, (CocoTask, list, str))
        if isinstance(tasks, CocoTask):
            tasks = [tasks]
        elif isinstance(tasks, str):
            tasks = [CocoTask[tasks]]
        elif tasks:
            for i, t in enumerate(tasks):
                if isinstance(t, str):
                    tasks[i] = CocoTask[t]
                else:
                    assert t in CocoTask, t
        self._tasks = tasks

        assert segmentation_mode is None or \
            isinstance(segmentation_mode, str) or \
            segmentation_mode in SegmentationMode
        if segmentation_mode is None:
            segmentation_mode = SegmentationMode.guess
        if isinstance(segmentation_mode, str):
            segmentation_mode = SegmentationMode[segmentation_mode]
        self._segmentation_mode = segmentation_mode

        self._crop_covered = crop_covered
        self._allow_attributes = allow_attributes

        self._image_ids = {}

    def _make_dirs(self):
        self._images_dir = osp.join(self._save_dir, CocoPath.IMAGES_DIR)
        os.makedirs(self._images_dir, exist_ok=True)

        self._ann_dir = osp.join(self._save_dir, CocoPath.ANNOTATIONS_DIR)
        os.makedirs(self._ann_dir, exist_ok=True)

    def _make_task_converter(self, task):
        if task not in self._TASK_CONVERTER:
            raise NotImplementedError()
        return self._TASK_CONVERTER[task](self)

    def _make_task_converters(self):
        return { task: self._make_task_converter(task)
            for task in (self._tasks or self._TASK_CONVERTER) }

    def _get_image_id(self, item):
        image_id = self._image_ids.get(item.id)
        if image_id is None:
            image_id = cast(item.attributes.get('id'), int,
                len(self._image_ids) + 1)
            self._image_ids[item.id] = image_id
        return image_id

    def _save_image(self, item, path=None):
        super()._save_image(item,
            osp.join(self._images_dir, self._make_image_filename(item)))

    def apply(self):
        self._make_dirs()

        for subset_name in self._extractor.subsets() or [None]:
            if subset_name:
                subset = self._extractor.get_subset(subset_name)
            else:
                subset_name = DEFAULT_SUBSET_NAME
                subset = self._extractor

            task_converters = self._make_task_converters()
            for task_conv in task_converters.values():
                task_conv.save_categories(subset)
            for item in subset:
                if self._save_images:
                    if item.has_image:
                        self._save_image(item)
                    else:
                        log.debug("Item '%s' has no image info", item.id)
                for task_conv in task_converters.values():
                    task_conv.save_image_info(item,
                        self._make_image_filename(item))
                    task_conv.save_annotations(item)

            for task, task_conv in task_converters.items():
                if task_conv.is_empty() and not self._tasks:
                    continue
                task_conv.write(osp.join(self._ann_dir,
                    '%s_%s.json' % (task.name, subset_name)))

class CocoInstancesConverter(CocoConverter):
    def __init__(self, *args, **kwargs):
        kwargs['tasks'] = CocoTask.instances
        super().__init__(*args, **kwargs)

class CocoImageInfoConverter(CocoConverter):
    def __init__(self, *args, **kwargs):
        kwargs['tasks'] = CocoTask.image_info
        super().__init__(*args, **kwargs)

class CocoPersonKeypointsConverter(CocoConverter):
    def __init__(self, *args, **kwargs):
        kwargs['tasks'] = CocoTask.person_keypoints
        super().__init__(*args, **kwargs)

class CocoCaptionsConverter(CocoConverter):
    def __init__(self, *args, **kwargs):
        kwargs['tasks'] = CocoTask.captions
        super().__init__(*args, **kwargs)

class CocoLabelsConverter(CocoConverter):
    def __init__(self, *args, **kwargs):
        kwargs['tasks'] = CocoTask.labels
        super().__init__(*args, **kwargs)
