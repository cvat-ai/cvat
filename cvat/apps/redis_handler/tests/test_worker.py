# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import logging
import signal
import threading
import time
import uuid
from concurrent.futures import Future
from typing import Any
from unittest import TestCase
from unittest.mock import MagicMock, patch

import fakeredis
import rq
from rq import Queue, Retry
from rq.job import Job, JobStatus
from rq.registry import FailedJobRegistry, FinishedJobRegistry, StartedJobRegistry
from rq.worker import StopRequested, WorkerStatus

from cvat.apps.redis_handler import worker as worker_module
from cvat.apps.redis_handler.worker import RqThreadPoolWorker, ThreadPoolWorker


def _say_hello(name: str = "World") -> str:
    return f"Hi there, {name}!"


def _div_by_zero(x: int) -> int:
    return x // 0


def _sleep_for(seconds: float) -> None:
    time.sleep(seconds)


def _ambient_connection() -> "fakeredis.FakeRedis":
    # NOTE @sosov: inside a job thread the worker pushes self.connection onto
    # rq._connection_stack, so rq.Queue() with no explicit connection= resolves
    # to it. Under fakeredis that is the same client bound to the shared
    # FakeServer the test holds — no host/port round-trip needed.
    return rq.Queue().connection


def _record_thread_ident_and_wait_for_peers(barrier_key: str, expected: int) -> int:
    conn = _ambient_connection()
    ident = threading.get_ident()
    conn.lpush(barrier_key, str(ident))
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        if conn.llen(barrier_key) >= expected:
            return ident
        time.sleep(0.01)
    raise TimeoutError(f"timed out waiting for {expected} peers at {barrier_key}")


def _block_on_redis_key(release_key: str) -> str:
    conn = _ambient_connection()
    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        if conn.exists(release_key):
            return "released"
        time.sleep(0.05)
    raise TimeoutError(f"timed out waiting for release key {release_key}")


def _implicit_rq_connection_resolves() -> bool:
    # rq.Queue() with no connection= relies on rq._connection_stack (a
    # threading.get_ident-keyed LocalStack). Returning ping() proves the
    # implicit connection both exists in this thread and is a working Redis.
    return bool(rq.Queue().connection.ping())


class _WorkerTestBase(TestCase):
    def setUp(self) -> None:
        _server = fakeredis.FakeServer()
        self.conn = fakeredis.FakeRedis(server=_server)
        self.queue = Queue(f"test_threadpool_{uuid.uuid4().hex[:8]}", connection=self.conn)
        self._created_workers: list[RqThreadPoolWorker] = []

    def tearDown(self) -> None:
        for worker in self._created_workers:
            worker._heartbeat_stop_event.set()
            worker._executor.shutdown(wait=False)

    def _make_worker(self, **overrides: Any) -> RqThreadPoolWorker:
        kwargs: dict[str, Any] = {
            "queues": [self.queue],
            "connection": self.conn,
            "jobs_pool_size": 3,
            "job_execution_time_threshold": 5,
        }
        kwargs.update(overrides)
        worker = RqThreadPoolWorker(**kwargs)
        self._created_workers.append(worker)
        return worker


class TestRqVersionPin(TestCase):
    def test_rq_version_pin(self) -> None:
        expected = "1.16.0"
        if rq.VERSION != expected:
            self.fail(
                f"rq is pinned at {expected} (via django-rq in cvat/requirements) but the "
                f"installed version is {rq.VERSION}.\n"
                "\n"
                "RqThreadPoolWorker depends on rq internals in two places that MUST "
                "be re-validated on every rq bump:\n"
                "\n"
                "  1. cvat/apps/redis_handler/mixins.py — every method is\n"
                "     verbatim-pasted from rq.worker.Worker. Diff each method\n"
                "     against the new upstream Worker and re-apply any changes.\n"
                "\n"
                "  2. cvat/apps/redis_handler/worker.py —\n"
                "     handle_job_failure, get_heartbeat_ttl,\n"
                "     prepare_job_execution, _perform_job, and handle_job_success\n"
                "     are adapted from upstream Worker.perform_job / related\n"
                "     helpers. Diff each against upstream and re-apply documented\n"
                "     divergences.\n"
                "\n"
                "After verifying both, update the expected version in this test."
            )


