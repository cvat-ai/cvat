# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import attrs


@attrs.frozen
class ByteRange:
    offset: int
    size: int

    @property
    def end(self) -> int:
        return self.offset + self.size


@attrs.frozen
class SampleTable:
    """
    What the demuxer keeps from the MP4 sample table box (stbl).

    MP4 calls a frame a "sample": ``samples`` holds where each frame is in the file, and
    ``parameter_sets`` the SPS and PPS (from stsd / avc1 / avcC) in Annex-B form, which the
    decoder needs before the first frame.
    """

    parameter_sets: bytes
    samples: tuple[ByteRange, ...]
