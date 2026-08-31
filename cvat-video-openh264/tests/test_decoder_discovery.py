# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import pytest

import cvat_video_openh264.utils.decoder as decoder
from cvat_video_openh264 import DecoderVersionMismatchError, VideoDecoderUnavailableError
from cvat_video_openh264.utils.decoder import (
    MIN_SUPPORTED_VERSION,
    _discover_library_path,
    ensure_supported_version,
)


@pytest.mark.parametrize("version", [MIN_SUPPORTED_VERSION, (1, 8, 0), (2, 4, 1)])
def test_ensure_supported_version_accepts_supported(version: tuple[int, int, int]) -> None:
    ensure_supported_version(version, "/opt/codecs/libopenh264.so")


@pytest.mark.parametrize("version", [None, (0, 9, 9)])
def test_ensure_supported_version_rejects_unreadable_or_old(
    version: tuple[int, int, int] | None,
) -> None:
    with pytest.raises(DecoderVersionMismatchError):
        ensure_supported_version(version, "/opt/codecs/libopenh264.so")


def test_explicit_path_takes_precedence(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CVAT_OPENH264_LIBRARY", "/env/libopenh264.so")

    assert _discover_library_path("/explicit/libopenh264.so") == "/explicit/libopenh264.so"


def test_environment_variable_is_used_when_no_explicit_path(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("CVAT_OPENH264_LIBRARY", "/env/libopenh264.so")

    assert _discover_library_path(None) == "/env/libopenh264.so"


def test_posix_falls_back_to_system_discovery(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(decoder.os, "name", "posix")
    monkeypatch.delenv("CVAT_OPENH264_LIBRARY", raising=False)
    monkeypatch.setattr(
        decoder.ctypes.util, "find_library", lambda _name: "/usr/lib/libopenh264.so"
    )

    assert _discover_library_path(None) == "/usr/lib/libopenh264.so"


def test_windows_requires_an_absolute_explicit_path(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(decoder.os, "name", "nt")

    with pytest.raises(VideoDecoderUnavailableError, match="must be absolute on Windows"):
        _discover_library_path("relative\\libopenh264.dll")


def test_windows_does_not_search_path_or_cwd(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(decoder.os, "name", "nt")
    monkeypatch.delenv("CVAT_OPENH264_LIBRARY", raising=False)

    def fail(_name: str) -> str:
        raise AssertionError("Windows discovery must never search PATH via find_library")

    monkeypatch.setattr(decoder.ctypes.util, "find_library", fail)

    with pytest.raises(VideoDecoderUnavailableError, match="OpenH264 is required"):
        _discover_library_path(None)
