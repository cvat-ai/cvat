# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import abc
from typing import List, Sequence

import attrs
import PIL.Image
from typing_extensions import Protocol

import cvat_sdk.models as models


@attrs.frozen(kw_only=True)
class DetectionFunctionSpec:
    labels: Sequence[models.PatchedLabelRequest]


class DetectionFunctionContext(metaclass=abc.ABCMeta):
    @property
    @abc.abstractmethod
    def frame_name(self) -> str:
        ...


class DetectionFunction(Protocol):
    @property
    def spec(self) -> DetectionFunctionSpec:
        ...

    def detect(
        self, context: DetectionFunctionContext, image: PIL.Image.Image
    ) -> List[models.LabeledShapeRequest]:
        ...


# spec factories


# pylint: disable-next=redefined-builtin
def label_spec(name: str, id: int, **kwargs) -> models.PatchedLabelRequest:
    return models.PatchedLabelRequest(name=name, id=id, **kwargs)


# pylint: disable-next=redefined-builtin
def skeleton_label_spec(
    name: str, id: int, sublabels: Sequence[models.SublabelRequest], **kwargs
) -> models.PatchedLabelRequest:
    return models.PatchedLabelRequest(name=name, id=id, type="skeleton", sublabels=sublabels)


# pylint: disable-next=redefined-builtin
def keypoint_spec(name: str, id: int, **kwargs) -> models.SublabelRequest:
    return models.SublabelRequest(name=name, id=id, **kwargs)


# annotation factories


def shape(label_id: int, **kwargs) -> models.LabeledShapeRequest:
    return models.LabeledShapeRequest(label_id=label_id, frame=0, **kwargs)


def rectangle(label_id: int, points: Sequence[float], **kwargs) -> models.LabeledShapeRequest:
    return shape(label_id, type="rectangle", points=points, **kwargs)


def skeleton(
    label_id: int, elements: Sequence[models.SubLabeledShapeRequest], **kwargs
) -> models.LabeledShapeRequest:
    return shape(label_id, type="skeleton", elements=elements, **kwargs)


def keypoint(label_id: int, points: Sequence[float], **kwargs) -> models.SubLabeledShapeRequest:
    return models.SubLabeledShapeRequest(
        label_id=label_id, frame=0, type="points", points=points, **kwargs
    )
