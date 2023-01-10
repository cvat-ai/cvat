# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import List, Mapping

import attrs
import attrs.validators

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

    tags: List[models.LabeledImage] = attrs.Factory(list)
    shapes: List[models.LabeledShape] = attrs.Factory(list)


@attrs.frozen
class Target:
    """
    Non-image data for a dataset sample.
    """

    annotations: FrameAnnotations
    """Annotations for the frame corresponding to the sample."""

    label_id_to_index: Mapping[int, int]
    """
    A mapping from label_id values in `LabeledImage` and `LabeledShape` objects
    to an integer index. This mapping is consistent across all samples for a given task.
    """
