# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import Mapping

import attrs

from cvat_sdk.datasets.common import FrameAnnotations


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
