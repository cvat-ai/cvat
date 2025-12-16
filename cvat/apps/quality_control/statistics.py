# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from enum import Enum, auto

import numpy as np


class Averaging(Enum):
    weighted = auto()
    micro = auto()
    macro = auto()


def compute_dice_coeff(
    confusion_matrix,
    *,
    avg_mode: Averaging = Averaging.weighted,
    gt_ignored_label_idx: int | None = None,
    excluded_label_idx: int | None = None,
):
    # Rows: GT \ cols: predictions

    if gt_ignored_label_idx is not None:
        confusion_matrix = confusion_matrix.copy()
        confusion_matrix[gt_ignored_label_idx, :] = 0

    matches = np.diag(confusion_matrix)  # TP
    support = np.sum(confusion_matrix, axis=1)  # TP + FP

    total = np.sum(confusion_matrix, axis=1) + np.sum(confusion_matrix, axis=0)  # 2TP + FP + FN
    dice_coeffs = 2 * matches / np.where(total, total, 1)

    existing_support = support > 0
    if excluded_label_idx is not None:
        existing_support[excluded_label_idx] = False

    dice_coeffs[~existing_support] = np.nan

    if avg_mode == Averaging.weighted:
        if not np.any(existing_support):
            assert not np.any(dice_coeffs[existing_support])
            avg = 0
        else:
            avg = np.average(dice_coeffs[existing_support], weights=support[existing_support])
    elif avg_mode == Averaging.micro:
        avg = 2 * np.sum(matches[existing_support]) / (np.sum(total[existing_support]) or 1)
    elif avg_mode == Averaging.macro:
        avg = np.average(dice_coeffs[existing_support])
    else:
        assert False, avg_mode

    return avg, dice_coeffs, support


def compute_accuracy(
    confusion_matrix,
    *,
    gt_ignored_label_idx: int | None = None,
    excluded_label_idx: int | None = None,
    exclude_TN: bool = False,
) -> tuple[float, np.ndarray]:
    # Rows: GT \ cols: predictions

    if gt_ignored_label_idx is not None:
        confusion_matrix = confusion_matrix.copy()
        confusion_matrix[gt_ignored_label_idx, :] = 0

    matched_ann_counts = np.diag(confusion_matrix)
    ds_ann_counts = np.sum(confusion_matrix, axis=1)
    gt_ann_counts = np.sum(confusion_matrix, axis=0)
    total_annotations_count = np.sum(confusion_matrix)

    selected_labels = np.ones(len(confusion_matrix), dtype=bool)
    if excluded_label_idx is not None:
        selected_labels[excluded_label_idx] = False

    if exclude_TN:
        # Jaccard index, for Object Detection
        label_denom = (
            ds_ann_counts  # TP + FP
            + gt_ann_counts  # + TP + FN
            - matched_ann_counts  # - TP
            # ... = TP + FP + FN
        )
        label_accuracies = matched_ann_counts / np.where(label_denom, label_denom, 1)
    else:
        label_accuracies = (
            total_annotations_count  # TP + TN + FP + FN
            - (ds_ann_counts - matched_ann_counts)  # - FP
            - (gt_ann_counts - matched_ann_counts)  # - FN
            # ... = TP + TN
        ) / (total_annotations_count or 1)

    label_accuracies[~selected_labels] = np.nan

    accuracy = np.sum(matched_ann_counts) / (total_annotations_count or 1)

    return accuracy, label_accuracies
