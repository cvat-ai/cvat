# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import math
from logging import Logger
from pathlib import Path
from types import SimpleNamespace as namespace

import cvat_sdk.auto_annotation as cvataa
import PIL.Image
import pytest
from cvat_sdk import Client, models
from cvat_sdk.core.proxies.tasks import ResourceType

from shared.utils.helpers import generate_image_file

from .util import make_pbar

try:
    import torchvision.models as torchvision_models
except ModuleNotFoundError:
    torchvision_models = None


@pytest.fixture(autouse=True)
def _common_setup(
    tmp_path: Path,
    fxt_login: tuple[Client, str],
    fxt_logger: tuple[Logger, io.StringIO],
    restore_redis_ondisk_per_function,
    restore_redis_inmem_per_function,
):
    logger = fxt_logger[0]
    client = fxt_login[0]
    client.logger = logger
    client.config.cache_dir = tmp_path / "cache"

    api_client = client.api_client
    for k in api_client.configuration.logger:
        api_client.configuration.logger[k] = logger


class TestDetectionFunctionSpec:
    def _test_bad_spec(self, exc_match: str, **kwargs) -> None:
        with pytest.raises(cvataa.BadFunctionError, match=exc_match):
            cvataa.DetectionFunctionSpec(**kwargs)

    def test_attributes(self):
        self._test_bad_spec(
            "currently not supported",
            labels=[
                cvataa.label_spec(
                    "car",
                    123,
                    attributes=[
                        models.AttributeRequest(
                            "age",
                            mutable=False,
                            input_type="number",
                            values=["0", "100", "1"],
                            default_value="0",
                        )
                    ],
                ),
            ],
        )

    def test_label_without_id(self):
        self._test_bad_spec(
            "label .+ has no ID",
            labels=[
                models.PatchedLabelRequest(
                    name="car",
                ),
            ],
        )

    def test_duplicate_label_id(self):
        self._test_bad_spec(
            "same ID as another label",
            labels=[
                cvataa.label_spec("car", 123),
                cvataa.label_spec("bicycle", 123),
            ],
        )

    def test_non_skeleton_sublabels(self):
        self._test_bad_spec(
            "should be 'skeleton'",
            labels=[
                cvataa.label_spec(
                    "car",
                    123,
                    sublabels=[models.SublabelRequest("wheel", id=1)],
                ),
            ],
        )

    def test_sublabel_without_id(self):
        self._test_bad_spec(
            "sublabel .+ of label .+ has no ID",
            labels=[
                cvataa.skeleton_label_spec(
                    "car",
                    123,
                    [models.SublabelRequest("wheel")],
                ),
            ],
        )

    def test_duplicate_sublabel_id(self):
        self._test_bad_spec(
            "same ID as another sublabel",
            labels=[
                cvataa.skeleton_label_spec(
                    "cat",
                    123,
                    [
                        cvataa.keypoint_spec("head", 1),
                        cvataa.keypoint_spec("tail", 1),
                    ],
                ),
            ],
        )


