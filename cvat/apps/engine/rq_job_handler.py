# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from abc import ABCMeta, abstractmethod
from collections.abc import Iterable
from datetime import datetime
from typing import Any, Optional, Union
from uuid import UUID

import attrs
from attrs import asdict
from django.db.models import Model
from django.utils import timezone
from rq.job import Job as RQJob

from cvat.apps.engine.middleware import PatchedRequest

from .models import RequestAction, RequestSubresource, RequestTarget

str_validator = attrs.validators.instance_of(str)
int_validator = attrs.validators.instance_of(int)
optional_str_validator = attrs.validators.optional(attrs.validators.instance_of(str))
optional_int_validator = attrs.validators.optional(attrs.validators.instance_of(int))
optional_bool_validator = attrs.validators.optional(attrs.validators.instance_of(bool))
optional_float_validator = attrs.validators.optional(attrs.validators.instance_of(float))


def _update_value(self: AbstractRQMeta, attribute: attrs.Attribute, value: Any):
    self._job.meta[attribute.name] = value


@attrs.frozen(kw_only=True)
class UserInfo:
    id: int = attrs.field(validator=[int_validator])
    username: str = attrs.field(validator=[str_validator])
    email: str = attrs.field(validator=[str_validator])

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@attrs.frozen(kw_only=True)
class RequestInfo:
    uuid: str = attrs.field(validator=[str_validator])
    timestamp: datetime = attrs.field(validator=[attrs.validators.instance_of(datetime)])

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@attrs.define
class AbstractRQMeta(metaclass=ABCMeta):
    _job: RQJob | None = attrs.field(init=False, default=None)

    def to_dict(self) -> dict:
        return asdict(self, filter=lambda k, _: k.name != "_job")

    @classmethod
    def from_job(cls, rq_job: RQJob):
        keys_to_keep = [k.name for k in attrs.fields(cls)]
        meta = cls(**{k: v for k, v in rq_job.meta.items() if k in keys_to_keep})
        meta._job = rq_job

        return meta

    def save(self) -> None:
        assert isinstance(self._job, RQJob), "To save meta, rq job must be set"
        self._job.save_meta()

    @staticmethod
    @abstractmethod
    def _get_resettable_fields() -> list[RQJobMetaField]:
        """Return a list of fields that must be reset on retry"""

    def reset_meta_on_retry(self) -> dict[RQJobMetaField, Any]:
        resettable_fields = self._get_resettable_fields()

        return {k: v for k, v in self._job.meta.items() if k not in resettable_fields}


@attrs.define(kw_only=True)
class RQMetaWithFailureInfo(AbstractRQMeta):
    # immutable and optional fields
    formatted_exception: str | None = attrs.field(
        validator=[optional_str_validator],
        default=None,
        on_setattr=_update_value,
    )
    exc_type: str | None = attrs.field(
        validator=[optional_str_validator],
        default=None,
        on_setattr=_update_value,
    )
    exc_args: Iterable | None = attrs.field(default=None, on_setattr=_update_value)

    @staticmethod
    def _get_resettable_fields() -> list[RQJobMetaField]:
        """Return a list of fields that must be reset on retry"""
        return [
            RQJobMetaField.FORMATTED_EXCEPTION,
            RQJobMetaField.EXCEPTION_TYPE,
            RQJobMetaField.EXCEPTION_ARGS,
        ]


@attrs.define(kw_only=True)
class BaseRQMeta(RQMetaWithFailureInfo):
    # immutable and required fields
    user: UserInfo = attrs.field(
        validator=[attrs.validators.instance_of(UserInfo)],
        converter=lambda d: UserInfo(**d),
        on_setattr=attrs.setters.frozen,
    )
    request: RequestInfo = attrs.field(
        validator=[attrs.validators.instance_of(RequestInfo)],
        converter=lambda d: RequestInfo(**d),
        on_setattr=attrs.setters.frozen,
    )

    # immutable and optional fields
    org_id: int | None = attrs.field(
        validator=[optional_int_validator], default=None, on_setattr=attrs.setters.frozen
    )
    org_slug: str | None = attrs.field(
        validator=[optional_str_validator], default=None, on_setattr=attrs.setters.frozen
    )
    project_id: int | None = attrs.field(
        validator=[optional_int_validator], default=None, on_setattr=attrs.setters.frozen
    )
    task_id: int | None = attrs.field(
        validator=[optional_int_validator], default=None, on_setattr=attrs.setters.frozen
    )
    job_id: int | None = attrs.field(
        validator=[optional_int_validator], default=None, on_setattr=attrs.setters.frozen
    )

    # import && lambda
    progress: float | None = attrs.field(
        validator=[optional_float_validator],
        default=None,
        on_setattr=_update_value,
    )

    @staticmethod
    def _get_resettable_fields() -> list[RQJobMetaField]:
        """Return a list of fields that must be reset on retry"""
        return RQMetaWithFailureInfo._get_resettable_fields() + [RQJobMetaField.PROGRESS]

    @classmethod
    def build(
        cls,
        *,
        request: PatchedRequest,
        db_obj: Model | None,
    ):
        # to prevent circular import
        from cvat.apps.events.handlers import job_id, organization_slug, task_id
        from cvat.apps.webhooks.signals import organization_id, project_id

        oid = organization_id(db_obj)
        oslug = organization_slug(db_obj)
        pid = project_id(db_obj)
        tid = task_id(db_obj)
        jid = job_id(db_obj)

        user = request.user

        return cls(
            user=UserInfo(
                id=getattr(user, "id", None),
                username=getattr(user, "username", None),
                email=getattr(user, "email", None),
            ),
            request=RequestInfo(
                uuid=request.uuid,
                timestamp=timezone.localtime(),
            ),
            org_id=oid,
            org_slug=oslug,
            project_id=pid,
            task_id=tid,
            job_id=jid,
        ).to_dict()


