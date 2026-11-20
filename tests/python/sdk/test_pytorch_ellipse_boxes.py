# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import copy

import pytest

torch = pytest.importorskip("torch")
torchvision = pytest.importorskip("torchvision")

from cvat_sdk import models
from cvat_sdk.datasets.common import FrameAnnotations, UnsupportedDatasetError
from cvat_sdk.pytorch import ExtractBoundingBoxes, Target
from cvat_sdk.pytorch._utils import shape_bbox


def make_shape(points, *, shape_type="ellipse", label_id=7, rotation=0):
    return models.LabeledShape(
        frame=0,
        label_id=label_id,
        type=models.ShapeType(shape_type),
        points=points,
        rotation=rotation,
    )


def make_target(shapes):
    return Target(
        annotations=FrameAnnotations(shapes=shapes),
        label_id_to_index={7: 2, 19: 5},
        image_size=(64, 48),
    )


@pytest.mark.parametrize(
    "points, expected",
    [
        ([10.0, 20.0, 14.0, 17.0], [6.0, 17.0, 14.0, 23.0]),
        ([4.0, 3.0, 8.0, 0.0], [0.0, 0.0, 8.0, 6.0]),
        ([-2.0, -3.0, 2.0, -5.0], [-6.0, -5.0, 2.0, -1.0]),
        ([10.25, 20.5, 12.75, 19.25], [7.75, 19.25, 12.75, 21.75]),
        ([5.0, 5.0, 7.0, 3.0], [3.0, 3.0, 7.0, 7.0]),
        ([5.0, 5.0, 5.0, 2.0], [5.0, 2.0, 5.0, 8.0]),
        ([5.0, 5.0, 5.0, 5.0], [5.0, 5.0, 5.0, 5.0]),
    ],
)
def test_ellipse_uses_the_full_extents(points, expected):
    shape = make_shape(points)
    original = copy.deepcopy(shape.to_dict())
    assert shape_bbox(shape) == tuple(expected)
    result = ExtractBoundingBoxes(include_shape_types={"ellipse"})(make_target([shape]))
    torch.testing.assert_close(result["boxes"], torch.tensor([expected]))
    torch.testing.assert_close(result["labels"], torch.tensor([2]))
    assert result["boxes"].dtype == torch.float
    assert result["labels"].dtype == torch.long
    assert shape.to_dict() == original


@pytest.mark.parametrize(
    "shape_type, points, expected",
    [
        ("rectangle", [1.0, 2.0, 5.0, 7.0], (1.0, 2.0, 5.0, 7.0)),
        ("polygon", [1.0, 3.0, 5.0, 2.0, 3.0, 7.0], (1.0, 2.0, 5.0, 7.0)),
        ("polyline", [3.0, 4.0, 1.0, 2.0, 5.0, 7.0], (1.0, 2.0, 5.0, 7.0)),
        ("points", [3.0, 4.0], (3.0, 4.0, 3.0, 4.0)),
        ("mask", [1.0, 1.0, 2.0, 5.0, 7.0], (1.0, 2.0, 6.0, 8.0)),
    ],
)
def test_other_shape_conventions_are_unchanged(shape_type, points, expected):
    assert shape_bbox(make_shape(points, shape_type=shape_type)) == expected


def test_mixed_annotations_keep_order_labels_and_filtering():
    target = make_target(
        [
            make_shape([10.0, 20.0, 14.0, 17.0], label_id=19),
            make_shape([1.0, 2.0, 5.0, 7.0], shape_type="rectangle"),
            make_shape([3.0, 4.0], shape_type="points"),
        ]
    )
    result = ExtractBoundingBoxes(include_shape_types={"ellipse", "rectangle"})(target)
    torch.testing.assert_close(
        result["boxes"], torch.tensor([[6.0, 17.0, 14.0, 23.0], [1.0, 2.0, 5.0, 7.0]])
    )
    torch.testing.assert_close(result["labels"], torch.tensor([5, 2]))
    filtered = ExtractBoundingBoxes(include_shape_types={"polygon"})(target)
    assert filtered["boxes"].shape == (0, 4)
    assert filtered["labels"].shape == (0,)


def test_rotated_ellipse_remains_unsupported():
    target = make_target([make_shape([10.0, 20.0, 14.0, 17.0], rotation=30)])
    with pytest.raises(UnsupportedDatasetError, match="Rotated shapes"):
        ExtractBoundingBoxes(include_shape_types={"ellipse"})(target)


def test_native_box_regression_updates_match_the_geometric_targets():
    target = make_target(
        [
            make_shape([10.0, 20.0, 14.0, 17.0]),
            make_shape([4.0, 3.0, 8.0, 0.0], label_id=19),
        ]
    )
    transformed = ExtractBoundingBoxes(include_shape_types={"ellipse"})(target)
    reference_boxes = torch.tensor([[6.0, 17.0, 14.0, 23.0], [0.0, 0.0, 8.0, 6.0]])
    prediction = torch.nn.Parameter(torch.tensor([[5.0, 16.0, 15.0, 24.0], [1.0, 1.0, 9.0, 7.0]]))
    reference = torch.nn.Parameter(prediction.detach().clone())
    optimizer = torch.optim.SGD([prediction], lr=0.2)
    reference_optimizer = torch.optim.SGD([reference], lr=0.2)
    for _ in range(2):
        optimizer.zero_grad()
        reference_optimizer.zero_grad()
        loss = torchvision.ops.generalized_box_iou_loss(
            prediction, transformed["boxes"], reduction="mean"
        )
        reference_loss = torchvision.ops.generalized_box_iou_loss(
            reference, reference_boxes, reduction="mean"
        )
        torch.testing.assert_close(loss, reference_loss)
        loss.backward()
        reference_loss.backward()
        torch.testing.assert_close(prediction.grad, reference.grad)
        optimizer.step()
        reference_optimizer.step()
        torch.testing.assert_close(prediction, reference)
