# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import ctypes
from dataclasses import dataclass, field


@dataclass(frozen=True)
class DecoderInfo:
    """A resolved, loaded and version-validated OpenH264 shared library.

    ``library`` is the loaded handle, so passing one instance to repeated
    :func:`cvat_video_openh264.iter_frames` calls resolves and loads the codec once
    instead of once per chunk. It is excluded from comparison and ``repr`` because
    every load of the same path yields a distinct ``CDLL`` wrapper.
    """

    library_path: str
    version: tuple[int, int, int]
    library: ctypes.CDLL = field(repr=False, compare=False)


@dataclass(frozen=True)
class Box:
    type: bytes
    offset: int
    payload_offset: int
    end_offset: int


@dataclass(frozen=True)
class AvcConfiguration:
    nal_length_size: int
    sequence_parameter_sets: tuple[bytes, ...]
    picture_parameter_sets: tuple[bytes, ...]


@dataclass(frozen=True)
class Sample:
    offset: int
    size: int


@dataclass(frozen=True)
class VideoTrack:
    avc_configuration: AvcConfiguration
    samples: tuple[Sample, ...]
