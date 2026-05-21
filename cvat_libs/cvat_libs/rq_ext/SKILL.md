---
name: cvat-threadpool-worker
description: Use whenever modifying, extending, debugging, or reviewing CVAT's ThreadPoolWorker — the thread-pool RQ worker in cvat_libs/rq_ext/. Covers the threads-can't-be-stopped consequences for the --job-execution-time-threshold SLO and k8s graceful shutdown, the --jobs-pool-size knob (job slots only; the heartbeat thread has its own internal +1 slot), periodic active-job heartbeat refresh that keeps long-running jobs from being treated as abandoned, feature parity with rq.worker.Worker (depends_on, retries, callbacks all work; Job.timeout and stop-job are silently no-ops), and the architecture split between RqWorkerPortMixin (verbatim ports from rq.worker.Worker that must be re-synced on rq bumps) and ThreadPoolWorker (thread-specific code plus adapted-from-upstream methods). Trigger whenever someone touches anything under cvat_libs/rq_ext/ or the shadowed rqworker management command in cvat/apps/django_rq_ext/, asks about ThreadPoolWorker, changes jobs-pool-size or job-execution-time-threshold, syncs with a newer rq version, or adds a gevent or async variant — even if they do not say "ThreadPoolWorker" or "rq" explicitly.
---

# cvat_libs.rq_ext — ThreadPoolWorker

A thread-pool RQ worker for IO-bound jobs. One Python process, N threads,
drop-in replacement for `rq.worker.Worker` on queues whose jobs spend
most of their time blocked on remote IO. Used by pointing
`rqworker --worker-class` at
`cvat_libs.rq_ext.worker.ThreadPoolWorker`;
the shadowed `rqworker` command in `cvat.apps.django_rq_ext` adds
`--jobs-pool-size` and `--job-execution-time-threshold` flags.

## The SLO threshold — `--job-execution-time-threshold`

Python threads cannot be stopped. There is no `Thread.kill()`, and a
thread blocked in C-level socket IO cannot be interrupted from outside.
So `--job-execution-time-threshold` (default 60s, available on
`ThreadPoolWorker.__init__` as `job_execution_time_threshold`) is **not
a kill timeout**. It is the worker's declared expectation of how long a
job should take, and it drives three things:

1. **Post-completion warning.** If a job runs longer than the threshold,
   `_perform_job` logs a WARNING after it finishes. Diagnostic signal —
   nothing is killed.
2. **Drain cap on shutdown.** `teardown()` does
   `executor.shutdown(wait=False)` then
   `wait(in_flight, timeout=threshold)`. In-flight jobs get up to
   `threshold` seconds to finish; whatever's still running is left for
   the orchestrator to SIGKILL.
3. **Kubernetes graceful-shutdown contract.**
   `terminationGracePeriodSeconds` MUST be strictly greater than the
   threshold so `register_death` and the final log flush can run before
   SIGKILL. If you change the threshold, change the deploy spec.

Per-job timeout enforcement is the job function's responsibility (for
HTTP-bound work, `requests.post(..., timeout=N)` is the real watchdog).
`Job(..., timeout=N)` is silently ignored — the worker passes
`NoOpDeathPenalty` everywhere RQ would normally enforce a death penalty.

## `--jobs-pool-size` is exactly N concurrent jobs

`--jobs-pool-size N` (constructor kwarg `jobs_pool_size=N`) configures
exactly N concurrent job slots. The heartbeat thread runs as a
`ThreadPoolExecutor` future too, so internally `self.threadpool_size =
jobs_pool_size + 1` and the executor is sized to match — that `+1` is an
implementation detail, not something the operator budgets for.
`_is_threadpool_full` (`len(_active_futures) >= self.threadpool_size`)
counts the heartbeat future correctly, so dequeue back-pressure kicks in
at exactly N jobs in flight. Submitting more would otherwise queue
inside the executor's internal `_work_queue`, hidden from Redis and lost
on crash.

Minimum is `--jobs-pool-size 1`.

## Active jobs keep their `StartedJobRegistry` heartbeat refreshed

