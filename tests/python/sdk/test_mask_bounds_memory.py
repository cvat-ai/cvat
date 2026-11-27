# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import itertools
import tracemalloc

import numpy as np
import pytest

from cvat_sdk.masks import decode_mask, encode_mask


def _reference_encoding(bitmap, bbox=None):
    # A small, direct pixel reference independent of NumPy's bounding reductions.
    if bbox is None:
        foreground = [
            (x, y) for y, row in enumerate(bitmap) for x, value in enumerate(row) if value
        ]
        if foreground:
            xs, ys = zip(*foreground)
            x1, y1, x2, y2 = min(xs), min(ys), max(xs) + 1, max(ys) + 1
        else:
            x1 = y1 = 0
            x2 = y2 = 1
    else:
        x1, y1, x2, y2 = bbox

    pixels = bitmap[y1:y2, x1:x2].ravel().tolist()
    lengths = [len(list(group)) for _, group in itertools.groupby(pixels)]
    if pixels[0]:
        lengths.insert(0, 0)
    return lengths + [x1, y1, x2 - 1, y2 - 1]


@pytest.mark.parametrize("layout", ["contiguous", "transpose", "strided", "reversed"])
@pytest.mark.parametrize("pattern", ["empty", "full", "interior", "corners"])
def test_inferred_bounds_preserve_exact_runs_and_pixels(layout, pattern):
    bitmap = np.zeros((9, 13), dtype=bool)
    if pattern == "full":
        bitmap[:] = True
    elif pattern == "interior":
        bitmap[2:7, 3:11] = True
        bitmap[3:5, 5:8] = False
    elif pattern == "corners":
        bitmap[0, -1] = bitmap[-1, 0] = True

    if layout == "transpose":
        bitmap = bitmap.T
    elif layout == "strided":
        bitmap = bitmap[::2, ::2]
    elif layout == "reversed":
        bitmap = bitmap[::-1, ::-1]
    original = bitmap.copy()
    bitmap.flags.writeable = False

    encoded = encode_mask(bitmap)

    assert encoded == _reference_encoding(bitmap)
    np.testing.assert_array_equal(
        decode_mask(encoded, image_width=bitmap.shape[1], image_height=bitmap.shape[0]),
        original,
    )
    np.testing.assert_array_equal(bitmap, original)


@pytest.mark.parametrize("shape", [(1, 1), (1, 17), (19, 1)])
def test_single_axis_mask_bounds(shape):
    bitmap = np.ones(shape, dtype=bool)
    assert encode_mask(bitmap) == [0, bitmap.size, 0, 0, shape[1] - 1, shape[0] - 1]


def test_explicit_bounds_preserve_crop():
    bitmap = np.ones((9, 13), dtype=bool)
    bitmap[3:6, 6:8] = False
    assert encode_mask(bitmap, [2, 1, 11, 7]) == _reference_encoding(bitmap, [2, 1, 11, 7])


def test_dense_mask_does_not_materialize_per_pixel_coordinates():
    bitmap = np.ones((2048, 2048), dtype=bool)
    tracemalloc.start()
    try:
        encoded = encode_mask(bitmap)
        _, peak = tracemalloc.get_traced_memory()
    finally:
        tracemalloc.stop()

    assert encoded == [0, bitmap.size, 0, 0, 2047, 2047]
    # RLE still scans the cropped bitmap. Only bound inference must avoid the
    # two full intp arrays (16 bytes per foreground pixel on 64-bit systems).
    assert peak < bitmap.nbytes * 5
