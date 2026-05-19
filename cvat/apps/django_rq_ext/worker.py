# Thread-pool RQ worker.
#
# Design constraints:
#   - CPython threads cannot be cancelled. We do not support remote `stop-job`,
#     `kill-horse`, or per-job hard timeouts. Per-job time bounds are the job
#     function's responsibility (e.g. `requests.post(timeout=...)`).
#   - Soft per-job SLO: `task_execution_time_threshold` (default 60s, also
#     reused as the shutdown drain cap). Anything past it logs a warning. The
#     K8s `terminationGracePeriodSeconds` must be strictly greater (see
#     `sosov_deploy/worker.yaml`) so register_death + log flush can run before
#     SIGKILL.
#   - rq.BaseWorker isn't really a usable base — many lifecycle methods it
#     references live only on `rq.worker.Worker`. We port them verbatim via
#     `_RqWorkerPortMixin` in mixins.py.
#
# See TODO.md alongside this file for the observability / consistency
# follow-ups deferred to a later phase.

import sys
import threading
import time
import traceback
from concurrent.futures import Future, ThreadPoolExecutor, wait
from contextlib import suppress
from typing import Optional

import redis.exceptions
from rq.defaults import DEFAULT_LOGGING_DATE_FORMAT, DEFAULT_LOGGING_FORMAT
from rq.job import Job, JobStatus
from rq.queue import Queue
from rq.registry import StartedJobRegistry
from rq.utils import utcnow
from rq.worker import BaseWorker, DequeueStrategy, StopRequested

from cvat.apps.django_rq_ext.mixins import RqWorkerPortMixin

_POOL_FULL_POLL_INTERVAL = 0.1


