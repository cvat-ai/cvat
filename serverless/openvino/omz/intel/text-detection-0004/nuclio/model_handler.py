# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
import cv2
import numpy as np
from model_loader import ModelLoader
from shared import to_cvat_mask


class PixelLinkDecoder():
    def __init__(self, pixel_threshold, link_threshold):
        four_neighbours = False
        if four_neighbours:
            self._get_neighbours = self._get_neighbours_4
        else:
            self._get_neighbours = self._get_neighbours_8
        self.pixel_conf_threshold = pixel_threshold
        self.link_conf_threshold = link_threshold

    def decode(self, height, width, detections: dict):
        self.image_height = height
        self.image_width = width
        self.pixel_scores = self._set_pixel_scores(detections['model/segm_logits/add'])
        self.link_scores = self._set_link_scores(detections['model/link_logits_/add'])

        self.pixel_mask = self.pixel_scores >= self.pixel_conf_threshold
        self.link_mask = self.link_scores >= self.link_conf_threshold
        self.points = list(zip(*np.where(self.pixel_mask)))
        self.h, self.w = np.shape(self.pixel_mask)
        self.group_mask = dict.fromkeys(self.points, -1)
        self.bboxes = None
        self.root_map = None
        self.mask = None

        self._decode()

    def _softmax(self, x, axis=None):
        return np.exp(x - self._logsumexp(x, axis=axis, keepdims=True))

    # pylint: disable=no-self-use
    def _logsumexp(self, a, axis=None, b=None, keepdims=False, return_sign=False):
        if b is not None:
            a, b = np.broadcast_arrays(a, b)
            if np.any(b == 0):
                a = a + 0.  # promote to at least float
                a[b == 0] = -np.inf

        a_max = np.amax(a, axis=axis, keepdims=True)

        if a_max.ndim > 0:
            a_max[~np.isfinite(a_max)] = 0
        elif not np.isfinite(a_max):
            a_max = 0

        if b is not None:
            b = np.asarray(b)
            tmp = b * np.exp(a - a_max)
        else:
            tmp = np.exp(a - a_max)

        # suppress warnings about log of zero
        with np.errstate(divide='ignore'):
            s = np.sum(tmp, axis=axis, keepdims=keepdims)
            if return_sign:
                sgn = np.sign(s)
                s *= sgn  # /= makes more sense but we need zero -> zero
            out = np.log(s)

        if not keepdims:
            a_max = np.squeeze(a_max, axis=axis)
        out += a_max

        if return_sign:
            return out, sgn
        else:
            return out

    def _set_pixel_scores(self, pixel_scores):
        "get softmaxed properly shaped pixel scores"
        tmp = np.transpose(pixel_scores, (0, 2, 3, 1))
        return self._softmax(tmp, axis=-1)[0, :, :, 1]

    def _set_link_scores(self, link_scores):
        "get softmaxed properly shaped links scores"
        tmp = np.transpose(link_scores, (0, 2, 3, 1))
        tmp_reshaped = tmp.reshape(tmp.shape[:-1] + (8, 2))
        return self._softmax(tmp_reshaped, axis=-1)[0, :, :, :, 1]

    def _find_root(self, point):
        root = point
        update_parent = False
        tmp = self.group_mask[root]
        while tmp != -1:
            root = tmp
            tmp = self.group_mask[root]
            update_parent = True
        if update_parent:
            self.group_mask[point] = root
        return root

    def _join(self, p1, p2):
        root1 = self._find_root(p1)
        root2 = self._find_root(p2)
        if root1 != root2:
            self.group_mask[root2] = root1

    def _get_index(self, root):
        if root not in self.root_map:
            self.root_map[root] = len(self.root_map) + 1
        return self.root_map[root]

    def _get_all(self):
        self.root_map = {}
        self.mask = np.zeros_like(self.pixel_mask, dtype=np.int32)

        for point in self.points:
            point_root = self._find_root(point)
            bbox_idx = self._get_index(point_root)
            self.mask[point] = bbox_idx

    def _get_neighbours_8(self, x, y):
        w, h = self.w, self.h
        tmp = [(0, x - 1, y - 1), (1, x, y - 1),
               (2, x + 1, y - 1), (3, x - 1, y),
               (4, x + 1, y), (5, x - 1, y + 1),
               (6, x, y + 1), (7, x + 1, y + 1)]

        return [i for i in tmp if i[1] >= 0 and i[1] < w and i[2] >= 0 and i[2] < h]

    def _get_neighbours_4(self, x, y):
        w, h = self.w, self.h
        tmp = [(1, x, y - 1),
               (3, x - 1, y),
               (4, x + 1, y),
               (6, x, y + 1)]

        return [i for i in tmp if i[1] >= 0 and i[1] < w and i[2] >= 0 and i[2] < h]

    def _mask_to_bboxes(self, min_area=300, min_height=10):
        self.bboxes = []
        max_bbox_idx = self.mask.max()
        mask_tmp = cv2.resize(self.mask, (self.image_width, self.image_height), interpolation=cv2.INTER_NEAREST)

        for bbox_idx in range(1, max_bbox_idx + 1):
            bbox_mask = mask_tmp == bbox_idx
            cnts, _ = cv2.findContours(bbox_mask.astype(np.uint8), cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
            if len(cnts) == 0:
                continue
            cnt = cnts[0]
            rect, w, h = self._min_area_rect(cnt)
            if min(w, h) < min_height:
                continue
            if w * h < min_area:
                continue
            self.bboxes.append(self._order_points(rect))

    # pylint: disable=no-self-use
    def _min_area_rect(self, cnt):
        rect = cv2.minAreaRect(cnt)
        w, h = rect[1]
        box = cv2.boxPoints(rect)
        box = np.int0(box)
        return box, w, h

    # pylint: disable=no-self-use
    def _order_points(self, rect):
        """ (x, y)
            Order: TL, TR, BR, BL
        """
        tmp = np.zeros_like(rect)
        sums = rect.sum(axis=1)
        tmp[0] = rect[np.argmin(sums)]
        tmp[2] = rect[np.argmax(sums)]
        diff = np.diff(rect, axis=1)
        tmp[1] = rect[np.argmin(diff)]
        tmp[3] = rect[np.argmax(diff)]
        return tmp

    def _decode(self):
        for point in self.points:
            y, x = point
            neighbours = self._get_neighbours(x, y)
            for n_idx, nx, ny in neighbours:
                link_value = self.link_mask[y, x, n_idx]
                pixel_cls = self.pixel_mask[ny, nx]
                if link_value and pixel_cls:
                    self._join(point, (ny, nx))

        self._get_all()
        self._mask_to_bboxes()

class ModelHandler:
    def __init__(self, labels):
        base_dir = os.path.abspath(os.environ.get("MODEL_PATH",
            "/opt/nuclio/open_model_zoo/intel/text-detection-0004/FP32"))
        model_xml = os.path.join(base_dir, "text-detection-0004.xml")
        model_bin = os.path.join(base_dir, "text-detection-0004.bin")
        self.model = ModelLoader(model_xml, model_bin)
        self.labels = labels

    def infer(self, image, pixel_threshold, link_threshold):
        output_layer = self.model.infer(image)

        results = []
        obj_class = 1
        pcd = PixelLinkDecoder(pixel_threshold, link_threshold)

        pcd.decode(image.height, image.width, output_layer)
        for box in pcd.bboxes:
            mask = pcd.pixel_mask
            mask = np.array(mask, dtype=np.uint8)
            mask = cv2.resize(mask, dsize=(image.width, image.height), interpolation=cv2.INTER_CUBIC)
            cv2.normalize(mask, mask, 0, 255, cv2.NORM_MINMAX)

            box = box.ravel().tolist()
            x_min = min(box[::2])
            x_max = max(box[::2])
            y_min = min(box[1::2])
            y_max = max(box[1::2])
            cvat_mask = to_cvat_mask((x_min, y_min, x_max, y_max), mask)

            results.append({
                "confidence": None,
                "label": self.labels.get(obj_class, "unknown"),
                "points": box,
                "mask": cvat_mask,
                "type": "mask",
            })

        return results
