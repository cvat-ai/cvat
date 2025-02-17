# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import attrs
from django.db.models import Model
from rq.job import Job as RQJob

from cvat.apps.engine.rq import BaseRQMeta, RQJobMetaField, on_setattr
from cvat.apps.engine.types import ExtendedRequest


@attrs.define(kw_only=True)
class LambdaRQMeta(BaseRQMeta):
    # immutable fields
    function_id: str = attrs.field(
        validator=[attrs.validators.instance_of(str)], default=None, on_setattr=attrs.setters.frozen
    )
    lambda_: bool = attrs.field(
        validator=[attrs.validators.instance_of(bool)],
        default=False,
        on_setattr=attrs.setters.frozen,
    )

    # FUTURE-FIXME: progress should be in [0, 1] range
    progress: float | None = attrs.field(
        validator=[attrs.validators.optional(attrs.validators.instance_of(int))],
        default=None,
        on_setattr=on_setattr,
    )

    @classmethod
    def from_job(cls, rq_job: RQJob):
        keys_to_keep = [k.name for k in attrs.fields(cls) if not k.name.startswith("_")]
        params = {}
        for k, v in rq_job.meta.items():
            if k in keys_to_keep:
                params[k] = v
            elif k == RQJobMetaField.LAMBDA:
                params[RQJobMetaField.LAMBDA + "_"] = v
        meta = cls(**params)
        meta._job = rq_job

        return meta

    def to_dict(self) -> dict:
        d = super().to_dict()
        d[RQJobMetaField.LAMBDA] = d.pop(RQJobMetaField.LAMBDA + "_")

        return d

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
            **base_meta,
            function_id=function_id,
            lambda_=True,
        ).to_dict()
