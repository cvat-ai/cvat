# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""
Download Cisco's OpenH264 binary into the user data directory, remove it, or show its status.

Run as ``python -m cvat_mp4_h264 install|remove|status``. Nothing here runs on import or on
decoding: the library is downloaded only when the user asks for it.
"""

from __future__ import annotations

import argparse
import bz2
import hashlib
import http.client
import itertools
import os
import platform
import sys
import urllib.request
from collections.abc import Mapping, Sequence
from pathlib import Path

import attrs

from ..exceptions import VideoDecoderError
from ..openh264.consts import INSTALL_VERSION
from ..openh264.schemas import LibraryInfo
from ..openh264.services import load_library
from ..openh264.utils import get_library_install_path, load_library_from_path
from ..settings import OPENH264_LIBRARY_ENV_VAR, get_openh264_library_path

OPENH264_NOTICE = "OpenH264 Video Codec provided by Cisco Systems, Inc."

OPENH264_LICENSE_PATH = Path(__file__).with_name("OPENH264_BINARY_LICENSE.txt")

OPENH264_BASE_URL = "https://ciscobinary.openh264.org/"

_DOWNLOAD_TIMEOUT = 60  # seconds

_MANUAL_ALTERNATIVE = (
    f"Set {OPENH264_LIBRARY_ENV_VAR} to the path of an OpenH264 2.x library you supply."
)


class OpenH264InstallError(RuntimeError):
    """Raised when the OpenH264 library cannot be downloaded, installed or removed."""


class UnsupportedPlatformError(OpenH264InstallError):
    """Raised when there is no Cisco binary the command can install on this system."""


@attrs.frozen
class OpenH264Binary:
    url: str
    sha256: str
    """The SHA-256 of the decompressed file, as in Cisco's ``<file name>.signed.sha256.txt``."""


@attrs.frozen
class LibraryStatus:
    source: str

    library_path: str
    version: tuple[int, int, int]


_BINARIES: Mapping[tuple[str, str], OpenH264Binary] = {
    ("linux", "x86_64"): OpenH264Binary(
        url=f"{OPENH264_BASE_URL}libopenh264-{INSTALL_VERSION}-linux64.8.so.bz2",
        sha256="1522f873a482923c5ec018a4415e1866898197528828c50f90fd300c94620df3",
    ),
    ("linux", "arm64"): OpenH264Binary(
        url=f"{OPENH264_BASE_URL}libopenh264-{INSTALL_VERSION}-linux-arm64.8.so.bz2",
        sha256="9ac664b0154fd0868491c2a904397b8a05779874c0603b8b1f16ad15de1ffd82",
    ),
    ("darwin", "arm64"): OpenH264Binary(
        url=f"{OPENH264_BASE_URL}libopenh264-{INSTALL_VERSION}-mac-arm64.dylib.bz2",
        sha256="2e1ae3cd10c08328ca03a1f304fd2a1a2a7e5658c6d5a8582101a963f7995ef0",
    ),
    ("darwin", "x86_64"): OpenH264Binary(
        url=f"{OPENH264_BASE_URL}libopenh264-{INSTALL_VERSION}-mac-x64.dylib.bz2",
        sha256="31d38bcbe9348e9b44ca38dd08fa1e2af79ffce6521276449ef05e3cd39136f4",
    ),
    ("win32", "x86_64"): OpenH264Binary(
        url=f"{OPENH264_BASE_URL}openh264-{INSTALL_VERSION}-win64.dll.bz2",
        sha256="0ef5e7f3b38753b15c13afa0418d4d7805fa228e6adfd3e425bbf758cff1c288",
    ),
}

_ARCHITECTURE_ALIASES: Mapping[str, str] = {
    "x86_64": "x86_64",
    "amd64": "x86_64",
    "aarch64": "arm64",
    "arm64": "arm64",
}


def _current_platform() -> tuple[str, str]:
    machine = platform.machine().lower()
    return sys.platform, _ARCHITECTURE_ALIASES.get(machine, machine)


def _find_binary() -> OpenH264Binary:
    """Return the Cisco binary for the running interpreter, or raise UnsupportedPlatformError."""

    os_name, architecture = _current_platform()
    binary = _BINARIES.get((os_name, architecture))
    if binary is None:
        raise UnsupportedPlatformError(
            f"There is no OpenH264 binary to download for {os_name} {architecture}. "
            + _MANUAL_ALTERNATIVE
        )

    return binary


