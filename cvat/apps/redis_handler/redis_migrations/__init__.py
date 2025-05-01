# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from abc import ABCMeta, abstractmethod
from logging import Logger
from pathlib import Path
from types import NoneType
from typing import Generator, Literal, cast, overload

import django_rq
from attrs import define, field, validators
from redis import Redis
from rq.job import Job
from rq.registry import BaseRegistry
from rq_scheduler.utils import to_unix

from cvat.apps.engine.log import get_migration_logger
from cvat.apps.engine.utils import take_by
from cvat.apps.redis_handler.redis_migrations.utils import (
    force_enqueue_deferred_jobs,
    reset_job_relationships,
)
from redis.client import Pipeline

QUEUE_OR_REGISTRY_TYPE = django_rq.queues.DjangoRQ | BaseRegistry


class AbstractJobProcessor(metaclass=ABCMeta):
    class JobDeletionRequiredError(Exception):
        pass

    class InvalidJobIdFormatError(Exception):
        pass

    class InvalidJobError(Exception):
        pass

    class JobSkippedError(Exception):
        pass

    @abstractmethod
    def __call__(
        self, job: Job, *, logger: Logger, queue_or_registry: QUEUE_OR_REGISTRY_TYPE | None, pipeline: Pipeline | None = None
    ) -> None: ...