`prepare_job_execution` writes one initial heartbeat with TTL
`job_monitoring_interval + 15` (see
`consts.JOB_HEARTBEAT_REFRESH_BUFFER_SEC`). After that, `_heartbeat_loop`
calls
`_maintain_active_job_heartbeats()` every `job_monitoring_interval`
seconds, which snapshots `_active_jobs` under `_lock` and refreshes
each job's score in `StartedJobRegistry` with `xx=True` (so a job that
the success/failure path already removed in a race is not reanimated).

This means `job_execution_time_threshold` is _not_ the abandonment
timer. The abandonment timer is `job_monitoring_interval + 15`,
refreshed continuously — a long-running job whose thread is still alive
will never look abandoned to another worker's `clean_registries` pass.
`job_execution_time_threshold` drives only the post-completion warning
and the shutdown drain cap (see previous section).

## Feature parity with `rq.worker.Worker`

Supported with the same semantics as upstream:
- **`Retry(max=N, interval=...)`** — `handle_job_failure` calls
  `job.retry(queue=queue, pipeline=pipeline)`.
- **`depends_on=`** — `handle_job_success` calls
  `enqueue_dependents(job, pipeline)`; `handle_job_failure` calls
  `enqueue_dependents(job)` when not retrying.
- **`on_success` / `on_failure` callbacks** — `_perform_job` invokes
  them via `execute_success_callback` / `execute_failure_callback`.
- **Recovery from SIGKILL / segfault** — the next worker on the queue
  runs `clean_registries`, which moves abandoned jobs to
  `FailedJobRegistry` or re-enqueues them based on `retries_left`. The
  heartbeat TTL written in `prepare_job_execution`
  (`job_monitoring_interval + 15`) IS the abandonment threshold; once
  the worker dies its `_heartbeat_loop` stops refreshing and the score
  expires within roughly one monitoring interval.

Deliberately not supported:
- **`Job(..., timeout=N)`** — see SLO threshold section.
- **`on_success` / `on_failure` callback timeouts** — callbacks run
  with `NoOpDeathPenalty` for the same reason.
- **`rq.command.send_stop_job_command`** — `subscribe()` is a no-op;
  pubsub commands (`stop-job`, `kill-horse`, `shutdown`) never reach
  the worker. Even if they did, you cannot kill a thread mid-blocking-IO.

If you route a CPU-bound or unbounded-IO job through this worker,
neither RQ nor this code will save you from a runaway thread. Use
vanilla `rq.Worker` for those queues.

## Architecture split

`rq.worker.BaseWorker` is not usable on its own — half its lifecycle
methods reference attributes only defined on `rq.worker.Worker`, and
`Worker` is welded to `os.fork()`. We split along the line _should this
even have been on Worker upstream?_:

```
cvat_libs/rq_ext/
├── consts.py            POOL_FULL_POLL_INTERVAL,
│                        JOB_HEARTBEAT_REFRESH_BUFFER_SEC
├── mixins.py            RqWorkerPortMixin   ← belongs on BaseWorker upstream;
│                                              we paste it here verbatim.
├── utils.py             NoOpDeathPenalty
└── worker.py            ThreadPoolWorker(RqWorkerPortMixin, BaseWorker)
                                              everything thread-specific
                                              + the adapted-from-upstream methods
```

### `RqWorkerPortMixin` — verbatim ports

Every method here is copy-pasted from `rq.worker.Worker @ 1.16.0` without
modification. **Re-sync on every rq version bump** — diff each method
against the new upstream and apply changes. Nothing in this mixin should
diverge from upstream; modifications go in `ThreadPoolWorker`.

### `ThreadPoolWorker` — adapted from upstream `Worker`

The following methods mirror upstream `Worker` with deliberate, documented
differences. On rq bumps, diff against upstream and re-apply each
difference:

- **`handle_job_failure`** — `_stopped_job_id` branch stripped (no
  `stop-job` pubsub in this worker).
