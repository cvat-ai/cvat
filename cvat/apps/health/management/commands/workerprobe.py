import platform

import django_rq
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError, CommandParser
from rq.worker import Worker


class Command(BaseCommand):
    help = "Check worker liveness in specified queues"

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("queue_names", nargs="+", type=str)
        parser.add_argument("--expected-num-workers", type=int, required=True)

    def handle(self, *args, **options) -> None:
        hostname = platform.node()
        expected_num_workers: int = options["expected_num_workers"]

        for queue_name in options["queue_names"]:
            if queue_name not in settings.RQ_QUEUES:
                raise CommandError(f"Queue {queue_name} is not defined")

            connection = django_rq.get_connection(queue_name)
            live_workers = [
                w
                for w in Worker.all(connection)
                if queue_name in w.queue_names() and w.hostname == hostname
            ]

            if len(live_workers) < expected_num_workers:
                raise CommandError(
                    f"Queue {queue_name}: expected at least {expected_num_workers} live "
                    f"worker(s) on {hostname}, found {len(live_workers)}"
                )
