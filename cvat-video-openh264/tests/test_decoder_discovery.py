# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import types

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


@pytest.mark.parametrize(
    "version",
    [
        (0, 9, 9),
        # 1.0-1.5 carry an extra SDecodingParam field the bindings do not model.
        (1, 5, 0),
        # Unknown future major whose ABI this adapter has not been validated against.
        (3, 0, 0),
    ],
)
def test_ensure_supported_version_rejects_out_of_window(
    version: tuple[int, int, int],
) -> None:
    with pytest.raises(DecoderVersionMismatchError):
        ensure_supported_version(version, "/opt/codecs/libopenh264.so")


@pytest.mark.parametrize(
    "missing", ["WelsCreateDecoder", "WelsDestroyDecoder", "WelsGetCodecVersionEx"]
)
def test_load_library_requires_the_openh264_entry_points(
    monkeypatch: pytest.MonkeyPatch, missing: str
) -> None:
    class PartialLibrary:
        def __getattr__(self, name: str) -> object:
            if name == missing:
                raise AttributeError(name)
            # Stand in for a bound foreign function, which accepts prototype assignment.
            return types.SimpleNamespace()

    monkeypatch.setattr(decoder.ctypes, "CDLL", lambda *_args, **_kwargs: PartialLibrary())

    with pytest.raises(VideoDecoderUnavailableError, match=missing):
        decoder.load_library("/opt/codecs/libopenh264.so")


def test_probe_version_reads_through_the_ex_entry_point() -> None:
    class VersionLibrary:
        def WelsGetCodecVersionEx(self, version_reference: object) -> None:
            version = version_reference._obj
            version.major, version.minor, version.revision = (2, 4, 1)

    assert decoder._probe_version(VersionLibrary()) == (2, 4, 1)


def test_resolve_rejects_an_out_of_window_library(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(decoder, "_discover_library_path", lambda _p: "/opt/libopenh264.so")
    monkeypatch.setattr(decoder, "load_library", lambda _p: object())
    monkeypatch.setattr(decoder, "_probe_version", lambda _lib: (1, 0, 0))

    with pytest.raises(DecoderVersionMismatchError, match="1.0.0"):
        decoder.resolve_decoder_and_library(None)


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