@define
class BaseMigration(metaclass=ABCMeta):
    name: str = field(validator=[validators.instance_of(str)])
    app_label: str = field(validator=[validators.instance_of(str)])
    connection: Redis = field(validator=[validators.instance_of(Redis)], kw_only=True)
    logger: Logger | None = field(
        validator=validators.instance_of((Logger, NoneType)), default=None, init=False
    )

    def run(self) -> None:
        with get_migration_logger(Path(self.__class__.__module__).stem) as logger:
            self.logger = logger
            try:
                self._run()
            finally:
                self.logger = None

    @abstractmethod
    def _run(self) -> None: ...

    @overload
    def _iterate_and_migrate_jobs_from_queue_list_or_registry_set(
        self,
        *,
        queue_or_registry: QUEUE_OR_REGISTRY_TYPE,
        job_processor: AbstractJobProcessor,
        yield_old_job_id_too: Literal[False] = False,
    ) -> Generator[str, None, None]: ...

    @overload
    def _iterate_and_migrate_jobs_from_queue_list_or_registry_set(
        self,
        *,
        queue_or_registry: QUEUE_OR_REGISTRY_TYPE,
        job_processor: AbstractJobProcessor,
        yield_old_job_id_too: Literal[True] = True,
    ) -> Generator[tuple[str, str], None, None]: ...

    def _iterate_and_migrate_jobs_from_queue_list_or_registry_set(
        self,
        *,
        queue_or_registry: QUEUE_OR_REGISTRY_TYPE,
        job_processor: AbstractJobProcessor,
        yield_old_job_id_too: bool = False,
    ) -> Generator[str | tuple[str, str], None, None]:
        for subset_with_ids in take_by(set(queue_or_registry.get_job_ids()), 1000):
            results: list[str | tuple[str, str]] = [] # list with job ids or (outdated_job_id, actual_jb_id) pairs
            with queue_or_registry.connection.pipeline() as pipeline:
                for idx, job in enumerate(
                    queue_or_registry.job_class.fetch_many(subset_with_ids, connection=self.connection)
                ):
                    if job:
                        job_id_before_update = job.id
                        reset_job_relationships(job, pipeline=pipeline, save_to_redis=False)

                        try:
                            job_processor(
                                job,
                                logger=self.logger,
                                queue_or_registry=queue_or_registry,
                                pipeline=pipeline,
                            )

                            if yield_old_job_id_too:
                                results.append((job.id, job_id_before_update))
                            else:
                                results.append(job.id)
                        except AbstractJobProcessor.JobSkippedError:
                            continue
                        except AbstractJobProcessor.JobDeletionRequiredError:
                            queue_or_registry.remove(job, pipeline=pipeline)  # queue.remove has no "delete_job" argument
                            job.delete(pipeline=pipeline)
                        except AbstractJobProcessor.InvalidJobIdFormatError:
                            self.logger.error(
                                f"Unexpected job id format in the {queue_or_registry.name!r} queue: {job.id}"
                            )
                        except AbstractJobProcessor.InvalidJobError:
                            self.logger.error(
                                f"Unexpected job in the {queue_or_registry.name!r} queue: {job.id}"
                            )
                    else:
                        queue_or_registry.remove(subset_with_ids[idx], pipeline=pipeline)

                pipeline.execute()
            yield from results

    def _migrate_jobs_from_queue_list(
        self,
        *,
        queue: django_rq.queues.DjangoRQ,
        job_processor: AbstractJobProcessor,
        recreate_queue: bool = False,
    ) -> None:
        if not recreate_queue:
            for _ in self._iterate_and_migrate_jobs_from_queue_list_or_registry_set(
                queue_or_registry=queue, job_processor=job_processor
            ):
                pass
            return

        list_with_updated_ids = [
            job_id
            for job_id in self._iterate_and_migrate_jobs_from_queue_list_or_registry_set(
                queue_or_registry=queue, job_processor=job_processor
            )
        ]

        with queue.connection.pipeline() as pipe:
            # replace the queue LIST key with updated ids
            pipe.delete(queue.key)
            if list_with_updated_ids:
                pipe.rpush(queue.key, *list_with_updated_ids)
            pipe.execute()

    def _migrate_jobs_from_registry_sorted_set(
        self,
        *,
        registry: BaseRegistry,
        job_processor: AbstractJobProcessor,
        recreate_registry: bool = False,
    ) -> None:
        if not recreate_registry:
            for _ in self._iterate_and_migrate_jobs_from_queue_list_or_registry_set(
                queue_or_registry=registry, job_processor=job_processor
            ):
                pass
            return

        keys_with_scores = {
            key.decode(): score
            for key, score in self.connection.zrange(registry.key, 0, -1, withscores=True)
        }
        dict_with_updated_items = {
            updated_job_id: keys_with_scores[old_job_id]
            for updated_job_id, old_job_id in self._iterate_and_migrate_jobs_from_queue_list_or_registry_set(
                queue_or_registry=registry, job_processor=job_processor, yield_old_job_id_too=True
            )
        }

        with registry.connection.pipeline() as pipe:
            # replace the registry SORTED SET key with updated id/score pairs
            pipe.delete(registry.key)
            if dict_with_updated_items:
                pipe.zadd(registry.key, dict_with_updated_items)
            pipe.execute()

    def _migrate_jobs_from_scheduler(
        self,
        *,
        scheduler: django_rq.queues.DjangoScheduler,
        job_processor: AbstractJobProcessor,
    ) -> None:
        for job, dt in scheduler.get_jobs(with_times=True):
            job = cast(Job, job)
            # TODO: optimize to not call for each queue??
            # TODO: use pipelines
            job_queue = scheduler.get_queue_for_job(job)
            if job_queue.name != scheduler.queue_name:
                continue

            try:
                job_id_before_update = job.id
                job_processor(
                    job,
                    logger=self.logger,
                    queue_or_registry=None,
                )
                if job.id != job_id_before_update:
                    scheduler.cancel(job)
                    job.delete()  # job.dependents_key and job.dependencies_key are deleted here too
                    scheduler.connection.zadd(scheduler.scheduled_jobs_key, {job.id: to_unix(dt)})
            except AbstractJobProcessor.JobSkippedError:
                continue
            except AbstractJobProcessor.JobDeletionRequiredError:
                scheduler.cancel(job)
                job.delete()
            except AbstractJobProcessor.InvalidJobIdFormatError:
                self.logger.error(
                    f"Unexpected job id format in the {scheduler.queue_name!r} queue: {job.id}"
                )
            except AbstractJobProcessor.InvalidJobError:
                self.logger.error(f"Unexpected job in the {scheduler.queue_name!r} queue: {job.id}")

    def migrate_queue_jobs(
        self,
        *,
        queue_name: str,
        job_processor: AbstractJobProcessor,
        enqueue_deferred_jobs: bool = False,
        job_ids_are_changed: bool = False,
    ):
        queue: django_rq.queues.DjangoRQ = django_rq.get_queue(
            queue_name, connection=self.connection
        )
        if enqueue_deferred_jobs:
            force_enqueue_deferred_jobs(queue)

        self._migrate_jobs_from_queue_list(
            queue=queue, job_processor=job_processor, recreate_queue=job_ids_are_changed
        )

        for registry in (
            queue.started_job_registry,
            queue.deferred_job_registry,
            queue.finished_job_registry,
            queue.failed_job_registry,
        ):
            self._migrate_jobs_from_registry_sorted_set(
                registry=registry,
                job_processor=job_processor,
                recreate_registry=job_ids_are_changed,
            )

        scheduler: django_rq.queues.DjangoScheduler = django_rq.get_scheduler(queue_name)

        self._migrate_jobs_from_scheduler(scheduler=scheduler, job_processor=job_processor)
