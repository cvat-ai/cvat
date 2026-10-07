# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from logging import Logger
from pathlib import Path

import django_rq
from django.conf import settings
from rq.job import Job

from cvat.apps.engine.log import get_migration_logger
from cvat.apps.engine.serializers import BasicUserSerializer
from cvat.apps.engine.utils import take_by
from cvat.apps.iam.models import User
from cvat.apps.redis_handler.redis_migrations import BaseMigration

_NEW_USER_FIELDS = ("first_name", "last_name", "url")


def _needs_migration(job: Job) -> bool:
    user_meta = job.meta.get("user")
    return isinstance(user_meta, dict) and any(field not in user_meta for field in _NEW_USER_FIELDS)


def _migrate_jobs(jobs: list[Job], *, connection, logger: Logger) -> None:
    jobs_to_migrate = [job for job in jobs if _needs_migration(job)]
    if not jobs_to_migrate:
        return

    user_ids: set[int] = {job.meta["user"]["id"] for job in jobs_to_migrate}
    users_by_id: dict[int, User] = {user.pk: user for user in User.objects.filter(pk__in=user_ids)}
    serialized_by_id: dict[int, dict] = {
        user.pk: data
        for user, data in zip(
            users_by_id.values(),
            BasicUserSerializer(users_by_id.values(), many=True, context={"request": None}).data,
        )
    }

    with connection.pipeline() as pipeline:
        for job in jobs_to_migrate:
            user_id = job.meta["user"]["id"]
            user_data = serialized_by_id.get(user_id)

            if user_data is None:
                logger.warning(
                    "User %s referenced by job %s no longer exists, "
                    "backfilling first_name/last_name with empty strings",
                    user_id,
                    job.id,
                )
                user_data = {
                    "first_name": "",
                    "last_name": "",
                    "url": "",
                }

            logger.info("Backfilling user meta fields for job %s", job.id)
            job.meta["user"].update({field: user_data[field] for field in _NEW_USER_FIELDS})

            meta = job.serializer.dumps(job.meta)
            pipeline.hset(job.key, "meta", meta)

        pipeline.execute()


class Migration(BaseMigration):
    def run(self) -> None:
        with get_migration_logger(Path(__file__).stem) as logger:
            for queue_name in settings.RQ_QUEUES:
                queue: django_rq.queues.DjangoRQ = django_rq.get_queue(
                    queue_name, connection=self.connection
                )

                for registry in (
                    queue,
                    queue.started_job_registry,
                    queue.deferred_job_registry,
                    queue.finished_job_registry,
                    queue.failed_job_registry,
                ):
                    job_ids = list(registry.get_job_ids())
                    for subset in take_by(job_ids, 1000):
                        jobs = list(queue.job_class.fetch_many(subset, connection=self.connection))
                        for idx, job in enumerate(jobs):
                            if job is None:
                                registry.remove(subset[idx])

                        _migrate_jobs(
                            [job for job in jobs if job is not None],
                            connection=self.connection,
                            logger=logger,
                        )

            scheduler = django_rq.get_scheduler(next(iter(settings.RQ_QUEUES)))
            scheduled_jobs = list(scheduler.get_jobs())
            for subset in take_by(scheduled_jobs, 1000):
                _migrate_jobs(subset, connection=self.connection, logger=logger)
