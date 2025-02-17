# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import abc
from typing import Optional

import attrs
import attrs.validators
import PIL.Image

import cvat_sdk.core
import cvat_sdk.core.exceptions
import cvat_sdk.models as models


class UnsupportedDatasetError(cvat_sdk.core.exceptions.CvatSdkException):
    pass


@attrs.frozen
class FrameAnnotations:
    """
    Contains annotations that pertain to a single frame.
    """

    tags: list[models.LabeledImage] = attrs.Factory(list)
    shapes: list[models.LabeledShape] = attrs.Factory(list)


class MediaElement(metaclass=abc.ABCMeta):
    """
    The media part of a dataset sample.
    """

    @abc.abstractmethod
    def load_image(self) -> PIL.Image.Image:
        """
        Loads the media data and returns it as a PIL Image object.
        """
        ...


@attrs.frozen
class Sample:
    """
    Represents an element of a dataset.
    """

    frame_index: int
    """Index of the corresponding frame in its task."""

    frame_name: str
    """File name of the frame in its task."""

    annotations: Optional[FrameAnnotations]
    """
    Annotations belonging to the frame.

    Will be None if the dataset was created without loading annotations.
    """

    media: MediaElement
    """Media data of the frame."""
