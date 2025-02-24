# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from abc import ABCMeta, abstractmethod
from typing import TYPE_CHECKING, Any, Callable, Optional, Protocol, Union
from uuid import UUID

import attrs
from django.conf import settings
from django.db.models import Model
from django.utils import timezone
from django_rq.queues import DjangoRQ
from rq.job import Dependency as RQDependency
from rq.job import Job as RQJob
from rq.registry import BaseRegistry as RQBaseRegistry

from cvat.apps.engine.types import ExtendedRequest

from .models import RequestAction, RequestSubresource, RequestTarget

if TYPE_CHECKING:
    from django.contrib.auth.models import User


class RQJobMetaField:
    class UserField:
        ID = "id"
        USERNAME = "username"
        EMAIL = "email"

    class RequestField:
        UUID = "uuid"
        TIMESTAMP = "timestamp"

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
    TMP_FILE = "tmp_file"


class WithMeta(Protocol):
    meta: dict[str, Any]


class ImmutableRQMetaAttribute:
    def __init__(self, key: str, *, optional: bool = False) -> None:
        self._key = key
        self._optional = optional

    def __get__(self, instance: WithMeta, objtype: type[WithMeta] | None = None):
        if self._optional:
            return instance.meta.get(self._key)

        return instance.meta[self._key]

    def __set__(self, instance: WithMeta, value: Any):
        raise AttributeError("Immutable attributes cannot be set")


class MutableRQMetaAttribute(ImmutableRQMetaAttribute):
    def __init__(
        self, key: str, *, optional: bool = False, validator: Callable | None = None
    ) -> None:
        super().__init__(key, optional=optional)
        assert validator is None or callable(validator), "validator must be callable"
        self._validator = validator

    def validate(self, value):
        if value is None and not self._optional:
            raise ValueError(f"{self._key} is required")
        if value is not None and self._validator and not self._validator(value):
            raise ValueError("Value does not match the attribute validator")

    def __set__(self, instance: WithMeta, value: Any):
        self.validate(value)
        instance.meta[self._key] = value


class UserMeta:
    id: int = ImmutableRQMetaAttribute(RQJobMetaField.UserField.ID)
    username: str = ImmutableRQMetaAttribute(RQJobMetaField.UserField.USERNAME)
    email: str = ImmutableRQMetaAttribute(RQJobMetaField.UserField.EMAIL)

    def __init__(self, meta: dict[str, Any]) -> None:
        self._meta = meta

    @property
    def meta(self) -> dict[str, Any]:
        return self._meta

    def to_dict(self):
        return self.meta


class RequestMeta:
    uuid = ImmutableRQMetaAttribute(RQJobMetaField.RequestField.UUID)
    timestamp = ImmutableRQMetaAttribute(RQJobMetaField.RequestField.TIMESTAMP)

    def __init__(self, meta: dict[str, Any]) -> None:
        self._meta = meta

    @property
    def meta(self) -> dict[str, Any]:
        return self._meta

    def to_dict(self):
        return self.meta


class AbstractRQMeta(metaclass=ABCMeta):
    def __init__(self, *, meta: dict[str, Any], job: RQJob | None = None) -> None:
        if job:
            assert (
                meta is job.meta
            ), "When passed together, job.meta and meta should refer to the same object"

        self._job = job
        self._meta = meta

    @property
    def meta(self) -> dict[str, Any]:
        return self._meta

    @classmethod
    def for_job(cls, job: RQJob):
        return cls(job=job, meta=job.meta)

    @classmethod
    def for_meta(cls, meta: dict[str, Any]):
        return cls(meta=meta)

    def save(self) -> None:
        assert isinstance(self._job, RQJob), "To save meta, rq job must be set"
        self._job.save_meta()

    @staticmethod
    @abstractmethod
    def _get_resettable_fields() -> list[str]:
        """Return a list of fields that must be reset on retry"""

    def get_meta_on_retry(self) -> dict[str, Any]:
        resettable_fields = self._get_resettable_fields()

        return {k: v for k, v in self._job.meta.items() if k not in resettable_fields}


class RQMetaWithFailureInfo(AbstractRQMeta):
    formatted_exception = MutableRQMetaAttribute(
        RQJobMetaField.FORMATTED_EXCEPTION,
        validator=lambda x: isinstance(x, str),
        optional=True,
    )
    exc_type = MutableRQMetaAttribute(
        RQJobMetaField.EXCEPTION_TYPE,
        validator=lambda x: issubclass(x, BaseException),
        optional=True,
    )
    exc_args = MutableRQMetaAttribute(
        RQJobMetaField.EXCEPTION_ARGS,
        validator=lambda x: isinstance(x, tuple),
        optional=True,
    )

    @staticmethod
    def _get_resettable_fields() -> list[str]:
        return [
            RQJobMetaField.FORMATTED_EXCEPTION,
            RQJobMetaField.EXCEPTION_TYPE,
            RQJobMetaField.EXCEPTION_ARGS,
        ]


