# NOTE @sosov: shadows django_rq.management.commands.rqworker.Command. Picked
# up by Django because cvat.apps.django_rq_ext sits before `django_rq` in
# INSTALLED_APPS, and get_commands() iterates via reversed(get_app_configs()),
# so the FIRST app in INSTALLED_APPS wins for command-name collisions.
#
# Adds --pool-size and --task-execution-time-threshold. Both default to None
# and are only injected when explicitly set, so stock rq.Worker invocations
# (e.g. `just runworker`) keep working unchanged.

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
        # with no extension hook, so we monkey-patch `get_worker` in its
        # module namespace just for the duration of one super() call. Less
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
