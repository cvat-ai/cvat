# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from uuid import UUID

from django.contrib.auth.models import User
from django.db.models import Model

from cvat.apps.engine.rq import (
    BaseRQMeta,
    ImmutableRQMetaAttribute,
    MutableRQMetaAttribute,
    RQJobMetaField,
)


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
        user: User,
        uuid: UUID,
        instance: Model,
        function_id: str,
    ):
        base_meta = BaseRQMeta.build_from_instance(
            user=user,
            uuid=uuid,
            instance=instance,
        )
        return {
            **base_meta,
            RQJobMetaField.FUNCTION_ID: function_id,
            RQJobMetaField.LAMBDA: True,
        }
