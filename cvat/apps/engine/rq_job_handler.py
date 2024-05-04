# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import attrs

from typing import Optional, Union
from uuid import UUID
from rq.job import Job as RQJob

def is_rq_job_owner(rq_job: RQJob, user_id: int) -> bool:
    return rq_job.meta.get('user', {}).get('id') == user_id

RQ_ID_ACTIONS = ("import", "export", "create",)
RQ_ID_RESOURCES = ("project", "task", "job",)
RQ_ID_SUBRESOURCES = ("annotations", "dataset", "backup",)


@attrs.define(kw_only=True)
class RQId:
    action: str = attrs.field(
        validator=attrs.validators.in_(RQ_ID_ACTIONS)
    )
    resource: str = attrs.field(
        validator=attrs.validators.in_(RQ_ID_RESOURCES)
    )
    identifier: Union[int, UUID] = attrs.field(
        validator=attrs.validators.instance_of((int, UUID))
    )
    subresource: Optional[str] = attrs.field(
        validator=attrs.validators.optional(
            attrs.validators.in_(RQ_ID_SUBRESOURCES)
        )
    )
    user_id: Optional[int] = attrs.field(
        validator=attrs.validators.optional(attrs.validators.instance_of(int))
    )
    format: Optional[str] = attrs.field(
        validator=attrs.validators.optional(attrs.validators.instance_of(str))
    )


class RQIdManager:
    # RQ ID templates:
    # import:<task|project|job>-<id|uuid>-<annotations|dataset|backup>
    # create:task-<tid>
    # export:<project|task|job>-<id>-<annotations|dataset>-in-<format>-format-by-<user_id>
    # export:<project|task>-<id>-backup-by-<user_id>

    @staticmethod
    def build(
        action: str,
        resource: str,
        identifier: Union[int, UUID],
        *,
        subresource: Optional[str] = None,
        user_id: Optional[int] = None,
        anno_format: Optional[str] = None,
    ) -> str:
        if "import" == action:
            return f"{action}:{resource}-{identifier}-{subresource}"
        elif "export" == action:
            if anno_format is None:
                return (
                    f"{action}:{resource}-{identifier}-{subresource}-by-{user_id}"
                )
            format_to_be_used_in_urls = anno_format.replace(" ", "_").replace(".", "@")
            return f"{action}:{resource}-{identifier}-{subresource}-in-{format_to_be_used_in_urls}-format-by-{user_id}"
        elif "create" == action:
            assert "task" == resource
            return f"{action}:{resource}-{identifier}"
        else:
            raise ValueError(f"Unsupported action {action!r} was found")

    @staticmethod
    def parse(rq_id: str) -> RQId:
        action = resource = identifier = subresource = user_id = anno_format = None

        try:
            action_and_resource, unparsed = rq_id.split("-", maxsplit=1)

            action, resource = action_and_resource.split(":")

            if "create" == action:
                identifier = unparsed
            elif "import" == action:
                identifier, subresource = unparsed.rsplit("-", maxsplit=1)
            else:  # export
                identifier, subresource, unparsed = unparsed.split("-", maxsplit=2)
                if "backup" == subresource:
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
                resource=resource,
                identifier=identifier,
                subresource=subresource,
                user_id=user_id,
                format=anno_format,
            )

        except Exception as ex:
            raise ValueError(f"The {rq_id!r} RQ ID cannot be parsed: {str(ex)}") from ex

    @classmethod
    def can_be_parsed(cls, job_id: str) -> bool:
        try:
            cls.parse(job_id)
        except Exception:
            return False

        return True
