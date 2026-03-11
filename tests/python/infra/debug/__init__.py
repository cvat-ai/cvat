# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

DEFAULT_DEBUG_PORT_BASE = 39090
DEBUG_SERVICE_TO_CONTAINER = {
    "server": "cvat_server",
    "worker_annotation": "cvat_worker_annotation",
    "worker_chunks": "cvat_worker_chunks",
    "worker_consensus": "cvat_worker_consensus",
    "worker_export": "cvat_worker_export",
    "worker_import": "cvat_worker_import",
    "worker_quality_reports": "cvat_worker_quality_reports",
    "worker_utils": "cvat_worker_utils",
    "worker_webhooks": "cvat_worker_webhooks",
}
DEBUG_SERVICE_TO_CONTAINER_PORT = {
    "server": 5678,
    "worker_annotation": 5679,
    "worker_chunks": 5680,
    "worker_consensus": 5681,
    "worker_export": 5682,
    "worker_import": 5683,
    "worker_quality_reports": 5684,
    "worker_utils": 5685,
    "worker_webhooks": 5686,
}
