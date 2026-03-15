# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import json
import re
from subprocess import CalledProcessError, run
from importlib import metadata
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen

import pytest


def _read_version_from_source(path: Path) -> str:
    content = path.read_text(encoding="utf-8")
    match = re.search(r'^VERSION\s*=\s*"([^"]+)"\s*$', content, flags=re.MULTILINE)
    if not match:
        raise pytest.UsageError(f"Cannot read VERSION from: {path}")
    return match.group(1)


def expected_repo_versions(cvat_root_dir: Path) -> dict[str, str]:
    return {
        "cvat-sdk": _read_version_from_source(cvat_root_dir / "cvat-sdk/cvat_sdk/version.py"),
        "cvat-cli": _read_version_from_source(cvat_root_dir / "cvat-cli/src/cvat_cli/version.py"),
    }


def installed_python_versions() -> dict[str, str]:
    versions: dict[str, str] = {}
    for dist_name in ("cvat-sdk", "cvat-cli"):
        try:
            versions[dist_name] = metadata.version(dist_name)
        except metadata.PackageNotFoundError as ex:
            raise pytest.UsageError(
                f"{dist_name} is not installed in the current environment. "
                "Install project deps and retry."
            ) from ex
    return versions


def check_python_package_versions(cvat_root_dir: Path) -> None:
    expected = expected_repo_versions(cvat_root_dir)
    installed = installed_python_versions()

    mismatches = [
        f"{name}: installed={installed[name]!r}, expected={expected[name]!r} (major.minor mismatch)"
        for name in ("cvat-sdk", "cvat-cli")
        if _version_major_minor(installed[name]) != _version_major_minor(expected[name])
    ]
    if mismatches:
        mismatch_text = "; ".join(mismatches)
        raise pytest.UsageError(
            "Version precheck failed for Python packages: "
            f"{mismatch_text}. Reinstall deps in your venv before running tests."
        )


def _version_major_minor(version: str) -> tuple[int, int]:
    match = re.match(r"^\s*(\d+)\.(\d+)", version)
    if not match:
        raise pytest.UsageError(f"Cannot parse major.minor from version: {version!r}")
    return int(match.group(1)), int(match.group(2))


def _server_image_ref() -> str:
    from os import environ

    return f"cvat/server:{environ.get('CVAT_VERSION', 'dev')}"


def get_server_image_version(image_ref: str) -> str:
    try:
        result = run(  # nosec
            [
                "docker",
                "run",
                "--rm",
                "--entrypoint",
                "python",
                image_ref,
                "-c",
                "import cvat; print(getattr(cvat, '__version__', ''))",
            ],
            check=True,
            capture_output=True,
            text=True,
        )
    except CalledProcessError as ex:
        raise pytest.UsageError(
            "Version precheck failed: cannot read version from server image "
            f"{image_ref!r}. Build/pull the image first. "
            f"stderr={ex.stderr.strip()!r}"
        ) from ex

    version = result.stdout.strip()
    if not version:
        raise pytest.UsageError(
            f"Version precheck failed: empty version from server image {image_ref!r}"
        )
    return version


def check_server_image_version(cvat_root_dir: Path) -> None:
    expected_version = expected_repo_versions(cvat_root_dir)["cvat-sdk"]
    image_ref = _server_image_ref()
    server_version = get_server_image_version(image_ref)
    if _version_major_minor(server_version) != _version_major_minor(expected_version):
        raise pytest.UsageError(
            "Version precheck failed: server image version mismatch. "
            f"image={image_ref!r}, server={server_version!r}, expected={expected_version!r} "
            "(major.minor compared). "
            "Refresh images/containers before running tests."
        )


def get_server_about_version(base_url: str, timeout: float = 3.0) -> str:
    about_url = f"{base_url.rstrip('/')}/api/server/about"
    try:
        with urlopen(about_url, timeout=timeout) as response:  # nosec B310 (trusted local test endpoint)
            payload = json.loads(response.read().decode("utf-8"))
    except URLError as ex:
        raise RuntimeError(f"Server is not reachable at {about_url}: {ex}") from ex

    version = payload.get("version")
    if not isinstance(version, str) or not version:
        raise RuntimeError(f"Invalid /api/server/about response from {about_url}: {payload!r}")
    return version


def check_server_version_major_minor(server_version: str, expected_version: str) -> None:
    if _version_major_minor(server_version) != _version_major_minor(expected_version):
        raise pytest.UsageError(
            "Version precheck failed: server/API version mismatch. "
            f"server={server_version!r}, expected={expected_version!r} (major.minor compared). "
            "Refresh images/containers before running tests."
        )


def run_sanity_version_check(*, cvat_root_dir: Path, platform: str) -> None:
    expected_version = expected_repo_versions(cvat_root_dir)["cvat-sdk"]
    check_python_package_versions(cvat_root_dir)
    try:
        from infra.config import RuntimeInfraConfig

        about_version = get_server_about_version(RuntimeInfraConfig.get_base_url())
        check_server_version_major_minor(about_version, expected_version)
        return
    except RuntimeError:
        # If no live server is reachable, fall back to local image check when possible.
        pass

    if platform == "local":
        check_server_image_version(cvat_root_dir)
