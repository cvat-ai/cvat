# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""
An auto-annotation detection function powered by the YOLOv8n model.
Outputs rectangles.
"""

from typing import Iterator, List

import PIL.Image
from ultralytics import YOLO
from ultralytics.engine.results import Results

import cvat_sdk.auto_annotation as cvataa
import cvat_sdk.models as models

_model = YOLO("yolov8n.pt")

spec = cvataa.DetectionFunctionSpec(
    labels=[cvataa.label_spec(name, id) for id, name in _model.names.items()],
)


def _yolo_to_cvat(results: List[Results]) -> Iterator[models.LabeledShapeRequest]:
    for result in results:
        for box, label in zip(result.boxes.xyxy, result.boxes.cls):
            yield cvataa.rectangle(
                label_id=int(label.item()),
                points=[p.item() for p in box],
            )


def detect(context, image: PIL.Image.Image) -> List[models.LabeledShapeRequest]:
    return list(_yolo_to_cvat(_model.predict(source=image, verbose=False)))
