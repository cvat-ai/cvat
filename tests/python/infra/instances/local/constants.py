# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

COVERED_CONTAINERS = (
    "cvat_server",
    "cvat_worker_annotation",
    "cvat_worker_import",
    "cvat_worker_export",
    "cvat_worker_quality_reports",
    "cvat_worker_webhooks",
    "cvat_worker_utils",
)
REQUIRED_RUNNING_CONTAINERS = COVERED_CONTAINERS + (
    "cvat_db",
    "cvat_worker_chunks",
    "cvat_worker_consensus",
    "traefik",
)
FAILURE_LOG_CONTAINERS = COVERED_CONTAINERS + ("cvat_opa", "traefik")
LOCAL_DC_FILES = (
    "tests/docker-compose.file_share.yml",
    "tests/docker-compose.minio.yml",
    "tests/docker-compose.pat_settings.yml",
    "tests/docker-compose.test_servers.yml",
)
