# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from collections.abc import Iterable
from itertools import combinations

from cvat.apps.quality_control.comparison_report import UNMATCHED_LABEL_NAME, ConfusionMatrix

MIN_FEEDBACK_DISCREPANCIES = 3
MAX_FEEDBACK_MESSAGES = 3


def get_confusion_matrix_feedback(matrices: Iterable[ConfusionMatrix]) -> list[str]:
    """Describe the largest discrepancies without exposing counts or replacement labels.

    Missing and extra annotations are separate candidates for each label. Class
    confusion combines both directions for a sorted label pair. For overlapping
    requirements, use the largest weight for each candidate instead of adding counts.
    """
    weights: dict[tuple[str, ...], int] = {}

    for matrix in matrices:
        labels, rows = matrix.labels, matrix.rows
        if not labels or rows is None:
            continue

        label_indices = [i for i, label in enumerate(labels) if label != UNMATCHED_LABEL_NAME]
        for i, j in combinations(label_indices, 2):
            key = ("confused", *sorted((labels[i], labels[j])))
            weight = int(rows[i, j] + rows[j, i])
            weights[key] = max(weights.get(key, 0), weight)

        if UNMATCHED_LABEL_NAME in labels:
            unmatched_index = labels.index(UNMATCHED_LABEL_NAME)
            for i in label_indices:
                # Rows are annotations, columns are ground truth. A failed match
                # can contribute independently to both missing and extra annotations.
                for kind, count in (
                    ("missing", rows[unmatched_index, i]),
                    ("extra", rows[i, unmatched_index]),
                ):
                    key = (kind, labels[i])
                    weights[key] = max(weights.get(key, 0), int(count))

    candidates = sorted(
        (key for key, weight in weights.items() if weight >= MIN_FEEDBACK_DISCREPANCIES),
        # Prefer class pairs on ties, then label names, then missing before extra.
        key=lambda key: (-weights[key], -len(key), key[1:], key[0] == "extra"),
    )

    templates = {
        "confused": 'Confused classes: "{}" and "{}"',
        "missing": 'Missing annotations: "{}"',
        "extra": 'Extra annotations: "{}"',
    }
    return [templates[key[0]].format(*key[1:]) for key in candidates[:MAX_FEEDBACK_MESSAGES]]