class TestTaskAutoAnnotation:
    @pytest.fixture(autouse=True)
    def setup(
        self,
        tmp_path: Path,
        fxt_login: tuple[Client, str],
    ):
        self.client = fxt_login[0]
        self.images = [
            generate_image_file("1.png", size=(333, 333), color=(0, 0, 0)),
            generate_image_file("2.png", size=(333, 333), color=(100, 100, 100)),
        ]

        image_dir = tmp_path / "images"
        image_dir.mkdir()

        image_paths = []
        for image in self.images:
            image_path = image_dir / image.name
            image_path.write_bytes(image.getbuffer())
            image_paths.append(image_path)

        self.task = self.client.tasks.create_from_data(
            models.TaskWriteRequest(
                "Auto-annotation test task",
                labels=[
                    models.PatchedLabelRequest(name="person"),
                    models.PatchedLabelRequest(name="person-rect", type="rectangle"),
                    models.PatchedLabelRequest(name="person-mask", type="mask"),
                    models.PatchedLabelRequest(name="person-poly", type="polygon"),
                    models.PatchedLabelRequest(
                        name="cat",
                        type="skeleton",
                        sublabels=[
                            models.SublabelRequest(name="head"),
                            models.SublabelRequest(name="tail"),
                        ],
                    ),
                ],
            ),
            resource_type=ResourceType.LOCAL,
            resources=image_paths,
        )

        task_labels = self.task.get_labels()
        self.task_labels_by_id = {label.id: label for label in task_labels}
        self.cat_sublabels_by_id = {
            sl.id: sl
            for sl in next(label for label in task_labels if label.name == "cat").sublabels
        }

        # The initial annotation is just to check that it gets erased after auto-annotation
        self.task.update_annotations(
            models.PatchedLabeledDataRequest(
                shapes=[
                    models.LabeledShapeRequest(
                        frame=0,
                        label_id=next(iter(self.task_labels_by_id)),
                        type="rectangle",
                        points=[1.0, 2.0, 3.0, 4.0],
                    ),
                ],
            )
        )

    def test_detection_rectangle(self):
        spec = cvataa.DetectionFunctionSpec(
            labels=[
                cvataa.label_spec("person", 123),
                cvataa.label_spec("bicycle (should be ignored)", 456),
            ],
        )

        def detect(
            context: cvataa.DetectionFunctionContext, image: PIL.Image.Image
        ) -> list[models.LabeledShapeRequest]:
            assert context.frame_name in {"1.png", "2.png"}
            assert image.width == image.height == 333
            return [
                cvataa.rectangle(
                    123,  # person
                    # produce different coordinates for different images
                    [*image.getpixel((0, 0)), 300 + int(context.frame_name[0])],
                ),
                cvataa.shape(
                    456,  # ignored
                    type="points",
                    points=[1, 1],
                ),
            ]

        cvataa.annotate_task(
            self.client,
            self.task.id,
            namespace(spec=spec, detect=detect),
            clear_existing=True,
            allow_unmatched_labels=True,
        )

        annotations = self.task.get_annotations()

        shapes = sorted(annotations.shapes, key=lambda shape: shape.frame)

        assert len(shapes) == 2

        for i, shape in enumerate(shapes):
            assert shape.frame == i
            assert shape.type.value == "rectangle"
            assert self.task_labels_by_id[shape.label_id].name == "person"
            assert shape.points[3] in {301, 302}

        assert shapes[0].points[0] != shapes[1].points[0]
        assert shapes[0].points[3] != shapes[1].points[3]

    def test_detection_skeleton(self):
        spec = cvataa.DetectionFunctionSpec(
            labels=[
                cvataa.skeleton_label_spec(
                    "cat",
                    123,
                    [
                        cvataa.keypoint_spec("head", 10),
                        cvataa.keypoint_spec("torso (should be ignored)", 20),
                        cvataa.keypoint_spec("tail", 30),
                    ],
                ),
            ],
        )

        def detect(context, image: PIL.Image.Image) -> list[models.LabeledShapeRequest]:
            assert image.width == image.height == 333
            return [
                cvataa.skeleton(
                    123,  # cat
                    [
                        # ignored
                        cvataa.keypoint(20, [20, 20]),
                        # tail
                        cvataa.keypoint(30, [30, 30]),
                        # head
                        cvataa.keypoint(10, [10, 10]),
                    ],
                ),
            ]

        cvataa.annotate_task(
            self.client,
            self.task.id,
            namespace(spec=spec, detect=detect),
            clear_existing=True,
            allow_unmatched_labels=True,
        )

        annotations = self.task.get_annotations()

        shapes = sorted(annotations.shapes, key=lambda shape: shape.frame)

        assert len(shapes) == 2

        for i, shape in enumerate(shapes):
            assert shape.frame == i
            assert shape.type.value == "skeleton"
            assert self.task_labels_by_id[shape.label_id].name == "cat"
            assert len(shape.elements) == 2

            elements = sorted(
                shape.elements, key=lambda s: self.cat_sublabels_by_id[s.label_id].name
            )

            for element in elements:
                assert element.frame == i
                assert element.type.value == "points"

            assert self.cat_sublabels_by_id[elements[0].label_id].name == "head"
            assert elements[0].points == [10, 10]
            assert self.cat_sublabels_by_id[elements[1].label_id].name == "tail"
            assert elements[1].points == [30, 30]

    def test_progress_reporting(self):
        spec = cvataa.DetectionFunctionSpec(labels=[])

        def detect(context, image):
            return []

        file = io.StringIO()

        cvataa.annotate_task(
            self.client,
            self.task.id,
            namespace(spec=spec, detect=detect),
            pbar=make_pbar(file),
        )

        assert "100%" in file.getvalue()

    def test_detection_without_clearing(self):
        spec = cvataa.DetectionFunctionSpec(
            labels=[
                cvataa.label_spec("person", 123),
            ],
        )

        def detect(context, image: PIL.Image.Image) -> list[models.LabeledShapeRequest]:
            return [
                cvataa.rectangle(
                    123,  # person
                    [5, 6, 7, 8],
                    rotation=10,
                ),
            ]

        cvataa.annotate_task(
            self.client,
            self.task.id,
            namespace(spec=spec, detect=detect),
            clear_existing=False,
        )

        annotations = self.task.get_annotations()

        shapes = sorted(annotations.shapes, key=lambda shape: (shape.frame, shape.rotation))

        # original annotation
        assert shapes[0].points == [1, 2, 3, 4]
        assert shapes[0].rotation == 0

        # new annotations
        for i in (1, 2):
            assert shapes[i].points == [5, 6, 7, 8]
            assert shapes[i].rotation == 10

    def test_conf_threshold(self):
        spec = cvataa.DetectionFunctionSpec(labels=[])

        received_threshold = None

        def detect(
            context: cvataa.DetectionFunctionContext, image: PIL.Image.Image
        ) -> list[models.LabeledShapeRequest]:
            nonlocal received_threshold
            received_threshold = context.conf_threshold
            return []

        cvataa.annotate_task(
            self.client,
            self.task.id,
            namespace(spec=spec, detect=detect),
            conf_threshold=0.75,
        )

        assert received_threshold == 0.75  # python:S1244 NOSONAR

        cvataa.annotate_task(
            self.client,
            self.task.id,
            namespace(spec=spec, detect=detect),
        )

        assert received_threshold is None

        for bad_threshold in [-0.1, 1.1]:
            with pytest.raises(ValueError):
                cvataa.annotate_task(
                    self.client,
                    self.task.id,
                    namespace(spec=spec, detect=detect),
                    conf_threshold=bad_threshold,
                )

    def test_conv_mask_to_poly(self):
        spec = cvataa.DetectionFunctionSpec(
            labels=[
                cvataa.label_spec("person", 123),
            ],
        )

        received_cmtp = None

        def detect(context, image: PIL.Image.Image) -> list[models.LabeledShapeRequest]:
            nonlocal received_cmtp
            received_cmtp = context.conv_mask_to_poly
            return [cvataa.mask(123, [1, 0, 0, 0, 0])]

        cvataa.annotate_task(
            self.client,
            self.task.id,
            namespace(spec=spec, detect=detect),
            conv_mask_to_poly=False,
        )

        assert received_cmtp is False

        with pytest.raises(cvataa.BadFunctionError, match=".*conv_mask_to_poly.*"):
            cvataa.annotate_task(
                self.client,
                self.task.id,
                namespace(spec=spec, detect=detect),
                conv_mask_to_poly=True,
            )

        assert received_cmtp is True

    @pytest.mark.parametrize(
        ["label_name", "label_type"],
        [
            ("person", "any"),
            ("person-rect", "any"),
            ("person", "rectangle"),
            ("person-rect", "rectangle"),
        ],
    )
    def test_type_compatibility(self, label_name: str, label_type: str) -> None:
        spec = cvataa.DetectionFunctionSpec(
            labels=[
                cvataa.label_spec(label_name, 123, type=label_type),
            ]
        )

        def detect(context, image: PIL.Image.Image) -> list[models.LabeledShapeRequest]:
            return [cvataa.rectangle(123, [1, 2, 3, 4])]

        cvataa.annotate_task(self.client, self.task.id, namespace(spec=spec, detect=detect))

    @pytest.mark.parametrize(
        ["label_name", "conv_mask_to_poly"],
        [
            ("person-mask", False),
            ("person-poly", True),
        ],
    )
    def test_type_compatibility_cmtp(self, label_name: str, conv_mask_to_poly: bool) -> None:
        spec = cvataa.DetectionFunctionSpec(
            labels=[
                cvataa.label_spec(label_name, 123, type="mask"),
            ]
        )

        def detect(
            context: cvataa.DetectionFunctionContext, image: PIL.Image.Image
        ) -> list[models.LabeledShapeRequest]:
            if context.conv_mask_to_poly:
                return [cvataa.polygon(123, [1, 2, 3, 4, 5, 6])]
            else:
                return [cvataa.mask(123, [1, 0, 0, 0, 0])]

        cvataa.annotate_task(
            self.client,
            self.task.id,
            namespace(spec=spec, detect=detect),
            conv_mask_to_poly=conv_mask_to_poly,
        )

    def _test_spec_dataset_mismatch(
        self, exc_match: str, spec: cvataa.DetectionFunctionSpec, *, conv_mask_to_poly: bool = False
    ) -> None:
        def detect(context, image):
            assert False

        with pytest.raises(cvataa.BadFunctionError, match=exc_match):
            cvataa.annotate_task(
                self.client,
                self.task.id,
                namespace(spec=spec, detect=detect),
                conv_mask_to_poly=conv_mask_to_poly,
            )

    def test_label_not_in_dataset(self):
        self._test_spec_dataset_mismatch(
            "not in dataset",
            cvataa.DetectionFunctionSpec(labels=[cvataa.label_spec("dog", 123)]),
        )

    def test_sublabel_not_in_dataset(self):
        self._test_spec_dataset_mismatch(
            "not in dataset",
            cvataa.DetectionFunctionSpec(
                labels=[
                    cvataa.skeleton_label_spec("cat", 123, [cvataa.keypoint_spec("nose", 1)]),
                ],
            ),
        )

    def test_incompatible_label_type(self):
        self._test_spec_dataset_mismatch(
            "has type 'ellipse' in the function, but 'rectangle' in the dataset",
            cvataa.DetectionFunctionSpec(
                labels=[
                    cvataa.label_spec("person-rect", 123, type="ellipse"),
                ],
            ),
        )

        self._test_spec_dataset_mismatch(
            "has type 'polygon' in the function, but 'mask' in the dataset",
            cvataa.DetectionFunctionSpec(
                labels=[
                    cvataa.label_spec("person-mask", 123, type="mask"),
                ],
            ),
            conv_mask_to_poly=True,
        )

    def _test_bad_function_detect(self, detect, exc_match: str) -> None:
        spec = cvataa.DetectionFunctionSpec(
            labels=[
                cvataa.label_spec("person", 123),
                cvataa.label_spec("person", 124, type="rectangle"),
                cvataa.label_spec("person-rect", 125),
                cvataa.label_spec("person-rect", 126, type="rectangle"),
                cvataa.skeleton_label_spec(
                    "cat",
                    456,
                    [
                        cvataa.keypoint_spec("head", 12),
                        cvataa.keypoint_spec("tail", 34),
                    ],
                ),
            ],
        )

        with pytest.raises(cvataa.BadFunctionError, match=exc_match):
            cvataa.annotate_task(self.client, self.task.id, namespace(spec=spec, detect=detect))

    def test_preset_shape_id(self):
        self._test_bad_function_detect(
            lambda context, image: [
                models.LabeledShapeRequest(
                    type="rectangle", frame=0, label_id=123, id=1111, points=[1, 2, 3, 4]
                ),
            ],
            "shape with preset id",
        )

    def test_preset_shape_source(self):
        self._test_bad_function_detect(
            lambda context, image: [
                models.LabeledShapeRequest(
                    type="rectangle", frame=0, label_id=123, source="manual", points=[1, 2, 3, 4]
                ),
            ],
            "shape with preset source",
        )

    def test_bad_shape_frame_number(self):
        self._test_bad_function_detect(
            lambda context, image: [
                models.LabeledShapeRequest(
                    type="rectangle",
                    frame=1,
                    label_id=123,
                    points=[1, 2, 3, 4],
                ),
            ],
            "unexpected frame number",
        )

    def test_unknown_label_id(self):
        self._test_bad_function_detect(
            lambda context, image: [
                cvataa.rectangle(111, [1, 2, 3, 4]),
            ],
            "unknown label ID",
        )

    def test_shape_with_attributes(self):
        self._test_bad_function_detect(
            lambda context, image: [
                cvataa.rectangle(
                    123,
                    [1, 2, 3, 4],
                    attributes=[
                        models.AttributeValRequest(spec_id=1, value="asdf"),
                    ],
                ),
            ],
            "shape with attributes",
        )

    def test_preset_element_id(self):
        self._test_bad_function_detect(
            lambda context, image: [
                cvataa.skeleton(
                    456,
                    [
                        models.SubLabeledShapeRequest(
                            type="points", frame=0, label_id=12, id=1111, points=[1, 2]
                        ),
                    ],
                ),
            ],
            "element with preset id",
        )

    def test_preset_element_source(self):
        self._test_bad_function_detect(
            lambda context, image: [
                cvataa.skeleton(
                    456,
                    [
                        models.SubLabeledShapeRequest(
                            type="points", frame=0, label_id=12, source="manual", points=[1, 2]
                        ),
                    ],
                ),
            ],
            "element with preset source",
        )

    def test_bad_element_frame_number(self):
        self._test_bad_function_detect(
            lambda context, image: [
                cvataa.skeleton(
                    456,
                    [
                        models.SubLabeledShapeRequest(
                            type="points", frame=1, label_id=12, points=[1, 2]
                        ),
                    ],
                ),
            ],
            "element with unexpected frame number",
        )

    def test_non_points_element(self):
        self._test_bad_function_detect(
            lambda context, image: [
                cvataa.skeleton(
                    456,
                    [
                        models.SubLabeledShapeRequest(
                            type="rectangle", frame=0, label_id=12, points=[1, 2, 3, 4]
                        ),
                    ],
                ),
            ],
            "element type other than 'points'",
        )

    def test_unknown_sublabel_id(self):
        self._test_bad_function_detect(
            lambda context, image: [
                cvataa.skeleton(456, [cvataa.keypoint(56, [1, 2])]),
            ],
            "unknown sublabel ID",
        )

    def test_multiple_elements_with_same_sublabel(self):
        self._test_bad_function_detect(
            lambda context, image: [
                cvataa.skeleton(
                    456,
                    [
                        cvataa.keypoint(12, [1, 2]),
                        cvataa.keypoint(12, [3, 4]),
                    ],
                ),
            ],
            "multiple elements with same sublabel",
        )

    def test_not_enough_elements(self):
        self._test_bad_function_detect(
            lambda context, image: [
                cvataa.skeleton(456, [cvataa.keypoint(12, [1, 2])]),
            ],
            "with fewer elements than expected",
        )

    def test_non_skeleton_with_elements(self):
        self._test_bad_function_detect(
            lambda context, image: [
                cvataa.shape(
                    123,
                    type="rectangle",
                    elements=[cvataa.keypoint(12, [1, 2])],
                ),
            ],
            "non-skeleton shape with elements",
        )

    @pytest.mark.parametrize("label_id", [124, 125, 126])
    def test_incompatible_shape_type(self, label_id: int):
        self._test_bad_function_detect(
            lambda context, image: [
                cvataa.shape(label_id, type="ellipse"),
            ],
            r"shape of type 'ellipse' \(expected 'rectangle'\)",
        )


