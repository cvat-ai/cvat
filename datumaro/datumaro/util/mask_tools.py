
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from itertools import groupby
import numpy as np

from datumaro.util.image import lazy_image, load_image


def generate_colormap(length=256):
    def get_bit(number, index):
        return (number >> index) & 1

    colormap = np.zeros((length, 3), dtype=int)
    indices = np.arange(length, dtype=int)

    for j in range(7, -1, -1):
        for c in range(3):
            colormap[:, c] |= get_bit(indices, c) << j
        indices >>= 3

    return {
        id: tuple(color) for id, color in enumerate(colormap)
    }

def invert_colormap(colormap):
    return {
        tuple(a): index for index, a in colormap.items()
    }

_default_colormap = generate_colormap()
_default_unpaint_colormap = invert_colormap(_default_colormap)

def _default_unpaint_colormap_fn(r, g, b):
    return _default_unpaint_colormap[(r, g, b)]

def unpaint_mask(painted_mask, colormap=None):
    # expect HWC BGR [0; 255] image
    # expect RGB->index colormap
    assert len(painted_mask.shape) == 3
    if colormap is None:
        colormap = _default_unpaint_colormap_fn
    if callable(colormap):
        map_fn = lambda a: colormap(int(a[2]), int(a[1]), int(a[0]))
    else:
        map_fn = lambda a: colormap[(int(a[2]), int(a[1]), int(a[0]))]

    unpainted_mask = np.apply_along_axis(map_fn,
        1, np.reshape(painted_mask, (-1, 3)))
    unpainted_mask = np.reshape(unpainted_mask, (painted_mask.shape[:2]))
    return unpainted_mask.astype(int)


def apply_colormap(mask, colormap=None):
    # expect HW [0; max_index] mask
    # expect index->RGB colormap
    assert len(mask.shape) == 2

    if colormap is None:
        colormap = _default_colormap
    if callable(colormap):
        map_fn = lambda p: colormap(int(p[0]))[::-1]
    else:
        map_fn = lambda p: colormap[int(p[0])][::-1]
    painted_mask = np.apply_along_axis(map_fn, 1, np.reshape(mask, (-1, 1)))

    painted_mask = np.reshape(painted_mask, (*mask.shape, 3))
    return painted_mask.astype(np.float32)


def load_mask(path, colormap=None):
    mask = load_image(path)
    if colormap is not None:
        if len(mask.shape) == 3 and mask.shape[2] != 1:
            mask = unpaint_mask(mask, colormap=colormap)
    return mask

def lazy_mask(path, colormap=None):
    return lazy_image(path, lambda path: load_mask(path, colormap))


def convert_mask_to_rle(binary_mask):
    counts = []
    for i, (value, elements) in enumerate(
            groupby(binary_mask.ravel(order='F'))):
        # decoding starts from 0
        if i == 0 and value == 1:
            counts.append(0)
        counts.append(len(list(elements)))

    return {
        'counts': counts,
        'size': list(binary_mask.shape)
    }