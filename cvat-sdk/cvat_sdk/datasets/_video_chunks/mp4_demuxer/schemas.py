# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import attrs

from cvat_sdk.datasets._video_chunks.exceptions import UnsupportedVideoError


@attrs.frozen
class ByteRange:
    offset: int
    size: int

    @property
    def end(self) -> int:
        return self.offset + self.size


@attrs.frozen
class BoxType:
    code: bytes

    def __str__(self) -> str:
        return repr(self.code.decode("latin-1"))


@attrs.frozen
class Box:
    type: BoxType
    payload_range: ByteRange


class BoxMapping:
    def __init__(self) -> None:
        self._boxes: dict[BoxType, Box] = {}

    def __setitem__(self, box_type: BoxType, box: Box) -> None:
        if box_type in self._boxes:
            raise UnsupportedVideoError(f"The MP4 chunk has more than one {box_type} box")

        self._boxes[box_type] = box

    def __getitem__(self, box_type: BoxType) -> Box:
        try:
            return self._boxes[box_type]
        except KeyError:
            raise UnsupportedVideoError(f"The MP4 chunk has no {box_type} box") from None


@attrs.frozen
class SampleTable:
    """
    What the demuxer keeps from the MP4 sample table box (stbl).

    In a CVAT chunk every MP4 sample is one frame: ``samples`` holds where each frame is in
    the file, and ``parameter_sets`` the SPS and PPS (from stsd / avc1 / avcC) in Annex-B
    form, which the decoder needs before the first frame.
    """

    parameter_sets: bytes
    samples: tuple[ByteRange, ...]
