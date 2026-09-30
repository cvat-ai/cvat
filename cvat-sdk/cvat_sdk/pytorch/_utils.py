# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import numpy as np
import PIL.Image
import PIL.ImageDraw

from cvat_sdk import models
from cvat_sdk.masks import decode_mask


def shape_bbox(shape: models.LabeledShape) -> tuple[float, float, float, float]:
    """
    Return the unrotated bounding box of a CVAT shape as (x_min, y_min, x_max, y_max).

    For mask shapes, the bounding box is read from the encoded mask points. CVAT stores
    the lower-right mask coordinates inclusively, so they are converted to the exclusive
    coordinates expected by torchvision targets.
    """

    if shape.type.value == "mask":
        if len(shape.points) < 5:
            raise ValueError("encoded mask has too few elements")

        x1, y1, x2, y2 = shape.points[-4:]
        return x1, y1, x2 + 1, y2 + 1

    x_coords = shape.points[0::2]
    y_coords = shape.points[1::2]

    return min(x_coords), min(y_coords), max(x_coords), max(y_coords)


def draw_mask(shape: models.LabeledShape, image_size: tuple[int, int]) -> np.ndarray:
    """
    Rasterize a CVAT shape into a dense full-image boolean mask.

    `image_size` must be a (width, height) tuple. CVAT mask shapes are decoded from
    their encoded `points` representation; polygon shapes are drawn into a binary
    PIL image and returned as a writable NumPy array.
    """

    shape_type = shape.type.value

    if shape_type == "mask":
        return decode_mask(shape.points, image_width=image_size[0], image_height=image_size[1])

    image = PIL.Image.new("1", image_size)
    draw = PIL.ImageDraw.Draw(image)

    if shape_type == "polygon":
        draw.polygon(list(zip(shape.points[0::2], shape.points[1::2])), fill=1)
    else:
        raise AssertionError(f"unsupported shape type: {shape_type!r}")

    return np.array(image)
