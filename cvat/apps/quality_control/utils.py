# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


import numpy as np


def array_safe_divide(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    "Scalar (element-wise) array division with NaNs (a / 0) converted to 0"

    divisor = b.copy()
    divisor[b == 0] = 1
    return a / divisor
