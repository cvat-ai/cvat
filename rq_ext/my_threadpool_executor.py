# NOTE @sosov: Phase 1 minimal thread-pool RQ worker for the `webhooks` queue.
# See `documentation.md` alongside this file for the full roadmap, the
# deliberate Phase 1 omissions (no remote-stop, no depends_on, no callbacks,
# no per-job heartbeat refresh, no observability, placeholder shutdown), and
# which methods are copy-pasted from rq 1.16.0 and need to be re-synced on
# rq version bumps.

import os
import signal
import sys
import threading
import time
import traceback
from concurrent.futures import Future, ThreadPoolExecutor, wait
from contextlib import suppress
from typing import Optional, final

import redis.exceptions
from rq import worker_registration
from rq.defaults import DEFAULT_LOGGING_DATE_FORMAT, DEFAULT_LOGGING_FORMAT
from rq.job import Job, JobStatus
from rq.queue import Queue
from rq.registry import StartedJobRegistry
from rq.utils import utcformat, utcnow
from rq.worker import BaseWorker, DequeueStrategy, StopRequested

_DEFAULT_POOL_SIZE = 8
_POOL_FULL_POLL_INTERVAL = 0.1


class ThreadPoolWorker(BaseWorker):
    # NOTE @sosov: No death-penalty wrapper. The inherited BaseWorker default is
    # UnixSignalDeathPenalty which uses SIGALRM; signal.signal() is restricted
    # to the main thread, so it would ValueError in a worker thread. The
    # threading alternative (TimerDeathPenalty via PyThreadState_SetAsyncExc)
    # cannot interrupt a thread blocked in C-level socket IO either, which is
    # exactly the case we care about. Job timeout enforcement is therefore the
    # job function's responsibility — for webhooks, `requests.post(timeout=10)`
    # in cvat.apps.webhooks.utils.perform_webhook_request.

    def __init__(
        self,
        *args,
        pool_size: int = _DEFAULT_POOL_SIZE,
        # NOTE @sosov: soft per-job SLO, also reused as the shutdown drain
        # timeout in teardown(). Must be co-configured with the K8s manifest:
        # terminationGracePeriodSeconds must be strictly greater (currently 70s
        # in worker.yaml, leaving ~10s for register_death + final log flush
        # before SIGKILL).
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
        self._active_jobs: list[Future] = []
        self._active_jobs_lock = threading.Lock()

        self._heartbeat_thread: Optional[threading.Thread] = None
        self._heartbeat_stop_event = threading.Event()

    # ------------------------------------------------------------------
    # Work loop. `work` is adapted from rq.worker.BaseWorker.work
    # @ 1.16.0 (worker.py:372-460). Re-sync on rq bumps.
    #
    # Diff from upstream:
    #   1. Pool-full gate inserted before `dequeue_job_and_maintain_ttl`,
    #      so we never dequeue more jobs than the pool can run. Without it,
    #      ThreadPoolExecutor parks overflow in its internal `_work_queue`,
    #      hiding those jobs from Redis (no entry in `started_job_registry`,
    #      not on the queue) and losing them on crash.
    #   2. `completed_jobs` counter and the `max_jobs` parameter are dropped
    #      — unused by CVAT (the `webhooks` worker is invoked with neither).
    #   3. Inline `self.heartbeat()` after `execute_job` is dropped: with
    #      threads in flight we want a steady heartbeat cadence regardless
    #      of dequeue timing. Replaced by `_heartbeat_loop` started below.
    # ------------------------------------------------------------------

    def work(
        self,
        burst: bool = False,
        logging_level: str = "INFO",
        date_format: str = DEFAULT_LOGGING_DATE_FORMAT,
        log_format: str = DEFAULT_LOGGING_FORMAT,
        max_idle_time: Optional[int] = None,
        with_scheduler: bool = False,
        dequeue_strategy: DequeueStrategy = DequeueStrategy.DEFAULT,
        # NOTE @sosov: accepted-and-ignored. django_rq's rqworker command always
        # passes max_jobs=options['max_jobs']; we can't bound a worker's lifetime
        # by completed-job count because completions happen off the main thread.
        # Keep the kwarg so the command line stays uniform with stock workers.
        max_jobs: Optional[int] = None,
    ) -> None:
        self.bootstrap(logging_level, date_format, log_format)
        self._dequeue_strategy = dequeue_strategy
        if with_scheduler:
            self._start_scheduler(burst, logging_level, date_format, log_format)

        self._install_signal_handlers()
        self._start_heartbeat_thread()
        try:
            while True:
                try:
                    if self._stop_requested:
                        self.log.info("Worker %s: stopping on request", self.key)
                        break

                    self.check_for_suspension(burst)

                    if self.should_run_maintenance_tasks:
                        self.run_maintenance_tasks()

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
                    # Cold shutdown detected
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

    @final
    @property
    def _is_pool_full(self) -> bool:
        with self._active_jobs_lock:
            return len(self._active_jobs) >= self.threadpool_size

    @final
    def _start_heartbeat_thread(self) -> None:
        self._heartbeat_stop_event.clear()
        self._heartbeat_thread = threading.Thread(
            target=self._heartbeat_loop,
            name="rq_threadpool_heartbeat",
            daemon=True,
        )
        self._heartbeat_thread.start()

    @final
    def _stop_heartbeat_thread(self) -> None:
        self._heartbeat_stop_event.set()
        if self._heartbeat_thread is not None:
            self._heartbeat_thread.join(timeout=1.0)
            self._heartbeat_thread = None

    @final
    def _heartbeat_loop(self) -> None:
        # NOTE @sosov: runs in a daemon thread. `self.heartbeat()` may also be
        # called concurrently from `dequeue_job_and_maintain_ttl` in the main
        # thread — that is fine, it's a single Redis EXPIRE on the worker key.
        while not self._heartbeat_stop_event.is_set():
            try:
                self.heartbeat()
            except Exception:
                self.log.warning("Background heartbeat failed", exc_info=True)

            self._heartbeat_stop_event.wait(timeout=self.job_monitoring_interval)

    @final
    def register_birth(self) -> None:
        self.log.debug("Registering birth of worker %s", self.name)
        if self.connection.exists(self.key) and not self.connection.hexists(self.key, "death"):
            raise ValueError(f"There exists an active worker named {self.name!r} already")

        with self.connection.pipeline() as p:
            p.delete(self.key)
            now = utcnow()
            now_in_string = utcformat(now)
            self.birth_date = now

            mapping = {
                "birth": now_in_string,
                "last_heartbeat": now_in_string,
                "queues": ",".join(self.queue_names()),
                "pid": self.pid,
                "hostname": self.hostname,
                "ip_address": self.ip_address,
                "version": self.version,
                "python_version": self.python_version,
            }
            if self.get_redis_server_version() >= (4, 0, 0):
                p.hset(self.key, mapping=mapping)
            else:
                p.hmset(self.key, mapping)
            worker_registration.register(self, p)
            p.expire(self.key, self.worker_ttl + 60)
            p.execute()

    @final
    def register_death(self) -> None:
        self.log.debug("Registering death")
        with self.connection.pipeline() as p:
            worker_registration.unregister(self, p)
            p.hset(self.key, "death", utcformat(utcnow()))
            p.expire(self.key, 60)
            p.execute()

    def teardown(self) -> None:
        # Called by `work()` in its finally: block.
        #
        # Ordering matters:
        #   1. Stop the scheduler (no new periodic enqueues).
        #   2. shutdown(wait=False) closes the executor to new submissions but
        #      lets in-flight threads finish.
        #   3. wait(..., timeout=self._task_execution_time_threshold_sec) drains
        #      with a cap. Heartbeat thread is still alive here, so RQ does
        #      not declare us dead and re-enqueue our in-flight jobs.
        #   4. Stop the heartbeat thread, then register_death + unsubscribe.
        #      K8s terminationGracePeriodSeconds must exceed the drain timeout
        #      by enough margin (~10s) for these last steps to finish before
        #      SIGKILL.
        if self.scheduler:
            self.stop_scheduler()

        self.executor.shutdown(wait=False)

        with self._active_jobs_lock:
            in_flight = list(self._active_jobs)

        if in_flight:
            _, not_done = wait(in_flight, timeout=self._task_execution_time_threshold_sec)
            if not_done:
                self.log.warning(
                    "Drain timed out after %ds, %d job(s) still running; "
                    "letting K8s SIGKILL them",
                    self._task_execution_time_threshold_sec,
                    len(not_done),
                )

        self._stop_heartbeat_thread()
        self.register_death()
        self.unsubscribe()

    @final
    def stop_scheduler(self) -> None:
        # NOTE @sosov: copy-paste of rq.worker.Worker.stop_scheduler @ 1.16.0
        # (worker.py:1052). Not on BaseWorker. Re-sync on rq bumps.
        if self.scheduler._process and self.scheduler._process.pid:
            try:
                os.kill(self.scheduler._process.pid, signal.SIGTERM)
            except OSError:
                pass
            self.scheduler._process.join()

    def request_stop(self, signum, frame) -> None:
        # NOTE @sosov: required override. SIGINT/SIGTERM are wired in
        # BaseWorker._install_signal_handlers() to self.request_stop, but
        # request_stop itself lives on rq.worker.Worker (not BaseWorker), so
        # without this method signal-handler install would AttributeError.
        # We can't stop a running thread, so this is just a flag flip — the
        # actual drain happens in teardown().
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

        with self._active_jobs_lock:
            self._active_jobs.append(future)

        future.add_done_callback(self._on_job_performed)

    def _on_job_performed(self, future: Future) -> None:
        with self._active_jobs_lock:
            try:
                self._active_jobs.remove(future)
            except ValueError:
                # NOTE @sosov: defensive — the future was appended above, so
                # this shouldn't fire, but a duplicate callback would be silently
                # tolerated rather than crashing the executor thread.
                pass

    def _perform_job(self, job: Job, queue: Queue) -> None:
        # NOTE @sosov: runs in an executor thread. Minimal:
        #   - mark job started + add to started_job_registry. job.heartbeat()
        #     does both atomically (see rq/job.py:710-723).
        #   - run job.perform() under the death penalty.
        #   - on success: move to finished_job_registry.
        #   - on failure: delegate to self.handle_job_failure (a copy-paste of
        #     BaseWorker.handle_job_failure) — preserves RQ Retry() semantics
        #     via job.retry(queue, pipeline).
        #
        # TODO @sosov [Phase 4]: depends_on (queue.enqueue_dependents),
        #   on_success / on_failure callbacks.
        # TODO @sosov [Phase 3]: per-job heartbeat refresh. Webhook jobs finish
        #   in <10s and the initial heartbeat_ttl below is ~90s, so safe today.
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
        except Exception:
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

    # ------------------------------------------------------------------
    # Failure path. Adapted from rq.worker.BaseWorker.handle_job_failure
    # @ 1.16.0 (worker.py:462-516). Re-sync on rq bumps.
    #
    # Diffs from upstream:
    #   1. The `_stopped_job_id == job.id` branch is removed — see
    #      documentation.md §1; we can't kill threads, so remote-stop never
    #      fires for this worker and the branch is dead code.
    #   2. The set_current_job_id / increment_failed_job_count /
    #      increment_total_working_time calls are removed. They track
    #      per-worker state that only makes sense for a single-job worker;
    #      with N concurrent jobs the counters would race and the
    #      "current job id" key is meaningless. Observability is a separate
    #      Phase 3 concern (see TODO.md).
    # ------------------------------------------------------------------

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
                # Ensure that custom exception handlers are called
                # even if Redis is down
                pass
