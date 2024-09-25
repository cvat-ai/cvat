import os
import platform
from datetime import datetime
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from rq.worker import Worker
import django_rq


class Command(BaseCommand):
    help = "Check worker liveness in specified queues"

    def add_arguments(self, parser):
        parser.add_argument("queue_names", nargs="+", type=str)

    def handle(self, *args, **options):
        allowed_queue_names = list(q.value for q in settings.CVAT_QUEUES)
        hostname = platform.node()
        for queue_name in options["queue_names"]:
            if queue_name not in allowed_queue_names:
                raise CommandError(f"Queue {queue_name} is not defined")

            queue = django_rq.get_queue(queue_name)

            workers = [w for w in Worker.all(queue.connection) if queue.name in w.queue_names() and w.hostname == hostname]

            if len(workers) != int(os.getenv("NUMPROCS", 1)) or \
                not all((datetime.now() - w.last_heartbeat).seconds < w.worker_ttl for w in workers):
                raise CommandError(f"Unhealthy workers in the {queue_name} queue")
