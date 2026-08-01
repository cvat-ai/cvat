# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from dataclasses import dataclass


@dataclass(frozen=True)
class DecoderInfo:
    library_path: str
    version: tuple[int, int, int] | None


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
