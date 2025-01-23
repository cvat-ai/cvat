# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from typing import Any, Optional, Union
from uuid import UUID

import attrs
from rq.job import Job as RQJob

from .models import RequestAction, RequestSubresource, RequestTarget


class RQMeta:
    @staticmethod
    def get_resettable_fields() -> list[RQJobMetaField]:
        """Return a list of fields that must be reset on retry"""
        return [
            RQJobMetaField.FORMATTED_EXCEPTION,
            RQJobMetaField.PROGRESS,
            RQJobMetaField.TASK_PROGRESS,
            RQJobMetaField.STATUS
        ]

    @classmethod
    def reset_meta_on_retry(cls, meta_to_update: dict[RQJobMetaField, Any]) -> dict[RQJobMetaField, Any]:
        resettable_fields = cls.get_resettable_fields()

        return {
            k: v for k, v in meta_to_update.items() if k not in resettable_fields
        }

class RQJobMetaField:
    # common fields
    FORMATTED_EXCEPTION = "formatted_exception"
    REQUEST = 'request'
    USER = 'user'
    PROJECT_ID = 'project_id'
    TASK_ID = 'task_id'
    JOB_ID = 'job_id'
    ORG_ID = 'org_id'
    ORG_SLUG = 'org_slug'
    STATUS = 'status'
    PROGRESS = 'progress'
    TASK_PROGRESS = 'task_progress'
    # export specific fields
    RESULT_URL = 'result_url'
    FUNCTION_ID = 'function_id'
    EXCEPTION_TYPE = 'exc_type'
    EXCEPTION_ARGS = 'exc_args'

def is_rq_job_owner(rq_job: RQJob, user_id: int) -> bool:
    return rq_job.meta.get(RQJobMetaField.USER, {}).get('id') == user_id

@attrs.frozen()
class RQId:
    action: RequestAction = attrs.field(
        validator=attrs.validators.instance_of(RequestAction)
    )
    target: RequestTarget = attrs.field(
        validator=attrs.validators.instance_of(RequestTarget)
    )
    identifier: Union[int, UUID] = attrs.field(
        validator=attrs.validators.instance_of((int, UUID))
    )
    subresource: Optional[RequestSubresource] = attrs.field(
        validator=attrs.validators.optional(
            attrs.validators.instance_of(RequestSubresource)
        ),
        kw_only=True, default=None,
    )
    user_id: Optional[int] = attrs.field(
        validator=attrs.validators.optional(attrs.validators.instance_of(int)),
        kw_only=True, default=None,
    )
    format: Optional[str] = attrs.field(
        validator=attrs.validators.optional(attrs.validators.instance_of(str)),
        kw_only=True, default=None,
    )

    _OPTIONAL_FIELD_REQUIREMENTS = {
        RequestAction.AUTOANNOTATE: {"subresource": False, "format": False, "user_id": False},
        RequestAction.CREATE: {"subresource": False, "format": False, "user_id": False},
        RequestAction.EXPORT: {"subresource": True, "user_id": True},
        RequestAction.IMPORT: {"subresource": True, "format": False, "user_id": False},
    }

    def __attrs_post_init__(self) -> None:
        for field, req in self._OPTIONAL_FIELD_REQUIREMENTS[self.action].items():
            if req:
                if getattr(self, field) is None:
                    raise ValueError(f"{field} is required for the {self.action} action")
            else:
                if getattr(self, field) is not None:
                    raise ValueError(f"{field} is not allowed for the {self.action} action")

    # RQ ID templates:
    # autoannotate:task-<tid>
    # import:<task|project|job>-<id|uuid>-<annotations|dataset|backup>
    # create:task-<tid>
    # export:<project|task|job>-<id>-<annotations|dataset>-in-<format>-format-by-<user_id>
    # export:<project|task>-<id>-backup-by-<user_id>

    def render(
        self,
    ) -> str:
        common_prefix = f"{self.action}:{self.target}-{self.identifier}"

        if RequestAction.IMPORT == self.action:
            return f"{common_prefix}-{self.subresource}"
        elif RequestAction.EXPORT == self.action:
            if self.format is None:
                return (
                    f"{common_prefix}-{self.subresource}-by-{self.user_id}"
                )

            format_to_be_used_in_urls = self.format.replace(" ", "_").replace(".", "@")
            return f"{common_prefix}-{self.subresource}-in-{format_to_be_used_in_urls}-format-by-{self.user_id}"
        elif self.action in {RequestAction.CREATE, RequestAction.AUTOANNOTATE}:
            return common_prefix
        else:
            assert False, f"Unsupported action {self.action!r} was found"

    @staticmethod
    def parse(rq_id: str) -> RQId:
        identifier: Optional[Union[UUID, int]] = None
        subresource: Optional[RequestSubresource] = None
        user_id: Optional[int] = None
        anno_format: Optional[str] = None

        try:
            action_and_resource, unparsed = rq_id.split("-", maxsplit=1)
            action_str, target_str = action_and_resource.split(":")
            action = RequestAction(action_str)
            target = RequestTarget(target_str)

            if action in {RequestAction.CREATE, RequestAction.AUTOANNOTATE}:
                identifier = unparsed
            elif RequestAction.IMPORT == action:
                identifier, subresource_str = unparsed.rsplit("-", maxsplit=1)
                subresource = RequestSubresource(subresource_str)
            else: # action == export
                identifier, subresource_str, unparsed = unparsed.split("-", maxsplit=2)
                subresource = RequestSubresource(subresource_str)

                if RequestSubresource.BACKUP == subresource:
                    _, user_id = unparsed.split("-")
                else:
                    unparsed, _, user_id = unparsed.rsplit("-", maxsplit=2)
                    # remove prefix(in-), suffix(-format) and restore original format name
                    # by replacing special symbols: "_" -> " ", "@" -> "."
                    anno_format = unparsed[3:-7].replace("_", " ").replace("@", ".")

            if identifier is not None:
                if identifier.isdigit():
                    identifier = int(identifier)
                else:
                    identifier = UUID(identifier)

            if user_id is not None:
                user_id = int(user_id)

            return RQId(
                action=action,
                target=target,
                identifier=identifier,
                subresource=subresource,
                user_id=user_id,
                format=anno_format,
            )

        except Exception as ex:
            raise ValueError(f"The {rq_id!r} RQ ID cannot be parsed: {str(ex)}") from ex
