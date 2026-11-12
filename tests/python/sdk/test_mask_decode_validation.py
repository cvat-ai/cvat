# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import gc
import tracemalloc

import numpy as np
import pytest

from cvat_sdk.masks import decode_mask, encode_mask


@pytest.mark.parametrize("run_length", [1_000_000, 2_000_000])
def test_mismatched_run_lengths_are_rejected_without_allocating_the_bitmap(run_length):
    encoded = [0, run_length, 0, 0, 1, 1]
    gc.collect()
    tracemalloc.start()
    try:
        with pytest.raises(ValueError, match="encoded bitmap does not match encoded bounding box"):
            decode_mask(encoded, image_width=2, image_height=2)
        _, peak = tracemalloc.get_traced_memory()
    finally:
        tracemalloc.stop()

    # Only the short RLE and a 2x2 bounding box are involved. Expanding the
    # invalid run first would allocate one or two million boolean pixels.
    assert peak < 128 * 1024
    assert encoded == [0, run_length, 0, 0, 1, 1]


@pytest.mark.parametrize("runs", [[3], [5], [0, 5], [2, 3], [2**65], [2**64, 2**64]])
def test_mismatched_totals_have_the_documented_validation_error(runs):
    with pytest.raises(ValueError, match="encoded bitmap does not match encoded bounding box"):
        decode_mask([*runs, 0, 0, 1, 1], image_width=2, image_height=2)


@pytest.mark.parametrize(
    "runs,expected",
    [
        ([4], [[False, False], [False, False]]),
        ([0, 4], [[True, True], [True, True]]),
        ([1, 1, 1, 1], [[False, True], [False, True]]),
        ([0, 0, 4], [[False, False], [False, False]]),
        ([0, 1, 0, 1, 0, 1, 0, 1], [[True, True], [True, True]]),
        ([1.0, 2.0, 1.0], [[False, True], [True, False]]),
    ],
)
def test_valid_zero_runs_and_integer_float_counts_keep_their_pixels(runs, expected):
    actual = decode_mask([*runs, 0, 0, 1, 1], image_width=2, image_height=2)
    np.testing.assert_array_equal(actual, expected)
    assert actual.dtype == np.bool_


@pytest.mark.parametrize("runs", [[5, -1], [-1, 5], [-1]])
def test_negative_runs_remain_invalid(runs):
    with pytest.raises(ValueError):
        decode_mask([*runs, 0, 0, 1, 1], image_width=2, image_height=2)


def test_offset_mask_and_native_encoder_round_trip():
    expected = np.zeros((4, 5), dtype=bool)
    expected[1, 2] = expected[2, 1] = True
    actual = decode_mask([1, 2, 1, 1, 1, 2, 2], image_width=5, image_height=4)
    np.testing.assert_array_equal(actual, expected)
    encoded = encode_mask(expected)
    assert encoded == [1, 2, 1, 1, 1, 2, 2]
    np.testing.assert_array_equal(decode_mask(encoded, image_width=5, image_height=4), expected)
