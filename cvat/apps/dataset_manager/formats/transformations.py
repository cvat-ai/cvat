# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import math
from itertools import chain
from typing import Optional

import cv2
import datumaro as dm
import numpy as np
from pycocotools import mask as mask_utils


class RotatedBoxesToPolygons(dm.ItemTransform):
    def _rotate_point(self, p, angle, cx, cy):
        [x, y] = p
        rx = cx + math.cos(angle) * (x - cx) - math.sin(angle) * (y - cy)
        ry = cy + math.sin(angle) * (x - cx) + math.cos(angle) * (y - cy)
        return rx, ry

    def _convert_annotations(self, item: dm.DatasetItem) -> list[dm.Annotation]:
        annotations = item.annotations[:]
        anns = [
            p for p in annotations if p.type == dm.AnnotationType.bbox and p.attributes["rotation"]
        ]
        for ann in anns:
            rotation = math.radians(ann.attributes["rotation"])
            x0, y0, x1, y1 = ann.points
            [cx, cy] = [(x0 + (x1 - x0) / 2), (y0 + (y1 - y0) / 2)]
            anno_points = list(
                chain.from_iterable(
                    self._rotate_point(p, rotation, cx, cy)
                    for p in [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
                )
            )

            annotations.remove(ann)
            annotations.append(
                dm.Polygon(
                    anno_points,
                    label=ann.label,
                    attributes=ann.attributes,
                    group=ann.group,
                    z_order=ann.z_order,
                )
            )
        return annotations

    def transform_item(self, item):
        return item.wrap(annotations=lambda: self._convert_annotations(item))


class MaskConverter:
    @staticmethod
    def cvat_rle_to_dm_rle(shape, img_h: int, img_w: int) -> dm.RleMask:
        "Converts a CVAT RLE to a Datumaro / COCO mask"

        # use COCO representation of CVAT RLE to avoid python loops
        left, top, right, bottom = [math.trunc(v) for v in shape.points[-4:]]
        h = bottom - top + 1
        w = right - left + 1
        cvat_as_coco_rle_uncompressed = {
            "counts": shape.points[:-4],
            "size": [w, h],
        }
        cvat_as_coco_rle_compressed = mask_utils.frPyObjects(
            [cvat_as_coco_rle_uncompressed], h=h, w=w
        )[0]

        # expand the mask to the full image size
        tight_mask = mask_utils.decode(cvat_as_coco_rle_compressed).transpose()
        full_mask = np.zeros((img_h, img_w), dtype=np.uint8)
        full_mask[top : bottom + 1, left : right + 1] = tight_mask

        # obtain RLE
        coco_rle = mask_utils.encode(np.asfortranarray(full_mask))
        return dm.RleMask(
            rle=coco_rle,
            label=shape.label,
            z_order=shape.z_order,
            attributes=shape.attributes,
            group=shape.group,
        )

    @classmethod
    def dm_mask_to_cvat_rle(cls, dm_mask: dm.Mask) -> list[int]:
        "Converts a Datumaro mask to a CVAT RLE"

        # get tight mask
        x, y, w, h = dm_mask.get_bbox()
        top = int(y)
        left = int(x)
        bottom = int(max(y, y + h - 1))
        right = int(max(x, x + w - 1))
        tight_binary_mask = dm_mask.image[top : bottom + 1, left : right + 1]

        # obtain RLE
        cvat_rle = cls.rle(tight_binary_mask.reshape(-1))
        cvat_rle += [left, top, right, bottom]
        return cvat_rle

    @classmethod
    def rle(cls, arr: np.ndarray) -> list[int]:
        "Computes RLE for a flat array"
        # adapted from https://stackoverflow.com/a/32681075

        n = len(arr)
        if n == 0:
            return []

        pairwise_unequal = arr[1:] != arr[:-1]
        rle = np.diff(np.nonzero(pairwise_unequal)[0], prepend=-1, append=n - 1)

        # CVAT RLE starts from 0
        cvat_rle = rle.tolist()
        if arr[0] != 0:
            cvat_rle.insert(0, 0)

        return cvat_rle


class EllipsesToMasks(dm.ItemTransform):
    @staticmethod
    def _convert(ellipse: dm.Ellipse, img_h, img_w):
        cx, cy, rightX, topY = ellipse.c_x, ellipse.c_y, ellipse.x2, ellipse.y1
        rx = rightX - cx
        ry = cy - topY
        center = (round(cx), round(cy))
        axis = (round(rx), round(ry))
        angle = ellipse.attributes.get("rotation", 0)
        mat = np.zeros((img_h, img_w), dtype=np.uint8)

        # TODO: has bad performance for big masks, try to find a better solution
        cv2.ellipse(mat, center, axis, angle, 0, 360, 255, thickness=-1)

        rle = mask_utils.encode(np.asfortranarray(mat))
        return rle

    @staticmethod
    def convert_ellipse(ellipse: dm.Ellipse, img_h, img_w):
        def _lazy_convert():
            return EllipsesToMasks._convert(ellipse, img_h, img_w)

        return dm.RleMask(
            rle=_lazy_convert,
            label=ellipse.label,
            z_order=ellipse.z_order,
            attributes=ellipse.attributes,
            group=ellipse.group,
        )

    @staticmethod
    def _convert_annotations(item: dm.DatasetItem) -> list[dm.Annotation]:
        if not isinstance(item.media, dm.Image):
            raise Exception("Image info is required for this transform")

        img_h, img_w = item.media_as(dm.Image).size

        return [
            (
                EllipsesToMasks.convert_ellipse(ann, img_h, img_w)
                if isinstance(ann, dm.Ellipse)
                else ann
            )
            for ann in item.annotations
        ]

    def transform_item(self, item: dm.DatasetItem) -> Optional[dm.DatasetItem]:
        return item.wrap(annotations=lambda: self._convert_annotations(item))


class MaskToPolygonTransformation:
    """
    Manages common logic for mask to polygons conversion in dataset import.
    This usecase is supposed for backward compatibility for the transition period.
    """

    @classmethod
    def declare_arg_names(cls):
        return ["conv_mask_to_poly"]

    @classmethod
    def convert_dataset(cls, dataset, **kwargs):
        if kwargs.get("conv_mask_to_poly", True):
            dataset.transform("masks_to_polygons")
        return dataset


class SetKeyframeForEveryTrackShape(dm.ItemTransform):
    KEEPS_SUBSETS_INTACT = True

    def transform_item(self, item):
        def convert_annotations():
            annotations = []
            for ann in item.annotations:
                if "track_id" in ann.attributes:
                    ann = ann.wrap(attributes=dict(ann.attributes, keyframe=True))
                annotations.append(ann)
            return annotations

        return item.wrap(annotations=convert_annotations)
