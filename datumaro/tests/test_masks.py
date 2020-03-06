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

    def _test_mask_to_rle(self, source_mask):
        rle_uncompressed = mask_tools.mask_to_rle(source_mask)

        from pycocotools import mask as mask_utils
        resulting_mask = mask_utils.frPyObjects(
            rle_uncompressed, *rle_uncompressed['size'])
        resulting_mask = mask_utils.decode(resulting_mask)

        self.assertTrue(np.array_equal(source_mask, resulting_mask),
            '%s\n%s\n' % (source_mask, resulting_mask))

    def test_mask_to_rle_multi(self):
        cases = [
            np.array([
                [0, 1, 1, 1, 0, 1, 1, 1, 1, 0],
                [0, 0, 1, 1, 0, 1, 0, 1, 0, 0],
                [0, 0, 0, 1, 0, 1, 1, 0, 0, 0],
                [0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ]),

            np.array([
                [0]
            ]),
            np.array([
                [1]
            ]),

            np.array([
                [1, 0, 0, 0, 0, 0, 0, 1, 0, 0],
                [0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
                [1, 0, 1, 0, 1, 1, 1, 0, 0, 0],
                [1, 1, 0, 1, 0, 1, 1, 1, 1, 0],
                [1, 0, 1, 0, 1, 0, 0, 0, 0, 0],
                [1, 0, 0, 1, 0, 0, 0, 1, 0, 1],
                [1, 1, 0, 0, 1, 1, 0, 0, 0, 1],
                [0, 0, 1, 0, 0, 0, 1, 1, 1, 1],
                [1, 1, 0, 0, 0, 0, 0, 1, 0, 0],
                [1, 1, 1, 1, 1, 0, 1, 0, 1, 0],
                [0, 1, 0, 1, 1, 1, 1, 1, 0, 0],
                [0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
                [1, 1, 0, 1, 0, 0, 1, 1, 1, 1],
            ])
        ]

        for case in cases:
            self._test_mask_to_rle(case)

class ColormapOperationsTest(TestCase):
    def test_can_paint_mask(self):
        mask = np.zeros((1, 3), dtype=np.uint8)
        mask[:, 0] = 0
        mask[:, 1] = 1
        mask[:, 2] = 2

        colormap = mask_tools.generate_colormap(3)

        expected = np.zeros((*mask.shape, 3), dtype=np.uint8)
        expected[:, 0] = colormap[0][::-1]
        expected[:, 1] = colormap[1][::-1]
        expected[:, 2] = colormap[2][::-1]

        actual = mask_tools.paint_mask(mask, colormap)

        self.assertTrue(np.array_equal(expected, actual),
            '%s\nvs.\n%s' % (expected, actual))

    def test_can_unpaint_mask(self):
        colormap = mask_tools.generate_colormap(3)
        inverse_colormap = mask_tools.invert_colormap(colormap)

        mask = np.zeros((1, 3, 3), dtype=np.uint8)
        mask[:, 0] = colormap[0][::-1]
        mask[:, 1] = colormap[1][::-1]
        mask[:, 2] = colormap[2][::-1]

        expected = np.zeros((1, 3), dtype=np.uint8)
        expected[:, 0] = 0
        expected[:, 1] = 1
        expected[:, 2] = 2

        actual = mask_tools.unpaint_mask(mask, inverse_colormap)

        self.assertTrue(np.array_equal(expected, actual),
            '%s\nvs.\n%s' % (expected, actual))

    def test_can_remap_mask(self):
        class_count = 10
        remap_fn = lambda c: class_count - c

        src = np.empty((class_count, class_count), dtype=np.uint8)
        for c in range(class_count):
            src[c:, c:] = c

        expected = np.empty_like(src)
        for c in range(class_count):
            expected[c:, c:] = remap_fn(c)

        actual = mask_tools.remap_mask(src, remap_fn)

        self.assertTrue(np.array_equal(expected, actual),
            '%s\nvs.\n%s' % (expected, actual))

    def test_can_merge_masks(self):
        masks = [
            np.array([0, 2, 4, 0, 0, 1]),
            np.array([0, 1, 1, 0, 2, 0]),
            np.array([0, 0, 2, 3, 0, 0]),
        ]
        expected = \
            np.array([0, 1, 2, 3, 2, 1])

        actual = mask_tools.merge_masks(masks)

        self.assertTrue(np.array_equal(expected, actual),
            '%s\nvs.\n%s' % (expected, actual))