def _print_notice() -> None:
    print(OPENH264_NOTICE)
    print(f"License: {OPENH264_LICENSE_PATH}")


def _file_sha256(path: Path) -> str:
    with path.open("rb") as file:
        return hashlib.file_digest(file, "sha256").hexdigest()


def _download(binary: OpenH264Binary) -> bytes:
    try:
        with urllib.request.urlopen(binary.url, timeout=_DOWNLOAD_TIMEOUT) as response:
            library = bz2.decompress(response.read())
    except (OSError, ValueError, http.client.HTTPException) as e:
        raise OpenH264InstallError(f"Could not download {binary.url}: {e}") from e

    actual_sha256 = hashlib.sha256(library).hexdigest()
    if actual_sha256 != binary.sha256:
        raise OpenH264InstallError(
            f"The checksum of {binary.url} does not match: "
            f"expected SHA-256 {binary.sha256}, got {actual_sha256}"
        )

    return library


def _write_atomically(path: Path, data: bytes) -> None:
    """Readers and concurrent installs see either no file or the complete one."""

    path.parent.mkdir(parents=True, exist_ok=True)

    for counter in itertools.count():
        temp_path = path.with_name(f"{path.name}.tmp{counter}")
        try:
            temp_file = temp_path.open("xb")
            break
        except FileExistsError:
            pass

    try:
        with temp_file:
            temp_file.write(data)
        os.replace(temp_path, path)
    except BaseException:
        temp_path.unlink()
        raise


def install() -> LibraryInfo:
    """
    Download Cisco's OpenH264 binary for this system and check that it loads.

    Downloads nothing if the library is already installed.
    """

    _print_notice()

    binary = _find_binary()
    path = get_library_install_path()

    if not (path.is_file() and _file_sha256(path=path) == binary.sha256):
        library = _download(binary=binary)
        try:
            _write_atomically(path=path, data=library)
        except OSError as e:
            raise OpenH264InstallError(f"Could not write {path}: {e}") from e

    return load_library_from_path(library_path=str(path))


def remove() -> Path | None:
    """Delete the library installed by ``install()``. Return its path, or None if there was none."""

    _print_notice()

    path = get_library_install_path()
    if not path.is_file():
        return None

    try:
        path.unlink()
    except OSError as e:
        raise OpenH264InstallError(f"Could not remove {path}: {e}") from e

    return path


def status() -> LibraryStatus:
    """
    Return which OpenH264 library the reader would use.

    Raises VideoDecoderUnavailableError when there is none or it cannot be loaded.
    """

    library_info = load_library()
    source = (
        OPENH264_LIBRARY_ENV_VAR if get_openh264_library_path() is not None else "installed copy"
    )
    return LibraryStatus(
        source=source,
        library_path=library_info.library_path,
        version=library_info.version,
    )


def _format_version(version: tuple[int, int, int]) -> str:
    return ".".join(map(str, version))


def run_command(command: str) -> str:
    """
    Run ``install``, ``remove`` or ``status`` and return the line to print.

    Shared by ``python -m cvat_mp4_h264`` and ``cvat-cli openh264``.
    Raises VideoDecoderError or OpenH264InstallError on failure.
    """

    if command == "install":
        library_info = install()
        return (
            f"OpenH264 {_format_version(version=library_info.version)} "
            f"is installed at {library_info.library_path}"
        )

    if command == "remove":
        removed_path = remove()
        if removed_path is None:
            return "OpenH264 is not installed, nothing to remove"
        return f"Removed {removed_path}"

    if command == "status":
        library_status = status()
        return (
            f"OpenH264 {_format_version(version=library_status.version)} "
            f"from {library_status.source}: {library_status.library_path}"
        )

    raise ValueError(f"Unknown command: {command!r}")


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m cvat_mp4_h264",
        description=(
            "Download Cisco's OpenH264 library, which cvat-mp4-h264 uses to decode video, "
            f"into {get_library_install_path().parent}, remove it, or show which library is used.\n\n"
            f"{OPENH264_NOTICE}\n"
            f"License: {OPENH264_LICENSE_PATH}"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser(
        "install", help=f"download OpenH264 {INSTALL_VERSION} from Cisco and check that it loads"
    )
    subparsers.add_parser("remove", help="delete the downloaded library")
    subparsers.add_parser("status", help="show which OpenH264 library is used")

    args = parser.parse_args(argv)

    try:
        print(run_command(command=args.command))
    except (VideoDecoderError, OpenH264InstallError) as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1

    return 0
