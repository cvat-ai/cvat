# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from django.db.models import Model

from cvat.apps.engine.rq import (
    BaseRQMeta,
    ImmutableRQMetaAttribute,
    MutableRQMetaAttribute,
    RQJobMetaField,
)
from cvat.apps.engine.types import ExtendedRequest


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
        db_obj: Model,
        function_id: str,
    ):
        base_meta = BaseRQMeta.build(request=request, db_obj=db_obj)
        return {
            **base_meta,
            RQJobMetaField.FUNCTION_ID: function_id,
            RQJobMetaField.LAMBDA: True,
        }
