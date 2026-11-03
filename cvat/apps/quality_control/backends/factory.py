# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from typing import TYPE_CHECKING

from cvat.apps.quality_control.backends.base import QualityBackend

if TYPE_CHECKING:
    from cvat.apps.quality_control.data_providers import JobDataProvider


def make_quality_backend(
    ds_data_provider: JobDataProvider, gt_data_provider: JobDataProvider
) -> QualityBackend:
    from cvat.apps.engine.models import DimensionType
    from cvat.apps.quality_control.backends.datumaro import Datumaro2DBackend
    from cvat.apps.quality_control.datumaro_data_provider import DatumaroJobDataProvider

    if any(
        provider.dimension != DimensionType.DIM_2D
        for provider in (ds_data_provider, gt_data_provider)
    ):
        raise ValueError("Quality comparison is only supported for 2D data")

    if not isinstance(ds_data_provider, DatumaroJobDataProvider) or not isinstance(
        gt_data_provider, DatumaroJobDataProvider
    ):
        raise ValueError("No quality backend is available for these data providers")

    return Datumaro2DBackend(ds_data_provider, gt_data_provider)
