# Copyright (C) 2025 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from cvat_sdk.api_client import models
from abc import ABCMeta, abstractmethod
from PIL import Image
from .enums import _SourceDataType

class ITaskSpec(models.ITaskWriteRequest, models.IDataRequest, metaclass=ABCMeta):
    size: int
    frame_step: int
    source_data_type: _SourceDataType

    @abstractmethod
    def read_frame(self, i: int) -> Image.Image: ...
