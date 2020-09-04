# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

from enum import Enum
import logging as log
import os.path as osp
import random
import re

import pycocotools.mask as mask_utils

from datumaro.components.extractor import (Transform, AnnotationType,
    RleMask, Polygon, Bbox,
    LabelCategories, MaskCategories, PointsCategories
)
from datumaro.components.cli_plugin import CliPlugin
import datumaro.util.mask_tools as mask_tools
from datumaro.util.annotation_util import find_group_leader, find_instances


class CropCoveredSegments(Transform, CliPlugin):
    def transform_item(self, item):
        annotations = []
        segments = []
        for ann in item.annotations:
            if ann.type in {AnnotationType.polygon, AnnotationType.mask}:
                segments.append(ann)
            else:
                annotations.append(ann)
        if not segments:
            return item

        if not item.has_image:
            raise Exception("Image info is required for this transform")
        h, w = item.image.size
        segments = self.crop_segments(segments, w, h)

        annotations += segments
        return self.wrap_item(item, annotations=annotations)

    @classmethod
    def crop_segments(cls, segment_anns, img_width, img_height):
        segment_anns = sorted(segment_anns, key=lambda x: x.z_order)

        segments = []
        for s in segment_anns:
            if s.type == AnnotationType.polygon:
                segments.append(s.points)
            elif s.type == AnnotationType.mask:
                if isinstance(s, RleMask):
                    rle = s.rle
                else:
                    rle = mask_tools.mask_to_rle(s.image)
                segments.append(rle)

        segments = mask_tools.crop_covered_segments(
            segments, img_width, img_height)

        new_anns = []
        for ann, new_segment in zip(segment_anns, segments):
            fields = {'z_order': ann.z_order, 'label': ann.label,
                'id': ann.id, 'group': ann.group, 'attributes': ann.attributes
            }
            if ann.type == AnnotationType.polygon:
                if fields['group'] is None:
                    fields['group'] = cls._make_group_id(
                        segment_anns + new_anns, fields['id'])
                for polygon in new_segment:
                    new_anns.append(Polygon(points=polygon, **fields))
            else:
                rle = mask_tools.mask_to_rle(new_segment)
                rle = mask_utils.frPyObjects(rle, *rle['size'])
                new_anns.append(RleMask(rle=rle, **fields))

        return new_anns

    @staticmethod
    def _make_group_id(anns, ann_id):
        if ann_id:
            return ann_id
        max_gid = max(anns, default=0, key=lambda x: x.group)
        return max_gid + 1

class MergeInstanceSegments(Transform, CliPlugin):
    """
    Replaces instance masks and, optionally, polygons with a single mask.
    """

    @classmethod
    def build_cmdline_parser(cls, **kwargs):
        parser = super().build_cmdline_parser(**kwargs)
        parser.add_argument('--include-polygons', action='store_true',
            help="Include polygons")
        return parser

    def __init__(self, extractor, include_polygons=False):
        super().__init__(extractor)

        self._include_polygons = include_polygons

    def transform_item(self, item):
        annotations = []
        segments = []
        for ann in item.annotations:
            if ann.type in {AnnotationType.polygon, AnnotationType.mask}:
                segments.append(ann)
            else:
                annotations.append(ann)
        if not segments:
            return item

        if not item.has_image:
            raise Exception("Image info is required for this transform")
        h, w = item.image.size
        instances = self.find_instances(segments)
        segments = [self.merge_segments(i, w, h, self._include_polygons)
            for i in instances]
        segments = sum(segments, [])

        annotations += segments
        return self.wrap_item(item, annotations=annotations)

    @classmethod
    def merge_segments(cls, instance, img_width, img_height,
            include_polygons=False):
        polygons = [a for a in instance if a.type == AnnotationType.polygon]
        masks = [a for a in instance if a.type == AnnotationType.mask]
        if not polygons and not masks:
            return []

        leader = find_group_leader(polygons + masks)
        instance = []

        # Build the resulting mask
        mask = None

        if include_polygons and polygons:
            polygons = [p.points for p in polygons]
            mask = mask_tools.rles_to_mask(polygons, img_width, img_height)
        else:
            instance += polygons # keep unused polygons

        if masks:
            masks = [m.image for m in masks]
            if mask is not None:
                masks += [mask]
            mask = mask_tools.merge_masks(masks)

        if mask is None:
            return instance

        mask = mask_tools.mask_to_rle(mask)
        mask = mask_utils.frPyObjects(mask, *mask['size'])
        instance.append(
            RleMask(rle=mask, label=leader.label, z_order=leader.z_order,
                id=leader.id, attributes=leader.attributes, group=leader.group
            )
        )
        return instance

    @staticmethod
    def find_instances(annotations):
        return find_instances(a for a in annotations
            if a.type in {AnnotationType.polygon, AnnotationType.mask})

