# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import textwrap

import pytest

try:
    import numpy as np
    from cvat_sdk.masks import decode_mask, encode_mask
except ModuleNotFoundError as e:
    if e.name.split(".")[0] != "numpy":
        raise

    numpy_installed = False
else:
    numpy_installed = True


@pytest.mark.skipif(not numpy_installed, reason="NumPy is not installed")
class TestMasks:
    def _bitmap_from_string(self, string: str) -> np.ndarray:
        return np.array(
            [[bool(int(c)) for c in line] for line in textwrap.dedent(string).splitlines()]
        )

    def test_encode_mask_without_bbox(self):
        bitmap = self._bitmap_from_string(
            """\
            0000000
            0001110
            0011000
            0000000
            """
        )

        assert encode_mask(bitmap) == [1, 5, 2, 2, 1, 5, 2]

        bitmap = np.zeros((4, 6), dtype=bool)
        assert encode_mask(bitmap) == [1, 0, 0, 0, 0]

        bitmap = np.ones((4, 6), dtype=bool)
        assert encode_mask(bitmap) == [0, 4 * 6, 0, 0, 5, 3]

    def test_encode_mask_with_bbox(self):
        bitmap = self._bitmap_from_string(
            """\
            001110
            011000
            """
        )
        bbox = [2.9, 0.9, 4.1, 1.1]  # will get rounded to [2, 0, 5, 2]

        # There's slightly different logic for when the cropped mask starts with
        # 0 and 1, so test both.
        # This one starts with 1:
        # 111
        # 100

        assert encode_mask(bitmap, bbox) == [0, 4, 2, 2, 0, 4, 1]

        bbox = [1, 0, 5, 2]

        # This one starts with 0:
        # 0111
        # 1100

        assert encode_mask(bitmap, bbox) == [1, 5, 2, 1, 0, 4, 1]

        bbox = [3, 1, 6, 2]  # zeroes only: 000
        assert encode_mask(bitmap, bbox) == [3, 3, 1, 5, 1]

        bbox = [2, 0, 5, 1]  # ones only: 111
        assert encode_mask(bitmap, bbox) == [0, 3, 2, 0, 4, 0]

        # Edge case: full image
        bbox = [0, 0, 6, 2]
        assert encode_mask(bitmap, bbox) == [2, 3, 2, 2, 3, 0, 0, 5, 1]

    def test_encode_mask_invalid_dim(self):
        with pytest.raises(ValueError, match="bitmap must have 2 dimensions"):
            encode_mask([True], [0, 0, 1, 1])

    def test_encode_mask_invalid_dtype(self):
        with pytest.raises(ValueError, match="bitmap must have boolean items"):
            encode_mask([[1]], [0, 0, 1, 1])

    @pytest.mark.parametrize(
        "bbox",
        [
            [-0.1, 0, 1, 1],
            [0, -0.1, 1, 1],
            [0, 0, 1.1, 1],
            [0, 0, 1, 1.1],
            [1, 0, 0, 1],
            [0, 1, 1, 0],
            [0, 0, 0, 1],
            [0, 0, 1, 0],
        ],
    )
    def test_encode_mask_invalid_bbox(self, bbox):
        with pytest.raises(ValueError, match="bbox has invalid coordinates"):
            encode_mask([[True]], bbox)

    def test_decode_mask(self):
        points = [1, 0, 0, 0, 0]
        np.testing.assert_array_equal(
            decode_mask(points, image_width=6, image_height=4), np.zeros((4, 6), dtype=bool)
        )

        points = [0, 24, 0, 0, 5, 3]
        np.testing.assert_array_equal(
            decode_mask(points, image_width=6, image_height=4),
            np.ones((4, 6), dtype=bool),
        )

        points = [1, 5, 2, 2, 1, 5, 2]

        bitmap = self._bitmap_from_string(
            """\
            0000000
            0001110
            0011000
            0000000
            """
        )
        np.testing.assert_array_equal(decode_mask(points, image_width=7, image_height=4), bitmap)

        # Same mask, but with the bbox covering the whole image.
        points = [10, 3, 3, 2, 10, 0, 0, 6, 3]
        np.testing.assert_array_equal(decode_mask(points, image_width=7, image_height=4), bitmap)

    @pytest.mark.parametrize("image_width, image_height", [(1, 0), (1, -1), (0, 1), (-1, 1)])
    def test_decode_mask_invalid_image_dimensions(self, image_width, image_height):
        with pytest.raises(ValueError, match="invalid image dimensions"):
            decode_mask([1, 0, 0, 0, 0], image_width=image_width, image_height=image_height)

    @pytest.mark.parametrize("points", [[], [1, 2, 3, 4]])
    def test_decode_mask_invalid_too_few_elements(self, points):
        with pytest.raises(ValueError, match="too few elements in encoded mask"):
            decode_mask(points, image_width=1, image_height=1)

    @pytest.mark.parametrize("points", [[1.1, 2, 3, 4, 5], ["1", 2, 3, 4, 5]])
    def test_decode_mask_invalid_non_integer(self, points):
        with pytest.raises(ValueError, match="non-integer value in encoded mask"):
            decode_mask(points, image_width=1, image_height=1)

    @pytest.mark.parametrize(
        "points",
        [
            [9, -1, 1, 3, 3],
            [9, 1, -1, 3, 3],
            [9, 1, 1, 0, 3],
            [9, 1, 1, 3, 0],
            [9, 1, 1, 6, 3],
            [9, 1, 1, 3, 4],
        ],
    )
    def test_decode_mask_invalid_bbox(self, points):
        with pytest.raises(ValueError, match="invalid encoded bounding box"):
            decode_mask(points, image_width=6, image_height=4)

    def test_decode_mask_invalid_mismatched_bbox(self):
        with pytest.raises(ValueError, match="encoded bitmap does not match encoded bounding box"):
            decode_mask([10, 1, 1, 3, 3], image_width=6, image_height=4)

    def _random_subrange(self, rng: np.random.Generator, range_len: int) -> tuple[int, int]:
        subrange_len = rng.integers(1, range_len + 1)
        start = rng.integers(0, range_len - subrange_len + 1)
        return start.item(), (start + subrange_len).item()

    @pytest.mark.parametrize("with_bbox", [False, True])
    def test_roundtrip(self, with_bbox: bool):
        rng = np.random.default_rng(seed=list(b"CVAT"))

        for _ in range(100):
            width, height = rng.integers(1, 11, size=2)
            bitmap = rng.integers(0, 2, size=(height, width), dtype=bool)

            if with_bbox:
                x1, x2 = self._random_subrange(rng, width)
                y1, y2 = self._random_subrange(rng, height)
                points = encode_mask(bitmap, [x1, y1, x2, y2])
                expected = np.zeros((height, width), dtype=bool)
                expected[y1:y2, x1:x2] = bitmap[y1:y2, x1:x2]
            else:
                points = encode_mask(bitmap)
                expected = bitmap

            decoded = decode_mask(points, image_width=width, image_height=height)
            np.testing.assert_array_equal(decoded, expected)
