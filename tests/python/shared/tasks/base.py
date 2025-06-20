# Copyright (C) 2025 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import Any, Union

import attrs
from cvat_sdk.api_client import models

from .interface import ITaskSpec
from .utils import parse_frame_step


@attrs.define
class _TaskSpecBase(ITaskSpec):
    _params: Union[dict, models.TaskWriteRequest]
    _data_params: Union[dict, models.DataRequest]
    size: int = attrs.field(kw_only=True)

    @property
    def frame_step(self) -> int:
        return parse_frame_step(getattr(self, "frame_filter", ""))

    def __getattr__(self, k: str) -> Any:
        notfound = object()

        for params in [self._params, self._data_params]:
            if isinstance(params, dict):
                v = params.get(k, notfound)
            else:
                v = getattr(params, k, notfound)

            if v is not notfound:
                return v

        raise AttributeError(k)
