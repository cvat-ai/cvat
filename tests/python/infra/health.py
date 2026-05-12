# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import json
import logging
import os
import re
from http import HTTPStatus
from importlib import metadata
from pathlib import Path
from subprocess import CalledProcessError, run
from time import monotonic, sleep
from urllib.error import URLError
from urllib.request import urlopen

import packaging.version as pv
import pytest
import requests

from infra.config import RuntimeInfraConfig
from shared.utils.config import ADMIN_PASS, ADMIN_USER

logger = logging.getLogger(__name__)


class _LiveServerUnavailable(RuntimeError):
    pass


def run_runtime_sanity_checks(*, cvat_root_dir: Path, platform: str) -> None:
    """Verify that local packages and runtime server/image versions match the repo.

    Python package versions can be checked before depending on runtime services. After
    the stack is available, the live server version is checked through /api/server/about.
    Local runs fall back to inspecting the cvat/server image only when the live server
    cannot be reached.
    """
    logger.debug("running CVAT runtime sanity checks platform=%s", platform)

    sdk_version_file = cvat_root_dir / "cvat-sdk/cvat_sdk/version.py"
    if sdk_version_file.exists():
        content = sdk_version_file.read_text(encoding="utf-8")
        match = re.search(r'^VERSION\s*=\s*"([^"]+)"\s*$', content, flags=re.MULTILINE)
        if not match:
            raise pytest.UsageError(f"Cannot read VERSION from: {sdk_version_file}")
        expected_sdk_version = match.group(1)
        logger.debug(
            "expected cvat-sdk version read from source path=%s version=%s",
            sdk_version_file,
            expected_sdk_version,
        )
    else:
        expected_sdk_version = metadata.version("cvat-sdk")
        logger.debug(
            "expected cvat-sdk version read from installed package version=%s",
            expected_sdk_version,
        )

    _check_python_package_versions(cvat_root_dir, expected_sdk_version)
    try:
        _check_live_server_version(expected_sdk_version)
        logger.debug("CVAT runtime sanity checks passed using live server version")
        return
    except _LiveServerUnavailable as ex:
        logger.debug("live server version check unavailable; fallback may be used: %s", ex)

    if platform == "local":
        _check_server_image_version(expected_sdk_version)
        logger.debug("CVAT runtime sanity checks passed using local server image version")
    else:
        logger.debug("local server image version check skipped platform=%s", platform)


def _check_python_package_versions(cvat_root_dir: Path, expected_sdk_version: str) -> None:
    logger.debug("checking Python package versions")

    cli_version_file = cvat_root_dir / "cvat-cli/src/cvat_cli/version.py"
    content = cli_version_file.read_text(encoding="utf-8")
    match = re.search(r'^VERSION\s*=\s*"([^"]+)"\s*$', content, flags=re.MULTILINE)
    if not match:
        raise pytest.UsageError(f"Cannot read VERSION from: {cli_version_file}")
    expected_cli_version = match.group(1)
    logger.debug(
        "expected cvat-cli version read from source path=%s version=%s",
        cli_version_file,
        expected_cli_version,
    )

    expected = {
        "cvat-sdk": expected_sdk_version,
        "cvat-cli": expected_cli_version,
    }
    installed: dict[str, str] = {}
    for dist_name in ("cvat-sdk", "cvat-cli"):
        try:
            installed[dist_name] = metadata.version(dist_name)
            logger.debug(
                "installed Python package version name=%s version=%s",
                dist_name,
                installed[dist_name],
            )
        except metadata.PackageNotFoundError as ex:
            raise pytest.UsageError(
                f"{dist_name} is not installed in the current environment. "
                "Install project deps and retry."
            ) from ex

    mismatches = []
    for name in ("cvat-sdk", "cvat-cli"):
        installed_major_minor = _major_minor(installed[name])
        expected_major_minor = _major_minor(expected[name])
        logger.debug(
            "checking Python package major.minor name=%s installed=%s expected=%s",
            name,
            installed_major_minor,
            expected_major_minor,
        )
        if installed_major_minor != expected_major_minor:
            mismatches.append(
                f"{name}: installed={installed[name]!r}, expected={expected[name]!r} "
                "(major.minor mismatch)"
            )
    if mismatches:
        mismatch_text = "; ".join(mismatches)
        raise pytest.UsageError(
            "Version precheck failed for Python packages: "
            f"{mismatch_text}. Reinstall deps in your venv before running tests."
        )

    logger.debug(
        "Python package version check passed installed=%s expected=%s", installed, expected
    )


def _check_live_server_version(expected_version: str) -> None:
    about_url = RuntimeInfraConfig.get_server_url("api/server/about")
    logger.debug("checking live server version url=%s expected=%s", about_url, expected_version)
    try:
        with urlopen(
            about_url, timeout=3.0
        ) as response:  # nosec B310 (trusted local test endpoint)
            payload = json.loads(response.read().decode("utf-8"))
    except URLError as ex:
        raise _LiveServerUnavailable(f"Server is not reachable at {about_url}: {ex}") from ex

    server_version = payload.get("version")
    if not isinstance(server_version, str) or not server_version:
        raise pytest.UsageError(f"Invalid /api/server/about response from {about_url}: {payload!r}")
    logger.debug("live server reported version url=%s version=%s", about_url, server_version)

    _check_version_major_minor(
        check_name="server/API",
        current_version=server_version,
        expected_version=expected_version,
        failure_hint="Refresh images/containers before running tests.",
    )
    logger.debug(
        "live server version check passed url=%s server=%s expected=%s",
        about_url,
        server_version,
        expected_version,
    )


