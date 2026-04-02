# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from infra.config import RuntimeInfraConfig


def add_infra_options(parser):
    group = parser.getgroup("CVAT REST API testing options")
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
        default=RuntimeInfraConfig.get_default_project_name(),
        help=(
            "Prefix used for a test run identity. "
            "It is used as docker compose project/container prefix and runtime state namespace "
            "(default: 'test')."
        ),
    )
    group._addoption(
        "--infra",
        action="store",
        default=RuntimeInfraConfig.get_default_infra_mode(),
        choices=RuntimeInfraConfig.get_infra_modes(),
        help=(
            "Infrastructure mode: auto (default behavior), up (start services and exit), "
            "reuse (reuse already running services), down (stop services and exit), "
            "restore-db (restore DB from test assets and exit), "
            "build-images (rebuild cvat/server:dev and cvat/ui:dev and exit)."
        ),
    )
    group._addoption(
        "--infra-profile",
        action="store",
        default=RuntimeInfraConfig.get_default_infra_profile(),
        choices=RuntimeInfraConfig.get_infra_profiles(),
        help=(
            "Single-lane infrastructure profile. "
            "Sets the runtime profile for non-parallel local/kube runs "
            "(default: %(default)s)."
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
