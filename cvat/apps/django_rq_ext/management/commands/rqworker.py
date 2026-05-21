import argparse

import django_rq.management.commands.rqworker as _upstream


def _validate_pool_size(raw: str) -> int:
    # NOTE @sosov: minimum is 2 because the heartbeat future permanently
    # occupies one slot; pool_size=1 would leave zero capacity for jobs.
    value = int(raw)
    if value < 2:
        raise argparse.ArgumentTypeError(
            f"--pool-size must be at least 2 (got {value}); the heartbeat "
            "future occupies one slot so a pool of 1 has no capacity for jobs."
        )
    return value


class Command(_upstream.Command):
    def add_arguments(self, parser) -> None:
        super().add_arguments(parser)
        parser.add_argument(
            "--pool-size",
            type=_validate_pool_size,
            default=None,
            help=(
                "Thread-pool size for ThreadPoolWorker (minimum 2 — the "
                "heartbeat thread takes one slot). Only meaningful when "
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