if torchvision_models is not None:
    import torch
    import torch.nn as nn

    class FakeTorchvisionDetector(nn.Module):
        def __init__(self, label_id: int) -> None:
            super().__init__()
            self._label_id = label_id

        def forward(self, images: list[torch.Tensor]) -> list[dict]:
            assert isinstance(images, list)
            assert all(isinstance(t, torch.Tensor) for t in images)

            return [
                {
                    "boxes": torch.tensor([[1, 2, 3, 4], [5, 6, 7, 8]]),
                    "labels": torch.tensor([self._label_id, self._label_id]),
                    "scores": torch.tensor([0.75, 0.74]),
                }
            ]

    def fake_get_detection_model(name: str, weights, test_param):
        assert test_param == "expected_value"

        car_label_id = weights.meta["categories"].index("car")

        return FakeTorchvisionDetector(label_id=car_label_id)

    class FakeTorchvisionInstanceSegmenter(nn.Module):
        def __init__(self, label_id: int) -> None:
            super().__init__()
            self._label_id = label_id

        def forward(self, images: list[torch.Tensor]) -> list[dict]:
            assert isinstance(images, list)
            assert all(isinstance(t, torch.Tensor) for t in images)

            def make_box(im, a1, a2):
                return [im.shape[2] * a1, im.shape[1] * a1, im.shape[2] * a2, im.shape[1] * a2]

            def make_mask(im, a1, a2):
                # creates a rectangular mask with a hole
                mask = torch.full((1, im.shape[1], im.shape[2]), 0.49)
                mask[
                    0,
                    math.ceil(im.shape[1] * a1) : math.floor(im.shape[1] * a2),
                    math.ceil(im.shape[2] * a1) : math.floor(im.shape[2] * a2),
                ] = 0.5
                mask[
                    0,
                    math.ceil(im.shape[1] * a1) + 3 : math.floor(im.shape[1] * a2) - 3,
                    math.ceil(im.shape[2] * a1) + 3 : math.floor(im.shape[2] * a2) - 3,
                ] = 0.49
                return mask

            return [
                {
                    "labels": torch.tensor([self._label_id, self._label_id]),
                    "boxes": torch.tensor(
                        [
                            make_box(im, 1 / 6, 1 / 3),
                            make_box(im, 2 / 3, 5 / 6),
                        ]
                    ),
                    "masks": torch.stack(
                        [
                            make_mask(im, 1 / 6, 1 / 3),
                            make_mask(im, 2 / 3, 5 / 6),
                        ]
                    ),
                    "scores": torch.tensor([0.75, 0.74]),
                }
                for im in images
            ]

    def fake_get_instance_segmentation_model(name: str, weights, test_param):
        assert test_param == "expected_value"

        car_label_id = weights.meta["categories"].index("car")

        return FakeTorchvisionInstanceSegmenter(label_id=car_label_id)

    class FakeTorchvisionKeypointDetector(nn.Module):
        def __init__(self, label_id: int, keypoint_names: list[str]) -> None:
            super().__init__()
            self._label_id = label_id
            self._keypoint_names = keypoint_names

        def forward(self, images: list[torch.Tensor]) -> list[dict]:
            assert isinstance(images, list)
            assert all(isinstance(t, torch.Tensor) for t in images)

            return [
                {
                    "labels": torch.tensor([self._label_id, self._label_id]),
                    "keypoints": torch.tensor(
                        [
                            [
                                [hash(name) % 100, 0, 1 if name.startswith("right_") else 0]
                                for i, name in enumerate(self._keypoint_names)
                            ],
                            [[0, 0, 1] for i, name in enumerate(self._keypoint_names)],
                        ]
                    ),
                    "scores": torch.tensor([0.75, 0.74]),
                }
            ]

    def fake_get_keypoint_detection_model(name: str, weights, test_param):
        assert test_param == "expected_value"

        person_label_id = weights.meta["categories"].index("person")

        return FakeTorchvisionKeypointDetector(
            label_id=person_label_id, keypoint_names=weights.meta["keypoint_names"]
        )


