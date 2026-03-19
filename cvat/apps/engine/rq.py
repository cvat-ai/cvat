# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from abc import ABCMeta, abstractmethod
from collections.abc import Callable
from types import NoneType
from typing import TYPE_CHECKING, Any, ClassVar, Protocol

import attrs
import django_rq
from django.conf import settings
from django.db.models import Model
from django.utils import timezone
from django_rq.queues import DjangoRQ, get_redis_connection
from redis.client import Pipeline
from rq.job import Dependency as RQDependency
from rq.job import Job as RQJob
from rq.registry import BaseRegistry as RQBaseRegistry

from cvat.apps.engine.types import ExtendedRequest
from cvat.apps.engine.utils import take_by
from cvat.apps.redis_handler.apps import SELECTOR_TO_QUEUE
from cvat.apps.redis_handler.rq import RequestId, RequestIdWithOptionalSubresource

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

    # failure info fields
    FORMATTED_EXCEPTION = "formatted_exception"
    EXCEPTION_TYPE = "exc_type"
    EXCEPTION_ARGS = "exc_args"

    # common fields
    REQUEST = "request"
    USER = "user"
    ORG_ID = "org_id"
    ORG_SLUG = "org_slug"
    PROJECT_ID = "project_id"
    TASK_ID = "task_id"
    JOB_ID = "job_id"
    STATUS = "status"
    PROGRESS = "progress"

    # import-specific fields
    TASK_PROGRESS = "task_progress"

    # export specific fields
    RESULT_URL = "result_url"
    RESULT_FILENAME = "result_filename"

    # lambda fields
    LAMBDA = "lambda"
    FUNCTION_ID = "function_id"


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

    def save(self, *, pipeline: Pipeline | None = None) -> None:
        assert isinstance(self._job, RQJob), "To save meta, rq job must be set"
        # TODO: send PR to the upstream repo to support pipelines
        meta = self._job.serializer.dumps(self._job.meta)
        connection = pipeline if pipeline else self._job.connection
        connection.hset(self._job.key, "meta", meta)

    @staticmethod
    @abstractmethod
    def _get_resettable_fields() -> list[str]:
        """Return a list of fields that must be reset on retry"""

    def get_meta_on_retry(self) -> dict[str, Any]:
        resettable_fields = self._get_resettable_fields()

        return {k: v for k, v in self._meta.items() if k not in resettable_fields}


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
    # immutable fields
    # FUTURE-TODO: change to required fields when each enqueued job
    # regardless of queue type will have these fields
    # Blocked now by:
    # - [annotation queue] Some jobs may have no user/request info
    # - [chunks queue] Each job has no user/request info
    # - [import queue] Jobs running to cleanup uploaded files have no user/request info

    @property
    def user(self):
        if user_info := self.meta.get(RQJobMetaField.USER):
            return UserMeta(user_info)

        return None

    @property
    def request(self):
        if request_info := self.meta.get(RQJobMetaField.REQUEST):
            return RequestMeta(request_info)

        return None

    # immutable && optional fields
    project_id: int | None = ImmutableRQMetaAttribute(RQJobMetaField.PROJECT_ID, optional=True)
    task_id: int | None = ImmutableRQMetaAttribute(RQJobMetaField.TASK_ID, optional=True)
    job_id: int | None = ImmutableRQMetaAttribute(RQJobMetaField.JOB_ID, optional=True)

    # mutable && optional fields
    org_id: int | None = MutableRQMetaAttribute(
        RQJobMetaField.ORG_ID, validator=lambda x: isinstance(x, int), optional=True
    )
    org_slug: int | None = MutableRQMetaAttribute(
        RQJobMetaField.ORG_SLUG, validator=lambda x: isinstance(x, str), optional=True
    )
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
        RQJobMetaField.RESULT_URL,
        optional=True,
    )
    result_filename: str = ImmutableRQMetaAttribute(RQJobMetaField.RESULT_FILENAME)

    @staticmethod
    def _get_resettable_fields() -> list[str]:
        base_fields = BaseRQMeta._get_resettable_fields()
        return base_fields + [RQJobMetaField.RESULT_URL, RQJobMetaField.RESULT_FILENAME]

    @classmethod
    def build_for(
        cls,
        *,
        request: ExtendedRequest,
        db_obj: Model,
        result_url: str | None,
        result_filename: str,
    ):
        base_meta = BaseRQMeta.build(request=request, db_obj=db_obj)

        return {
            **base_meta,
            RQJobMetaField.RESULT_URL: result_url,
            RQJobMetaField.RESULT_FILENAME: result_filename,
        }


class ImportRQMeta(BaseRQMeta):
    # mutable fields
    task_progress: float | None = MutableRQMetaAttribute(
        RQJobMetaField.TASK_PROGRESS, validator=lambda x: isinstance(x, float), optional=True
    )  # used when importing project dataset

    @staticmethod
    def _get_resettable_fields() -> list[str]:
        base_fields = BaseRQMeta._get_resettable_fields()

        return base_fields + [RQJobMetaField.TASK_PROGRESS]


def is_rq_job_owner(rq_job: RQJob, user_id: int) -> bool:
    if user := BaseRQMeta.for_job(rq_job).user:
        return user.id == user_id

    return False