def _check_server_image_version(expected_version: str) -> None:
    image_ref = f"cvat/server:{os.environ.get('CVAT_VERSION', 'dev')}"
    logger.debug(
        "checking local server image version image=%s expected=%s", image_ref, expected_version
    )
    logger.debug("reading server version from Docker image image=%s", image_ref)
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

    server_version = result.stdout.strip()
    if not server_version:
        raise pytest.UsageError(
            f"Version precheck failed: empty version from server image {image_ref!r}"
        )
    logger.debug(
        "local server image reported version image=%s version=%s", image_ref, server_version
    )

    _check_version_major_minor(
        check_name="server image",
        current_version=server_version,
        expected_version=expected_version,
        failure_hint="Refresh images/containers before running tests.",
        details=f"image={image_ref!r}",
    )
    logger.debug(
        "local server image version check passed image=%s server=%s expected=%s",
        image_ref,
        server_version,
        expected_version,
    )


def _check_version_major_minor(
    *,
    check_name: str,
    current_version: str,
    expected_version: str,
    failure_hint: str,
    details: str = "",
) -> None:
    current_major_minor = _major_minor(current_version)
    expected_major_minor = _major_minor(expected_version)
    logger.debug(
        "checking %s major.minor current=%s expected=%s",
        check_name,
        current_major_minor,
        expected_major_minor,
    )
    if current_major_minor == expected_major_minor:
        return

    details_prefix = f"{details}, " if details else ""
    raise pytest.UsageError(
        f"Version precheck failed: {check_name} version mismatch. "
        f"{details_prefix}server={current_version!r}, expected={expected_version!r} "
        f"(major.minor compared). {failure_hint}"
    )


def _major_minor(version: str) -> tuple[int, int]:
    try:
        parsed_version = pv.Version(version)
    except pv.InvalidVersion as ex:
        raise pytest.UsageError(f"Cannot parse major.minor from version: {version!r}") from ex
    return parsed_version.major, parsed_version.minor


def wait_for_services(timeout_seconds: int = 300) -> None:
    REQUEST_TIMEOUT_SECONDS = 5
    POLL_INTERVAL_SECONDS = 1
    url = RuntimeInfraConfig.get_server_url("api/server/health/", format="json")
    logger.debug("wait_for_services start url=%s timeout=%ss", url, timeout_seconds)
    deadline = monotonic() + timeout_seconds
    attempt = 0
    while monotonic() < deadline:
        remaining_seconds = deadline - monotonic()
        logger.debug("waiting for the server to load ... (%s)", attempt)
        try:
            response = requests.get(
                url,
                timeout=min(REQUEST_TIMEOUT_SECONDS, remaining_seconds),
            )
            logger.debug(
                "wait_for_services attempt=%s url=%s status=%s content_type=%s",
                attempt,
                url,
                response.status_code,
                response.headers.get("Content-Type"),
            )
            if response.status_code == HTTPStatus.OK:
                logger.debug("the server has finished loading! attempt=%s url=%s", attempt, url)
                return

            try:
                statuses = response.json()
                logger.debug("server status: \n%s", statuses)
            except Exception as ex:
                logger.debug(
                    "server health returned non-JSON payload (status=%s, content-type=%s): %s",
                    response.status_code,
                    response.headers.get("Content-Type"),
                    ex,
                )
        except Exception as ex:
            logger.debug("an error occurred during the server status checking: %s", ex)

        attempt += 1
        remaining_seconds = deadline - monotonic()
        if remaining_seconds > 0:
            sleep(min(POLL_INTERVAL_SECONDS, remaining_seconds))

    logger.debug("wait_for_services timeout url=%s timeout=%ss", url, timeout_seconds)
    raise Exception(
        f"Failed to reach the server during {timeout_seconds} seconds. "
        "Please check the configuration."
    )


def wait_for_auth_login_ready() -> None:
    TIMEOUT_SECONDS = 180
    REQUEST_TIMEOUT_SECONDS = 5
    POLL_INTERVAL_SECONDS = 1
    login_url = RuntimeInfraConfig.get_server_url("api/auth/login")
    payload = {"username": ADMIN_USER, "password": ADMIN_PASS}
    logger.debug(
        "wait_for_auth_login_ready start url=%s timeout=%ss",
        login_url,
        TIMEOUT_SECONDS,
    )
    deadline = monotonic() + TIMEOUT_SECONDS
    attempt = 0
    while monotonic() < deadline:
        remaining_seconds = deadline - monotonic()
        logger.debug("waiting for login endpoint to become ready ... (%s)", attempt)
        try:
            response = requests.post(
                login_url,
                json=payload,
                timeout=min(REQUEST_TIMEOUT_SECONDS, remaining_seconds),
            )
            logger.debug("login readiness status: %s", response.status_code)
            # Any non-5xx response indicates endpoint is reachable and backend responds.
            if response.status_code < HTTPStatus.INTERNAL_SERVER_ERROR:
                logger.debug(
                    "login endpoint is ready attempt=%s url=%s status=%s",
                    attempt,
                    login_url,
                    response.status_code,
                )
                return
        except Exception as ex:
            logger.debug("an error occurred during login readiness checking: %s", ex)

        attempt += 1
        remaining_seconds = deadline - monotonic()
        if remaining_seconds > 0:
            sleep(min(POLL_INTERVAL_SECONDS, remaining_seconds))

    logger.debug("wait_for_auth_login_ready timeout url=%s timeout=%ss", login_url, TIMEOUT_SECONDS)
    raise Exception(
        "Failed to get a stable response from /api/auth/login during " f"{TIMEOUT_SECONDS} seconds."
    )
