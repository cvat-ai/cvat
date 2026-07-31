# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Reject prohibited native/media payloads in standalone package artifacts."""

from __future__ import annotations

import argparse
import tarfile
import zipfile
from collections.abc import Iterable
from pathlib import Path, PurePosixPath

_PROHIBITED_NATIVE_SUFFIXES = {".dll", ".dylib", ".pyd", ".so"}
_PROHIBITED_NAME_PREFIXES = (
    "ffmpeg",
    "libav",
    "libopenh264",
    "libsw",
    "libx264",
    "openh264",
)


class ArtifactValidationError(ValueError):
    """Raised when an artifact contains a prohibited or unexpected payload."""


def _archive_members(path: Path) -> tuple[str, ...]:
    if path.suffix == ".whl":
        with zipfile.ZipFile(path) as archive:
            return tuple(archive.namelist())
    if path.name.endswith(".tar.gz"):
        with tarfile.open(path, "r:gz") as archive:
            return tuple(archive.getnames())

    raise ArtifactValidationError(f"Unsupported package artifact {path.name!r}")


def validate_artifact(path: Path) -> None:
    """Validate the initial pure-Python package boundary for one artifact."""

    members = _archive_members(path)
    normalized_members = tuple(PurePosixPath(member) for member in members)
    if not any(
        member.name == "__init__.py" and "cvat_video_openh264" in member.parts
        for member in normalized_members
    ):
        raise ArtifactValidationError(f"{path.name!r} does not contain the adapter package")
    for required_notice in ("LICENSE", "THIRD_PARTY_NOTICES.md"):
        if not any(member.name == required_notice for member in normalized_members):
            raise ArtifactValidationError(
                f"{path.name!r} does not contain required notice {required_notice!r}"
            )

    if path.suffix == ".whl" and not path.name.endswith("-py3-none-any.whl"):
        raise ArtifactValidationError(f"{path.name!r} is not a pure-Python wheel")

    for member in normalized_members:
        lowered_parts = tuple(part.lower() for part in member.parts)
        basename = member.name.lower()
        if "cvat_sdk" in lowered_parts:
            raise ArtifactValidationError(f"{path.name!r} contains SDK-owned file {str(member)!r}")
        if "av" in lowered_parts[:-1]:
            raise ArtifactValidationError(
                f"{path.name!r} contains a PyAV package path {str(member)!r}"
            )
        if member.suffix.lower() in _PROHIBITED_NATIVE_SUFFIXES:
            raise ArtifactValidationError(f"{path.name!r} contains native file {str(member)!r}")
        if basename.startswith(_PROHIBITED_NAME_PREFIXES):
            raise ArtifactValidationError(f"{path.name!r} contains prohibited file {str(member)!r}")


def validate_artifacts(paths: Iterable[Path]) -> None:
    artifacts = tuple(paths)
    if not artifacts:
        raise ArtifactValidationError("No package artifacts were supplied")

    for path in artifacts:
        validate_artifact(path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("artifacts", nargs="+", type=Path)
    arguments = parser.parse_args()
    validate_artifacts(arguments.artifacts)


if __name__ == "__main__":
    main()
