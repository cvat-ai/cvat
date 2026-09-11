# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from typing import TYPE_CHECKING

from django.db.models import Model

from cvat.apps.engine.rq import (
    BaseRQMeta,
    ImmutableRQMetaAttribute,
    MutableRQMetaAttribute,
    RQJobMetaField,
)

if TYPE_CHECKING:
    from cvat.apps.engine.types import ExtendedRequest
    from cvat.apps.redis_handler.background import AbstractRequestManager


class LambdaRQMeta(BaseRQMeta):
    # immutable fields
    function_id: str = ImmutableRQMetaAttribute(RQJobMetaField.FUNCTION_ID)
    lambda_: bool | None = ImmutableRQMetaAttribute(RQJobMetaField.LAMBDA, optional=True)
    # FUTURE-FIXME: progress should be in [0, 1] range
    progress: int | None = MutableRQMetaAttribute(
        RQJobMetaField.PROGRESS, validator=lambda x: isinstance(x, int), optional=True
    )

    @classmethod
    def build_for(
        cls,
        *,
        request: ExtendedRequest,
        request_manager_cls: type[AbstractRequestManager],
        instance: Model,
        function_id: str,
    ):
        base_meta = BaseRQMeta.build_from_instance(
            request=request,
            instance=instance,
            request_manager_cls=request_manager_cls,
        )
        return {
            **base_meta,
            RQJobMetaField.FUNCTION_ID: function_id,
            RQJobMetaField.LAMBDA: True,
        }