class PolygonsToMasks(Transform, CliPlugin):
    def transform_item(self, item):
        annotations = []
        for ann in item.annotations:
            if ann.type == AnnotationType.polygon:
                if not item.has_image:
                    raise Exception("Image info is required for this transform")
                h, w = item.image.size
                annotations.append(self.convert_polygon(ann, h, w))
            else:
                annotations.append(ann)

        return self.wrap_item(item, annotations=annotations)

    @staticmethod
    def convert_polygon(polygon, img_h, img_w):
        rle = mask_utils.frPyObjects([polygon.points], img_h, img_w)[0]

        return RleMask(rle=rle, label=polygon.label, z_order=polygon.z_order,
            id=polygon.id, attributes=polygon.attributes, group=polygon.group)

class BoxesToMasks(Transform, CliPlugin):
    def transform_item(self, item):
        annotations = []
        for ann in item.annotations:
            if ann.type == AnnotationType.bbox:
                if not item.has_image:
                    raise Exception("Image info is required for this transform")
                h, w = item.image.size
                annotations.append(self.convert_bbox(ann, h, w))
            else:
                annotations.append(ann)

        return self.wrap_item(item, annotations=annotations)

    @staticmethod
    def convert_bbox(bbox, img_h, img_w):
        rle = mask_utils.frPyObjects([bbox.as_polygon()], img_h, img_w)[0]

        return RleMask(rle=rle, label=bbox.label, z_order=bbox.z_order,
            id=bbox.id, attributes=bbox.attributes, group=bbox.group)

class MasksToPolygons(Transform, CliPlugin):
    def transform_item(self, item):
        annotations = []
        for ann in item.annotations:
            if ann.type == AnnotationType.mask:
                polygons = self.convert_mask(ann)
                if not polygons:
                    log.debug("[%s]: item %s: "
                        "Mask conversion to polygons resulted in too "
                        "small polygons, which were discarded" % \
                        (self._get_name(__class__), item.id))
                annotations.extend(polygons)
            else:
                annotations.append(ann)

        return self.wrap_item(item, annotations=annotations)

    @staticmethod
    def convert_mask(mask):
        polygons = mask_tools.mask_to_polygons(mask.image)

        return [
            Polygon(points=p, label=mask.label, z_order=mask.z_order,
                id=mask.id, attributes=mask.attributes, group=mask.group)
            for p in polygons
        ]

class ShapesToBoxes(Transform, CliPlugin):
    def transform_item(self, item):
        annotations = []
        for ann in item.annotations:
            if ann.type in { AnnotationType.mask, AnnotationType.polygon,
                AnnotationType.polyline, AnnotationType.points,
            }:
                annotations.append(self.convert_shape(ann))
            else:
                annotations.append(ann)

        return self.wrap_item(item, annotations=annotations)

    @staticmethod
    def convert_shape(shape):
        bbox = shape.get_bbox()
        return Bbox(*bbox, label=shape.label, z_order=shape.z_order,
            id=shape.id, attributes=shape.attributes, group=shape.group)

class Reindex(Transform, CliPlugin):
    @classmethod
    def build_cmdline_parser(cls, **kwargs):
        parser = super().build_cmdline_parser(**kwargs)
        parser.add_argument('-s', '--start', type=int, default=1,
            help="Start value for item ids")
        return parser

    def __init__(self, extractor, start=1):
        super().__init__(extractor)

        self._start = start

    def __iter__(self):
        for i, item in enumerate(self._extractor):
            yield self.wrap_item(item, id=i + self._start)

