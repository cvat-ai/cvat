import signal
import sys
import threading
import time
import traceback
from concurrent.futures import Future, ThreadPoolExecutor, wait
from contextlib import suppress
from types import FrameType
from typing import Optional

import redis.exceptions
from rq.connections import pop_connection, push_connection
from rq.defaults import DEFAULT_LOGGING_DATE_FORMAT, DEFAULT_LOGGING_FORMAT
from rq.job import Job, JobStatus
from rq.queue import Queue
from rq.registry import StartedJobRegistry
from rq.utils import utcnow
from rq.worker import BaseWorker, DequeueStrategy, StopRequested, WorkerStatus

from cvat_libs.rq_ext import consts
from cvat_libs.rq_ext.mixins import RqWorkerPortMixin
from cvat_libs.rq_ext.utils import NoOpDeathPenalty


class ThreadPoolWorker(RqWorkerPortMixin, BaseWorker):
    def __init__(
        self,
        *args,
        jobs_pool_size: int,
        job_execution_time_threshold: int = 60,
        **kwargs,
    ) -> None:
        super().__init__(*args, **kwargs)
        # NOTE @sosov: +1 reserves the heartbeat slot; jobs_pool_size is the
        # user-facing job-slot count.
        self.threadpool_size = jobs_pool_size + 1

        self._job_execution_time_threshold_sec = job_execution_time_threshold

        self._executor = ThreadPoolExecutor(
            max_workers=self.threadpool_size,
            thread_name_prefix="rq_threadpool_",
        )
        self._active_futures: list[Future] = []
        self._active_jobs: dict[Future, Job] = {}
        self._lock = threading.Lock()

        self._heartbeat_future: Optional[Future] = None
        self._heartbeat_stop_event = threading.Event()

    def subscribe(self) -> None:
        # NOTE @sosov: BaseWorker.subscribe opens a pubsub channel for
        # stop-job / kill-horse / shutdown commands — all horse-bound and
        # inapplicable to threads. No-op; unsubscribe() is then also a no-op
        # because self.pubsub_thread stays None.
        pass

    @property
    def _is_threadpool_full(self) -> bool:
        with self._lock:
            return len(self._active_futures) >= self.threadpool_size

    def _on_future_performed(self, future: Future) -> None:
        with self._lock:
            try:
                self._active_futures.remove(future)
            except ValueError:
                pass

            self._active_jobs.pop(future, None)

            if future is self._heartbeat_future:
                return

            if all(f is self._heartbeat_future for f in self._active_futures):
                self.set_state(WorkerStatus.IDLE)

    def _maintain_active_job_heartbeats(self) -> None:
        with self._lock:
            jobs = list(self._active_jobs.values())

        if not jobs:
            return

        try:
            with self.connection.pipeline() as pipeline:
                now = utcnow()
                for job in jobs:
                    job.heartbeat(
                        timestamp=now,
                        ttl=self.get_heartbeat_ttl(job),
                        pipeline=pipeline,
                        xx=True,
                    )
                pipeline.execute()
        except Exception:  # pylint: disable=broad-except
            self.log.warning("Active-job heartbeat refresh failed", exc_info=True)

    def _heartbeat_loop(self) -> None:
        while not self._heartbeat_stop_event.is_set():
            try:
                self.heartbeat()
            except Exception:  # pylint: disable=broad-except
                self.log.warning("Background heartbeat failed", exc_info=True)

            self._maintain_active_job_heartbeats()

            self._heartbeat_stop_event.wait(timeout=self.job_monitoring_interval)

    def _start_heartbeat(self) -> None:
        self._heartbeat_stop_event.clear()

        self._heartbeat_future = self._executor.submit(self._heartbeat_loop)

        with self._lock:
            self._active_futures.append(self._heartbeat_future)

        self._heartbeat_future.add_done_callback(self._on_future_performed)

    def get_heartbeat_ttl(self, job: Job) -> int:
        return self.job_monitoring_interval + consts.JOB_HEARTBEAT_REFRESH_BUFFER_SEC

    def prepare_job_execution(
        self,
        job: Job,
        remove_from_intermediate_queue: bool = False,
    ) -> None:
        with self.connection.pipeline() as pipeline:
            job.prepare_for_execution(worker_name=self.name, pipeline=pipeline)
            job.heartbeat(
                timestamp=utcnow(),
                ttl=self.get_heartbeat_ttl(job),
                pipeline=pipeline,
            )

            if remove_from_intermediate_queue:
                intermediate_queue = Queue(name=job.origin, connection=self.connection)
                pipeline.lrem(intermediate_queue.intermediate_queue_key, 1, job.id)

            pipeline.execute()

    def handle_job_success(
        self,
        job: Job,
        queue: Queue,
        started_job_registry: StartedJobRegistry,
    ) -> None:
        with self.connection.pipeline() as pipeline:
            while True:
                try:
                    pipeline.watch(job.dependents_key)
                    queue.enqueue_dependents(job=job, pipeline=pipeline)

                    if not pipeline.explicit_transaction:
                        pipeline.multi()

                    self.increment_successful_job_count(pipeline=pipeline)
                    self.increment_total_working_time(
                        job_execution_time=job.ended_at - job.started_at,
                        pipeline=pipeline,
                    )

                    result_ttl = job.get_result_ttl(self.default_result_ttl)
                    if result_ttl != 0:
                        job._handle_success(result_ttl=result_ttl, pipeline=pipeline)

                    job.cleanup(ttl=result_ttl, pipeline=pipeline, remove_from_queue=False)
                    started_job_registry.remove(job, pipeline=pipeline)

                    pipeline.execute()
                    break
                except redis.exceptions.WatchError:
                    continue

        self.log.info("Job %s succeeded", job.id)

    def handle_job_failure(
        self,
        job: Job,
        queue: Queue,
        started_job_registry: Optional[StartedJobRegistry] = None,
        exc_string: str = "",
    ) -> None:
        self.log.debug("Handling failed execution of job %s", job.id)
        with self.connection.pipeline() as pipeline:
            if started_job_registry is None:
                started_job_registry = StartedJobRegistry(
                    name=job.origin,
                    connection=self.connection,
                    job_class=self.job_class,
                    serializer=self.serializer,
                )

            retry = job.retries_left and job.retries_left > 0
            if not retry:
                job.set_status(JobStatus.FAILED, pipeline=pipeline)

            started_job_registry.remove(job, pipeline=pipeline)

            if not self.disable_default_exception_handler and not retry:
                job._handle_failure(exc_string=exc_string, pipeline=pipeline)
                with suppress(redis.exceptions.ConnectionError):
                    pipeline.execute()

            self.increment_failed_job_count(pipeline=pipeline)

            if job.started_at and job.ended_at:
                self.increment_total_working_time(
                    job_execution_time=job.ended_at - job.started_at,
                    pipeline=pipeline,
                )

            if retry:
                job.retry(queue=queue, pipeline=pipeline)
                enqueue_dependents = False
            else:
                enqueue_dependents = True

            try:
                pipeline.execute()
                if enqueue_dependents:
                    queue.enqueue_dependents(job=job)
            except Exception:  # nosec B110  pylint: disable=broad-except
                # Ensure that custom exception handlers are called even if Redis is down.
                pass

    def _perform_job(self, job: Job, queue: Queue) -> None:
        push_connection(self.connection)
        try:
            started_registry = queue.started_job_registry

            try:
                remove_from_intermediate_queue = len(self.queues) == 1
                self.prepare_job_execution(
                    job=job,
                    remove_from_intermediate_queue=remove_from_intermediate_queue,
                )

                rv = job.perform()

                job.ended_at = utcnow()
                job._result = rv

                job.heartbeat(timestamp=utcnow(), ttl=job.success_callback_timeout)
                job.execute_success_callback(
                    death_penalty_class=NoOpDeathPenalty,
                    result=rv,
                )

                self.handle_job_success(
                    job=job,
                    queue=queue,
                    started_job_registry=started_registry,
                )

            except Exception:  # pylint: disable=broad-except
                exc_info = sys.exc_info()
                exc_string = "".join(traceback.format_exception(*exc_info))
                self.log.warning("Job %s raised an exception", job.id)
                job.ended_at = utcnow()

                try:
                    job.heartbeat(timestamp=utcnow(), ttl=job.failure_callback_timeout)
                    job.execute_failure_callback(NoOpDeathPenalty, *exc_info)
                except Exception:  # pylint: disable=broad-except
                    exc_info = sys.exc_info()
                    exc_string = "".join(traceback.format_exception(*exc_info))

                self.handle_job_failure(
                    job=job,
                    queue=queue,
                    started_job_registry=started_registry,
                    exc_string=exc_string,
                )
                self.handle_exception(job, *exc_info)

            if job.started_at and job.ended_at:
                elapsed_sec = (job.ended_at - job.started_at).total_seconds()
                if elapsed_sec > self._job_execution_time_threshold_sec:
                    self.log.warning(
                        "Job %s exceeded execution threshold: %.1fs > %ds",
                        job.id,
                        elapsed_sec,
                        self._job_execution_time_threshold_sec,
                    )
        finally:
            pop_connection()

    def execute_job(self, job: Job, queue: Queue) -> None:
        future = self._executor.submit(self._perform_job, job=job, queue=queue)

        with self._lock:
            self._active_futures.append(future)
            self._active_jobs[future] = job
            self.set_state(WorkerStatus.BUSY)

        future.add_done_callback(self._on_future_performed)

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
        self.bootstrap(
            logging_level=logging_level,
            date_format=date_format,
            log_format=log_format,
        )
        self._dequeue_strategy = dequeue_strategy

        if with_scheduler:
            self._start_scheduler(
                burst=burst,
                logging_level=logging_level,
                date_format=date_format,
                log_format=log_format,
            )

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

                    if self._is_threadpool_full:
                        time.sleep(consts.POOL_FULL_POLL_INTERVAL)
                        continue

                    result = self.dequeue_job_and_maintain_ttl(
                        timeout=None if burst else self.dequeue_timeout,
                        max_idle_time=max_idle_time,
                    )
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
                    self.execute_job(job=job, queue=queue)

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

    def handle_warm_shutdown_request(self) -> None:
        self.log.info("Worker %s [PID %d]: warm shut down requested", self.name, self.pid)

    def _shutdown(self) -> None:
        self._stop_requested = True

        self.set_shutdown_requested_date()

        if self.scheduler:
            self.stop_scheduler()

        raise StopRequested()

    def request_force_stop(self, signum: int, frame: Optional[FrameType]) -> None:
        self.log.warning("Cold shut down")
        raise SystemExit()

    def request_stop(self, signum: int, frame: Optional[FrameType]) -> None:
        self.log.debug("Got signal %s", signum)
        self._shutdown_requested_date = utcnow()

        signal.signal(signal.SIGINT, self.request_force_stop)
        signal.signal(signal.SIGTERM, self.request_force_stop)

        self.handle_warm_shutdown_request()
        self._shutdown()

    def _stop_heartbeat(self) -> None:
        self._heartbeat_stop_event.set()

    def teardown(self) -> None:
        if self.scheduler:
            self.stop_scheduler()

        self._stop_heartbeat()

        self._executor.shutdown(wait=False)

        with self._lock:
            in_flight = list(self._active_futures)

        if in_flight:
            _, not_done = wait(in_flight, timeout=self._job_execution_time_threshold_sec)
            if not_done:
                self.log.warning(
                    "Drain timed out after %ds, %d job(s) still running; "
                    "letting K8s SIGKILL them",
                    self._job_execution_time_threshold_sec,
                    len(not_done),
                )

        self.register_death()
