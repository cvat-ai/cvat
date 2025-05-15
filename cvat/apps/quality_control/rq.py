# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import ClassVar

import attrs

from cvat.apps.redis_handler.rq import RequestIdWithSubresource


@attrs.frozen(kw_only=True, slots=False)
class QualityRequestId(RequestIdWithSubresource):
    ACTION_DEFAULT_VALUE: ClassVar[str] = "calculate"
    ACTION_ALLOWED_VALUES: ClassVar[tuple[str]] = (ACTION_DEFAULT_VALUE,)

    SUBRESOURCE_DEFAULT_VALUE: ClassVar[str] = "quality"
    SUBRESOURCE_ALLOWED_VALUES: ClassVar[tuple[str]] = (SUBRESOURCE_DEFAULT_VALUE,)

    QUEUE_SELECTORS: ClassVar[tuple[tuple[str, str]]] = (
        (ACTION_DEFAULT_VALUE, SUBRESOURCE_DEFAULT_VALUE),
    )

    # will be deleted after several releases
    LEGACY_FORMAT_PATTERNS = (
        r"quality-check-(?P<target>task)-(?P<target_id>\d+)-user-(\d+)",  # user id is excluded in the new format
    )
