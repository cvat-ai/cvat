# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import attrs
from django.db.models import Model
from rq.job import Job as RQJob

from cvat.apps.engine.rq import (
    BaseRQMeta,
    ImmutableRQMetaAttribute,
    MutableRQMetaAttribute,
    RQJobMetaField,
)
from cvat.apps.engine.types import ExtendedRequest


class LambdaRQMeta(BaseRQMeta):
    # immutable fields
    function_id: str = ImmutableRQMetaAttribute(
        RQJobMetaField.FUNCTION_ID, validator=lambda x: isinstance(x, str)
    )
    lambda_: bool = ImmutableRQMetaAttribute(
        RQJobMetaField.LAMBDA, validator=lambda x: isinstance(x, str)
    )
    # FUTURE-FIXME: progress should be in [0, 1] range
    progress: int | None = MutableRQMetaAttribute(
        RQJobMetaField.FUNCTION_ID, validator=lambda x: isinstance(x, int), optional=True
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
        return cls(
            data={
                **base_meta,
                RQJobMetaField.FUNCTION_ID: function_id,
                RQJobMetaField.LAMBDA: True,
            }
        )
