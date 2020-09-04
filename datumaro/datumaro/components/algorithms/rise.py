
# Copyright (C) 2019-2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

# pylint: disable=unused-variable

import numpy as np
from math import ceil

from datumaro.components.extractor import AnnotationType
from datumaro.util.annotation_util import nms


def flatmatvec(mat):
    return np.reshape(mat, (len(mat), -1))

def expand(array, axis=None):
    if axis is None:
        axis = len(array.shape)
    return np.expand_dims(array, axis=axis)

class RISE:
    """
    Implements RISE: Randomized Input Sampling for
    Explanation of Black-box Models algorithm
    See explanations at: https://arxiv.org/pdf/1806.07421.pdf
    """

    def __init__(self, model,
            max_samples=None, mask_width=7, mask_height=7, prob=0.5,
            iou_thresh=0.9, nms_thresh=0.0, det_conf_thresh=0.0,
            batch_size=1):
        self.model = model
        self.max_samples = max_samples
        self.mask_height = mask_height
        self.mask_width = mask_width
        self.prob = prob
        self.iou_thresh = iou_thresh
        self.nms_thresh = nms_thresh
        self.det_conf_thresh = det_conf_thresh
        self.batch_size = batch_size

    @staticmethod
    def split_outputs(annotations):
        labels = []
        bboxes = []
        for r in annotations:
            if r.type is AnnotationType.label:
                labels.append(r)
            elif r.type is AnnotationType.bbox:
                bboxes.append(r)
        return labels, bboxes

    def normalize_hmaps(self, heatmaps, counts):
        eps = np.finfo(heatmaps.dtype).eps
        mhmaps = flatmatvec(heatmaps)
        mhmaps /= expand(counts * self.prob + eps)
        mhmaps -= expand(np.min(mhmaps, axis=1))
        mhmaps /= expand(np.max(mhmaps, axis=1) + eps)
        return np.reshape(mhmaps, heatmaps.shape)

    def apply(self, image, progressive=False):
        import cv2

        assert len(image.shape) in [2, 3], \
            "Expected an input image in (H, W, C) format"
        if len(image.shape) == 3:
            assert image.shape[2] in [3, 4], "Expected BGR or BGRA input"
        image = image[:, :, :3].astype(np.float32)

        model = self.model
        iou_thresh = self.iou_thresh

        image_size = np.array((image.shape[:2]))
        mask_size = np.array((self.mask_height, self.mask_width))
        cell_size = np.ceil(image_size / mask_size)
        upsampled_size = np.ceil((mask_size + 1) * cell_size)

        rng = lambda shape=None: np.random.rand(*shape)
        samples = np.prod(image_size)
        if self.max_samples is not None:
            samples = min(self.max_samples, samples)
        batch_size = self.batch_size

        result = next(iter(model.launch(expand(image, 0))))
        result_labels, result_bboxes = self.split_outputs(result)
        if 0 < self.det_conf_thresh:
            result_bboxes = [b for b in result_bboxes \
                if self.det_conf_thresh <= b.attributes['score']]
        if 0 < self.nms_thresh:
            result_bboxes = nms(result_bboxes, self.nms_thresh)

        predicted_labels = set()
        if len(result_labels) != 0:
            predicted_label = max(result_labels,
                key=lambda r: r.attributes['score']).label
            predicted_labels.add(predicted_label)
        if len(result_bboxes) != 0:
            for bbox in result_bboxes:
                predicted_labels.add(bbox.label)
        predicted_labels = { label: idx \
            for idx, label in enumerate(predicted_labels) }

        predicted_bboxes = result_bboxes

        heatmaps_count = len(predicted_labels) + len(predicted_bboxes)
        heatmaps = np.zeros((heatmaps_count, *image_size), dtype=np.float32)
        total_counts = np.zeros(heatmaps_count, dtype=np.int32)
        confs = np.zeros(heatmaps_count, dtype=np.float32)

        heatmap_id = 0

        label_heatmaps = None
        label_total_counts = None
        label_confs = None
        if len(predicted_labels) != 0:
            step = len(predicted_labels)
            label_heatmaps = heatmaps[heatmap_id : heatmap_id + step]
            label_total_counts = total_counts[heatmap_id : heatmap_id + step]
            label_confs = confs[heatmap_id : heatmap_id + step]
            heatmap_id += step

        bbox_heatmaps = None
        bbox_total_counts = None
        bbox_confs = None
        if len(predicted_bboxes) != 0:
            step = len(predicted_bboxes)
            bbox_heatmaps = heatmaps[heatmap_id : heatmap_id + step]
            bbox_total_counts = total_counts[heatmap_id : heatmap_id + step]
            bbox_confs = confs[heatmap_id : heatmap_id + step]
            heatmap_id += step

        ups_mask = np.empty(upsampled_size.astype(int), dtype=np.float32)
        masks = np.empty((batch_size, *image_size), dtype=np.float32)

        full_batch_inputs = np.empty((batch_size, *image.shape), dtype=np.float32)
        current_heatmaps = np.empty_like(heatmaps)
        for b in range(ceil(samples / batch_size)):
            batch_pos = b * batch_size
            current_batch_size = min(samples - batch_pos, batch_size)

            batch_masks = masks[: current_batch_size]
            for i in range(current_batch_size):
                mask = (rng(mask_size) < self.prob).astype(np.float32)
                cv2.resize(mask, (int(upsampled_size[1]), int(upsampled_size[0])),
                    ups_mask)

                offsets = np.round(rng((2,)) * cell_size)
                mask = ups_mask[
                    int(offsets[0]):int(image_size[0] + offsets[0]),
                    int(offsets[1]):int(image_size[1] + offsets[1]) ]
                batch_masks[i] = mask

            batch_inputs = full_batch_inputs[:current_batch_size]
            np.multiply(expand(batch_masks), expand(image, 0), out=batch_inputs)

            results = model.launch(batch_inputs)
            for mask, result in zip(batch_masks, results):
                result_labels, result_bboxes = self.split_outputs(result)

                confs.fill(0)
                if len(predicted_labels) != 0:
                    for r in result_labels:
                        idx = predicted_labels.get(r.label, None)
                        if idx is not None:
                            label_total_counts[idx] += 1
                            label_confs[idx] += r.attributes['score']
                    for r in result_bboxes:
                        idx = predicted_labels.get(r.label, None)
                        if idx is not None:
                            label_total_counts[idx] += 1
                            label_confs[idx] += r.attributes['score']

                if len(predicted_bboxes) != 0 and len(result_bboxes) != 0:
                    if 0 < self.det_conf_thresh:
                        result_bboxes = [b for b in result_bboxes \
                            if self.det_conf_thresh <= b.attributes['score']]
                    if 0 < self.nms_thresh:
                        result_bboxes = nms(result_bboxes, self.nms_thresh)

                    for detection in result_bboxes:
                        for pred_idx, pred in enumerate(predicted_bboxes):
                            if pred.label != detection.label:
                                continue

                            iou = pred.iou(detection)
                            assert iou == -1 or 0 <= iou and iou <= 1
                            if iou < iou_thresh:
                                continue

                            bbox_total_counts[pred_idx] += 1

                            conf = detection.attributes['score']
                            bbox_confs[pred_idx] += conf

                np.multiply.outer(confs, mask, out=current_heatmaps)
                heatmaps += current_heatmaps

                if progressive:
                    yield self.normalize_hmaps(heatmaps.copy(), total_counts)

        yield self.normalize_hmaps(heatmaps, total_counts)