class MapSubsets(Transform, CliPlugin):
    @staticmethod
    def _mapping_arg(s):
        parts = s.split(':')
        if len(parts) != 2:
            import argparse
            raise argparse.ArgumentTypeError()
        return parts

    @classmethod
    def build_cmdline_parser(cls, **kwargs):
        parser = super().build_cmdline_parser(**kwargs)
        parser.add_argument('-s', '--subset', action='append',
            type=cls._mapping_arg, dest='mapping',
            help="Subset mapping of the form: 'src:dst' (repeatable)")
        return parser

    def __init__(self, extractor, mapping=None):
        super().__init__(extractor)

        if mapping is None:
            mapping = {}
        elif not isinstance(mapping, dict):
            mapping = dict(tuple(m) for m in mapping)
        self._mapping = mapping

    def transform_item(self, item):
        return self.wrap_item(item,
            subset=self._mapping.get(item.subset, item.subset))

class RandomSplit(Transform, CliPlugin):
    """
    Joins all subsets into one and splits the result into few parts.
    It is expected that item ids are unique and subset ratios sum up to 1.|n
    |n
    Example:|n
    |s|s%(prog)s --subset train:.67 --subset test:.33
    """

    @staticmethod
    def _split_arg(s):
        parts = s.split(':')
        if len(parts) != 2:
            import argparse
            raise argparse.ArgumentTypeError()
        return (parts[0], float(parts[1]))

    @classmethod
    def build_cmdline_parser(cls, **kwargs):
        parser = super().build_cmdline_parser(**kwargs)
        parser.add_argument('-s', '--subset', action='append',
            type=cls._split_arg, dest='splits',
            default=[('train', 0.67), ('test', 0.33)],
            help="Subsets in the form of: '<subset>:<ratio>' (repeatable)")
        parser.add_argument('--seed', type=int, help="Random seed")
        return parser

    def __init__(self, extractor, splits, seed=None):
        super().__init__(extractor)

        assert 0 < len(splits), "Expected at least one split"
        assert all(0.0 <= r and r <= 1.0 for _, r in splits), \
            "Ratios are expected to be in the range [0; 1], but got %s" % splits

        total_ratio = sum(s[1] for s in splits)
        if not abs(total_ratio - 1.0) <= 1e-7:
            raise Exception(
                "Sum of ratios is expected to be 1, got %s, which is %s" %
                (splits, total_ratio))

        dataset_size = len(extractor)
        indices = list(range(dataset_size))

        random.seed(seed)
        random.shuffle(indices)
        parts = []
        s = 0
        for subset, ratio in splits:
            s += ratio
            boundary = int(s * dataset_size)
            parts.append((boundary, subset))

        self._parts = parts

    def _find_split(self, index):
        for boundary, subset in self._parts:
            if index < boundary:
                return subset
        return subset # all the possible remainder goes to the last split

    def __iter__(self):
        for i, item in enumerate(self._extractor):
            yield self.wrap_item(item, subset=self._find_split(i))

class IdFromImageName(Transform, CliPlugin):
    def transform_item(self, item):
        if item.has_image and item.image.path:
            name = osp.splitext(osp.basename(item.image.path))[0]
            return self.wrap_item(item, id=name)
        else:
            log.debug("Can't change item id for item '%s': "
                "item has no image info" % item.id)
            return item

class Rename(Transform, CliPlugin):
    """
    Renames items in the dataset. Supports regular expressions.
    The first character in the expression is a delimiter for
    the pattern and replacement parts. Replacement part can also
    contain string.format tokens with 'item' object available.|n
    |n
    Examples:|n
    - Replace 'pattern' with 'replacement':|n
    |s|srename -e '|pattern|replacement|'|n
    - Remove 'frame_' from item ids:|n
    |s|srename -e '|frame_(\d+)|\\1|'
    """

    @classmethod
    def build_cmdline_parser(cls, **kwargs):
        parser = super().build_cmdline_parser(**kwargs)
        parser.add_argument('-e', '--regex',
            help="Regex for renaming.")
        return parser

    def __init__(self, extractor, regex):
        super().__init__(extractor)

        assert regex and isinstance(regex, str)
        parts = regex.split(regex[0], maxsplit=3)
        regex, sub = parts[1:3]
        self._re = re.compile(regex)
        self._sub = sub

    def transform_item(self, item):
        return self.wrap_item(item, id=self._re.sub(self._sub, item.id) \
            .format(item=item))

