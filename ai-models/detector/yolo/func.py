# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import abc
import math
from collections.abc import Iterable
from typing import ClassVar

import cvat_sdk.auto_annotation as cvataa
import cvat_sdk.models as models
import PIL.Image
from ultralytics import YOLO
from ultralytics.engine.results import Results


class YoloFunction(abc.ABC):
    def __init__(self, model: YOLO, *, device: str = "cpu") -> None:
        self._model = model
        self._device = device

        self.spec = cvataa.DetectionFunctionSpec(
            labels=[self._label_spec(name, id) for id, name in self._model.names.items()],
        )

    @abc.abstractmethod
    def _label_spec(self, name: str, id_: int) -> models.PatchedLabelRequest: ...


class YoloFunctionWithSimpleLabel(YoloFunction):
    LABEL_TYPE: ClassVar[str]

    def _label_spec(self, name: str, id_: int) -> models.PatchedLabelRequest:
        return cvataa.label_spec(name, id_, type=self.LABEL_TYPE)


class YoloClassificationFunction(YoloFunctionWithSimpleLabel):
    LABEL_TYPE = "tag"

    def detect(
        self, context: cvataa.DetectionFunctionContext, image: PIL.Image.Image
    ) -> list[cvataa.DetectionAnnotation]:
        # Unlike the other models, the `predict` method of the classification models does not
        # take a confidence threshold. Therefore, we apply one manually.
        # We also use 0 as the default threshold on the assumption that by default the user
        # wants to get exactly one tag per image.
        conf_threshold = context.conf_threshold or 0.0

        return [
            cvataa.tag(results.probs.top1)
            for results in self._model.predict(source=image, device=self._device, verbose=False)
            if results.probs.top1conf >= conf_threshold
        ]


class YoloFunctionWithShapes(YoloFunction):
    def detect(
        self, context: cvataa.DetectionFunctionContext, image: PIL.Image.Image
    ) -> list[cvataa.DetectionAnnotation]:
        kwargs = {}
        if context.conf_threshold is not None:
            kwargs["conf"] = context.conf_threshold

        return [
            annotation
            for results in self._model.predict(
                source=image, device=self._device, verbose=False, **kwargs
            )
            if len(results) > 0
            for annotation in self._annotations_from_results(results)
        ]

    @abc.abstractmethod
    def _annotations_from_results(
        self, results: Results
    ) -> Iterable[cvataa.DetectionAnnotation]: ...


class YoloDetectionFunction(YoloFunctionWithSimpleLabel, YoloFunctionWithShapes):
    LABEL_TYPE = "rectangle"

    def _annotations_from_results(self, results: Results) -> Iterable[cvataa.DetectionAnnotation]:
        return (
            cvataa.rectangle(int(label.item()), points.tolist())
            for label, points in zip(results.boxes.cls, results.boxes.xyxy)
        )


class YoloOrientedDetectionFunction(YoloFunctionWithSimpleLabel, YoloFunctionWithShapes):
    LABEL_TYPE = "rectangle"

    def _annotations_from_results(self, results: Results) -> Iterable[cvataa.DetectionAnnotation]:
        return (
            cvataa.rectangle(
                int(label.item()),
                [x - 0.5 * w, y - 0.5 * h, x + 0.5 * w, y + 0.5 * h],
                rotation=math.degrees(r),
            )
            for label, xywhr in zip(results.obb.cls, results.obb.xywhr)
            for x, y, w, h, r in [xywhr.tolist()]
        )


DEFAULT_KEYPOINT_NAMES = [
    # The keypoint names are not recorded in the model file, so we have to ask the user to
    # supply them separately (see the keypoint_names_path option).
    # But to make using the default models easier, we hardcode the usual COCO keypoint names.
    "nose",
    "left_eye",
    "right_eye",
    "left_ear",
    "right_ear",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
    "left_ankle",
    "right_ankle",
]


class YoloPoseEstimationFunction(YoloFunctionWithShapes):
    def __init__(self, model: YOLO, *, keypoint_names_path: str | None = None, **kwargs) -> None:
        if keypoint_names_path is None:
            self._keypoint_names = DEFAULT_KEYPOINT_NAMES
        else:
            self._keypoint_names = self._load_names(keypoint_names_path)

        super().__init__(model, **kwargs)

    def _load_names(self, path: str) -> list[str]:
        with open(path, "r") as f:
            return [
                stripped_line
                for line in f.readlines()
                for stripped_line in [line.strip()]
                if stripped_line
            ]

    def _label_spec(self, name: str, id_: int) -> models.PatchedLabelRequest:
        return cvataa.skeleton_label_spec(
            name,
            id_,
            [
                cvataa.keypoint_spec(kp_name, kp_id)
                for kp_id, kp_name in enumerate(self._keypoint_names)
            ],
        )

    def _annotations_from_results(self, results: Results) -> Iterable[cvataa.DetectionAnnotation]:
        return (
            cvataa.skeleton(
                int(label.item()),
                [
                    cvataa.keypoint(kp_index, kp.tolist(), outside=kp_conf.item() < 0.5)
                    for kp_index, (kp, kp_conf) in enumerate(zip(kps, kp_confs))
                ],
            )
            for label, kps, kp_confs in zip(
                results.boxes.cls, results.keypoints.xy, results.keypoints.conf
            )
        )


class YoloSegmentationFunction(YoloFunctionWithSimpleLabel, YoloFunctionWithShapes):
    LABEL_TYPE = "polygon"

    def _annotations_from_results(self, results: Results) -> Iterable[cvataa.DetectionAnnotation]:
        return (
            cvataa.polygon(int(label.item()), [c for p in poly_points.tolist() for c in p])
            for label, poly_points in zip(results.boxes.cls, results.masks.xy)
        )


FUNCTION_CLASS_BY_TASK = {
    "classify": YoloClassificationFunction,
    "detect": YoloDetectionFunction,
    "pose": YoloPoseEstimationFunction,
    "obb": YoloOrientedDetectionFunction,
    "segment": YoloSegmentationFunction,
}


def create(model: str, **kwargs) -> cvataa.DetectionFunction:
    model = YOLO(model=model, verbose=False)
    return FUNCTION_CLASS_BY_TASK[model.task](model, **kwargs)
