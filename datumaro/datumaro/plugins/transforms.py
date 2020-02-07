
# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

from itertools import groupby
import logging as log

import pycocotools.mask as mask_utils

from datumaro.components.extractor import (Transform, AnnotationType,
    Mask, RleMask, Polygon)
from datumaro.components.cli_plugin import CliPlugin
import datumaro.util.mask_tools as mask_tools


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
        h, w = item.image.shape[:2]
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
                    rle = s._rle
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
        h, w = item.image.shape[:2]
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

        leader = cls.find_group_leader(polygons + masks)
        instance = []

        # Build the resulting mask
        mask = None

        if include_polygons and polygons:
            polygons = [p.points for p in polygons]
            mask = mask_tools.rles_to_mask(polygons, img_width, img_height)
        else:
            instance += polygons # keep unused polygons

        if masks:
            if mask is not None:
                masks += [mask]
            mask = cls.merge_masks(masks)

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
    def find_group_leader(group):
        return max(group, key=lambda x: x.get_area())

    @staticmethod
    def merge_masks(masks):
        if not masks:
            return None

        def get_mask(m):
            if isinstance(m, Mask):
                return m.image
            else:
                return m

        binary_mask = get_mask(masks[0])
        for m in masks[1:]:
            binary_mask |= get_mask(m)

        return binary_mask

    @staticmethod
    def find_instances(annotations):
        segment_anns = (a for a in annotations
            if a.type in {AnnotationType.polygon, AnnotationType.mask}
        )

        ann_groups = []
        for g_id, group in groupby(segment_anns, lambda a: a.group):
            if g_id is None:
                ann_groups.extend(([a] for a in group))
            else:
                ann_groups.append(list(group))

        return ann_groups

class PolygonsToMasks(Transform, CliPlugin):
    def transform_item(self, item):
        annotations = []
        for ann in item.annotations:
            if ann.type == AnnotationType.polygon:
                if not item.has_image:
                    raise Exception("Image info is required for this transform")
                h, w = item.image.shape[:2]
                annotations.append(self.convert_polygon(ann, h, w))
            else:
                annotations.append(ann)

        return self.wrap_item(item, annotations=annotations)

    @staticmethod
    def convert_polygon(polygon, img_h, img_w):
        rle = mask_utils.frPyObjects([polygon.points], img_h, img_w)[0]

        return RleMask(rle=rle, label=polygon.label, z_order=polygon.z_order,
            id=polygon.id, attributes=polygon.attributes, group=polygon.group)

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
                        (self.NAME, item.id))
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