class TestMultithreadingWorker(_WorkerTestBase):
    def test_get_heartbeat_ttl_uses_monitoring_interval_plus_buffer(self) -> None:
        # NOTE @sosov: threshold deliberately chosen to differ from
        # job_monitoring_interval so the negative assertion below catches a
        # regression to the old `threshold + slack` formula.
        worker = self._make_worker(job_execution_time_threshold=999, job_monitoring_interval=10)

        ttl = worker.get_heartbeat_ttl(MagicMock(spec=Job))

        self.assertEqual(
            ttl, worker.job_monitoring_interval + worker_module._JOB_HEARTBEAT_REFRESH_BUFFER_SEC
        )
        self.assertNotEqual(ttl, 999 + worker_module._JOB_HEARTBEAT_REFRESH_BUFFER_SEC)

    def test_is_threadpool_full_saturates_at_jobs_pool_size_plus_one(self) -> None:
        # jobs_pool_size=3 → executor of 4 (3 jobs + 1 heartbeat slot).
        worker = self._make_worker(jobs_pool_size=3)

        self.assertIs(worker._is_threadpool_full, False)

        worker._active_futures.extend([Future(), Future(), Future()])
        self.assertIs(worker._is_threadpool_full, False)

        worker._active_futures.append(Future())
        self.assertIs(worker._is_threadpool_full, True)

    def test_on_future_performed_sets_idle_when_only_heartbeat_remains(self) -> None:
        worker = self._make_worker(jobs_pool_size=3)
        state_calls: list[str] = []
        worker.set_state = state_calls.append

        heartbeat_future = Future()
        job_future = Future()
        worker._heartbeat_future = heartbeat_future
        worker._active_futures = [heartbeat_future, job_future]

        worker._on_future_performed(job_future)

        self.assertEqual(state_calls, [WorkerStatus.IDLE])
        self.assertEqual(worker._active_futures, [heartbeat_future])

    def test_on_future_performed_does_not_idle_when_other_jobs_running(self) -> None:
        worker = self._make_worker(jobs_pool_size=3)
        state_calls: list[str] = []
        worker.set_state = state_calls.append

        heartbeat_future = Future()
        job_future_a = Future()
        job_future_b = Future()
        worker._heartbeat_future = heartbeat_future
        worker._active_futures = [heartbeat_future, job_future_a, job_future_b]

        worker._on_future_performed(job_future_a)

        self.assertEqual(state_calls, [])
        self.assertEqual(worker._active_futures, [heartbeat_future, job_future_b])

    def test_on_future_performed_handles_missing_future(self) -> None:
        worker = self._make_worker(jobs_pool_size=3)
        worker.set_state = lambda _state: None
        worker._heartbeat_future = Future()
        worker._active_futures = [worker._heartbeat_future]

        # Removing a future that was never tracked must be swallowed and must
        # not corrupt the active-futures list.
        worker._on_future_performed(Future())

        self.assertEqual(worker._active_futures, [worker._heartbeat_future])

    def test_on_future_performed_pops_from_active_jobs(self) -> None:
        worker = self._make_worker(jobs_pool_size=3)
        worker.set_state = lambda _state: None

        heartbeat_future = Future()
        job_future = Future()
        job = MagicMock(spec=Job)
        worker._heartbeat_future = heartbeat_future
        worker._active_futures = [heartbeat_future, job_future]
        worker._active_jobs = {job_future: job}

        worker._on_future_performed(job_future)

        self.assertEqual(worker._active_futures, [heartbeat_future])
        self.assertEqual(worker._active_jobs, {})

    def test_maintain_active_job_heartbeats_is_noop_when_empty(self) -> None:
        worker = self._make_worker()
        # _active_jobs is empty on a fresh worker; the helper must short-circuit
        # at `if not jobs: return` before opening a Redis pipeline.
        with patch.object(
            worker.connection, "pipeline", wraps=worker.connection.pipeline
        ) as pipeline_spy:
            worker._maintain_active_job_heartbeats()

        pipeline_spy.assert_not_called()

    def test_maintain_active_job_heartbeats_extends_registry_ttl(self) -> None:
        worker = self._make_worker(jobs_pool_size=1)
        job = self.queue.enqueue(_say_hello)
        started_registry = StartedJobRegistry(queue=self.queue)
        started_registry.add(job, ttl=worker.get_heartbeat_ttl(job))
        initial_score = self.queue.connection.zscore(started_registry.key, job.id)
        self.assertIsNotNone(initial_score)

        with worker._lock:
            worker._active_jobs[Future()] = job

        # NOTE @sosov: sleep just enough that the new heartbeat timestamp is
        # measurably later than the initial one.
        time.sleep(1.1)

        worker._maintain_active_job_heartbeats()

        new_score = self.queue.connection.zscore(started_registry.key, job.id)
        self.assertIsNotNone(new_score)
        self.assertGreater(
            new_score,
            initial_score,
            f"registry TTL should be extended; was {initial_score}, is {new_score}",
        )

    def test_maintain_active_job_heartbeats_does_not_reanimate_removed_entry(self) -> None:
        # NOTE @sosov: xx=True must prevent recreating a registry entry that
        # _handle_success / _handle_failure already removed in a race.
        worker = self._make_worker(jobs_pool_size=1)
        job = self.queue.enqueue(_say_hello)
        started_registry = StartedJobRegistry(queue=self.queue)
        self.assertIsNone(self.queue.connection.zscore(started_registry.key, job.id))

        with worker._lock:
            worker._active_jobs[Future()] = job

        worker._maintain_active_job_heartbeats()

        self.assertIsNone(self.queue.connection.zscore(started_registry.key, job.id))

    def test_subscribe_is_noop(self) -> None:
        worker = self._make_worker()

        worker.subscribe()

        self.assertIsNone(worker.pubsub_thread)
        worker.unsubscribe()

    def test_request_force_stop_raises_system_exit(self) -> None:
        worker = self._make_worker()

        with self.assertRaises(SystemExit):
            worker.request_force_stop(signal.SIGINT, None)

    def test_request_stop_sets_flag_and_raises_stoprequested(self) -> None:
        worker = self._make_worker()
        worker.set_shutdown_requested_date = lambda: None

        with patch.object(signal, "signal", lambda *_args, **_kwargs: None):
            with self.assertRaises(StopRequested):
                worker.request_stop(signal.SIGTERM, None)

        self.assertIs(worker._stop_requested, True)

    def test_start_heartbeat_adds_one_active_future(self) -> None:
        worker = self._make_worker(jobs_pool_size=1, job_execution_time_threshold=1)

        self.assertEqual(worker._active_futures, [])

        worker._start_heartbeat()
        try:
            self.assertEqual(len(worker._active_futures), 1)
            self.assertIs(worker._active_futures[0], worker._heartbeat_future)
            self.assertIs(worker._heartbeat_future.done(), False)
        finally:
            worker._stop_heartbeat()

    def test_stop_heartbeat_completes_the_heartbeat_future(self) -> None:
        worker = self._make_worker(jobs_pool_size=1, job_execution_time_threshold=1)
        worker._start_heartbeat()

        worker._stop_heartbeat()
        worker._heartbeat_future.result(timeout=5)

        self.assertIs(worker._heartbeat_future.done(), True)

    def test_pool_full_when_jobs_pool_size_plus_one_futures_in_flight(self) -> None:
        worker = self._make_worker(jobs_pool_size=3)
        release = threading.Event()
        # Executor has jobs_pool_size + 1 = 4 slots; saturate all 4.
        futures = [worker._executor.submit(release.wait) for _ in range(4)]

        with worker._lock:
            worker._active_futures.extend(futures)

        try:
            self.assertIs(worker._is_threadpool_full, True)
        finally:
            release.set()
            for future in futures:
                future.result(timeout=5)

    def test_jobs_pool_size_one_runs_one_job_with_heartbeat(self) -> None:
        # NOTE @sosov: jobs_pool_size=1 is the minimum allowed and must work
        # without deadlocking against the heartbeat slot.
        self.queue.enqueue(_say_hello, name="Frank")
        worker = self._make_worker(jobs_pool_size=1)

        worker.work(burst=True)

        self.assertEqual(len(FinishedJobRegistry(queue=self.queue).get_job_ids()), 1)

    def test_concurrent_jobs_run_on_distinct_threads(self) -> None:
        # Enqueue 3 jobs that synchronize on a Redis-backed barrier so all three
        # are guaranteed to be in flight simultaneously; otherwise a fast worker
        # could process them sequentially on the same thread.
        barrier_key = f"test_threadpool_barrier_{uuid.uuid4().hex[:8]}"
        expected = 3

        jobs = [
            self.queue.enqueue(_record_thread_ident_and_wait_for_peers, barrier_key, expected)
            for _ in range(expected)
        ]

        # jobs_pool_size = expected; the heartbeat slot is added internally.
        worker = self._make_worker(jobs_pool_size=expected)
        worker.work(burst=True)

        idents = []
        for job in jobs:
            job.refresh()
            idents.append(job.return_value())

        self.assertEqual(len(set(idents)), expected, f"jobs reused threads: {idents}")

    def test_implicit_rq_connection_is_available_inside_job_thread(self) -> None:
        # NOTE @sosov: rq stores the current Redis connection in
        # rq._connection_stack — a LocalStack keyed by threading.get_ident().
        # Upstream Worker.perform_job pushes self.connection in the forked
        # child; RqThreadPoolWorker must push it in the executor thread so user
        # code calling rq.Queue() without an explicit connection= can resolve.
        job = self.queue.enqueue(_implicit_rq_connection_resolves)
        worker = self._make_worker(jobs_pool_size=1)

        worker.work(burst=True)

        job.refresh()
        self.assertEqual(
            job.get_status(), JobStatus.FINISHED, f"job failed; exc_info=\n{job.exc_info}"
        )
        self.assertIs(job.return_value(), True)

    def test_long_running_job_survives_past_initial_heartbeat_ttl(self) -> None:
        # NOTE @sosov: regression guard for the abandonment race. We shrink the
        # TTL buffer to 1s and set job_monitoring_interval=1 so the initial
        # registry TTL is ~2s; the job is held longer than that via a Redis
        # release key. If the background loop fails to refresh the heartbeat,
        # StartedJobRegistry.cleanup() called after the original TTL would
        # treat the job as abandoned.
        #
        # We drive the worker manually (`_start_heartbeat` + `execute_job`)
        # rather than via `worker.work()` because `work()` installs signal
        # handlers and only runs on the main thread.
        release_key = f"test_threadpool_release_{uuid.uuid4().hex[:8]}"
        job = self.queue.enqueue(_block_on_redis_key, release_key)

        worker = self._make_worker(jobs_pool_size=1, job_monitoring_interval=1)
        started_registry = StartedJobRegistry(queue=self.queue)

        with patch.object(worker_module, "_JOB_HEARTBEAT_REFRESH_BUFFER_SEC", 1):
            worker._start_heartbeat()
            try:
                worker.execute_job(job=job, queue=self.queue)

                deadline = time.monotonic() + 5
                while time.monotonic() < deadline:
                    if self.queue.connection.zscore(started_registry.key, job.id) is not None:
                        break
                    time.sleep(0.05)
                else:
                    self.fail("worker never wrote initial job heartbeat")

                # Sleep past the *initial* TTL so any non-refreshing implementation
                # would have a stale registry score.
                time.sleep(3)

                # Cleanup with a current timestamp must NOT consider the job
                # abandoned because the background loop has been refreshing it.
                started_registry.cleanup(timestamp=time.time())
                self.assertIn(
                    job.id,
                    started_registry.get_job_ids(),
                    "job was treated as abandoned despite its future being active",
                )
            finally:
                self.queue.connection.set(release_key, "1")
                deadline = time.monotonic() + 10
                while time.monotonic() < deadline:
                    with worker._lock:
                        if not worker._active_jobs:
                            break
                    time.sleep(0.05)
                worker._stop_heartbeat()
                self.queue.connection.delete(release_key)

        job.refresh()
        self.assertEqual(job.get_status(), JobStatus.FINISHED)
        self.assertNotIn(job.id, started_registry.get_job_ids())
        self.assertIn(job.id, FinishedJobRegistry(queue=self.queue).get_job_ids())

    def test_teardown_drains_in_flight_within_threshold(self) -> None:
        worker = self._make_worker(jobs_pool_size=1, job_execution_time_threshold=5)
        worker.register_death = lambda: None

        future = worker._executor.submit(time.sleep, 0.3)
        with worker._lock:
            worker._active_futures.append(future)
        future.add_done_callback(worker._on_future_performed)

        start = time.monotonic()
        worker.teardown()
        elapsed = time.monotonic() - start

        self.assertIs(future.done(), True)
        self.assertIsNone(future.exception())
        self.assertLess(elapsed, 3.0)

    def test_teardown_warns_and_returns_when_drain_exceeds_threshold(self) -> None:
        worker = self._make_worker(jobs_pool_size=1, job_execution_time_threshold=1)
        worker.register_death = lambda: None
        release = threading.Event()

        future = worker._executor.submit(release.wait)
        with worker._lock:
            worker._active_futures.append(future)
        future.add_done_callback(worker._on_future_performed)

        try:
            start = time.monotonic()
            with self.assertLogs(level=logging.WARNING) as captured:
                worker.teardown()
            elapsed = time.monotonic() - start

            self.assertLess(elapsed, 3.0)
            self.assertTrue(any("Drain timed out" in line for line in captured.output))
            self.assertIs(future.done(), False)
        finally:
            release.set()
            future.result(timeout=5)


