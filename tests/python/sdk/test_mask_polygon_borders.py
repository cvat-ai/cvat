# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import math

import numpy as np
import pytest
import torch
from skimage import measure

from cvat_sdk.auto_annotation.driver import _DetectionFunctionContextImpl
from cvat_sdk.auto_annotation.functions.torchvision_instance_segmentation import (
    _generate_shapes,
    _is_positively_oriented,
)
from cvat_sdk.masks import encode_mask


def _polygons(mask):
    height, width = mask.shape[-2:]
    context = _DetectionFunctionContextImpl(frame_name="frame.png", conv_mask_to_poly=True)
    return list(
        _generate_shapes(context, torch.tensor([0, 0, width, height]), mask, torch.tensor(7))
    )


@pytest.mark.parametrize(
    "bounds",
    [
        (0, 4, 8, 16),
        (16, 4, 24, 16),
        (6, 0, 18, 8),
        (6, 12, 18, 20),
        (0, 0, 8, 8),
        (16, 0, 24, 8),
        (0, 12, 8, 20),
        (16, 12, 24, 20),
        (0, 0, 24, 20),
    ],
)
@pytest.mark.parametrize("foreground", [0.5, 1.0])
def test_border_foreground_keeps_the_same_polygon_as_an_interior_translation(bounds, foreground):
    mask = torch.zeros((1, 20, 24))
    left, top, right, bottom = bounds
    mask[:, top:bottom, left:right] = foreground
    mask.requires_grad_()
    before = mask.detach().clone()

    # The same region translated into a larger image has a complete background
    # around it. Translation must not change its polygon or remove the object.
    translated = torch.nn.functional.pad(mask.detach(), (10, 10, 10, 10))
    reference = _polygons(translated)
    actual = _polygons(mask)
    assert len(reference) == len(actual) == 1
    expected_points = np.asarray(reference[0].points).reshape(-1, 2) - 10
    points = np.asarray(actual[0].points).reshape(-1, 2)
    np.testing.assert_allclose(points, expected_points, atol=1e-6, rtol=0)
    np.testing.assert_allclose(points[0], points[-1], atol=1e-6, rtol=0)
    assert actual[0].label_id == 7
    assert actual[0].type.value == "polygon"
    assert len(points) >= 4
    torch.testing.assert_close(mask.detach(), before, rtol=0, atol=0)
    assert mask.requires_grad and mask.grad is None


def test_empty_foreground_remains_empty():
    assert _polygons(torch.zeros((1, 12, 18))) == []


def test_interior_outer_contour_keeps_existing_hole_filtering_and_simplification():
    mask = torch.zeros((1, 24, 28))
    mask[:, 4:20, 5:23] = 0.75
    mask[:, 8:16, 9:19] = 0.0
    reference = []
    for contour in measure.find_contours(mask[0].numpy(), level=math.nextafter(0.5, 0)):
        if len(contour) < 3 or _is_positively_oriented(contour):
            continue
        simplified = measure.approximate_polygon(contour, tolerance=2.5)
        reference.append(contour if len(simplified) < 3 else simplified)
    actual = _polygons(mask)
    assert len(actual) == len(reference) == 1
    np.testing.assert_allclose(
        np.asarray(actual[0].points).reshape(-1, 2),
        reference[0][:, ::-1],
        atol=1e-6,
        rtol=0,
    )


@pytest.mark.parametrize("foreground", [0.0, 0.5, 1.0])
def test_rle_output_is_unchanged(foreground):
    mask = torch.full((1, 12, 18), foreground)
    context = _DetectionFunctionContextImpl(frame_name="frame.png", conv_mask_to_poly=False)
    shapes = list(_generate_shapes(context, torch.tensor([0, 0, 18, 12]), mask, torch.tensor(7)))
    assert len(shapes) == 1
    assert shapes[0].type.value == "mask"
    assert shapes[0].points == encode_mask(mask[0] >= 0.5, [0, 0, 18, 12])


def test_disconnected_border_components_are_not_dropped():
    mask = torch.zeros((1, 24, 28))
    mask[:, :8, :8] = 1
    mask[:, 16:, 20:] = 1
    actual = _polygons(mask)
    reference = _polygons(torch.nn.functional.pad(mask, (10, 10, 10, 10)))
    assert len(actual) == len(reference) == 2
    for shape, expected in zip(actual, reference):
        points = np.asarray(shape.points).reshape(-1, 2)
        np.testing.assert_allclose(
            points, np.asarray(expected.points).reshape(-1, 2) - 10, atol=1e-6, rtol=0
        )
        np.testing.assert_allclose(points[0], points[-1], atol=1e-6, rtol=0)
