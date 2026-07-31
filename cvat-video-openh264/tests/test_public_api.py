# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import builtins
import inspect
from pathlib import Path

import pytest

import cvat_video_openh264 as video
import cvat_video_openh264._reader as reader
import cvat_video_openh264.errors as errors


def test_public_decoder_contract_is_typed_and_compatible() -> None:
    signature = inspect.signature(video.iter_frames)

    assert list(signature.parameters) == ["path", "library_path"]
    assert signature.parameters["library_path"].kind is inspect.Parameter.KEYWORD_ONLY
    assert video.VideoDecoderUnavailableError is video.DecoderUnavailableError
    assert video.VideoDecoderUnavailableError.__name__ == "VideoDecoderUnavailableError"

    for name in errors.__all__:
        assert getattr(video, name) is getattr(errors, name)
        assert issubclass(getattr(video, name), video.VideoDecoderError)

    assert issubclass(video.DecoderUnavailableError, RuntimeError)
    assert issubclass(video.UnsupportedVideoChunkError, ValueError)


def test_import_and_iterator_construction_have_no_side_effects(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fail(*args: object, **kwargs: object) -> None:
        raise AssertionError("Iterator construction must not load a codec or prompt")

    monkeypatch.setattr(reader.ctypes, "CDLL", fail)
    monkeypatch.setattr(reader.ctypes.util, "find_library", fail)
    monkeypatch.setattr(builtins, "input", fail)

    frames = video.iter_frames(tmp_path / "not-read-until-iteration.mp4")

    assert inspect.isgenerator(frames)
    frames.close()
