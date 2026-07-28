# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import csv
import unittest
from io import StringIO

import numpy as np

from cvat.apps.quality_control.comparison_report import ConfusionMatrix
from cvat.apps.quality_control.export import _serialize_confusion_matrix_csv


class TestConfusionMatrixCsvExport(unittest.TestCase):
    def test_includes_per_class_and_aggregate_metrics(self) -> None:
        confusion_matrix = ConfusionMatrix(
            labels=["car", "person", "unmatched"],
            rows=np.array(
                [
                    [2, 0, 1],
                    [0, 1, 0],
                    [1, 0, 0],
                ]
            ),
        )

        rows = list(csv.reader(StringIO(_serialize_confusion_matrix_csv(confusion_matrix))))

        self.assertEqual(
            rows,
            [
                ["DS (row) \\ GT (col) label", "car", "person", "unmatched", "precision"],
                ["car", "2", "0", "1", str(2 / 3)],
                ["person", "0", "1", "0", "1.0"],
                ["unmatched", "1", "0", "0", "0.0"],
                ["recall", str(2 / 3), "1.0", "0.0"],
                ["dice coefficient", str(2 / 3), "1.0", "nan"],
                ["jaccard index", "0.5", "1.0", "nan"],
                [""],
                ["avg. accuracy (micro)", "0.6"],
                ["avg. dice coefficient (macro)", "0.8333333333333333"],
            ],
        )
