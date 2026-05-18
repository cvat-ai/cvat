# NOTE @sosov: dedicated entry point for ThreadPoolWorker. We can't reuse
# `manage.py rqworker --worker-class=...` because django_rq's command calls
# `worker.work(max_jobs=...)`, and our ThreadPoolWorker.work() signature does
# not accept max_jobs.

import django_rq
from django.core.management.base import BaseCommand

from rq_ext.my_threadpool_executor import ThreadPoolWorker

_DEFAULT_QUEUE = "playground"
_DEFAULT_POOL_SIZE = 4


class Command(BaseCommand):
    help = "Run ThreadPoolWorker against one or more RQ queues (default: playground)."

    def add_arguments(self, parser) -> None:
        parser.add_argument("queues", nargs="*", default=[_DEFAULT_QUEUE])
        parser.add_argument("--pool-size", type=int, default=_DEFAULT_POOL_SIZE)
        parser.add_argument("--with-scheduler", action="store_true", default=False)
        parser.add_argument("--burst", action="store_true", default=False)

    def handle(self, *args, **options) -> None:
        queue_names: list[str] = options["queues"] or [_DEFAULT_QUEUE]
        queues = [django_rq.get_queue(name) for name in queue_names]

        worker = ThreadPoolWorker(
            queues=queues,
            connection=queues[0].connection,
            pool_size=options["pool_size"],
        )

        self.stdout.write(
            f"starting ThreadPoolWorker pool_size={options['pool_size']} " f"queues={queue_names}"
        )
        worker.work(
            burst=options["burst"],
            with_scheduler=options["with_scheduler"],
        )