class BaseRQMeta(RQMetaWithFailureInfo):
    # immutable && required fields
    @property
    def user(self):
        return UserMeta(self.meta[RQJobMetaField.USER])

    @property
    def request(self):
        return RequestMeta(self.meta[RQJobMetaField.REQUEST])

    # immutable && optional fields
    org_id: int | None = ImmutableRQMetaAttribute(RQJobMetaField.ORG_ID, optional=True)
    org_slug: int | None = ImmutableRQMetaAttribute(RQJobMetaField.ORG_SLUG, optional=True)
    project_id: int | None = ImmutableRQMetaAttribute(RQJobMetaField.PROJECT_ID, optional=True)
    task_id: int | None = ImmutableRQMetaAttribute(RQJobMetaField.TASK_ID, optional=True)
    job_id: int | None = ImmutableRQMetaAttribute(RQJobMetaField.JOB_ID, optional=True)

    # mutable && optional fields
    progress: float | None = MutableRQMetaAttribute(
        RQJobMetaField.PROGRESS, validator=lambda x: isinstance(x, float), optional=True
    )
    status: str | None = MutableRQMetaAttribute(
        RQJobMetaField.STATUS, validator=lambda x: isinstance(x, str), optional=True
    )

    @staticmethod
    def _get_resettable_fields() -> list[str]:
        return RQMetaWithFailureInfo._get_resettable_fields() + [
            RQJobMetaField.PROGRESS,
            RQJobMetaField.STATUS,
        ]

    @classmethod
    def build(
        cls,
        *,
        request: ExtendedRequest,
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

        user: User = request.user

        return {
            RQJobMetaField.USER: {
                RQJobMetaField.UserField.ID: user.pk,
                RQJobMetaField.UserField.USERNAME: user.username,
                RQJobMetaField.UserField.EMAIL: user.email,
            },
            RQJobMetaField.REQUEST: {
                RQJobMetaField.RequestField.UUID: request.uuid,
                RQJobMetaField.RequestField.TIMESTAMP: timezone.now(),
            },
            RQJobMetaField.ORG_ID: oid,
            RQJobMetaField.ORG_SLUG: oslug,
            RQJobMetaField.PROJECT_ID: pid,
            RQJobMetaField.TASK_ID: tid,
            RQJobMetaField.JOB_ID: jid,
        }


class ExportRQMeta(BaseRQMeta):
    result_url: str | None = ImmutableRQMetaAttribute(
        RQJobMetaField.RESULT_URL, optional=True
    )  # will be changed to ExportResultInfo in the next PR

    @staticmethod
    def _get_resettable_fields() -> list[str]:
        base_fields = BaseRQMeta._get_resettable_fields()
        return base_fields + [RQJobMetaField.RESULT]

    @classmethod
    def build_for(
        cls,
        *,
        request: ExtendedRequest,
        db_obj: Model | None,
        result_url: str | None,
    ):
        base_meta = BaseRQMeta.build(request=request, db_obj=db_obj)

        return {**base_meta, RQJobMetaField.RESULT_URL: result_url}


class ImportRQMeta(BaseRQMeta):
    # immutable && optional fields
    tmp_file: str | None = ImmutableRQMetaAttribute(
        RQJobMetaField.TMP_FILE, optional=True
    )  # used only when importing annotations|datasets|backups

    # mutable fields
    task_progress: float | None = MutableRQMetaAttribute(
        RQJobMetaField.TASK_PROGRESS, validator=lambda x: isinstance(x, float), optional=True
    )  # used when importing project dataset

    @staticmethod
    def _get_resettable_fields() -> list[str]:
        base_fields = BaseRQMeta._get_resettable_fields()

        return base_fields + [RQJobMetaField.TASK_PROGRESS]

    @classmethod
    def build_for(
        cls,
        *,
        request: ExtendedRequest,
        db_obj: Model | None,
        tmp_file: str | None = None,
    ):
        base_meta = BaseRQMeta.build(request=request, db_obj=db_obj)

        return {**base_meta, RQJobMetaField.TMP_FILE: tmp_file}


def is_rq_job_owner(rq_job: RQJob, user_id: int) -> bool:
    return BaseRQMeta.for_job(rq_job).user.id == user_id


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


def define_dependent_job(
    queue: DjangoRQ,
    user_id: int,
    should_be_dependent: bool = settings.ONE_RUNNING_JOB_IN_QUEUE_PER_USER,
    *,
    rq_id: Optional[str] = None,
) -> RQDependency:
    if not should_be_dependent:
        return None

    queues: list[RQBaseRegistry | DjangoRQ] = [
        queue.deferred_job_registry,
        queue,
        queue.started_job_registry,
    ]
    # Since there is no cleanup implementation in DeferredJobRegistry,
    # this registry can contain "outdated" jobs that weren't deleted from it
    # but were added to another registry. Probably such situations can occur
    # if there are active or deferred jobs when restarting the worker container.
    filters = [lambda job: job.is_deferred, lambda _: True, lambda _: True]
    all_user_jobs: list[RQJob] = []
    for q, f in zip(queues, filters):
        job_ids = q.get_job_ids()
        jobs = q.job_class.fetch_many(job_ids, q.connection)
        jobs = filter(
            lambda job: job and BaseRQMeta.for_job(job).user.id == user_id and f(job), jobs
        )
        all_user_jobs.extend(jobs)

    if rq_id:
        # Prevent cases where an RQ job depends on itself.
        # It isn't possible to have multiple RQ jobs with the same ID in Redis.
        # However, a race condition in request processing can lead to self-dependencies
        # when 2 parallel requests attempt to enqueue RQ jobs with the same ID.
        # This happens if an rq_job is fetched without a lock,
        # but a lock is used when defining the dependent job and enqueuing a new one.
        if any(rq_id == job.id for job in all_user_jobs):
            return None

        # prevent possible cyclic dependencies
        all_job_dependency_ids = {
            dep_id.decode() for job in all_user_jobs for dep_id in job.dependency_ids or ()
        }

        if RQJob.redis_job_namespace_prefix + rq_id in all_job_dependency_ids:
            return None

    return (
        RQDependency(
            jobs=[sorted(all_user_jobs, key=lambda job: job.created_at)[-1]], allow_failure=True
        )
        if all_user_jobs
        else None
    )
