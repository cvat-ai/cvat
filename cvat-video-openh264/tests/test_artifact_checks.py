# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import zipfile
from pathlib import Path

import pytest
from scripts.check_artifacts import ArtifactValidationError, validate_artifact


def _write_wheel(path: Path, members: tuple[str, ...]) -> None:
    with zipfile.ZipFile(path, "w") as wheel:
        for member in (
            *members,
            "cvat_video_openh264-0.1.0.dev0.dist-info/licenses/LICENSE",
        ):
            wheel.writestr(member, b"")


def test_pure_python_adapter_wheel_is_accepted(tmp_path: Path) -> None:
    wheel_path = tmp_path / "cvat_video_openh264-0.1.0.dev0-py3-none-any.whl"
    _write_wheel(wheel_path, ("cvat_video_openh264/__init__.py",))

    validate_artifact(wheel_path)


@pytest.mark.parametrize(
    "prohibited_member",
    [
        "cvat_video_openh264/libopenh264.so",
        "av/__init__.py",
        "cvat_sdk/__init__.py",
    ],
)
def test_prohibited_wheel_payload_is_rejected(
    tmp_path: Path,
    prohibited_member: str,
) -> None:
    wheel_path = tmp_path / "cvat_video_openh264-0.1.0.dev0-py3-none-any.whl"
    _write_wheel(
        wheel_path,
        ("cvat_video_openh264/__init__.py", prohibited_member),
    )

    with pytest.raises(ArtifactValidationError):
        validate_artifact(wheel_path)
