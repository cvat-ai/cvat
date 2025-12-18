# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import Any

import attrs
from cvat_sdk.api_client import models

from shared.tasks.interface import ITaskSpec
from shared.tasks.utils import parse_frame_step


@attrs.define
class TaskSpecBase(ITaskSpec):
    _params: dict | models.TaskWriteRequest
    _data_params: dict | models.DataRequest
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
