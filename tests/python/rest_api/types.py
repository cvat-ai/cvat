# Copyright (C) 2025 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
from collections.abc import Callable
from contextlib import closing
from typing import ClassVar

import attrs
from PIL import Image

from shared.tasks.base import TaskSpecBase
from shared.tasks.enums import SourceDataType
from shared.utils.helpers import read_video_file


@attrs.define
class VideoTaskSpec(TaskSpecBase):
    source_data_type: ClassVar[SourceDataType] = SourceDataType.video

    _get_video_file: Callable[[], io.IOBase] = attrs.field(kw_only=True)

    def read_frame(self, i: int) -> Image.Image:
        with closing(read_video_file(self._get_video_file())) as reader:
            for _ in range(i + 1):
                frame = next(reader)

            return frame


@attrs.define
class ImagesTaskSpec(TaskSpecBase):
    source_data_type: ClassVar[SourceDataType] = SourceDataType.images

    _get_frame: Callable[[int], bytes] = attrs.field(kw_only=True)

    def read_frame(self, i: int) -> Image.Image:
        return Image.open(io.BytesIO(self._get_frame(i)))
