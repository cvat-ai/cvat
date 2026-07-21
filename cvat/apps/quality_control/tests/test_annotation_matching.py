# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import unittest

import datumaro as dm
import numpy as np

from cvat.apps.quality_control.annotation_matching import Comparator
from cvat.apps.quality_control.comparison_report import ComparisonParameters


def _make_mask_item(mask: np.ndarray) -> dm.DatasetItem:
    return dm.DatasetItem(
        id="frame",
        media=dm.Image.from_numpy(data=np.zeros((*mask.shape, 3), dtype=np.uint8)),
        annotations=[dm.Mask(np.asfortranarray(mask), label=0)],
    )


class TestComparator(unittest.TestCase):
    @staticmethod
    def _make_comparator() -> Comparator:
        return Comparator(
            {dm.AnnotationType.label: dm.LabelCategories.from_iterable(["car"])},
            settings=ComparisonParameters(),
        )

    def test_mask_only_comparator_matches_masks(self) -> None:
        mask = np.zeros((8, 8), dtype=bool)
        mask[2:6, 2:6] = True
        settings = ComparisonParameters()
        settings.included_annotation_types = [dm.AnnotationType.mask]

        comparator = Comparator(
            {dm.AnnotationType.label: dm.LabelCategories.from_iterable(["car"])},
            settings=settings,
        )

        matches, mismatches, gt_unmatched, ds_unmatched, _ = comparator.match_annotations(
            _make_mask_item(mask),
            _make_mask_item(mask.copy()),
        )["all_ann_types"]

        self.assertEqual(len(matches), 1)
        self.assertFalse(mismatches)
        self.assertFalse(gt_unmatched)
        self.assertFalse(ds_unmatched)

    def test_score_is_not_compared_as_a_user_attribute(self) -> None:
        comparator = self._make_comparator()

        result = comparator.match_attrs(
            dm.Label(0, attributes={"score": 0.25}),
            dm.Label(0, attributes={"score": 0.75}),
        )

        self.assertEqual(result, ([], [], [], []))
