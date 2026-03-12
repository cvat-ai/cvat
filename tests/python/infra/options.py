# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from infra.config import (
    DEFAULT_INFRA_MODE,
    DEFAULT_PROJECT_NAME,
    INFRA_MODES,
)


def add_infra_options(parser):
    group = parser.getgroup("CVAT REST API testing options")
    group._addoption(
        "--rebuild",
        action="store_true",
        help="Rebuild CVAT images and exit without running tests. (default: %(default)s)",
    )

    group._addoption(
        "--cleanup",
        action="store_true",
        help="Delete files that was create by tests without running tests. (default: %(default)s)",
    )

    group._addoption(
        "--dumpdb",
        action="store_true",
        help="Update data.json without running tests. (default: %(default)s)",
    )

    group._addoption(
        "--platform",
        action="store",
        default="local",
        choices=("kube", "local"),
        help="Platform identifier - 'kube' or 'local'. (default: %(default)s)",
    )
    group._addoption(
        "--run-prefix",
        action="store",
        default=DEFAULT_PROJECT_NAME,
        help=(
            "Prefix used for a test run identity. "
            "It is used as docker compose project/container prefix and runtime state namespace "
            "(default: 'test')."
        ),
    )
    group._addoption(
        "--infra",
        action="store",
        default=DEFAULT_INFRA_MODE,
        choices=INFRA_MODES,
        help=(
            "Infrastructure mode: auto (default behavior), up (start services and exit), "
            "down (stop services and exit)."
        ),
    )
    group._addoption(
        "--skip-version-check",
        action="store_true",
        default=False,
        help=(
            "Skip startup sanity check for sdk/cli/server image versions. "
            "(default: %(default)s)"
        ),
    )
    return group