@pytest.mark.skipif(torchvision_models is None, reason="torchvision is not installed")
class TestAutoAnnotationFunctions:
    @pytest.fixture(autouse=True)
    def setup(
        self,
        tmp_path: Path,
        fxt_login: tuple[Client, str],
    ):
        self.client = fxt_login[0]

        self.image_dir = tmp_path / "images"
        self.image_dir.mkdir()

    def _create_task(self, labels):
        self.image = generate_image_file("1.png", size=(100, 100))
        image_path = self.image_dir / self.image.name
        image_path.write_bytes(self.image.getbuffer())

        self.task = self.client.tasks.create_from_data(
            models.TaskWriteRequest("Auto-annotation test task", labels=labels),
            resources=[image_path],
        )

        task_labels = self.task.get_labels()
        self.task_labels_by_id = {label.id: label for label in task_labels}

    def test_torchvision_detection(self, monkeypatch: pytest.MonkeyPatch):
        self._create_task([models.PatchedLabelRequest(name="car", type="rectangle")])

        monkeypatch.setattr(torchvision_models, "get_model", fake_get_detection_model)

        import cvat_sdk.auto_annotation.functions.torchvision_detection as td

        cvataa.annotate_task(
            self.client,
            self.task.id,
            td.create("fasterrcnn_resnet50_fpn_v2", "COCO_V1", test_param="expected_value"),
            allow_unmatched_labels=True,
            conf_threshold=0.75,
        )

        annotations = self.task.get_annotations()

        assert len(annotations.shapes) == 1
        assert self.task_labels_by_id[annotations.shapes[0].label_id].name == "car"
        assert annotations.shapes[0].type.value == "rectangle"
        assert annotations.shapes[0].points == [1, 2, 3, 4]

    def test_torchvision_instance_segmentation(self, monkeypatch: pytest.MonkeyPatch):
        self._create_task([models.PatchedLabelRequest(name="car")])

        monkeypatch.setattr(torchvision_models, "get_model", fake_get_instance_segmentation_model)

        import cvat_sdk.auto_annotation.functions.torchvision_instance_segmentation as tis
        from cvat_sdk.masks import encode_mask

        cvataa.annotate_task(
            self.client,
            self.task.id,
            tis.create("maskrcnn_resnet50_fpn_v2", "COCO_V1", test_param="expected_value"),
            allow_unmatched_labels=True,
            conf_threshold=0.75,
        )

        annotations = self.task.get_annotations()

        assert len(annotations.shapes) == 1
        assert self.task_labels_by_id[annotations.shapes[0].label_id].name == "car"

        expected_bitmap = torch.zeros((100, 100), dtype=torch.bool)
        expected_bitmap[17:33, 17:33] = True
        expected_bitmap[20:30, 20:30] = False

        assert annotations.shapes[0].type.value == "mask"
        assert annotations.shapes[0].points == encode_mask(expected_bitmap, [16, 16, 34, 34])

        cvataa.annotate_task(
            self.client,
            self.task.id,
            tis.create("maskrcnn_resnet50_fpn_v2", "COCO_V1", test_param="expected_value"),
            allow_unmatched_labels=True,
            conf_threshold=0.75,
            conv_mask_to_poly=True,
            clear_existing=True,
        )

        annotations = self.task.get_annotations()

        assert len(annotations.shapes) == 1
        assert self.task_labels_by_id[annotations.shapes[0].label_id].name == "car"
        assert annotations.shapes[0].type.value == "polygon"

        # We shouldn't rely on the exact result of polygon conversion,
        # since it depends on a 3rd-party library. Instead, we'll just
        # check that all points are within the expected area.
        for x, y in zip(*[iter(annotations.shapes[0].points)] * 2):
            assert expected_bitmap[round(y), round(x)]

    def test_torchvision_keypoint_detection(self, monkeypatch: pytest.MonkeyPatch):
        self._create_task(
            [
                models.PatchedLabelRequest(
                    name="person",
                    type="skeleton",
                    sublabels=[
                        models.SublabelRequest(name="left_eye"),
                        models.SublabelRequest(name="right_eye"),
                    ],
                ),
            ]
        )
        person_label = next(
            label for label in self.task_labels_by_id.values() if label.name == "person"
        )
        person_sublabels_by_id = {sl.id: sl for sl in person_label.sublabels}

        monkeypatch.setattr(torchvision_models, "get_model", fake_get_keypoint_detection_model)

        import cvat_sdk.auto_annotation.functions.torchvision_keypoint_detection as tkd

        cvataa.annotate_task(
            self.client,
            self.task.id,
            tkd.create("keypointrcnn_resnet50_fpn", "COCO_V1", test_param="expected_value"),
            allow_unmatched_labels=True,
            conf_threshold=0.75,
        )

        annotations = self.task.get_annotations()

        assert len(annotations.shapes) == 1
        assert self.task_labels_by_id[annotations.shapes[0].label_id].name == "person"
        assert annotations.shapes[0].type.value == "skeleton"
        assert len(annotations.shapes[0].elements) == 2

        elements = sorted(
            annotations.shapes[0].elements,
            key=lambda e: person_sublabels_by_id[e.label_id].name,
        )

        assert person_sublabels_by_id[elements[0].label_id].name == "left_eye"
        assert elements[0].points[0] == hash("left_eye") % 100
        assert elements[0].occluded

        assert person_sublabels_by_id[elements[1].label_id].name == "right_eye"
        assert elements[1].points[0] == hash("right_eye") % 100
        assert not elements[1].occluded
