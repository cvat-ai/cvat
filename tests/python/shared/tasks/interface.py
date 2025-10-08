# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from abc import ABCMeta, abstractmethod

from cvat_sdk.api_client import models
from PIL import Image

from shared.tasks.enums import SourceDataType


class ITaskSpec(models.ITaskWriteRequest, models.IDataRequest, metaclass=ABCMeta):
    size: int
    frame_step: int
    source_data_type: SourceDataType

    @abstractmethod
    def read_frame(self, i: int) -> Image.Image: ...
