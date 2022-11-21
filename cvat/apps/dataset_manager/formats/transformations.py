# Copyright (C) 2021-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

import math
import cv2
import numpy as np
from itertools import chain
from pycocotools import mask as mask_utils

from datumaro.components.extractor import ItemTransform
import datumaro.components.annotation as dm

class RotatedBoxesToPolygons(ItemTransform):
    def _rotate_point(self, p, angle, cx, cy):
        [x, y] = p
        rx = cx + math.cos(angle) * (x - cx) - math.sin(angle) * (y - cy)
        ry = cy + math.sin(angle) * (x - cx) + math.cos(angle) * (y - cy)
        return rx, ry

    def transform_item(self, item):
        annotations = item.annotations[:]
        anns = [p for p in annotations if p.type == dm.AnnotationType.bbox and p.attributes['rotation']]
        for ann in anns:
            rotation = math.radians(ann.attributes['rotation'])
            x0, y0, x1, y1 = ann.points
            [cx, cy] = [(x0 + (x1 - x0) / 2), (y0 + (y1 - y0) / 2)]
            anno_points = list(chain.from_iterable(
                map(lambda p: self._rotate_point(p, rotation, cx, cy), [(x0, y0), (x1, y0), (x1, y1), (x0, y1)])
            ))

            annotations.remove(ann)
            annotations.append(dm.Polygon(anno_points,
                label=ann.label, attributes=ann.attributes, group=ann.group,
                z_order=ann.z_order))

        return item.wrap(annotations=annotations)

class CVATRleToCOCORle(ItemTransform):
    @staticmethod
    def convert_mask(shape, img_h, img_w):
        rle = shape.points[:-4]
        left, top, right = list(math.trunc(v) for v in shape.points[-4:-1])
        mat = np.zeros((img_h, img_w), dtype=np.uint8)
        width = right - left + 1
        value = 0
        offset = 0
        for rleCount in rle:
            rleCount = math.trunc(rleCount)
            while rleCount > 0:
                x, y = offset % width, offset // width
                mat[y + top][x + left] = value
                rleCount -= 1
                offset += 1
            value = abs(value - 1)

        rle = mask_utils.encode(np.asfortranarray(mat))
        return dm.RleMask(rle=rle, label=shape.label, z_order=shape.z_order,
            attributes=shape.attributes, group=shape.group)

class EllipsesToMasks:
    @staticmethod
    def convert_ellipse(ellipse, img_h, img_w):
        cx, cy, rightX, topY = ellipse.points
        rx = rightX - cx
        ry = cy - topY
        center = (round(cx), round(cy))
        axis = (round(rx), round(ry))
        angle = ellipse.rotation
        mat = np.zeros((img_h, img_w), dtype=np.uint8)
        cv2.ellipse(mat, center, axis, angle, 0, 360, 255, thickness=-1)
        rle = mask_utils.encode(np.asfortranarray(mat))
        return dm.RleMask(rle=rle, label=ellipse.label, z_order=ellipse.z_order,
            attributes=ellipse.attributes, group=ellipse.group)

class MaskToPolygonTransformation:
    """
    Manages common logic for mask to polygons conversion in dataset import.
    This usecase is supposed for backward compatibility for the transition period.
    """

    @classmethod
    def declare_arg_names(cls):
        return ['conv_mask_to_poly']

    @classmethod
    def convert_dataset(cls, dataset, **kwargs):
        if kwargs.get('conv_mask_to_poly', True):
            dataset.transform('masks_to_polygons')
        return dataset
