# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import unittest

import numpy as np

from cvat.apps.quality_control.comparison_report import UNMATCHED_LABEL_NAME, ConfusionMatrix
from cvat.apps.quality_control.feedback import get_confusion_matrix_feedback


class TestConfusionMatrixFeedback(unittest.TestCase):
    @staticmethod
    def matrix(labels, rows):
        return ConfusionMatrix(labels=labels, rows=np.array(rows, dtype=int))

    def test_confused_classes_and_unmatched_annotations(self):
        matrix = self.matrix(
            ["A", "B", "C", UNMATCHED_LABEL_NAME],
            [[32, 12, 0, 0], [9, 27, 0, 0], [0, 0, 18, 10], [0, 0, 10, 0]],
        )
        original_rows = matrix.rows.copy()

        self.assertEqual(
            get_confusion_matrix_feedback([matrix]),
            [
                'Confused classes: "A" and "B"',
                'Missing annotations: "C"',
                'Extra annotations: "C"',
            ],
        )
        np.testing.assert_array_equal(matrix.rows, original_rows)

    def test_pair_threshold_combines_both_directions(self):
        for forward, backward, expected in [
            (2, 0, []),
            (2, 1, ['Confused classes: "A" and "B"']),
            (0, 3, ['Confused classes: "A" and "B"']),
        ]:
            with self.subTest(forward=forward, backward=backward):
                matrix = self.matrix(["B", "A"], [[10, forward], [backward, 10]])
                self.assertEqual(get_confusion_matrix_feedback([matrix]), expected)

    def test_missing_and_extra_have_independent_thresholds_and_weights(self):
        for missing, extra, expected in [
            (2, 0, []),
            (0, 2, []),
            (1, 2, []),
            (2, 2, []),
            (0, 3, ['Extra annotations: "A"']),
            (3, 0, ['Missing annotations: "A"']),
            (3, 2, ['Missing annotations: "A"']),
            (2, 3, ['Extra annotations: "A"']),
            (3, 3, ['Missing annotations: "A"', 'Extra annotations: "A"']),
            (3, 4, ['Extra annotations: "A"', 'Missing annotations: "A"']),
        ]:
            with self.subTest(missing=missing, extra=extra):
                matrix = self.matrix(["A", UNMATCHED_LABEL_NAME], [[10, extra], [missing, 0]])
                self.assertEqual(get_confusion_matrix_feedback([matrix]), expected)

    def test_unmatched_is_located_by_name(self):
        matrix = self.matrix([UNMATCHED_LABEL_NAME, "B", "A"], [[0, 4, 0], [0, 10, 3], [0, 0, 10]])
        self.assertEqual(
            get_confusion_matrix_feedback([matrix]),
            [
                'Missing annotations: "B"',
                'Confused classes: "A" and "B"',
            ],
        )

    def test_duplicate_requirements_do_not_accumulate_weight(self):
        pair = self.matrix(["A", "B"], [[10, 3], [0, 10]])
        reverse_pair = self.matrix(["B", "A"], [[10, 0], [4, 10]])
        unmatched = self.matrix(["C", UNMATCHED_LABEL_NAME], [[10, 5], [0, 0]])
        self.assertEqual(
            get_confusion_matrix_feedback([pair, reverse_pair, unmatched, pair]),
            [
                'Extra annotations: "C"',
                'Confused classes: "A" and "B"',
            ],
        )

    def test_repeated_small_discrepancies_do_not_reach_threshold(self):
        matrix = self.matrix(["A", "B", UNMATCHED_LABEL_NAME], [[10, 2, 2], [0, 10, 0], [0, 0, 0]])
        self.assertEqual(get_confusion_matrix_feedback([matrix, matrix, matrix]), [])

    def test_missing_and_extra_are_deduplicated_separately(self):
        first = self.matrix(["A", UNMATCHED_LABEL_NAME], [[10, 3], [4, 0]])
        second = self.matrix(["A", UNMATCHED_LABEL_NAME], [[10, 5], [3, 0]])
        expected = ['Extra annotations: "A"', 'Missing annotations: "A"']
        self.assertEqual(get_confusion_matrix_feedback([first, second, first]), expected)
        self.assertEqual(get_confusion_matrix_feedback([second, first]), expected)

    def test_top_three_counts_missing_and_extra_as_separate_hints(self):
        matrix = self.matrix(["A", "B", UNMATCHED_LABEL_NAME], [[10, 6, 4], [0, 10, 3], [5, 0, 0]])
        self.assertEqual(
            get_confusion_matrix_feedback([matrix]),
            ['Confused classes: "A" and "B"', 'Missing annotations: "A"', 'Extra annotations: "A"'],
        )

    def test_top_three_and_ties_are_independent_of_matrix_order(self):
        matrix = self.matrix(
            ["D", "C", "B", "A", UNMATCHED_LABEL_NAME],
            [
                [10, 0, 0, 0, 4],
                [0, 10, 5, 4, 4],
                [0, 0, 10, 4, 0],
                [0, 0, 0, 10, 0],
                [0, 0, 0, 0, 0],
            ],
        )
        reordered = self.matrix(list(reversed(matrix.labels)), matrix.rows[::-1, ::-1])
        expected = [
            'Confused classes: "B" and "C"',
            'Confused classes: "A" and "B"',
            'Confused classes: "A" and "C"',
        ]
        self.assertEqual(get_confusion_matrix_feedback([matrix]), expected)
        self.assertEqual(get_confusion_matrix_feedback([reordered]), expected)

    def test_pair_and_unmatched_label_are_distinct_topics(self):
        matrix = self.matrix(["A", "B", UNMATCHED_LABEL_NAME], [[10, 3, 3], [0, 10, 0], [0, 0, 0]])
        self.assertEqual(
            get_confusion_matrix_feedback([matrix]),
            [
                'Confused classes: "A" and "B"',
                'Extra annotations: "A"',
            ],
        )

    def test_empty_and_correct_matrices_produce_no_feedback(self):
        self.assertEqual(get_confusion_matrix_feedback([]), [])
        for matrix in [
            ConfusionMatrix(labels=None, rows=None),
            ConfusionMatrix(labels=["A"], rows=None),
            self.matrix([], []),
            self.matrix(["A", "B", UNMATCHED_LABEL_NAME], np.diag([100, 200, 0])),
            self.matrix([UNMATCHED_LABEL_NAME], [[10]]),
        ]:
            with self.subTest(labels=matrix.labels):
                self.assertEqual(get_confusion_matrix_feedback([matrix]), [])

    def test_label_names_are_preserved(self):
        matrix = self.matrix(['A "quoted" <tag> & B', UNMATCHED_LABEL_NAME], [[0, 3], [0, 0]])
        self.assertEqual(
            get_confusion_matrix_feedback([matrix]),
            ['Extra annotations: "A "quoted" <tag> & B"'],
        )
