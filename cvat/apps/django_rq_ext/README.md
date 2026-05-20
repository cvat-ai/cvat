# `rq_ext.ThreadPoolWorker` — Phase 1

A minimal thread-pool RQ worker for **IO-bound** jobs, built specifically for
CVAT's `webhooks` queue. The job is `send_webhook(...)`, which is essentially
`requests.post(target_url, ..., timeout=10)` plus an HMAC and a `WebhookDelivery`
row write — all blocked on a remote HTTP call. Classic case where one
fork-per-job worker wastes most of its time waiting and Python threading is
genuinely the right tool.

This document records what is **deliberately missing from Phase 1**, **why**,
and **when we plan to address it**. Pair with `my_threadpool_executor.py`.

---

## Roadmap

| Phase | Scope |
|-------|-------|
| **1 (current)** | Run jobs in a thread pool. Success → `finished_job_registry`. Failure → `failed_job_registry` (via copied `handle_job_failure`). RQ retries (`Retry(max=…)`) work because we go through `handle_job_failure` → `job.retry()`. |
| **2** | Pool-full back-pressure. Override `work()` to gate `dequeue_job_and_maintain_ttl` on `is_pool_full`, so jobs stay in Redis until we have a thread for them. |
| **3** | Proper shutdown semantics (warm vs cold), per-job heartbeat refresh thread, K8s liveness file. |
| **4** | Observability: `WorkerStatus`, `current_job_id` tracking via `_current_jobs`, real counters under a lock, `procline`. |

---

## Why `BaseWorker`, not `Worker`

`rq.Worker` is welded around `os.fork()`: it carries `fork_work_horse`,
`monitor_work_horse`, `kill_horse`, `wait_for_horse`, `main_work_horse`,
`setup_work_horse_signals`, and a `_shutdown` that branches on worker state
written by those fork paths. None of it applies in a thread model.

The split between `BaseWorker` and `Worker` in rq 1.16.0 is partial — most
of the job-execution machinery (`perform_job`, `prepare_job_execution`,
`handle_job_success`, `register_birth`, `teardown`) is still on `Worker`.
We cherry-pick what we need by copy-pasting from `Worker` rather than
inheriting from it.

---

## Known limitations

### 1. No remote-stop (`send_stop_job_command`)

In normal `Worker`, an admin can call
`rq.command.send_stop_job_command(connection, job_id)`. This publishes a
Redis pub/sub message; the worker's pub/sub thread (started by
`BaseWorker.subscribe` during `bootstrap`) receives it, sets
`worker._stopped_job_id = job_id` and calls `kill_horse()` to SIGKILL the
workhorse. The killed horse trips `handle_job_failure`, which sees
`_stopped_job_id == job.id` and marks the job `STOPPED` (not `FAILED`,
no retry).

**Why we can't support it.** You cannot cleanly kill a Python thread.
There is no `Thread.kill()`. The CPython internals trick (`ctypes` →
`PyThreadState_SetAsyncExc`) only takes effect at bytecode boundaries
and cannot interrupt a thread blocked in C-level socket IO — i.e. the
exact case we care about (`requests.post(...)`).

**What happens if you call `send_stop_job_command` against this worker.**
The pub/sub thread will receive the message and set `_stopped_job_id`,
but the executor thread will run to completion (or until
`requests.timeout=10` fires). By the time `handle_job_failure` runs, the
job either succeeded or failed naturally. Our `handle_job_failure` has
the `_stopped_job_id == job.id` branch **stripped** (vs upstream
`BaseWorker.handle_job_failure`) because it is dead code in this worker.
If you re-sync the method from a future `rq` version, drop those lines
again.

### 2. No `depends_on` (dependent jobs) — Phase 4

`Worker.handle_job_success` calls `queue.enqueue_dependents(job)`. Our
`_perform_job` does not. Any job enqueued with `depends_on=…` will have
its dependents sit in `DeferredJobRegistry` forever.

**Current consumers.** `cvat.apps.webhooks.dispatch.add_to_queue` does not
use `depends_on`, and no other code routes through this worker. Adding
support is a single `queue.enqueue_dependents(job, pipeline=pipeline)`
call. Held back so "Phase 1 is the smallest possible footprint" stays
literally true.

### 3. No `on_success` / `on_failure` job callbacks — Phase 4

`Worker.perform_job` runs `job.execute_success_callback(...)` and
`job.execute_failure_callback(...)` under their own death penalty.
`_perform_job` doesn't. No CVAT enqueue site currently passes these
callbacks; if one is added, this becomes a real gap.

### 4. No per-job heartbeat refresh — Phase 3

`StartedJobRegistry.cleanup` declares a job "abandoned" if its
`last_heartbeat` is older than `heartbeat_ttl` and moves it to
`FailedJobRegistry`. In normal `Worker`, `monitor_work_horse` refreshes
the per-job heartbeat every `job_monitoring_interval` (default 30 s)
while the horse runs.

