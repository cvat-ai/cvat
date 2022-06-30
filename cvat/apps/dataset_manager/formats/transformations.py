# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import math
import cv2
import numpy as np
from itertools import chain
from pycocotools import mask as mask_utils
from pycocotools import mask as cocomask
from skimage import measure

from datumaro.components.extractor import ItemTransform
import datumaro.components.annotation as datum_annotation

class RotatedBoxesToPolygons(ItemTransform):
    def _rotate_point(self, p, angle, cx, cy):
        [x, y] = p
        rx = cx + math.cos(angle) * (x - cx) - math.sin(angle) * (y - cy)
        ry = cy + math.sin(angle) * (x - cx) + math.cos(angle) * (y - cy)
        return rx, ry

    def transform_item(self, item):
        annotations = item.annotations[:]
        anns = [p for p in annotations if p.type == datum_annotation.AnnotationType.bbox and p.attributes['rotation']]
        for ann in anns:
            rotation = math.radians(ann.attributes['rotation'])
            x0, y0, x1, y1 = ann.points
            [cx, cy] = [(x0 + (x1 - x0) / 2), (y0 + (y1 - y0) / 2)]
            anno_points = list(chain.from_iterable(
                map(lambda p: self._rotate_point(p, rotation, cx, cy), [(x0, y0), (x1, y0), (x1, y1), (x0, y1)])
            ))

            annotations.remove(ann)
            annotations.append(datum_annotation.Polygon(anno_points,
                label=ann.label, attributes=ann.attributes, group=ann.group,
                z_order=ann.z_order))

        return item.wrap(annotations=annotations)

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
        return datum_annotation.RleMask(rle=rle, label=ellipse.label, z_order=ellipse.z_order,
            attributes=ellipse.attributes, group=ellipse.group)

class RawMaskToRLE:

    @staticmethod
    def points_to_np_array_converter(points):
#     points = [17, 10, 27, 15, 23, 18, 20, 21, 18, 23, 16, 24, 15, 26, 13, 27, 13, 27, 12, 29, 10, 30, 9, 32, 7, 34, 5, 36, 3, 38, 2, 38, 2, 39, 1, 39, 1, 120, 1, 39, 1, 39, 1, 39, 2, 38, 2, 38, 3, 37, 3, 37, 3, 37, 4, 36, 4, 35, 6, 34, 7, 33, 7, 32, 9, 30, 10, 29, 13, 26, 15, 23, 18, 20, 22, 15, 12, 79, 304, 119, 344]

        rle = points[:-4]
        [left,top,right,bottom]  = points[-4:]
        width = right - left
        height = bottom - top
        decoded = np.zeros(width * height, dtype=int)
        latestIdx = len(rle) - 4
        decodedIdx = 0
        value = 0

        for rleCountIdx in range(latestIdx):
            count = rle[rleCountIdx]
            while count > 0:
                decoded[decodedIdx] = value
                decodedIdx+=1
                count-=1
            value = abs(value - 1);
        #
        complete_rle = np.append(decoded, [left, top, right, bottom])

        np_array = np.array(decoded).reshape(height,width)

        # im = Image.fromarray(np.uint8(cm.gist_earth(np_array)*255))

        return np_array

    @staticmethod
    def convert_rle (rle_object):
        # xs = [p for p in rle_object.points[0::2]]
        # ys = [p for p in rle_object.points[1::2]]
        # x0 = min(xs)
        # x1 = max(xs)
        # y0 = min(ys)
        # y1 = max(ys)
        # x,y,w,h = [x0, y0, x1 - x0, y1 - y0]
        # rle = mask_utils.frPyObjects([rle_object.points], y + h, x + w)

        # points = rle_object.points

        # rle = mask_utils.frPyObjects(list(int (v) for v in points[:-4]), points[-1]- points[-3], points[-2] - points[-4])
        # rle = mask_utils.frPyObjects([list(int (v) for v in points[:-4])], points[-1]- points[-3], points[-2] - points[-4])
        # rle = mask_utils.frPyObjects([rle_object.points], img_h, img_w)


        mask = RawMaskToRLE.points_to_np_array_converter(rle_object.points)

        fortran_ground_truth_binary_mask = np.asfortranarray(mask)
        encoded_ground_truth = cocomask.encode(fortran_ground_truth_binary_mask.astype(np.uint8))
        ground_truth_area = cocomask.area(encoded_ground_truth)
        ground_truth_bounding_box = cocomask.toBbox(encoded_ground_truth)
        contours = measure.find_contours(mask, 0.5)
        segmentations = []
        for contour in contours:
            contour = np.flip(contour, axis=1).astype(int)
            segmentation = contour.ravel().tolist()
            segmentations.append(segmentation)
        print(segmentations)

        return datum_annotation.RleMask(rle=encoded_ground_truth, label=rle_object.label, z_order=rle_object.z_order,
            attributes=rle_object.attributes, group=rle_object.group)
        # datum_annotation.RleMask(rle = encoded_ground_truth, label=1, z_order = 0, attributes=[], group = 0)


        # return rle

