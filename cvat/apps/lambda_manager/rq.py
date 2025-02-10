# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import attrs
from attrs import asdict
from django.db.models import Model

from cvat.apps.engine.middleware import PatchedRequest
from cvat.apps.engine.rq_job_handler import BaseRQMeta, RQJobMetaField


@attrs.define(kw_only=True)
class LambdaRQMeta(BaseRQMeta):
    # immutable fields
    function_id: int = attrs.field(
        validator=[attrs.validators.instance_of(int)], default=None, on_setattr=attrs.setters.frozen
    )
    lambda_: bool = attrs.field(
        validator=[attrs.validators.instance_of(bool)],
        init=False,
        default=True,
        on_setattr=attrs.setters.frozen,
    )

    def to_dict(self) -> dict:
        d = asdict(self)
        if v := d.pop(RQJobMetaField.LAMBDA + "_", None) is not None:
            d[RQJobMetaField.LAMBDA] = v

        return d

    @classmethod
    def build_for(
        cls,
        *,
        request: PatchedRequest,
        db_obj: Model,
        function_id: int,
    ):
        base_meta = BaseRQMeta.build(request=request, db_obj=db_obj)
        return cls(
            **base_meta,
            function_id=function_id,
        ).to_dict()
