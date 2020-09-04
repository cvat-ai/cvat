# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

from itertools import groupby

import numpy as np

from datumaro.components.extractor import _Shape, Mask, AnnotationType, RleMask
from datumaro.util.mask_tools import mask_to_rle


def find_instances(instance_anns):
    instance_anns = sorted(instance_anns, key=lambda a: a.group)
    ann_groups = []
    for g_id, group in groupby(instance_anns, lambda a: a.group):
        if not g_id:
            ann_groups.extend(([a] for a in group))
        else:
            ann_groups.append(list(group))

    return ann_groups

def find_group_leader(group):
    return max(group, key=lambda x: x.get_area())

def _get_bbox(ann):
    if isinstance(ann, (_Shape, Mask)):
        return ann.get_bbox()
    else:
        return ann

def max_bbox(annotations):
    boxes = [_get_bbox(ann) for ann in annotations]
    x0 = min((b[0] for b in boxes), default=0)
    y0 = min((b[1] for b in boxes), default=0)
    x1 = max((b[0] + b[2] for b in boxes), default=0)
    y1 = max((b[1] + b[3] for b in boxes), default=0)
    return [x0, y0, x1 - x0, y1 - y0]

def mean_bbox(annotations):
    le = len(annotations)
    boxes = [_get_bbox(ann) for ann in annotations]
    mlb = sum(b[0] for b in boxes) / le
    mtb = sum(b[1] for b in boxes) / le
    mrb = sum(b[0] + b[2] for b in boxes) / le
    mbb = sum(b[1] + b[3] for b in boxes) / le
    return [mlb, mtb, mrb - mlb, mbb - mtb]

def softmax(x):
    return np.exp(x) / sum(np.exp(x))

def nms(segments, iou_thresh=0.5):
    """
    Non-maxima suppression algorithm.
    """

    indices = np.argsort([b.attributes['score'] for b in segments])
    ious = np.array([[iou(a, b) for b in segments] for a in segments])

    predictions = []
    while len(indices) != 0:
        i = len(indices) - 1
        pred_idx = indices[i]
        to_remove = [i]
        predictions.append(segments[pred_idx])
        for i, box_idx in enumerate(indices[:i]):
            if iou_thresh < ious[pred_idx, box_idx]:
                to_remove.append(i)
        indices = np.delete(indices, to_remove)

    return predictions

def bbox_iou(a, b):
    """
    IoU computations for simple cases with bounding boxes
    """
    bbox_a = _get_bbox(a)
    bbox_b = _get_bbox(b)

    aX, aY, aW, aH = bbox_a
    bX, bY, bW, bH = bbox_b
    in_right = min(aX + aW, bX + bW)
    in_left = max(aX, bX)
    in_top = max(aY, bY)
    in_bottom = min(aY + aH, bY + bH)

    in_w = max(0, in_right - in_left)
    in_h = max(0, in_bottom - in_top)
    intersection = in_w * in_h
    if not intersection:
        return -1

    a_area = aW * aH
    b_area = bW * bH
    union = a_area + b_area - intersection
    return intersection / union

def segment_iou(a, b):
    """
    Generic IoU computation with masks, polygons, and boxes.
    Returns -1 if no intersection, [0; 1] otherwise
    """
    from pycocotools import mask as mask_utils

    a_bbox = a.get_bbox()
    b_bbox = b.get_bbox()

    is_bbox = AnnotationType.bbox in [a.type, b.type]
    if is_bbox:
        a = [a_bbox]
        b = [b_bbox]
    else:
        w = max(a_bbox[0] + a_bbox[2], b_bbox[0] + b_bbox[2])
        h = max(a_bbox[1] + a_bbox[3], b_bbox[1] + b_bbox[3])

        def _to_rle(ann):
            if ann.type == AnnotationType.polygon:
                return mask_utils.frPyObjects([ann.points], h, w)
            elif isinstance(ann, RleMask):
                return [ann.rle]
            elif ann.type == AnnotationType.mask:
                return mask_utils.frPyObjects([mask_to_rle(ann.image)], h, w)
            else:
                raise TypeError("Unexpected arguments: %s, %s" % (a, b))
        a = _to_rle(a)
        b = _to_rle(b)
    return float(mask_utils.iou(a, b, [not is_bbox]))

def PDJ(a, b, eps=None, ratio=0.05, bbox=None):
    """
    Percentage of Detected Joints metric.
    Counts the number of matching points.
    """

    assert eps is not None or ratio is not None

    p1 = np.array(a.points).reshape((-1, 2))
    p2 = np.array(b.points).reshape((-1, 2))
    if len(p1) != len(p2):
        return 0

    if not eps:
        if bbox is None:
            bbox = mean_bbox([a, b])

        diag = (bbox[2] ** 2 + bbox[3] ** 2) ** 0.5
        eps = ratio * diag

    dists = np.linalg.norm(p1 - p2, axis=1)
    return np.sum(dists < eps) / len(p1)

def OKS(a, b, sigma=None, bbox=None, scale=None):
    """
    Object Keypoint Similarity metric.
    https://cocodataset.org/#keypoints-eval
    """

    p1 = np.array(a.points).reshape((-1, 2))
    p2 = np.array(b.points).reshape((-1, 2))
    if len(p1) != len(p2):
        return 0

    if not sigma:
        sigma = 0.1
    else:
        assert len(sigma) == len(p1)

    if not scale:
        if bbox is None:
            bbox = mean_bbox([a, b])
        scale = bbox[2] * bbox[3]

    dists = np.linalg.norm(p1 - p2, axis=1)
    return np.sum(np.exp(-(dists ** 2) / (2 * scale * (2 * sigma) ** 2)))

def smooth_line(points, segments):
    assert 2 <= len(points) // 2 and len(points) % 2 == 0

    if len(points) // 2 == segments:
        return points

    points = list(points)
    if len(points) == 2:
        points.extend(points)
    points = np.array(points).reshape((-1, 2))

    lengths = np.linalg.norm(points[1:] - points[:-1], axis=1)
    dists = [0]
    for l in lengths:
        dists.append(dists[-1] + l)

    step = dists[-1] / segments

    new_points = np.zeros((segments + 1, 2))
    new_points[0] = points[0]

    old_segment = 0
    for new_segment in range(1, segments + 1):
        pos = new_segment * step
        while dists[old_segment + 1] < pos and old_segment + 2 < len(dists):
            old_segment += 1

        segment_start = dists[old_segment]
        segment_len = lengths[old_segment]
        prev_p = points[old_segment]
        next_p = points[old_segment + 1]
        r = (pos - segment_start) / segment_len

        new_points[new_segment] = prev_p * (1 - r) + next_p * r

    return new_points, step
