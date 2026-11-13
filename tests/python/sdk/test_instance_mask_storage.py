# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import copy

import numpy as np
import pytest
import torch
from torch.utils.data import DataLoader

from cvat_sdk import models
from cvat_sdk.datasets.common import FrameAnnotations, UnsupportedDatasetError
from cvat_sdk.masks import encode_mask
from cvat_sdk.pytorch.common import Target
from cvat_sdk.pytorch.transforms import ExtractInstanceMasks


def _target(count, image_size=(7, 6)):
    shapes = []
    expected = []
    boxes = []
    labels = []
    for index in range(count):
        bitmap = np.zeros((image_size[1], image_size[0]), dtype=bool)
        left, top = index % 3, index % 2
        bitmap[top : top + 3, left : left + 3] = True
        if index % 2:
            shape_type = "mask"
            points = encode_mask(bitmap)
            box = [left, top, left + 3, top + 3]
        else:
            shape_type = "polygon"
            points = [left, top, left + 2, top, left + 2, top + 2, left, top + 2]
            box = [left, top, left + 2, top + 2]
        label_id = 11 + index % 2
        shapes.append(
            models.LabeledShape(
                frame=0, label_id=label_id, type=models.ShapeType(shape_type), points=points
            )
        )
        expected.append(bitmap)
        boxes.append(box)
        labels.append(2 if label_id == 11 else 1)
    target = Target(
        annotations=FrameAnnotations(shapes=shapes),
        label_id_to_index={11: 2, 12: 1},
        image_size=image_size,
    )
    return target, expected, boxes, labels


@pytest.mark.parametrize("count", [0, 1, 3, 15])
@pytest.mark.parametrize("included", [("polygon",), ("mask",), ("polygon", "mask")])
def test_instance_mask_values_order_and_empty_shape(count, included):
    target, bitmaps, boxes, labels = _target(count)
    before = [shape.to_dict() for shape in target.annotations.shapes]
    selected = [
        index for index, shape in enumerate(target.annotations.shapes) if shape.type.value in included
    ]

    result = ExtractInstanceMasks(include_shape_types=included)(target)

    expected = np.stack([bitmaps[index] for index in selected]) if selected else np.empty((0, 6, 7))
    torch.testing.assert_close(result["masks"], torch.tensor(expected, dtype=torch.uint8))
    torch.testing.assert_close(
        result["boxes"], torch.tensor([boxes[index] for index in selected], dtype=torch.float).reshape(-1, 4)
    )
    torch.testing.assert_close(
        result["labels"], torch.tensor([labels[index] for index in selected], dtype=torch.long)
    )
    assert result["masks"].is_contiguous()
    assert [shape.to_dict() for shape in target.annotations.shapes] == before


def test_returned_mask_batches_are_independent_of_each_other_and_annotations():
    target, bitmaps, _, _ = _target(3)
    transform = ExtractInstanceMasks(include_shape_types=("polygon", "mask"))
    before = [shape.to_dict() for shape in target.annotations.shapes]

    first = transform(target)
    second = transform(target)
    first["masks"].zero_()

    torch.testing.assert_close(second["masks"], torch.tensor(np.stack(bitmaps), dtype=torch.uint8))
    assert first["masks"].untyped_storage().data_ptr() != second["masks"].untyped_storage().data_ptr()
    assert [shape.to_dict() for shape in target.annotations.shapes] == before


@pytest.mark.parametrize("shape_type", ["polygon", "mask"])
def test_rotated_selected_shapes_remain_unsupported(shape_type):
    target, _, _, _ = _target(2)
    for shape in target.annotations.shapes:
        if shape.type.value == shape_type:
            shape.rotation = 15

    with pytest.raises(UnsupportedDatasetError, match="Rotated"):
        ExtractInstanceMasks(include_shape_types=(shape_type,))(target)


def test_unselected_rotated_shapes_do_not_change_selected_masks():
    target, bitmaps, _, _ = _target(2)
    target.annotations.shapes[1].rotation = 15
    result = ExtractInstanceMasks(include_shape_types=("polygon",))(target)
    torch.testing.assert_close(result["masks"], torch.tensor(np.stack(bitmaps[:1]), dtype=torch.uint8))


def test_default_float_dtype_does_not_change_declared_output_dtypes():
    target, _, _, _ = _target(2)
    original = torch.get_default_dtype()
    try:
        torch.set_default_dtype(torch.float64)
        result = ExtractInstanceMasks(include_shape_types=("polygon", "mask"))(target)
    finally:
        torch.set_default_dtype(original)
    assert result["boxes"].dtype == torch.float32
    assert result["labels"].dtype == torch.int64
    assert result["masks"].dtype == torch.uint8


def test_transform_respects_default_device():
    target, _, _, _ = _target(2)
    with torch.device("meta"):
        result = ExtractInstanceMasks(include_shape_types=("polygon", "mask"))(target)
    assert all(tensor.device.type == "meta" for tensor in result.values())
    assert result["masks"].shape == (2, 6, 7)


@pytest.mark.parametrize("dtype", [torch.float32, torch.float64])
def test_native_dataloader_segmentation_updates_match_manual_masks(dtype):
    target, bitmaps, _, _ = _target(2)
    transform = ExtractInstanceMasks(include_shape_types=("polygon", "mask"))
    image = torch.linspace(-1, 1, 3 * 6 * 7, dtype=dtype).reshape(3, 6, 7)
    loader = DataLoader([(image, transform(target)), (image.flip(-1), transform(target))], batch_size=1)
    expected = torch.tensor(np.stack(bitmaps), dtype=dtype).unsqueeze(0)
    torch.manual_seed(78)
    model = torch.nn.Conv2d(3, 2, kernel_size=1).to(dtype)
    reference = copy.deepcopy(model)
    optimizer = torch.optim.SGD(model.parameters(), lr=0.1, momentum=0.5)
    reference_optimizer = torch.optim.SGD(reference.parameters(), lr=0.1, momentum=0.5)

    for _ in range(3):
        for inputs, extracted in loader:
            optimizer.zero_grad()
            reference_optimizer.zero_grad()
            loss = torch.nn.functional.binary_cross_entropy_with_logits(
                model(inputs), extracted["masks"].to(dtype)
            )
            reference_loss = torch.nn.functional.binary_cross_entropy_with_logits(reference(inputs), expected)
            torch.testing.assert_close(loss, reference_loss, rtol=0, atol=0)
            loss.backward()
            reference_loss.backward()
            for actual, oracle in zip(model.parameters(), reference.parameters()):
                torch.testing.assert_close(actual.grad, oracle.grad, rtol=0, atol=0)
            optimizer.step()
            reference_optimizer.step()
            for actual, oracle in zip(model.parameters(), reference.parameters()):
                torch.testing.assert_close(actual, oracle, rtol=0, atol=0)
