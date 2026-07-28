# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import math
from collections.abc import Sequence

import numpy as np
from numpy.typing import ArrayLike, NDArray


def encode_mask(bitmap: ArrayLike, /, bbox: Sequence[float] | None = None) -> list[float]:
    """
    Encodes an image mask into an array of numbers suitable for the "points"
    attribute of a LabeledShapeRequest object of type "mask".

    bitmap must be a boolean array of shape (H, W), where H is the height and
    W is the width of the image that the mask applies to.

    bbox, if specified, must have the form [x1, y1, x2, y2],
    where (0, 0) <= (x1, y1) < (x2, y2) <= (W, H).
    The encoded mask will be limited to points between (x1, y1) and (x2, y2).
    If bbox is None, the encoded mask will include all non-zero points of the bitmap.
    """

    bitmap = np.asanyarray(bitmap)
    if bitmap.ndim != 2:
        raise ValueError("bitmap must have 2 dimensions")
    if bitmap.dtype != np.bool_:
        raise ValueError("bitmap must have boolean items")

    if bbox is None:
        nz_y, nz_x = bitmap.nonzero()
        if nz_x.size == 0 or nz_y.size == 0:
            x1 = y1 = 0
            x2 = y2 = 1
        else:
            x1, y1 = (np.min(nz).item() for nz in (nz_x, nz_y))
            x2, y2 = (np.max(nz).item() + 1 for nz in (nz_x, nz_y))

    else:
        x1, y1 = map(math.floor, bbox[0:2])
        x2, y2 = map(math.ceil, bbox[2:4])

        if not (0 <= x1 < x2 <= bitmap.shape[1] and 0 <= y1 < y2 <= bitmap.shape[0]):
            raise ValueError("bbox has invalid coordinates")

    flat = bitmap[y1:y2, x1:x2].ravel()

    (run_indices,) = np.diff(flat, prepend=[not flat[0]], append=[not flat[-1]]).nonzero()
    if flat[0]:
        run_lengths = np.diff(run_indices, prepend=[0])
    else:
        run_lengths = np.diff(run_indices)

    return run_lengths.tolist() + [x1, y1, x2 - 1, y2 - 1]


def decode_mask(
    encoded: Sequence[float], /, *, image_width: int, image_height: int
) -> NDArray[bool]:
    """
    Decodes a "points" attribute of a LabeledShape/LabeledShapeRequest object of type "mask"
    into a 2D boolean array representing the mask.

    `image_width` and `image_height` must be set to the dimensions
    of the image that the mask applies to.
    The returned mask will have shape (image_height, image_width).
    """

    if len(encoded) < 5:
        raise ValueError("too few elements in encoded mask")

    if image_width <= 0 or image_height <= 0:
        raise ValueError("invalid image dimensions")

    def to_int(x: float) -> int:
        if isinstance(x, int):
            return x
        if isinstance(x, float) and x.is_integer():
            return int(x)
        raise ValueError(f"non-integer value in encoded mask: {x!r}")

    *run_lengths, x1, y1, x2, y2 = map(to_int, encoded)
    x2 += 1
    y2 += 1

    if not (0 <= x1 < x2 <= image_width and 0 <= y1 < y2 <= image_height):
        raise ValueError("invalid encoded bounding box")

    alternating_bools = (np.arange(len(run_lengths)) & 1) != 0
    mask = np.repeat(alternating_bools, run_lengths)
    if mask.size != (y2 - y1) * (x2 - x1):
        raise ValueError("encoded bitmap does not match encoded bounding box")

    full_mask = np.zeros((image_height, image_width), dtype=bool)
    full_mask[y1:y2, x1:x2] = mask.reshape((y2 - y1, x2 - x1))
    return full_mask
