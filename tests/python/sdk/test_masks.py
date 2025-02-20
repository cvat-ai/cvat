# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import pytest

try:
    import numpy as np
    from cvat_sdk.masks import encode_mask

except ModuleNotFoundError as e:
    if e.name.split(".")[0] != "numpy":
        raise

    encode_mask = None


@pytest.mark.skipif(encode_mask is None, reason="NumPy is not installed")
class TestMasks:
    def test_encode_mask(self):
        bitmap = np.array(
            [
                np.fromstring("0 0 1 1 1 0", sep=" "),
                np.fromstring("0 1 1 0 0 0", sep=" "),
            ],
            dtype=np.bool_,
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
        ],
    )
    def test_encode_mask_invalid_bbox(self, bbox):
        with pytest.raises(ValueError, match="bbox has invalid coordinates"):
            encode_mask([[True]], bbox)
