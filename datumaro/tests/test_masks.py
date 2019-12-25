import numpy as np

from unittest import TestCase

import datumaro.util.mask_tools as mask_tools


class PolygonConversionsTest(TestCase):
    def test_mask_can_be_converted_to_polygon(self):
        mask = np.array([
            [0, 1, 1, 1, 0, 1, 1, 1, 1, 0],
            [0, 0, 1, 1, 0, 1, 0, 1, 0, 0],
            [0, 0, 0, 1, 0, 1, 1, 0, 0, 0],
            [0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ])
        expected = [
            [1, 0, 3, 0, 3, 2, 1, 0],
            [5, 0, 8, 0, 5, 3],
        ]

        computed = mask_tools.mask_to_polygons(mask)

        self.assertEqual(len(expected), len(computed))

    def test_can_crop_covered_segments(self):
        image_size = [7, 7]
        initial = [
            [1, 1, 6, 1, 6, 6, 1, 6], # rectangle
            mask_tools.mask_to_rle(np.array([
                [0, 0, 0, 0, 0, 0, 0],
                [0, 0, 1, 0, 1, 1, 0],
                [0, 1, 1, 0, 1, 1, 0],
                [0, 0, 0, 0, 0, 1, 0],
                [0, 1, 1, 0, 0, 1, 0],
                [0, 1, 1, 1, 1, 1, 0],
                [0, 0, 0, 0, 0, 0, 0],
            ])),
            [1, 1, 6, 6, 1, 6], # lower-left triangle
        ]
        expected = [
            np.array([
                [0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 1, 0, 0, 0],
                [0, 0, 0, 1, 0, 0, 0],
                [0, 0, 0, 0, 1, 0, 0],
                [0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0],
            ]), # half-covered
            np.array([
                [0, 0, 0, 0, 0, 0, 0],
                [0, 0, 1, 0, 1, 1, 0],
                [0, 0, 0, 0, 1, 1, 0],
                [0, 0, 0, 0, 0, 1, 0],
                [0, 0, 0, 0, 0, 1, 0],
                [0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0],
            ]), # half-covered
            mask_tools.rles_to_mask([initial[2]], *image_size), # unchanged
        ]

        computed = mask_tools.crop_covered_segments(initial, *image_size,
            ratio_tolerance=0, return_masks=True)

        self.assertEqual(len(initial), len(computed))
        for i, (e_mask, c_mask) in enumerate(zip(expected, computed)):
            self.assertTrue(np.array_equal(e_mask, c_mask),
                '#%s: %s\n%s\n' % (i, e_mask, c_mask))