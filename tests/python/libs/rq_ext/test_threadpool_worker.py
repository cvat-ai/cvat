# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


import logging
import signal
import threading
import time
import uuid
from concurrent.futures import Future
from typing import Any, Callable, Generator, Optional
from unittest.mock import MagicMock

import pytest
import redis as redis_lib
import rq
from rq import Queue, Retry
from rq.job import Job, JobStatus
from rq.registry import FailedJobRegistry, FinishedJobRegistry, StartedJobRegistry
from rq.worker import StopRequested, WorkerStatus

from cvat_libs.rq_ext import consts
from cvat_libs.rq_ext.worker import ThreadPoolWorker


def _say_hello(name: str = "World") -> str:
    return f"Hi there, {name}!"


def _div_by_zero(x: int) -> int:
    return x // 0


def _sleep_for(seconds: float) -> None:
    time.sleep(seconds)


def _record_thread_ident_and_wait_for_peers(
    host: str,
    port: int,
    db: int,
    password: str | None,
    barrier_key: str,
    expected: int,
) -> int:
    conn = redis_lib.Redis(host=host, port=port, db=db, password=password)
    ident = threading.get_ident()
    conn.lpush(barrier_key, str(ident))
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        if conn.llen(barrier_key) >= expected:
            return ident
        time.sleep(0.01)
    raise TimeoutError(f"timed out waiting for {expected} peers at {barrier_key}")


def _block_on_redis_key(
    host: str,
    port: int,
    db: int,
    password: str | None,
    release_key: str,
) -> str:
    conn = redis_lib.Redis(host=host, port=port, db=db, password=password)
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


@pytest.fixture
def threadpool_worker_factory(
    queue: Queue,
) -> Generator[Callable[..., ThreadPoolWorker], None, None]:
    created: Optional[ThreadPoolWorker] = None

    def _make(**overrides: Any) -> ThreadPoolWorker:
        nonlocal created
        kwargs: dict[str, Any] = {
            "queues": [queue],
            "connection": queue.connection,
            "jobs_pool_size": 3,
            "job_execution_time_threshold": 5,
        }
        kwargs.update(overrides)
        created = ThreadPoolWorker(**kwargs)
        return created

    yield _make

    if created is not None:
        created._heartbeat_stop_event.set()
        created._executor.shutdown(wait=False)


def test_rq_version_pin():
    expected = "1.16.0"
    if rq.VERSION != expected:
        pytest.fail(
            f"rq is pinned at {expected} in cvat/requirements/base.in but the "
            f"installed version is {rq.VERSION}.\n"
            "\n"
            "ThreadPoolWorker depends on rq internals in two places that MUST "
            "be re-validated on every rq bump (see "
            "cvat_libs/rq_ext/SKILL.md):\n"
            "\n"
            "  1. cvat_libs/rq_ext/mixins.py — every method is\n"
            "     verbatim-pasted from rq.worker.Worker. Diff each method\n"
            "     against the new upstream Worker and re-apply any changes.\n"
            "\n"
            "  2. cvat_libs/rq_ext/worker.py —\n"
            "     handle_job_failure, get_heartbeat_ttl,\n"
            "     prepare_job_execution, _perform_job, and handle_job_success\n"
            "     are adapted from upstream Worker.perform_job / related\n"
            "     helpers. Diff each against upstream and re-apply documented\n"
            "     divergences.\n"
            "\n"
            "After verifying both, update the expected version in this test."
        )


