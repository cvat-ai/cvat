# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from argparse import ArgumentParser
from collections import defaultdict

import django_rq
from django.conf import settings
from django.core.management.base import BaseCommand
from rq.job import Job as RQJob


class Command(BaseCommand):
    help = "Synchronize periodic jobs in Redis with the project configuration"

    _PERIODIC_JOBS_KEY_PREFIX = "cvat:utils:periodic-jobs:"

    def add_arguments(self, parser: ArgumentParser) -> None:
        parser.add_argument(
            "--clear", action="store_true", help="Remove jobs from Redis instead of updating them"
        )

    def handle(self, *args, **options):
        configured_jobs = defaultdict(dict)

        if not options["clear"]:
            for job in settings.PERIODIC_RQ_JOBS:
                configured_jobs[job["queue"]][job["id"]] = job

        for queue_name in settings.RQ_QUEUES:
            self.stdout.write(f"Processing queue {queue_name}...")

            periodic_jobs_key = self._PERIODIC_JOBS_KEY_PREFIX + queue_name

            queue = django_rq.get_queue(queue_name)
            scheduler = django_rq.get_scheduler(queue_name, queue=queue)

            stored_jobs_for_queue = {
                member.decode("UTF-8") for member in queue.connection.smembers(periodic_jobs_key)
            }
            configured_jobs_for_queue = configured_jobs[queue_name]

            # Delete jobs that are no longer in the configuration
            jobs_to_delete = stored_jobs_for_queue.difference(configured_jobs_for_queue.keys())

            for job_id in jobs_to_delete:
                self.stdout.write(f"Deleting job {job_id}...")
                scheduler.cancel(job_id)
                if job := queue.fetch_job(job_id):
                    job.delete()

                queue.connection.srem(periodic_jobs_key, job_id)

            def is_job_actual(job: RQJob, job_definition: dict):
                return (
                    job.func_name == job_definition["func"]
                    and job.meta.get("cron_string") == job_definition["cron_string"]
                    and (
                        not (job.args or job_definition.get("args"))
                        or job.args == job_definition.get("args")
                    )
                    and (
                        not (job.kwargs or job_definition.get("kwargs"))
                        or job.kwargs == job_definition.get("kwargs")
                    )
                )

            # Add/update jobs from the configuration
            for job_definition in configured_jobs_for_queue.values():
                job_id = job_definition["id"]

                if job := queue.fetch_job(job_id):
                    if is_job_actual(job, job_definition):
                        self.stdout.write(f"Job {job_id} is unchanged")
                        queue.connection.sadd(periodic_jobs_key, job_id)
                        continue

                    self.stdout.write(f"Recreating job {job_id}...")
                    job.delete()
                else:
                    self.stdout.write(f"Creating job {job_id}...")

                scheduler.cron(
                    cron_string=job_definition["cron_string"],
                    func=job_definition["func"],
                    id=job_id,
                    args=job_definition.get("args"),
                    kwargs=job_definition.get("kwargs"),
                )

                queue.connection.sadd(periodic_jobs_key, job_id)
