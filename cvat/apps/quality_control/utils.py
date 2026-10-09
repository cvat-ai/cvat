# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from collections import defaultdict
from typing import Any

import numpy as np
from datumaro.util import parse_json
from django.db import models

CURRENT_REPORT_VERSION = 3
GENERALIZED_REPORT_VERSIONS = (2, 3)
INVALID_REPORT_VERSION = 0


def get_report_version(report_data: dict[str, Any]) -> int:
    """Recognize historical payloads without guessing the format of versioned data."""
    version = report_data.get("version")
    if "version" not in report_data:
        return 2 if "groups" in report_data else 1
    if not isinstance(version, int) or isinstance(version, bool) or version < 1:
        raise ValueError("Invalid quality report version")
    return version


def is_current_report_data(report_data: dict[str, Any]) -> bool:
    try:
        return get_report_version(report_data) in GENERALIZED_REPORT_VERSIONS
    except ValueError:
        return False


def detect_report_version(report_data: Any) -> int:
    """Decode a stored payload, using 0 to cache an unrecognizable format."""
    try:
        data = parse_json(report_data) if isinstance(report_data, str) else report_data
        if isinstance(data, dict):
            version = get_report_version(data)
            # The cached version must fit the database's PositiveIntegerField.
            if version <= 2**31 - 1:
                return version
    except (TypeError, ValueError):
        pass
    return INVALID_REPORT_VERSION


def resolve_report_versions(queryset: models.QuerySet) -> None:
    """Resolve only unknown versions in an already authorized, filtered queryset."""
    reports = queryset.model._base_manager.using(queryset.db).filter(version__isnull=True)
    ids_by_version = defaultdict(list)
    pending = 0

    def flush():
        for version, report_ids in ids_by_version.items():
            # Another reader may have resolved a version since we read the payload.
            reports.filter(pk__in=report_ids).update(version=version)
        ids_by_version.clear()

    unknown = queryset.filter(version__isnull=True).order_by().values_list("pk", "data")
    for report_id, data in unknown.iterator(chunk_size=50):
        ids_by_version[detect_report_version(data)].append(report_id)
        pending += 1
        if pending == 500:
            flush()
            pending = 0
    if pending:
        flush()


def filter_current_reports(queryset: models.QuerySet) -> models.QuerySet:
    """Resolve historical versions before filtering and counting supported reports."""
    resolve_report_versions(queryset)
    return queryset.filter(version__in=GENERALIZED_REPORT_VERSIONS)


def array_safe_divide(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    "Scalar (element-wise) array division with NaNs (a / 0) converted to 0"

    divisor = b.copy()
    divisor[b == 0] = 1
    return a / divisor