class ThreadPoolWorker(RqWorkerPortMixin, BaseWorker):
    def __init__(
        self,
        *args,
        pool_size: int,
        task_execution_time_threshold: int = 60,
        **kwargs,
    ) -> None:
        super().__init__(*args, **kwargs)
        self.threadpool_size = pool_size
        self._task_execution_time_threshold_sec = task_execution_time_threshold
        self.executor = ThreadPoolExecutor(
            max_workers=pool_size,
            thread_name_prefix="rq_threadpool_",
        )
        self._active_futures: list[Future] = []
        self._active_futures_lock = threading.Lock()
        self._heartbeat_stop_event = threading.Event()

    def work(
        self,
        burst: bool = False,
        logging_level: str = "INFO",
        date_format: str = DEFAULT_LOGGING_DATE_FORMAT,
        log_format: str = DEFAULT_LOGGING_FORMAT,
        max_idle_time: Optional[int] = None,
        with_scheduler: bool = False,
        dequeue_strategy: DequeueStrategy = DequeueStrategy.DEFAULT,
        # NOTE @sosov: accepted-and-ignored
        # reason: adds complexity to implementation, while we will never use such functionality
        max_jobs: Optional[int] = None,
    ) -> None:
        self.bootstrap(logging_level, date_format, log_format)
        self._dequeue_strategy = dequeue_strategy
        if with_scheduler:
            self._start_scheduler(burst, logging_level, date_format, log_format)

        self._install_signal_handlers()
        self._start_heartbeat()

        try:
            while True:
                try:
                    if self._stop_requested:
                        self.log.info("Worker %s: stopping on request", self.key)
                        break

                    self.check_for_suspension(burst)
                    if self.should_run_maintenance_tasks:
                        self.run_maintenance_tasks()

                    # NOTE @sosov: pool-full gate before dequeue. Without it,
                    # ThreadPoolExecutor would park overflow in its internal
                    # _work_queue, hiding jobs from Redis (not in started_job_registry,
                    # not on the queue) and losing them on crash.
                    if self._is_pool_full:
                        time.sleep(_POOL_FULL_POLL_INTERVAL)
                        continue

                    timeout = None if burst else self.dequeue_timeout
                    result = self.dequeue_job_and_maintain_ttl(timeout, max_idle_time)
                    if result is None:
                        if burst:
                            self.log.info("Worker %s: done, quitting", self.key)
                        elif max_idle_time is not None:
                            self.log.info(
                                "Worker %s: idle for %d seconds, quitting",
                                self.key,
                                max_idle_time,
                            )
                        break

                    job, queue = result
                    self.execute_job(job, queue)

                except redis.exceptions.TimeoutError:
                    self.log.error("Worker %s: Redis connection timeout, quitting...", self.key)
                    break
                except StopRequested:
                    break
                except SystemExit:
                    raise
                except:  # noqa pylint: disable=bare-except
                    self.log.error(
                        "Worker %s: found an unhandled exception, quitting...",
                        self.key,
                        exc_info=True,
                    )
                    break
        finally:
            self.teardown()

    @property
    def _is_pool_full(self) -> bool:
        with self._active_futures_lock:
            return len(self._active_futures) >= self.threadpool_size

    def subscribe(self) -> None:
        # NOTE @sosov: BaseWorker.subscribe opens a pubsub channel for
        # stop-job / kill-horse / shutdown commands — all horse-bound and
        # inapplicable to threads. No-op; unsubscribe() is then also a no-op
        # because self.pubsub_thread stays None.
        pass

    def _start_heartbeat(self) -> None:
        self._heartbeat_stop_event.clear()
        future = self.executor.submit(self._heartbeat_loop)
        with self._active_futures_lock:
            self._active_futures.append(future)
        future.add_done_callback(self._on_future_performed)

    def _stop_heartbeat(self) -> None:
        self._heartbeat_stop_event.set()

    def _heartbeat_loop(self) -> None:
        while not self._heartbeat_stop_event.is_set():
            try:
                self.heartbeat()
            except Exception:  # pylint: disable=broad-except
                self.log.warning("Background heartbeat failed", exc_info=True)

            self._heartbeat_stop_event.wait(timeout=self.job_monitoring_interval)

    def teardown(self) -> None:
        if self.scheduler:
            self.stop_scheduler()

        self._stop_heartbeat()

        self.executor.shutdown(wait=False)

        with self._active_futures_lock:
            in_flight = list(self._active_futures)

        if in_flight:
            _, not_done = wait(in_flight, timeout=self._task_execution_time_threshold_sec)
            if not_done:
                self.log.warning(
                    "Drain timed out after %ds, %d job(s) still running; "
                    "letting K8s SIGKILL them",
                    self._task_execution_time_threshold_sec,
                    len(not_done),
                )

        self.register_death()

    # NOTE @sosov: SIGINT/SIGTERM are wired by BaseWorker._install_signal_handlers to
    # self.request_stop. request_stop / request_force_stop live on
    # rq.worker.Worker (not BaseWorker), so we MUST override or signal-handler
    # install AttributeErrors. Our request_stop just flips a flag — threads
    # can't be interrupted, drain happens in teardown.

    def request_stop(self, signum, frame) -> None:
        self.log.info("Stop requested via signal %s", signum)
        self._shutdown_requested_date = utcnow()
        self._stop_requested = True

    def request_force_stop(self, signum, frame) -> None:
        self.log.warning("Cold shut down")
        raise SystemExit()

    def handle_warm_shutdown_request(self) -> None:
        self.log.info("Worker %s [PID %d]: warm shut down requested", self.name, self.pid)

    def execute_job(self, job: Job, queue: Queue) -> None:
        future = self.executor.submit(self._perform_job, job, queue)
        with self._active_futures_lock:
            self._active_futures.append(future)

        future.add_done_callback(self._on_future_performed)

    def _on_future_performed(self, future: Future) -> None:
        with self._active_futures_lock:
            try:
                self._active_futures.remove(future)
            except ValueError:
                pass

    def _perform_job(self, job: Job, queue: Queue) -> None:
        started_registry = queue.started_job_registry
        heartbeat_ttl = self.job_monitoring_interval + 60

        try:
            with self.connection.pipeline() as pipeline:
                job.prepare_for_execution(self.name, pipeline=pipeline)
                job.heartbeat(utcnow(), heartbeat_ttl, pipeline=pipeline)
                pipeline.execute()

            rv = job.perform()

            job.ended_at = utcnow()
            job._result = rv

            elapsed_sec = (job.ended_at - job.started_at).total_seconds()
            if elapsed_sec > self._task_execution_time_threshold_sec:
                self.log.warning(
                    "Job %s exceeded execution threshold: %.1fs > %ds",
                    job.id,
                    elapsed_sec,
                    self._task_execution_time_threshold_sec,
                )

            with self.connection.pipeline() as pipeline:
                result_ttl = job.get_result_ttl(self.default_result_ttl)
                job.set_status(JobStatus.FINISHED, pipeline=pipeline)
                job.worker_name = None
                started_registry.remove(job, pipeline=pipeline)
                if result_ttl != 0:
                    job.cleanup(result_ttl, pipeline=pipeline, remove_from_queue=False)
                    job.save(pipeline=pipeline, include_meta=False, include_result=True)
                    queue.finished_job_registry.add(job, result_ttl, pipeline=pipeline)
                pipeline.execute()

            self.log.info("Job %s succeeded", job.id)
        except Exception:  # pylint: disable=broad-except
            exc_info = sys.exc_info()
            exc_string = "".join(traceback.format_exception(*exc_info))
            self.log.warning("Job %s raised an exception", job.id)
            job.ended_at = utcnow()

            elapsed_sec = (job.ended_at - job.started_at).total_seconds()
            if elapsed_sec > self._task_execution_time_threshold_sec:
                self.log.warning(
                    "Failed job %s exceeded execution threshold: %.1fs > %ds",
                    job.id,
                    elapsed_sec,
                    self._task_execution_time_threshold_sec,
                )

            self.handle_job_failure(
                job,
                queue,
                started_job_registry=started_registry,
                exc_string=exc_string,
            )

    def handle_job_failure(self, job, queue, started_job_registry=None, exc_string=""):
        self.log.debug("Handling failed execution of job %s", job.id)
        with self.connection.pipeline() as pipeline:
            if started_job_registry is None:
                started_job_registry = StartedJobRegistry(
                    job.origin,
                    self.connection,
                    job_class=self.job_class,
                    serializer=self.serializer,
                )

            retry = job.retries_left and job.retries_left > 0
            if not retry:
                job.set_status(JobStatus.FAILED, pipeline=pipeline)

            started_job_registry.remove(job, pipeline=pipeline)

            if not self.disable_default_exception_handler and not retry:
                job._handle_failure(exc_string, pipeline=pipeline)
                with suppress(redis.exceptions.ConnectionError):
                    pipeline.execute()

            if retry:
                job.retry(queue, pipeline)
                enqueue_dependents = False
            else:
                enqueue_dependents = True

            try:
                pipeline.execute()
                if enqueue_dependents:
                    queue.enqueue_dependents(job)
            except Exception:  # nosec B110  pylint: disable=broad-except
                # Ensure that custom exception handlers are called even if Redis is down.
                pass