- **`get_heartbeat_ttl(job)`** — returns `job_monitoring_interval +
  consts.JOB_HEARTBEAT_REFRESH_BUFFER_SEC` (15s). Sized to outlive one missed
  refresh from `_heartbeat_loop`, not to encode the SLO threshold;
  upstream's `current_job_working_time`-aware formula doesn't apply
  because we have multiple concurrent jobs and no single-slot working
  time to feed into it.
- **`prepare_job_execution`** — skips upstream's `_current_job_id` /
  `current_job_working_time` updates, `procline`, and the extra
  post-pipeline `self.heartbeat` (covered by `_heartbeat_loop`).
- **`_maintain_active_job_heartbeats`** — net new; not in upstream
  because upstream forks one job at a time and refreshes inside the
  monitoring loop on a single `job` reference. Here we snapshot
  `_active_jobs` under `_lock`, then refresh each job's
  `StartedJobRegistry` score with `xx=True` in a single Redis pipeline
  outside the lock.
- **`_perform_job`** — adapted from upstream `perform_job`. Both
  callback sites pass `NoOpDeathPenalty`. The failure-callback
  invocation is wrapped in a nested try/except so a raising callback
  overwrites `exc_info` / `exc_string` before `handle_job_failure` runs.
- **`handle_job_success`** — split out of upstream `perform_job` so it
  is reusable; delegates to `job._handle_success(result_ttl, pipeline)`
  for Redis Streams handling.

## Tests

Tests live at `tests/python/libs/rq_ext/test_threadpool_worker.py`
(a new subtree under the existing pytest e2e tree — they need real Redis,
not the HTTP stack).

The test file is organized as:

- **Section A — Ports from upstream `rq/tests/test_worker.py @ v1.16.0`.**
  Each ported test maps 1:1 to an upstream test, written in /testing
  style. The top of the section lists every deliberately-skipped upstream
  test (work-horse/fork plumbing with no thread analog). Inverted tests
  document our deviations positively (e.g.,
  `test_job_timeout_is_silently_ignored`, `test_max_jobs_is_accepted_and_ignored`).
  Coverage today: ~6 ports + 2 inverts. The remaining ~60 upstream tests
  are catalogued and unported — pick them up incrementally.
- **Section B — Threading-specific.** Net-new tests for behavior rq
  doesn't have: heartbeat-future slot accounting, pool back-pressure,
  drain on teardown (success and timeout), concurrent thread idents.
- **Section C — rq version pin sentinel.** Asserts `rq.VERSION == "1.16.0"`
  with a multi-line failure message instructing the bumper to re-diff the
  mixin and adapted methods.
- **Section D — Pure unit tests.** `_is_threadpool_full`,
  `_on_future_performed`, `get_heartbeat_ttl`, `subscribe()` no-op, signal
  handlers. No I/O.

The fixtures (`queue` with UUID-suffixed name; `threadpool_worker_factory`)
live in `conftest.py` next to the tests. Queue names are UUID-suffixed so
each test is isolated and the running `runworker-pytest` worker cannot
accidentally consume our jobs — no shared between-test Redis cleanup is
needed.

The conftest builds the Redis connection directly from
`CVAT_REDIS_INMEM_HOST` / `CVAT_REDIS_INMEM_PORT` /
`CVAT_REDIS_INMEM_PASSWORD` env vars (defaulting to `localhost:6379`), so
the test process does NOT need Django installed, does NOT call
`django.setup()`, and does NOT load `INSTALLED_APPS`. The only heavy deps
pulled into the pytest process are `rq` and `redis` themselves.

## INSTALLED_APPS ordering

`cvat.apps.django_rq_ext` MUST come **before** `django_rq` in
`INSTALLED_APPS`. Django's `get_commands()` uses
`reversed(get_app_configs())`, so first-in-INSTALLED_APPS wins. If this
app moves after `django_rq`, the shadowed `rqworker` silently resolves
back to `django_rq`'s implementation — no error, no log, just vanilla
behavior. After any settings change in that region, verify with
`python manage.py help rqworker` (look for `--jobs-pool-size` and
`--job-execution-time-threshold` in the output).
