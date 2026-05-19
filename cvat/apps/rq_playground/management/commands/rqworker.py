# NOTE @sosov: shadows django_rq.management.commands.rqworker.Command. Picked
# up by Django because cvat.apps.rq_playground sits after `django_rq` in
# INSTALLED_APPS, and get_commands() takes the last definition wins.
#
# Adds two optional flags:
#   --pool-size                      (forwarded to worker.__init__)
#   --task-execution-time-threshold  (forwarded to worker.__init__)
# Both default to None and are only injected into worker kwargs when the user
# explicitly passes them, so the stock rq.Worker (which doesn't accept either)
# keeps working unchanged for `just runworker`.

import django_rq.management.commands.rqworker as _upstream


class Command(_upstream.Command):
    def add_arguments(self, parser) -> None:
        super().add_arguments(parser)
        parser.add_argument(
            "--pool-size",
            type=int,
            default=None,
            help=(
                "Thread-pool size for ThreadPoolWorker. Only meaningful when "
                "--worker-class points at a thread-pool worker; passing this "
                "with the stock rq.Worker will TypeError."
            ),
        )
        parser.add_argument(
            "--task-execution-time-threshold",
            type=int,
            default=None,
            help=(
                "ThreadPoolWorker soft per-job SLO (also reused as the drain "
                "timeout on shutdown). Worker default is 60s."
            ),
        )

    def handle(self, *args, **options) -> None:
        # NOTE @sosov: upstream handle() builds worker_kwargs as a literal dict
        # with no extension hook, so we monkey-patch `get_worker` in its module
        # namespace for the duration of one super() call. Upstream does
        # `from ...workers import get_worker`, which binds the name on
        # _upstream — rebinding it is what super().handle() resolves. Less
        # brittle than copy-pasting the whole handle() body.
        pool_size: int | None = options.pop("pool_size", None)
        task_threshold: int | None = options.pop("task_execution_time_threshold", None)

        if pool_size is None and task_threshold is None:
            super().handle(*args, **options)
            return

        extras: dict = {}
        if pool_size is not None:
            extras["pool_size"] = pool_size
        if task_threshold is not None:
            extras["task_execution_time_threshold"] = task_threshold

        original_get_worker = _upstream.get_worker

        def _patched_get_worker(*a, **kw):
            kw.update(extras)
            return original_get_worker(*a, **kw)

        _upstream.get_worker = _patched_get_worker
        try:
            super().handle(*args, **options)
        finally:
            _upstream.get_worker = original_get_worker
