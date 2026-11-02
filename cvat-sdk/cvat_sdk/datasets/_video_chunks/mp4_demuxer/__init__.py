# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""
Splits CVAT's MP4 video chunks into H.264 access units.

The demuxer accepts only the video chunks CVAT writes: FFmpeg's MP4 layout around
libopenh264 output, which every official CVAT image has produced since v1.2.0:

- exactly one track, with exactly one `avc1` sample-description entry;
- constrained-baseline H.264 with 4-byte NAL lengths and SPS and PPS entries in `avcC`;
- `stco`, `stsc` and `stsz` sample tables, with every frame inside `mdat`;
- 32-bit box sizes only.

Other files, including chunks encoded with `libx264`, raise `UnsupportedVideoError`.
"""