class TestMultithreadingWorker:
    def test_get_heartbeat_ttl_uses_monitoring_interval_plus_buffer(
        self, threadpool_worker_factory
    ):
        # NOTE @sosov: threshold deliberately chosen to differ from
        # job_monitoring_interval so the negative assertion below catches a
        # regression to the old `threshold + slack` formula.
        worker = threadpool_worker_factory(
            job_execution_time_threshold=999, job_monitoring_interval=10
        )

        ttl = worker.get_heartbeat_ttl(MagicMock(spec=Job))

        assert ttl == worker.job_monitoring_interval + consts.JOB_HEARTBEAT_REFRESH_BUFFER_SEC
        assert ttl != 999 + consts.JOB_HEARTBEAT_REFRESH_BUFFER_SEC

    def test_is_threadpool_full_saturates_at_jobs_pool_size_plus_one(
        self, threadpool_worker_factory
    ):
        # jobs_pool_size=3 → executor of 4 (3 jobs + 1 heartbeat slot).
        worker = threadpool_worker_factory(jobs_pool_size=3)

        assert worker._is_threadpool_full is False

        worker._active_futures.extend([Future(), Future(), Future()])
        assert worker._is_threadpool_full is False

        worker._active_futures.append(Future())
        assert worker._is_threadpool_full is True

    def test_on_future_performed_sets_idle_when_only_heartbeat_remains(
        self, threadpool_worker_factory, monkeypatch
    ):
        worker = threadpool_worker_factory(jobs_pool_size=3)
        state_calls: list[str] = []
        monkeypatch.setattr(worker, "set_state", state_calls.append)

        heartbeat_future = Future()
        job_future = Future()
        worker._heartbeat_future = heartbeat_future
        worker._active_futures = [heartbeat_future, job_future]

        worker._on_future_performed(job_future)

        assert state_calls == [WorkerStatus.IDLE]
        assert worker._active_futures == [heartbeat_future]

    def test_on_future_performed_does_not_idle_when_other_jobs_running(
        self, threadpool_worker_factory, monkeypatch
    ):
        worker = threadpool_worker_factory(jobs_pool_size=3)
        state_calls: list[str] = []
        monkeypatch.setattr(worker, "set_state", state_calls.append)

        heartbeat_future = Future()
        job_future_a = Future()
        job_future_b = Future()
        worker._heartbeat_future = heartbeat_future
        worker._active_futures = [heartbeat_future, job_future_a, job_future_b]

        worker._on_future_performed(job_future_a)

        assert state_calls == []
        assert worker._active_futures == [heartbeat_future, job_future_b]

    def test_on_future_performed_handles_missing_future(
        self, threadpool_worker_factory, monkeypatch
    ):
        worker = threadpool_worker_factory(jobs_pool_size=3)
        monkeypatch.setattr(worker, "set_state", lambda _state: None)
        worker._heartbeat_future = Future()
        worker._active_futures = [worker._heartbeat_future]

        worker._on_future_performed(Future())

    def test_on_future_performed_pops_from_active_jobs(
        self, threadpool_worker_factory, monkeypatch
    ):
        worker = threadpool_worker_factory(jobs_pool_size=3)
        monkeypatch.setattr(worker, "set_state", lambda _state: None)

        heartbeat_future = Future()
        job_future = Future()
        job = MagicMock(spec=Job)
        worker._heartbeat_future = heartbeat_future
        worker._active_futures = [heartbeat_future, job_future]
        worker._active_jobs = {job_future: job}

        worker._on_future_performed(job_future)

        assert worker._active_futures == [heartbeat_future]
        assert worker._active_jobs == {}

    def test_maintain_active_job_heartbeats_is_noop_when_empty(self, threadpool_worker_factory):
        worker = threadpool_worker_factory()
        # _active_jobs is empty on a fresh worker; the helper must short-circuit
        # without opening a Redis pipeline. We verify it neither raises nor
        # writes anything by checking the connection's command count is
        # unchanged. (No pipeline opened = no PIPELINE command issued.)
        worker._maintain_active_job_heartbeats()  # smoke: no exception

    def test_maintain_active_job_heartbeats_extends_registry_ttl(
        self, threadpool_worker_factory, queue
    ):
        worker = threadpool_worker_factory(jobs_pool_size=1)
        job = queue.enqueue(_say_hello)
        started_registry = StartedJobRegistry(queue=queue)
        started_registry.add(job, ttl=worker.get_heartbeat_ttl(job))
        initial_score = queue.connection.zscore(started_registry.key, job.id)
        assert initial_score is not None

        with worker._lock:
            worker._active_jobs[Future()] = job

        # NOTE @sosov: sleep just enough that the new heartbeat timestamp is
        # measurably later than the initial one.
        time.sleep(1.1)

        worker._maintain_active_job_heartbeats()

        new_score = queue.connection.zscore(started_registry.key, job.id)
        assert new_score is not None
        assert (
            new_score > initial_score
        ), f"registry TTL should be extended; was {initial_score}, is {new_score}"

    def test_maintain_active_job_heartbeats_does_not_reanimate_removed_entry(
        self, threadpool_worker_factory, queue
    ):
        # NOTE @sosov: xx=True must prevent recreating a registry entry that
        # _handle_success / _handle_failure already removed in a race.
        worker = threadpool_worker_factory(jobs_pool_size=1)
        job = queue.enqueue(_say_hello)
        started_registry = StartedJobRegistry(queue=queue)
        assert queue.connection.zscore(started_registry.key, job.id) is None

        with worker._lock:
            worker._active_jobs[Future()] = job

        worker._maintain_active_job_heartbeats()

        assert queue.connection.zscore(started_registry.key, job.id) is None

    def test_subscribe_is_noop(self, threadpool_worker_factory):
        worker = threadpool_worker_factory()

        worker.subscribe()

        assert worker.pubsub_thread is None
        worker.unsubscribe()

    def test_request_force_stop_raises_system_exit(self, threadpool_worker_factory):
        worker = threadpool_worker_factory()

        with pytest.raises(SystemExit):
            worker.request_force_stop(signal.SIGINT, None)

    def test_request_stop_sets_flag_and_raises_stoprequested(
        self, threadpool_worker_factory, monkeypatch
    ):
        worker = threadpool_worker_factory()
        monkeypatch.setattr(worker, "set_shutdown_requested_date", lambda: None)
        monkeypatch.setattr(signal, "signal", lambda *_args, **_kwargs: None)

        with pytest.raises(StopRequested):
            worker.request_stop(signal.SIGTERM, None)

        assert worker._stop_requested is True

    def test_start_heartbeat_adds_one_active_future(self, threadpool_worker_factory):
        worker = threadpool_worker_factory(jobs_pool_size=1, job_execution_time_threshold=1)

        assert worker._active_futures == []

        worker._start_heartbeat()
        try:
            assert len(worker._active_futures) == 1
            assert worker._active_futures[0] is worker._heartbeat_future
            assert worker._heartbeat_future.done() is False
        finally:
            worker._stop_heartbeat()

    def test_stop_heartbeat_completes_the_heartbeat_future(self, threadpool_worker_factory):
        worker = threadpool_worker_factory(jobs_pool_size=1, job_execution_time_threshold=1)
        worker._start_heartbeat()

        worker._stop_heartbeat()
        worker._heartbeat_future.result(timeout=5)

        assert worker._heartbeat_future.done() is True

    def test_pool_full_when_jobs_pool_size_plus_one_futures_in_flight(
        self, threadpool_worker_factory
    ):
        worker = threadpool_worker_factory(jobs_pool_size=3)
        release = threading.Event()
        # Executor has jobs_pool_size + 1 = 4 slots; saturate all 4.
        futures = [worker._executor.submit(release.wait) for _ in range(4)]

        with worker._lock:
            worker._active_futures.extend(futures)

        try:
            assert worker._is_threadpool_full is True
        finally:
            release.set()
            for future in futures:
                future.result(timeout=5)

    def test_jobs_pool_size_one_runs_one_job_with_heartbeat(self, threadpool_worker_factory, queue):
        # NOTE @sosov: jobs_pool_size=1 is the minimum allowed and must work
        # without deadlocking against the heartbeat slot.
        queue.enqueue(_say_hello, name="Frank")
        worker = threadpool_worker_factory(jobs_pool_size=1)

        worker.work(burst=True)

        assert len(FinishedJobRegistry(queue=queue).get_job_ids()) == 1

    def test_concurrent_jobs_run_on_distinct_threads(self, threadpool_worker_factory, queue):
        # Enqueue 3 jobs that synchronize on a Redis-backed barrier so all three
        # are guaranteed to be in flight simultaneously; otherwise a fast worker
        # could process them sequentially on the same thread.
        cfg = queue.connection.connection_pool.connection_kwargs
        barrier_key = f"test_threadpool_barrier_{uuid.uuid4().hex[:8]}"
        expected = 3

        jobs = [
            queue.enqueue(
                _record_thread_ident_and_wait_for_peers,
                cfg["host"],
                cfg["port"],
                cfg["db"],
                cfg.get("password"),
                barrier_key,
                expected,
            )
            for _ in range(expected)
        ]

        # jobs_pool_size = expected; the heartbeat slot is added internally.
        worker = threadpool_worker_factory(jobs_pool_size=expected)
        worker.work(burst=True)

        idents = []
        for job in jobs:
            job.refresh()
            idents.append(job.return_value())

        assert len(set(idents)) == expected, f"jobs reused threads: {idents}"

    def test_implicit_rq_connection_is_available_inside_job_thread(
        self, threadpool_worker_factory, queue
    ):
        # NOTE @sosov: rq stores the current Redis connection in
        # rq._connection_stack — a LocalStack keyed by threading.get_ident().
        # Upstream Worker.perform_job pushes self.connection in the forked
        # child; ThreadPoolWorker must push it in the executor thread so user
        # code calling rq.Queue() without an explicit connection= can resolve.
        job = queue.enqueue(_implicit_rq_connection_resolves)
        worker = threadpool_worker_factory(jobs_pool_size=1)

        worker.work(burst=True)

        job.refresh()
        assert job.get_status() == JobStatus.FINISHED, f"job failed; exc_info=\n{job.exc_info}"
        assert job.return_value() is True

    def test_long_running_job_survives_past_initial_heartbeat_ttl(
        self, threadpool_worker_factory, queue, monkeypatch
    ):
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
        monkeypatch.setattr(consts, "JOB_HEARTBEAT_REFRESH_BUFFER_SEC", 1)

        cfg = queue.connection.connection_pool.connection_kwargs
        release_key = f"test_threadpool_release_{uuid.uuid4().hex[:8]}"
        job = queue.enqueue(
            _block_on_redis_key,
            cfg["host"],
            cfg["port"],
            cfg["db"],
            cfg.get("password"),
            release_key,
        )

        worker = threadpool_worker_factory(
            jobs_pool_size=1,
            job_monitoring_interval=1,
        )
        started_registry = StartedJobRegistry(queue=queue)

        worker._start_heartbeat()
        try:
            worker.execute_job(job=job, queue=queue)

            deadline = time.monotonic() + 5
            while time.monotonic() < deadline:
                if queue.connection.zscore(started_registry.key, job.id) is not None:
                    break
                time.sleep(0.05)
            else:
                pytest.fail("worker never wrote initial job heartbeat")

            # Sleep past the *initial* TTL so any non-refreshing implementation
            # would have a stale registry score.
            time.sleep(3)

            # Cleanup with a current timestamp must NOT consider the job
            # abandoned because the background loop has been refreshing it.
            started_registry.cleanup(timestamp=time.time())
            assert (
                job.id in started_registry.get_job_ids()
            ), "job was treated as abandoned despite its future being active"
        finally:
            queue.connection.set(release_key, "1")
            deadline = time.monotonic() + 10
            while time.monotonic() < deadline:
                with worker._lock:
                    if not worker._active_jobs:
                        break
                time.sleep(0.05)
            worker._stop_heartbeat()
            queue.connection.delete(release_key)

        job.refresh()
        assert job.get_status() == JobStatus.FINISHED
        assert job.id not in started_registry.get_job_ids()
        assert job.id in FinishedJobRegistry(queue=queue).get_job_ids()

    def test_teardown_drains_in_flight_within_threshold(
        self, threadpool_worker_factory, monkeypatch
    ):
        worker = threadpool_worker_factory(jobs_pool_size=1, job_execution_time_threshold=5)
        monkeypatch.setattr(worker, "register_death", lambda: None)

        future = worker._executor.submit(time.sleep, 0.3)
        with worker._lock:
            worker._active_futures.append(future)
        future.add_done_callback(worker._on_future_performed)

        start = time.monotonic()
        worker.teardown()
        elapsed = time.monotonic() - start

        assert future.done() is True
        assert future.exception() is None
        assert elapsed < 3.0

    def test_teardown_warns_and_returns_when_drain_exceeds_threshold(
        self, threadpool_worker_factory, monkeypatch, caplog
    ):
        worker = threadpool_worker_factory(jobs_pool_size=1, job_execution_time_threshold=1)
        monkeypatch.setattr(worker, "register_death", lambda: None)
        release = threading.Event()

        future = worker._executor.submit(release.wait)
        with worker._lock:
            worker._active_futures.append(future)
        future.add_done_callback(worker._on_future_performed)

        try:
            start = time.monotonic()
            with caplog.at_level(logging.WARNING):
                worker.teardown()
            elapsed = time.monotonic() - start

            assert elapsed < 3.0
            assert any("Drain timed out" in record.message for record in caplog.records)
            assert future.done() is False
        finally:
            release.set()
            future.result(timeout=5)


