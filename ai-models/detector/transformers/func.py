# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from collections.abc import Iterator
from typing import ClassVar, Generic, TypeVar

import cvat_sdk.auto_annotation as cvataa
import numpy as np
import PIL.Image
import transformers
from cvat_sdk.masks import encode_mask
from skimage import measure

PipelineType = TypeVar("PipelineType", bound=transformers.Pipeline)


class TransformersFunction(Generic[PipelineType]):
    LABEL_TYPE: ClassVar[str]

    def __init__(self, pipeline: PipelineType) -> None:
        self._pipeline = pipeline

        id2label = self._pipeline.model.config.id2label
        self.spec = cvataa.DetectionFunctionSpec(
            labels=[
                cvataa.label_spec(name, id_, type=self.LABEL_TYPE) for id_, name in id2label.items()
            ]
        )

        self._label2id = self._pipeline.model.config.label2id


class TransformersImageClassificationFunction(
    TransformersFunction[transformers.ImageClassificationPipeline]
):
    LABEL_TYPE = "tag"

    def detect(
        self, context: cvataa.DetectionFunctionContext, image: PIL.Image.Image
    ) -> list[cvataa.DetectionAnnotation]:
        conf_threshold = context.conf_threshold or 0.0

        result = self._pipeline(image, top_k=1)

        if result[0]["score"] >= conf_threshold:
            return [cvataa.tag(int(self._label2id[result[0]["label"]]))]

        return []


class TransformersShapeFunction(TransformersFunction[PipelineType]):
    def detect(
        self, context: cvataa.DetectionFunctionContext, image: PIL.Image.Image
    ) -> list[cvataa.DetectionAnnotation]:
        extra_args = {}
        if context.conf_threshold is not None:
            extra_args["threshold"] = context.conf_threshold

        return [
            shape
            for detection in self._pipeline(image, **extra_args)
            for shape in self._generate_shapes(context, detection)
        ]


class TransformersObjectDetectionFunction(
    TransformersShapeFunction[transformers.ObjectDetectionPipeline]
):
    LABEL_TYPE = "rectangle"

    def _generate_shapes(
        self, context: cvataa.DetectionFunctionContext, detection: dict
    ) -> Iterator[cvataa.DetectionAnnotation]:
        box = detection["box"]

        yield cvataa.rectangle(
            int(self._label2id[detection["label"]]),
            [box["xmin"], box["ymin"], box["xmax"], box["ymax"]],
        )


def _is_positively_oriented(contour: np.ndarray) -> bool:
    ys, xs = contour.T
    return np.sum(xs * np.roll(ys, -1)) < np.sum(ys * np.roll(xs, -1))


class TransformersImageSegmentationFunction(
    TransformersShapeFunction[transformers.ImageSegmentationPipeline]
):
    LABEL_TYPE = "mask"

    def _generate_shapes(
        self, context: cvataa.DetectionFunctionContext, detection: dict
    ) -> Iterator[cvataa.DetectionAnnotation]:
        label_id = int(self._label2id[detection["label"]])
        mask = detection["mask"]

        if context.conv_mask_to_poly:
            contours = measure.find_contours(np.asanyarray(mask), level=0.5)

            for contour in contours:
                if len(contour) < 3 or _is_positively_oriented(contour):
                    continue

                approx_contour = measure.approximate_polygon(contour, tolerance=2.5)

                if len(approx_contour) < 3:
                    approx_contour = contour

                yield cvataa.polygon(label_id, approx_contour[:, ::-1].ravel().tolist())

        else:
            yield cvataa.mask(label_id, encode_mask(mask.convert("1")))


def create(**kwargs) -> cvataa.DetectionFunction:
    pipeline = transformers.pipeline(**kwargs)

    if isinstance(pipeline, transformers.ImageClassificationPipeline):
        return TransformersImageClassificationFunction(pipeline)

    if isinstance(pipeline, transformers.ObjectDetectionPipeline):
        return TransformersObjectDetectionFunction(pipeline)

    if isinstance(pipeline, transformers.ImageSegmentationPipeline):
        return TransformersImageSegmentationFunction(pipeline)

    raise ValueError(f"Unsupported pipeline type: {type(pipeline).__name__}")
