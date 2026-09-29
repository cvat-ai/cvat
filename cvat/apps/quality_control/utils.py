# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


import numpy as np
from django.db import connections, models

CURRENT_REPORT_VERSION = 3
GENERALIZED_REPORT_VERSIONS = (2, 3)


def get_report_version(report_data: object) -> int:
    """Recognize historical payloads without guessing the format of versioned data."""
    if not isinstance(report_data, dict):
        raise ValueError("Quality report data must be an object")
    version = report_data.get("version")
    if "version" not in report_data:
        return 2 if "groups" in report_data else 1
    if type(version) is not int or version < 1:
        raise ValueError("Invalid quality report version")
    return version


def is_current_report_data(report_data: object) -> bool:
    try:
        return get_report_version(report_data) in GENERALIZED_REPORT_VERSIONS
    except ValueError:
        return False


def filter_current_reports(queryset: models.QuerySet) -> models.QuerySet:
    """Filter supported report formats before pagination, including unversioned v2 reports."""
    sqlite = connections[queryset.db].vendor == "sqlite"
    # data stores a JSON string; unwrap it before accessing top-level fields.
    return queryset.alias(
        _report_data=models.Func(
            "data",
            template=(
                "json_extract(%(expressions)s, '$')"
                if sqlite
                else "(%(expressions)s #>> '{}')::jsonb"
            ),
            output_field=models.JSONField(),
        ),
        _report_type=models.Func(
            "_report_data",
            function="json_type" if sqlite else "jsonb_typeof",
            output_field=models.CharField(),
        ),
    ).filter(
        models.Q(_report_data__version__in=GENERALIZED_REPORT_VERSIONS)
        | (~models.Q(_report_data__has_key="version") & models.Q(_report_data__has_key="groups")),
        _report_type="object",
    )


def array_safe_divide(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    "Scalar (element-wise) array division with NaNs (a / 0) converted to 0"

    divisor = b.copy()
    divisor[b == 0] = 1
    return a / divisor