@attrs.define(kw_only=True)
class ExportRQMeta(BaseRQMeta):
    # will be changed to ExportResultInfo in the next PR
    result_url: str | None = attrs.field(validator=[optional_str_validator])

    @staticmethod
    def _get_resettable_fields() -> list[RQJobMetaField]:
        """Return a list of fields that must be reset on retry"""
        base_fields = BaseRQMeta._get_resettable_fields()
        return base_fields + [RQJobMetaField.RESULT]

    @classmethod
    def build(
        cls,
        *,
        request: PatchedRequest,
        db_obj: Model | None,
        result_url: str | None,
    ):
        base_meta = BaseRQMeta.build(request=request, db_obj=db_obj)

        return cls(
            **base_meta,
            result_url=result_url,
        ).to_dict()


@attrs.define(kw_only=True)
class ImportRQMeta(BaseRQMeta):
    # immutable && optional fields
    tmp_file: str | None = attrs.field(
        validator=[optional_str_validator], default=None, on_setattr=attrs.setters.frozen
    )

    # mutable fields
    # TODO: move into base?
    status: str = attrs.field(
        validator=[optional_str_validator], default="", on_setattr=_update_value
    )
    task_progress: float | None = attrs.field(
        validator=[optional_float_validator], default=None, on_setattr=_update_value
    )

    @staticmethod
    def _get_resettable_fields() -> list[RQJobMetaField]:
        """Return a list of fields that must be reset on retry"""
        base_fields = BaseRQMeta._get_resettable_fields()

        return base_fields + [
            RQJobMetaField.PROGRESS,
            RQJobMetaField.TASK_PROGRESS,
            RQJobMetaField.STATUS,
        ]

    @classmethod
    def build(
        cls,
        *,
        request: PatchedRequest,
        db_obj: Model | None,
        tmp_file: str | None = None,
    ):
        base_meta = BaseRQMeta.build(request=request, db_obj=db_obj)

        return cls(
            **base_meta,
            tmp_file=tmp_file,
        ).to_dict()


@attrs.define(kw_only=True)
class LambdaRQMeta(BaseRQMeta):
    # immutable fields
    function_id: int | None = attrs.field(
        validator=[optional_int_validator], default=None, on_setattr=attrs.setters.frozen
    )
    lambda_: bool | None = attrs.field(
        validator=[optional_bool_validator],
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
    def build(
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


class RQJobMetaField:
    # common fields
    FORMATTED_EXCEPTION = "formatted_exception"
    REQUEST = "request"
    USER = "user"
    PROJECT_ID = "project_id"
    TASK_ID = "task_id"
    JOB_ID = "job_id"
    LAMBDA = "lambda"
    ORG_ID = "org_id"
    ORG_SLUG = "org_slug"
    STATUS = "status"
    PROGRESS = "progress"
    TASK_PROGRESS = "task_progress"
    # export specific fields
    RESULT_URL = "result_url"
    RESULT = "result"
    FUNCTION_ID = "function_id"
    EXCEPTION_TYPE = "exc_type"
    EXCEPTION_ARGS = "exc_args"


def is_rq_job_owner(rq_job: RQJob, user_id: int) -> bool:
    return rq_job.meta.get(RQJobMetaField.USER, {}).get("id") == user_id


@attrs.frozen()
class RQId:
    action: RequestAction = attrs.field(validator=attrs.validators.instance_of(RequestAction))
    target: RequestTarget = attrs.field(validator=attrs.validators.instance_of(RequestTarget))
    identifier: Union[int, UUID] = attrs.field(validator=attrs.validators.instance_of((int, UUID)))
    subresource: Optional[RequestSubresource] = attrs.field(
        validator=attrs.validators.optional(attrs.validators.instance_of(RequestSubresource)),
        kw_only=True,
        default=None,
    )
    user_id: Optional[int] = attrs.field(
        validator=attrs.validators.optional(attrs.validators.instance_of(int)),
        kw_only=True,
        default=None,
    )
    format: Optional[str] = attrs.field(
        validator=attrs.validators.optional(attrs.validators.instance_of(str)),
        kw_only=True,
        default=None,
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
                return f"{common_prefix}-{self.subresource}-by-{self.user_id}"

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
            else:  # action == export
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
