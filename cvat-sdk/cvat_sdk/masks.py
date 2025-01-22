# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import math
from collections.abc import Sequence

import numpy as np
from numpy.typing import ArrayLike


def encode_mask(bitmap: ArrayLike, /, bbox: Sequence[float]) -> list[float]:
    """
    Encodes an image mask into an array of numbers suitable for the "points"
    attribute of a LabeledShapeRequest object of type "mask".

    bitmap must be a boolean array of shape (H, W), where H is the height and
    W is the width of the image that the mask applies to.

    bbox must have the form [x1, y1, x2, y2], where (0, 0) <= (x1, y1) < (x2, y2) <= (W, H).
    The mask will be limited to points between (x1, y1) and (x2, y2).
    """

    bitmap = np.asanyarray(bitmap)
    if bitmap.ndim != 2:
        raise ValueError("bitmap must have 2 dimensions")
    if bitmap.dtype != np.bool_:
        raise ValueError("bitmap must have boolean items")

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