class TestPortedFromRq(_WorkerTestBase):
    def test_create_worker(self) -> None:
        connection = self.conn

        single_str = RqThreadPoolWorker(queues="foo", connection=connection, jobs_pool_size=2)
        self.assertEqual(single_str.queues[0].name, "foo")

        list_of_str = RqThreadPoolWorker(
            queues=["foo", "bar"], connection=connection, jobs_pool_size=2
        )
        self.assertEqual([q.name for q in list_of_str.queues], ["foo", "bar"])
        self.assertEqual(
            list_of_str.queue_keys(), [list_of_str.queues[0].key, list_of_str.queues[1].key]
        )
        self.assertEqual(list_of_str.queue_names(), ["foo", "bar"])

        single_queue = RqThreadPoolWorker(
            queues=Queue("foo", connection=connection), connection=connection, jobs_pool_size=2
        )
        self.assertEqual(single_queue.queues[0].name, "foo")

        list_of_queues = RqThreadPoolWorker(
            queues=[Queue("foo", connection=connection), Queue("bar", connection=connection)],
            connection=connection,
            jobs_pool_size=2,
        )
        self.assertEqual([q.name for q in list_of_queues.queues], ["foo", "bar"])

        for worker in (single_str, list_of_str, single_queue, list_of_queues):
            worker._heartbeat_stop_event.set()
            worker._executor.shutdown(wait=False)

    def test_work_and_quit(self) -> None:
        # NOTE @sosov: upstream calls work(burst=True) twice on the same
        # instance — we can't, ThreadPoolExecutor.shutdown() in teardown() is
        # irreversible.
        self.queue.enqueue(_say_hello, name="Frank")
        worker = self._make_worker()

        worker.work(burst=True)

        self.assertEqual(len(FinishedJobRegistry(queue=self.queue).get_job_ids()), 1)

    def test_work_via_string_argument(self) -> None:
        # NOTE @sosov: upstream asserts `job.worker_name is None` after work —
        # that only holds when the worker forks (the in-test job object never
        # sees the forked process's mutations). In threads the same Python
        # object IS mutated, so worker_name stays set.
        job = self.queue.enqueue(
            "cvat.apps.redis_handler.tests.test_worker._say_hello",
            name="Frank",
        )
        worker = self._make_worker()

        worker.work(burst=True)

        job.refresh()
        self.assertEqual(job.return_value(), "Hi there, Frank!")
        self.assertEqual(job.get_status(), JobStatus.FINISHED)

    def test_work_fails_moves_job_to_failed_registry(self) -> None:
        job = self.queue.enqueue(_div_by_zero, 1)
        enqueued_at = str(job.enqueued_at)
        worker = self._make_worker()

        worker.work(burst=True)

        self.assertEqual(self.queue.count, 0)
        self.assertIn(job, FailedJobRegistry(queue=self.queue))
        job.refresh()
        self.assertEqual(job.origin, self.queue.name)
        self.assertEqual(str(job.enqueued_at), enqueued_at)
        self.assertTrue(job.exc_info)
        self.assertIn("ZeroDivisionError", job.exc_info)

    def test_job_times_are_recorded(self) -> None:
        job = self.queue.enqueue(_say_hello)
        worker = self._make_worker()

        worker.work(burst=True)

        job.refresh()
        self.assertIsNotNone(job.enqueued_at)
        self.assertIsNotNone(job.started_at)
        self.assertIsNotNone(job.ended_at)
        self.assertLessEqual(job.enqueued_at, job.started_at)
        self.assertLessEqual(job.started_at, job.ended_at)

    def test_handle_retry_re_enqueues_until_exhausted(self) -> None:
        job = self.queue.enqueue(_div_by_zero, 1, retry=Retry(max=2))
        registry = FailedJobRegistry(queue=self.queue)
        worker = self._make_worker()

        self.queue.empty()
        worker.handle_job_failure(job, self.queue)
        job.refresh()
        self.assertEqual(job.retries_left, 1)
        self.assertEqual(self.queue.job_ids, [job.id])
        self.assertNotIn(job, registry)

        self.queue.empty()
        worker.handle_job_failure(job, self.queue)
        job.refresh()
        self.assertEqual(job.retries_left, 0)
        self.assertEqual(self.queue.job_ids, [job.id])

        self.queue.empty()
        worker.handle_job_failure(job, self.queue)
        job.refresh()
        self.assertEqual(job.retries_left, 0)
        self.assertEqual(self.queue.job_ids, [])
        self.assertIn(job, registry)

    def test_job_timeout_is_silently_ignored(self) -> None:
        job = self.queue.enqueue(_sleep_for, 0.2, job_timeout=1)
        worker = self._make_worker()

        worker.work(burst=True)

        job.refresh()
        self.assertEqual(job.get_status(), JobStatus.FINISHED)
        self.assertNotIn(job, FailedJobRegistry(queue=self.queue))
        self.assertIn(job, FinishedJobRegistry(queue=self.queue))


class TestThreadPoolWorkerCancellation(_WorkerTestBase):
    def test_register_birth_marks_worker_non_cancellable(self) -> None:
        # The worker can't interrupt a running thread, so it writes the
        # cvat_can_stop_started_jobs="0" marker that RequestViewSet reads to
        # reject started-job cancellation (otherwise cancel returns 200 while
        # the job keeps running).
        worker = ThreadPoolWorker(
            queues=[self.queue],
            connection=self.conn,
            jobs_pool_size=1,
            job_execution_time_threshold=5,
        )
        self._created_workers.append(worker)

        worker.register_birth()

        self.assertEqual(self.conn.hget(worker.key, "cvat_can_stop_started_jobs"), b"0")
