# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import gc

import PIL.Image
import pytest

torch = pytest.importorskip("torch")
torchvision = pytest.importorskip("torchvision")
pytest.importorskip("skimage")

from cvat_sdk.auto_annotation.driver import _DetectionFunctionContextImpl
from cvat_sdk.auto_annotation.functions import (
    torchvision_classification,
    torchvision_detection,
    torchvision_instance_segmentation,
    torchvision_keypoint_detection,
)


@pytest.fixture(params=["classification", "detection", "segmentation", "keypoints"])
def function(request):
    torch.manual_seed(19)
    modules = {
        "classification": torchvision_classification,
        "detection": torchvision_detection,
        "segmentation": torchvision_instance_segmentation,
        "keypoints": torchvision_keypoint_detection,
    }
    options = dict(
        weights=None,
        weights_backbone=None,
        min_size=64,
        max_size=64,
        box_detections_per_img=3,
        rpn_pre_nms_top_n_test=20,
        rpn_post_nms_top_n_test=10,
    )
    if request.param == "classification":
        model = torchvision.models.resnet18(weights=None, num_classes=3)
    elif request.param == "detection":
        model = torchvision.models.detection.fasterrcnn_resnet50_fpn(num_classes=3, **options)
    elif request.param == "segmentation":
        model = torchvision.models.detection.maskrcnn_resnet50_fpn(num_classes=3, **options)
    else:
        model = torchvision.models.detection.keypointrcnn_resnet50_fpn(
            num_classes=2, num_keypoints=3, **options
        )

    # Use the real annotation implementation and real torchvision models with
    # random weights. Bypass only the constructor's pretrained-weight download.
    annotation_function = modules[request.param].create.__new__(modules[request.param].create)
    annotation_function._model = model.eval()
    annotation_function._transforms = torchvision.transforms.functional.to_tensor
    yield annotation_function
    del annotation_function, model
    gc.collect()


@pytest.fixture
def image():
    return PIL.Image.new("RGB", (64, 64), (73, 123, 191))


@pytest.mark.parametrize("grad_enabled", [False, True])
def test_detection_preserves_predictions_without_saved_backward_tensors(
    function, image, grad_enabled
):
    context = _DetectionFunctionContextImpl(frame_name="example.png", conf_threshold=0)
    with torch.no_grad():
        reference = function.detect(context, image)
    assert reference
    parameter_flags = [parameter.requires_grad for parameter in function._model.parameters()]
    assert any(parameter_flags)
    saved_bytes = []

    def save(tensor):
        saved_bytes.append(tensor.numel() * tensor.element_size())
        return tensor

    with torch.set_grad_enabled(grad_enabled):
        with torch.autograd.graph.saved_tensors_hooks(save, lambda tensor: tensor):
            actual = function.detect(context, image)
        assert torch.is_grad_enabled() is grad_enabled

    assert actual == reference
    assert saved_bytes == []
    assert [
        parameter.requires_grad for parameter in function._model.parameters()
    ] == parameter_flags
    assert all(parameter.grad is None for parameter in function._model.parameters())
    assert not function._model.training


def test_detection_does_not_disable_subsequent_training_gradients(function, image):
    context = _DetectionFunctionContextImpl(frame_name="example.png", conf_threshold=1)
    with torch.enable_grad():
        assert function.detect(context, image) == []
        parameter = torch.nn.Parameter(torch.tensor(3.0))
        parameter.square().backward()
        assert parameter.grad.item() == 6.0


def test_failed_transform_preserves_the_callers_grad_mode(function):
    context = _DetectionFunctionContextImpl(frame_name="example.png")
    with torch.enable_grad():
        with pytest.raises(TypeError):
            function.detect(context, object())
        assert torch.is_grad_enabled()