We set the initial job heartbeat TTL to `job_monitoring_interval + 60`
(default 90 s) at job start and don't refresh it after that. Webhook
jobs complete in ≤ 10 s (`cvat.apps.webhooks.utils._WEBHOOK_TIMEOUT`),
so they always finish well within 90 s and `cleanup` never sees them as
stale.

**This is safe for the webhook use case only.** Pointing this worker at
any queue with jobs that can run longer than ~90 s will cause those
jobs to be moved to `FailedJobRegistry` by the maintenance sweeper
while they're still running. Phase 3 will add a background heartbeat
thread that iterates `_current_jobs`.

### 5. No observability — Phase 4

Skipped on purpose, to keep Phase 1 small. These are absent or no-op'd:

- **`WorkerStatus` (`set_state` / `get_state`)** — we never write
  `BUSY`/`IDLE`. `rq info` will show our worker as whatever it
  defaults to (typically `started` from `BaseWorker.__init__:181`).
  Nothing in our runtime path reads worker state.
- **`set_current_job_id` / `get_current_job_id`** — no-op stub. A pool
  worker has 0..N concurrent jobs and the single-field
  `current_job_id` on the Worker doesn't model that. Phase 4 will
  expose all in-flight jobs via `_current_jobs: list[tuple[Job, Future]]`.
- **`increment_successful_job_count` / `increment_failed_job_count` /
  `increment_total_working_time`** — no-op stubs so the copied
  `handle_job_failure` keeps working. `rq info` will show
  `0 successful / 0 failed / 0 time-spent`. Phase 4 will wire real
  increments under a `threading.Lock`.
- **`procline`** — not called.

### 6. Phase 1 shutdown is a placeholder — Phase 3

`request_stop` just sets `self._stop_requested = True` and records
`_shutdown_requested_date`. On the next iteration of `BaseWorker.work()`,
the loop breaks and `teardown()` runs. `teardown()` calls
`executor.shutdown(wait=True)`, so in-flight jobs *do* get to finish —
**but only if the SIGTERM grace period is long enough.** On k8s the
default `terminationGracePeriodSeconds` is 30 s; webhooks at 10 s
timeout fit, but anything slower will get SIGKILL'd mid-flight.

Cold-shutdown semantics are degenerate: `request_force_stop` raises
`SystemExit()` immediately, with no "ignore duplicate signal within 1 s"
de-bounce that `Worker.request_force_stop` has.

### 7. No pool-full back-pressure — Phase 2

Today `work()` is `BaseWorker.work()` unmodified: it dequeues as fast as
Redis serves and submits to `self.executor`. `ThreadPoolExecutor` queues
overflow work in its internal `_work_queue` if all `pool_size` threads
are busy. **Those queued jobs are now in process memory, invisible to
Redis (not in `started_job_registry`, not in the queue list), and will
be lost if the process crashes.**

Phase 2 will copy `BaseWorker.work()` into our class and insert a
`while self.is_pool_full and not self._stop_requested: time.sleep(...)`
gate before `dequeue_job_and_maintain_ttl`, so jobs stay in Redis until
we have a thread for them.

---

## No death penalty

Neither of RQ's built-in death-penalty classes works in a thread model:

- **`UnixSignalDeathPenalty`** (BaseWorker default) uses
  `signal.signal(SIGALRM, …) + signal.alarm(timeout)`. Python only allows
  `signal.signal` to be called from the **main thread**; calling it from
  a worker thread raises `ValueError`. Inheriting this would crash on
  the first job.
- **`TimerDeathPenalty`** raises a `JobTimeoutException` in the target
  thread via `ctypes.pythonapi.PyThreadState_SetAsyncExc`. That only
  fires at Python **bytecode boundaries** and cannot interrupt a thread
  blocked in a C-level socket read — which is exactly the case we care
  about (`requests.post(…)`).

`_perform_job` therefore runs `job.perform()` directly with **no death
penalty wrapper**. Job timeout enforcement is the job function's own
responsibility. For webhooks, that responsibility is fulfilled by
`requests.post(..., timeout=10)` inside
`cvat.apps.webhooks.utils.perform_webhook_request`.

**Implication.** If `requests.timeout` is ever removed from
`perform_webhook_request`, jobs can hang indefinitely and no RQ-level
safeguard will save us. Any future non-webhook job routed through this
worker must enforce its own timeout, or run the risk of starving the
pool.

---

## Maintenance: keeping in sync with `rq`

The following methods are **copy-pasted from `rq.worker` @ 1.16.0**:

- `register_birth` — from `Worker.register_birth` (`worker.py:792`).
  Verbatim.
- `register_death` — from `Worker.register_death` (`worker.py:826`).
  Verbatim.
- `stop_scheduler` — from `Worker.stop_scheduler` (`worker.py:1052`).
  Verbatim.
- `handle_job_failure` — adapted from `BaseWorker.handle_job_failure`
  (`worker.py:462`). **Diff from upstream:** the
  `_stopped_job_id == job.id` branch is removed (see §1 above).

When CVAT bumps `rq`, diff these against upstream and re-sync any
non-trivial behavioral change. The diff target is
`site-packages/rq/worker.py`.
