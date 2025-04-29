# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from abc import ABCMeta, abstractmethod
from logging import Logger
from pathlib import Path
from types import NoneType

import django_rq
from attrs import define, field, validators
from redis import Redis
from rq.job import Job
from rq.registry import BaseRegistry

from cvat.apps.engine.log import get_migration_logger
from cvat.apps.engine.utils import take_by
from cvat.apps.redis_handler.redis_migrations.utils import force_enqueue_deferred_jobs


class AbstractJobProcessor(metaclass=ABCMeta):
    class JobMustBeDeletedError(Exception):
        pass

    class UnexpectedJobIdFormatError(Exception):
        pass

    class UnexpectedJobError(Exception):
        pass

    @abstractmethod
    def __call__(
        self, job: Job, *, logger: Logger, registry: BaseRegistry | django_rq.queues.DjangoRQ | None
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
            self._run()
        self.logger = None

    @abstractmethod
    def _run(self) -> None: ...

    def migrate_jobs_from_registry(
        self,
        *,
        registry: BaseRegistry | django_rq.queues.DjangoRQ,
        job_processor: AbstractJobProcessor,
    ) -> None:
        for subset_with_ids in take_by(set(registry.get_job_ids()), 1000):
            for idx, job in enumerate(
                registry.job_class.fetch_many(subset_with_ids, connection=self.connection)
            ):
                if job:
                    try:
                        job_processor(
                            job,
                            registry=registry,
                            logger=self.logger,
                        )
                    except AbstractJobProcessor.JobMustBeDeletedError:
                        registry.remove(job)  # queue.remove has no "delete_job" argument
                        job.delete()
                    except AbstractJobProcessor.UnexpectedJobIdFormatError:
                        self.logger.error(
                            f"Unexpected job id format in the {registry.name!r} queue: {job.id}"
                        )
                    except AbstractJobProcessor.UnexpectedJobError:
                        self.logger.error(
                            f"Unexpected job in the {registry.name!r} queue: {job.id}"
                        )
                    except Exception:  # nosec
                        continue
                else:
                    registry.remove(subset_with_ids[idx])

    def migrate_queue_jobs(
        self,
        *,
        queue_name: str,
        job_processor: AbstractJobProcessor,
        enqueue_deferred_jobs: bool = False,
    ):
        queue: django_rq.queues.DjangoRQ = django_rq.get_queue(
            queue_name, connection=self.connection
        )
        scheduler: django_rq.queues.DjangoScheduler = django_rq.get_scheduler(queue_name)

        if enqueue_deferred_jobs:
            force_enqueue_deferred_jobs(queue)

        for registry in (
            queue,
            queue.started_job_registry,
            queue.deferred_job_registry,
            queue.finished_job_registry,
            queue.failed_job_registry,
        ):
            self.migrate_jobs_from_registry(
                registry=registry,
                job_processor=job_processor,
            )

        for job in scheduler.get_jobs():
            try:
                job_processor(
                    job,
                    logger=self.logger,
                    registry=None,
                )
            except AbstractJobProcessor.JobMustBeDeletedError:
                scheduler.cancel(job)
                job.delete()
            except AbstractJobProcessor.UnexpectedJobIdFormatError:
                self.logger.error(f"Unexpected job id format in the {queue_name!r} queue: {job.id}")
            except AbstractJobProcessor.UnexpectedJobError:
                self.logger.error(f"Unexpected job in the {queue_name!r} queue: {job.id}")
            except Exception:  # nosec
                continue
