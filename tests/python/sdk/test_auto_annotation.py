# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
from logging import Logger
from pathlib import Path
from types import SimpleNamespace as namespace
from typing import List, Tuple

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
    fxt_login: Tuple[Client, str],
    fxt_logger: Tuple[Logger, io.StringIO],
):
    logger = fxt_logger[0]
    client = fxt_login[0]
    client.logger = logger
    client.config.cache_dir = tmp_path / "cache"

    api_client = client.api_client
    for k in api_client.configuration.logger:
        api_client.configuration.logger[k] = logger


class TestTaskAutoAnnotation:
    @pytest.fixture(autouse=True)
    def setup(
        self,
        tmp_path: Path,
        fxt_login: Tuple[Client, str],
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
                    models.PatchedLabelRequest(name="car"),
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
                cvataa.label_spec("car", 123),
                cvataa.label_spec("bicycle (should be ignored)", 456),
            ],
        )

        def detect(
            context: cvataa.DetectionFunctionContext, image: PIL.Image.Image
        ) -> List[models.LabeledShapeRequest]:
            assert context.frame_name in {"1.png", "2.png"}
            assert image.width == image.height == 333
            return [
                cvataa.rectangle(
                    123,  # car
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
            assert self.task_labels_by_id[shape.label_id].name == "car"
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

        def detect(context, image: PIL.Image.Image) -> List[models.LabeledShapeRequest]:
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
                cvataa.label_spec("car", 123),
            ],
        )

        def detect(context, image: PIL.Image.Image) -> List[models.LabeledShapeRequest]:
            return [
                cvataa.rectangle(
                    123,  # car
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

    def _test_bad_function_spec(self, spec: cvataa.DetectionFunctionSpec, exc_match: str) -> None:
        def detect(context, image):
            assert False

        with pytest.raises(cvataa.BadFunctionError, match=exc_match):
            cvataa.annotate_task(self.client, self.task.id, namespace(spec=spec, detect=detect))

    def test_attributes(self):
        self._test_bad_function_spec(
            cvataa.DetectionFunctionSpec(
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
            ),
            "currently not supported",
        )

    def test_label_not_in_dataset(self):
        self._test_bad_function_spec(
            cvataa.DetectionFunctionSpec(
                labels=[cvataa.label_spec("dog", 123)],
            ),
            "not in dataset",
        )

    def test_label_without_id(self):
        self._test_bad_function_spec(
            cvataa.DetectionFunctionSpec(
                labels=[
                    models.PatchedLabelRequest(
                        name="car",
                    ),
                ],
            ),
            "label .+ has no ID",
        )

    def test_duplicate_label_id(self):
        self._test_bad_function_spec(
            cvataa.DetectionFunctionSpec(
                labels=[
                    cvataa.label_spec("car", 123),
                    cvataa.label_spec("bicycle", 123),
                ],
            ),
            "same ID as another label",
        )

    def test_non_skeleton_sublabels(self):
        self._test_bad_function_spec(
            cvataa.DetectionFunctionSpec(
                labels=[
                    cvataa.label_spec(
                        "car",
                        123,
                        sublabels=[models.SublabelRequest("wheel", id=1)],
                    ),
                ],
            ),
            "should be 'skeleton'",
        )

    def test_sublabel_without_id(self):
        self._test_bad_function_spec(
            cvataa.DetectionFunctionSpec(
                labels=[
                    cvataa.skeleton_label_spec(
                        "car",
                        123,
                        [models.SublabelRequest("wheel")],
                    ),
                ],
            ),
            "sublabel .+ of label .+ has no ID",
        )

    def test_duplicate_sublabel_id(self):
        self._test_bad_function_spec(
            cvataa.DetectionFunctionSpec(
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
            ),
            "same ID as another sublabel",
        )

    def test_sublabel_not_in_dataset(self):
        self._test_bad_function_spec(
            cvataa.DetectionFunctionSpec(
                labels=[
                    cvataa.skeleton_label_spec("cat", 123, [cvataa.keypoint_spec("nose", 1)]),
                ],
            ),
            "not in dataset",
        )

    def _test_bad_function_detect(self, detect, exc_match: str) -> None:
        spec = cvataa.DetectionFunctionSpec(
            labels=[
                cvataa.label_spec("car", 123),
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
                    456,
                    type="rectangle",
                    elements=[cvataa.keypoint(12, [1, 2])],
                ),
            ],
            "non-skeleton shape with elements",
        )


if torchvision_models is not None:
    import torch
    import torch.nn as nn

    class FakeTorchvisionDetector(nn.Module):
        def __init__(self, label_id: int) -> None:
            super().__init__()
            self._label_id = label_id

        def forward(self, images: List[torch.Tensor]) -> List[dict]:
            assert isinstance(images, list)
            assert all(isinstance(t, torch.Tensor) for t in images)

            return [
                {
                    "boxes": torch.tensor([[1, 2, 3, 4]]),
                    "labels": torch.tensor([self._label_id]),
                }
            ]

    def fake_get_detection_model(name: str, weights, test_param):
        assert test_param == "expected_value"

        car_label_id = weights.meta["categories"].index("car")

        return FakeTorchvisionDetector(label_id=car_label_id)

    class FakeTorchvisionKeypointDetector(nn.Module):
        def __init__(self, label_id: int, keypoint_names: List[str]) -> None:
            super().__init__()
            self._label_id = label_id
            self._keypoint_names = keypoint_names

        def forward(self, images: List[torch.Tensor]) -> List[dict]:
            assert isinstance(images, list)
            assert all(isinstance(t, torch.Tensor) for t in images)

            return [
                {
                    "labels": torch.tensor([self._label_id]),
                    "keypoints": torch.tensor(
                        [
                            [
                                [hash(name) % 100, 0, 1 if name.startswith("right_") else 0]
                                for i, name in enumerate(self._keypoint_names)
                            ]
                        ]
                    ),
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
        fxt_login: Tuple[Client, str],
    ):
        self.client = fxt_login[0]
        self.image = generate_image_file("1.png", size=(100, 100))

        image_dir = tmp_path / "images"
        image_dir.mkdir()

        image_path = image_dir / self.image.name
        image_path.write_bytes(self.image.getbuffer())

        self.task = self.client.tasks.create_from_data(
            models.TaskWriteRequest(
                "Auto-annotation test task",
                labels=[
                    models.PatchedLabelRequest(
                        name="person",
                        type="skeleton",
                        sublabels=[
                            models.SublabelRequest(name="left_eye"),
                            models.SublabelRequest(name="right_eye"),
                        ],
                    ),
                    models.PatchedLabelRequest(name="car"),
                ],
            ),
            resources=[image_path],
        )

        task_labels = self.task.get_labels()
        self.task_labels_by_id = {label.id: label for label in task_labels}

        person_label = next(label for label in task_labels if label.name == "person")
        self.person_sublabels_by_id = {sl.id: sl for sl in person_label.sublabels}

    def test_torchvision_detection(self, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr(torchvision_models, "get_model", fake_get_detection_model)

        import cvat_sdk.auto_annotation.functions.torchvision_detection as td

        cvataa.annotate_task(
            self.client,
            self.task.id,
            td.create("fasterrcnn_resnet50_fpn_v2", "COCO_V1", test_param="expected_value"),
            allow_unmatched_labels=True,
        )

        annotations = self.task.get_annotations()

        assert len(annotations.shapes) == 1
        assert self.task_labels_by_id[annotations.shapes[0].label_id].name == "car"
        assert annotations.shapes[0].type.value == "rectangle"
        assert annotations.shapes[0].points == [1, 2, 3, 4]

    def test_torchvision_keypoint_detection(self, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr(torchvision_models, "get_model", fake_get_keypoint_detection_model)

        import cvat_sdk.auto_annotation.functions.torchvision_keypoint_detection as tkd

        cvataa.annotate_task(
            self.client,
            self.task.id,
            tkd.create("keypointrcnn_resnet50_fpn", "COCO_V1", test_param="expected_value"),
            allow_unmatched_labels=True,
        )

        annotations = self.task.get_annotations()

        assert len(annotations.shapes) == 1
        assert self.task_labels_by_id[annotations.shapes[0].label_id].name == "person"
        assert annotations.shapes[0].type.value == "skeleton"
        assert len(annotations.shapes[0].elements) == 2

        elements = sorted(
            annotations.shapes[0].elements,
            key=lambda e: self.person_sublabels_by_id[e.label_id].name,
        )

        assert self.person_sublabels_by_id[elements[0].label_id].name == "left_eye"
        assert elements[0].points[0] == hash("left_eye") % 100
        assert elements[0].occluded

        assert self.person_sublabels_by_id[elements[1].label_id].name == "right_eye"
        assert elements[1].points[0] == hash("right_eye") % 100
        assert not elements[1].occluded
