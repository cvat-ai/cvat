# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from typing import TYPE_CHECKING

from cvat.apps.quality_control.backends.base import QualityBackend

if TYPE_CHECKING:
    from cvat.apps.quality_control.data_providers import JobDataProvider


def get_quality_backend_class(dimension: str) -> type[QualityBackend]:
    from cvat.apps.engine.models import DimensionType

    if dimension == DimensionType.DIM_3D:
        from cvat.apps.quality_control.backends.cuboid import Cuboid3DBackend

        return Cuboid3DBackend
    if dimension == DimensionType.DIM_2D:
        from cvat.apps.quality_control.backends.datumaro import Datumaro2DBackend

        return Datumaro2DBackend
    raise ValueError("Quality comparison is only supported for 2D and 3D data")


def make_quality_backend(
    ds_data_provider: JobDataProvider, gt_data_provider: JobDataProvider
) -> QualityBackend:
    from cvat.apps.quality_control.backends.datumaro.data_provider import DatumaroJobDataProvider

    if ds_data_provider.dimension != gt_data_provider.dimension:
        raise ValueError("Quality comparison requires providers with the same dimension")
    backend_class = get_quality_backend_class(ds_data_provider.dimension)

    if not isinstance(ds_data_provider, DatumaroJobDataProvider) or not isinstance(
        gt_data_provider, DatumaroJobDataProvider
    ):
        raise ValueError("No quality backend is available for these data providers")

    return backend_class(ds_data_provider, gt_data_provider)
