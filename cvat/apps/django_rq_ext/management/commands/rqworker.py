import argparse

import django_rq.management.commands.rqworker as _upstream


def _validate_jobs_pool_size(raw: str) -> int:
    value = int(raw)
    if value < 1:
        raise argparse.ArgumentTypeError(f"--jobs-pool-size must be at least 1 (got {value}).")
    return value


class Command(_upstream.Command):
    def add_arguments(self, parser) -> None:
        super().add_arguments(parser)
        parser.add_argument(
            "--jobs-pool-size",
            type=_validate_jobs_pool_size,
            default=None,
            help=(
                "Number of concurrent jobs the ThreadPoolWorker can run "
                "(minimum 1). Only meaningful when --worker-class points at a "
                "thread-pool worker; passing this with the stock rq.Worker "
                "will TypeError."
            ),
        )
        parser.add_argument(
            "--job-execution-time-threshold",
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
        jobs_pool_size: int | None = options.pop("jobs_pool_size", None)
        job_threshold: int | None = options.pop("job_execution_time_threshold", None)

        if jobs_pool_size is None and job_threshold is None:
            super().handle(*args, **options)
            return

        extras: dict = {}
        if jobs_pool_size is not None:
            extras["jobs_pool_size"] = jobs_pool_size
        if job_threshold is not None:
            extras["job_execution_time_threshold"] = job_threshold

        original_get_worker = _upstream.get_worker

        def _patched_get_worker(*a, **kw):
            kw.update(extras)
            return original_get_worker(*a, **kw)

        _upstream.get_worker = _patched_get_worker
        try:
            super().handle(*args, **options)
        finally:
            _upstream.get_worker = original_get_worker
