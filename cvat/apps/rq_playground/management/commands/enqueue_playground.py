import django_rq
from django.core.management.base import BaseCommand

from cvat.apps.rq_playground.task import send_webhook_task

_DEFAULT_URL = "https://httpbin.org/get"
_DEFAULT_COUNT = 5
_QUEUE_NAME = "playground"


class Command(BaseCommand):
    help = "Enqueue N send_webhook_task jobs onto the `playground` queue."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--count", type=int, default=_DEFAULT_COUNT)
        parser.add_argument("--url", type=str, default=_DEFAULT_URL)
        parser.add_argument("--method", type=str, default="GET")

    def handle(self, *args, **options) -> None:
        queue = django_rq.get_queue(_QUEUE_NAME)
        count: int = options["count"]
        url: str = options["url"]
        method: str = options["method"]

        for i in range(count):
            job = queue.enqueue(
                send_webhook_task,
                url=url,
                method=method,
                payload={"i": i},
            )
            self.stdout.write(f"enqueued {job.id} -> {method} {url}")

        self.stdout.write(self.style.SUCCESS(f"enqueued {count} jobs on `{_QUEUE_NAME}`"))