class TestPortedFromRq:
    def test_create_worker(self, queue):
        connection = queue.connection

        single_str = ThreadPoolWorker(queues="foo", connection=connection, jobs_pool_size=2)
        assert single_str.queues[0].name == "foo"

        list_of_str = ThreadPoolWorker(
            queues=["foo", "bar"], connection=connection, jobs_pool_size=2
        )
        assert [q.name for q in list_of_str.queues] == ["foo", "bar"]
        assert list_of_str.queue_keys() == [list_of_str.queues[0].key, list_of_str.queues[1].key]
        assert list_of_str.queue_names() == ["foo", "bar"]

        single_queue = ThreadPoolWorker(
            queues=Queue("foo", connection=connection), connection=connection, jobs_pool_size=2
        )
        assert single_queue.queues[0].name == "foo"

        list_of_queues = ThreadPoolWorker(
            queues=[Queue("foo", connection=connection), Queue("bar", connection=connection)],
            connection=connection,
            jobs_pool_size=2,
        )
        assert [q.name for q in list_of_queues.queues] == ["foo", "bar"]

        for worker in (single_str, list_of_str, single_queue, list_of_queues):
            worker._heartbeat_stop_event.set()
            worker._executor.shutdown(wait=False)

    def test_work_and_quit(self, threadpool_worker_factory, queue):
        # NOTE @sosov: upstream calls work(burst=True) twice on the same
        # instance — we can't, ThreadPoolExecutor.shutdown() in teardown() is
        # irreversible.
        queue.enqueue(_say_hello, name="Frank")
        worker = threadpool_worker_factory()

        worker.work(burst=True)

        assert len(FinishedJobRegistry(queue=queue).get_job_ids()) == 1

    def test_work_via_string_argument(self, threadpool_worker_factory, queue):
        # NOTE @sosov: upstream asserts `job.worker_name is None` after work —
        # that only holds when the worker forks (the in-test job object never
        # sees the forked process's mutations). In threads the same Python
        # object IS mutated, so worker_name stays set.
        job = queue.enqueue(
            "libs.rq_ext.test_threadpool_worker._say_hello",
            name="Frank",
        )
        worker = threadpool_worker_factory()

        worker.work(burst=True)

        job.refresh()
        assert job.return_value() == "Hi there, Frank!"
        assert job.get_status() == JobStatus.FINISHED

    def test_work_fails_moves_job_to_failed_registry(self, threadpool_worker_factory, queue):
        job = queue.enqueue(_div_by_zero, 1)
        enqueued_at = str(job.enqueued_at)
        worker = threadpool_worker_factory()

        worker.work(burst=True)

        assert queue.count == 0
        assert job in FailedJobRegistry(queue=queue)
        job.refresh()
        assert job.origin == queue.name
        assert str(job.enqueued_at) == enqueued_at
        assert job.exc_info
        assert "ZeroDivisionError" in job.exc_info

    def test_job_times_are_recorded(self, threadpool_worker_factory, queue):
        job = queue.enqueue(_say_hello)
        worker = threadpool_worker_factory()

        worker.work(burst=True)

        job.refresh()
        assert job.enqueued_at is not None
        assert job.started_at is not None
        assert job.ended_at is not None
        assert job.enqueued_at <= job.started_at <= job.ended_at

    def test_handle_retry_re_enqueues_until_exhausted(self, threadpool_worker_factory, queue):
        job = queue.enqueue(_div_by_zero, 1, retry=Retry(max=2))
        registry = FailedJobRegistry(queue=queue)
        worker = threadpool_worker_factory()

        queue.empty()
        worker.handle_job_failure(job, queue)
        job.refresh()
        assert job.retries_left == 1
        assert queue.job_ids == [job.id]
        assert job not in registry

        queue.empty()
        worker.handle_job_failure(job, queue)
        job.refresh()
        assert job.retries_left == 0
        assert queue.job_ids == [job.id]

        queue.empty()
        worker.handle_job_failure(job, queue)
        job.refresh()
        assert job.retries_left == 0
        assert queue.job_ids == []
        assert job in registry

    def test_job_timeout_is_silently_ignored(self, threadpool_worker_factory, queue):
        job = queue.enqueue(_sleep_for, 0.2, job_timeout=1)
        worker = threadpool_worker_factory()

        worker.work(burst=True)

        job.refresh()
        assert job.get_status() == JobStatus.FINISHED
        assert job not in FailedJobRegistry(queue=queue)
        assert job in FinishedJobRegistry(queue=queue)