class RemapLabels(Transform, CliPlugin):
    """
    Changes labels in the dataset.|n
    Examples:|n
    - Rename 'person' to 'car' and 'cat' to 'dog', keep 'bus', remove others:|n
    |s|sremap_labels -l person:car -l bus:bus -l cat:dog --default delete
    """

    DefaultAction = Enum('DefaultAction', ['keep', 'delete'])

    @staticmethod
    def _split_arg(s):
        parts = s.split(':')
        if len(parts) != 2:
            import argparse
            raise argparse.ArgumentTypeError()
        return (parts[0], parts[1])

    @classmethod
    def build_cmdline_parser(cls, **kwargs):
        parser = super().build_cmdline_parser(**kwargs)
        parser.add_argument('-l', '--label', action='append',
            type=cls._split_arg, dest='mapping',
            help="Label in the form of: '<src>:<dst>' (repeatable)")
        parser.add_argument('--default',
            choices=[a.name for a in cls.DefaultAction],
            default=cls.DefaultAction.keep.name,
            help="Action for unspecified labels (default: %(default)s)")
        return parser

    def __init__(self, extractor, mapping, default=None):
        super().__init__(extractor)

        assert isinstance(default, (str, self.DefaultAction))
        if isinstance(default, str):
            default = self.DefaultAction[default]

        assert isinstance(mapping, (dict, list))
        if isinstance(mapping, list):
            mapping = dict(mapping)

        self._categories = {}

        src_label_cat = self._extractor.categories().get(AnnotationType.label)
        if src_label_cat is not None:
            self._make_label_id_map(src_label_cat, mapping, default)

        src_mask_cat = self._extractor.categories().get(AnnotationType.mask)
        if src_mask_cat is not None:
            assert src_label_cat is not None
            dst_mask_cat = MaskCategories(attributes=src_mask_cat.attributes)
            dst_mask_cat.colormap = {
                id: src_mask_cat.colormap[id]
                for id, _ in enumerate(src_label_cat.items)
                if self._map_id(id) or id == 0
            }
            self._categories[AnnotationType.mask] = dst_mask_cat

        src_points_cat = self._extractor.categories().get(AnnotationType.points)
        if src_points_cat is not None:
            assert src_label_cat is not None
            dst_points_cat = PointsCategories(attributes=src_points_cat.attributes)
            dst_points_cat.items = {
                id: src_points_cat.items[id]
                for id, item in enumerate(src_label_cat.items)
                if self._map_id(id) or id == 0
            }
            self._categories[AnnotationType.points] = dst_points_cat

    def _make_label_id_map(self, src_label_cat, label_mapping, default_action):
        dst_label_cat = LabelCategories(attributes=src_label_cat.attributes)
        id_mapping = {}
        for src_index, src_label in enumerate(src_label_cat.items):
            dst_label = label_mapping.get(src_label.name)
            if not dst_label and default_action == self.DefaultAction.keep:
                dst_label = src_label.name # keep unspecified as is
            if not dst_label:
                continue

            dst_index = dst_label_cat.find(dst_label)[0]
            if dst_index is None:
                dst_index = dst_label_cat.add(dst_label,
                    src_label.parent, src_label.attributes)
            id_mapping[src_index] = dst_index

        if log.getLogger().isEnabledFor(log.DEBUG):
            log.debug("Label mapping:")
            for src_id, src_label in enumerate(src_label_cat.items):
                if id_mapping.get(src_id):
                    log.debug("#%s '%s' -> #%s '%s'",
                        src_id, src_label.name, id_mapping[src_id],
                        dst_label_cat.items[id_mapping[src_id]].name
                    )
                else:
                    log.debug("#%s '%s' -> <deleted>", src_id, src_label.name)

        self._map_id = lambda src_id: id_mapping.get(src_id, None)
        self._categories[AnnotationType.label] = dst_label_cat

    def categories(self):
        return self._categories

    def transform_item(self, item):
        annotations = []
        for ann in item.annotations:
            if ann.type in { AnnotationType.label, AnnotationType.mask,
                AnnotationType.points, AnnotationType.polygon,
                AnnotationType.polyline, AnnotationType.bbox
            } and ann.label is not None:
                conv_label = self._map_id(ann.label)
                if conv_label is not None:
                    annotations.append(ann.wrap(label=conv_label))
            else:
                annotations.append(ann.wrap())
        return item.wrap(annotations=annotations)