@attrs.frozen(kw_only=True, slots=False)
class RequestIdWithOptionalFormat(RequestId):
    format: str | None = attrs.field(
        validator=attrs.validators.instance_of((str, NoneType)), default=None
    )


@attrs.frozen(kw_only=True, slots=False)
class RequestIdWithOptionalLightweight(RequestId):
    lightweight: bool | None = attrs.field(
        converter=lambda x: x if x is None else bool(x), default=None
    )


@attrs.frozen(kw_only=True, slots=False)
class ExportRequestId(
    RequestIdWithOptionalSubresource,  # subresource is optional because export queue works also with events
    RequestIdWithOptionalFormat,
    RequestIdWithOptionalLightweight,
):
    ACTION_DEFAULT_VALUE: ClassVar[str] = "export"
    ACTION_ALLOWED_VALUES: ClassVar[tuple[str]] = (ACTION_DEFAULT_VALUE,)

    SUBRESOURCE_ALLOWED_VALUES: ClassVar[tuple[str]] = ("backup", "dataset", "annotations")
    QUEUE_SELECTORS: ClassVar[tuple[str]] = ACTION_ALLOWED_VALUES

    # will be deleted after several releases
    LEGACY_FORMAT_PATTERNS: ClassVar[tuple[str]] = (
        r"export:(?P<target>(task|project))-(?P<target_id>\d+)-(?P<subresource>backup)-by-(?P<user_id>\d+)",
        r"export:(?P<target>(project|task|job))-(?P<target_id>\d+)-(?P<subresource>(annotations|dataset))"
        + r"-in-(?P<format>[\w@]+)-format-by-(?P<user_id>\d+)",
    )


@attrs.frozen(kw_only=True, slots=False)
class ImportRequestId(
    RequestIdWithOptionalSubresource,  # subresource is optional because import queue works also with task creation jobs
    RequestIdWithOptionalFormat,
):
    ACTION_ALLOWED_VALUES: ClassVar[tuple[str]] = ("create", "import")
    SUBRESOURCE_ALLOWED_VALUES: ClassVar[tuple[str]] = ("backup", "dataset", "annotations")
    QUEUE_SELECTORS: ClassVar[tuple[str]] = ACTION_ALLOWED_VALUES

    # will be deleted after several releases
    LEGACY_FORMAT_PATTERNS = (
        r"(?P<action>create):(?P<target>task)-(?P<target_id>\d+)",
        r"(?P<action>import):(?P<target>(task|project|job))-(?P<target_id>\d+)-(?P<subresource>(annotations|dataset))",
        r"(?P<action>import):(?P<target>(task|project))-(?P<id>[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12})-(?P<subresource>backup)",
    )


def define_dependent_job(
    queue: DjangoRQ,
    user_id: int,
    should_be_dependent: bool = settings.ONE_RUNNING_JOB_IN_QUEUE_PER_USER,
    *,
    rq_id: str | None = None,
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
            lambda job: job and is_rq_job_owner(job, user_id) and f(job),
            jobs,
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


class RunningBackgroundProcessesError(Exception):
    def __init__(self, queue_name: str, *args):
        self.queue_name = queue_name
        super().__init__(*args)


def update_org_related_data_in_rq_jobs(
    new_org_id: int | None,
    new_org_slug: str | None,
    *,
    project_id: int | None = None,
    task_id: int | None = None,
):
    def is_rq_job_related(job_meta: BaseRQMeta):
        return (
            project_id
            and job_meta.project_id == project_id
            or task_id
            and job_meta.task_id == task_id
        )

    assert (project_id or task_id) and not (project_id and task_id)

    queues: list[django_rq.queues.DjangoRQ] = [
        django_rq.get_queue(queue_name) for queue_name in set(SELECTOR_TO_QUEUE.values())
    ]

    # prohibit moving resources if there is at least one
    # running background job related to the resource
    for queue in queues:
        job_ids = set(
            queue.get_job_ids()
            + queue.deferred_job_registry.get_job_ids()
            + queue.started_job_registry.get_job_ids()
        )
        for batched_job_ids in take_by(job_ids, chunk_size=1000):
            for job in queue.job_class.fetch_many(batched_job_ids, queue.connection):
                if not job:
                    continue

                if is_rq_job_related(BaseRQMeta.for_job(job)):
                    raise RunningBackgroundProcessesError(queue_name=queue.name)

    conn = get_redis_connection(settings.REDIS_INMEM_SETTINGS)
    with conn.pipeline() as pipe:
        for queue in queues:
            job_ids = set(
                queue.finished_job_registry.get_job_ids() + queue.failed_job_registry.get_job_ids()
            )

            for batched_job_ids in take_by(job_ids, chunk_size=1000):
                for job in queue.job_class.fetch_many(batched_job_ids, queue.connection):
                    if not job:
                        continue

                    job_meta = BaseRQMeta.for_job(job)

                    if not is_rq_job_related(job_meta):
                        continue

                    job_meta.org_id = new_org_id
                    job_meta.org_slug = new_org_slug
                    job_meta.save(pipeline=pipe)

        # FUTURE-TODO: probably need to move it into a background process
        # and update RQ jobs in batches with rollback support.
        pipe.execute()  # it handles empty pipe.command_stack too
