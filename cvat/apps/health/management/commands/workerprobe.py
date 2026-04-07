import os
import platform
from datetime import datetime, timedelta

import django_rq
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from rq.worker import Worker


class Command(BaseCommand):
    help = "Check worker liveness in specified queues"

    def add_arguments(self, parser):
        parser.add_argument("queue_names", nargs="+", type=str)

    def handle(self, *args, **options):
        hostname = platform.node()
        for queue_name in options["queue_names"]:
            if queue_name not in settings.RQ_QUEUES:
                raise CommandError(f"Queue {queue_name} is not defined")

            connection = django_rq.get_connection(queue_name)
            workers = [
                w
                for w in Worker.all(connection)
                if queue_name in w.queue_names() and w.hostname == hostname
            ]

            expected_workers = int(os.getenv("NUMPROCS", 1))

            if len(workers) != expected_workers:
                raise CommandError(
                    "Number of registered workers does not match the expected number, "
                    f"actual: {len(workers)}, expected: {expected_workers}"
                )
            for worker in workers:
                if datetime.now() - worker.last_heartbeat > timedelta(seconds=worker.worker_ttl):
                    raise CommandError(
                        f"It seems that worker {worker.name}, pid: {worker.pid} is dead"
                    )
