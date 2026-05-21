---
name: cvat-threadpool-worker
description: Use whenever modifying, extending, debugging, or reviewing CVAT's ThreadPoolWorker — the thread-pool RQ worker in cvat/apps/django_rq_ext/. Covers the threads-can't-be-stopped consequences for the --task-execution-time-threshold SLO and k8s graceful shutdown, the pool-size-minus-one effective concurrency (one slot is the worker's own heartbeat), feature parity with rq.worker.Worker (depends_on, retries, callbacks all work; Job.timeout and stop-job are silently no-ops), and the architecture split between RqWorkerPortMixin (verbatim ports from rq.worker.Worker that must be re-synced on rq bumps) and ThreadPoolWorker (thread-specific code plus adapted-from-upstream methods). Trigger whenever someone touches anything under cvat/apps/django_rq_ext/, asks about ThreadPoolWorker, changes pool size or task-execution-time-threshold, syncs with a newer rq version, adds a gevent or async variant, or works on the shadowed rqworker management command — even if they do not say "ThreadPoolWorker" or "rq" explicitly.
---

# cvat.apps.django_rq_ext — ThreadPoolWorker

A thread-pool RQ worker for IO-bound jobs. One Python process, N threads,
drop-in replacement for `rq.worker.Worker` on queues whose jobs spend
most of their time blocked on remote IO. Used by pointing
`rqworker --worker-class` at
`cvat.apps.django_rq_ext.worker.multithreading.worker.ThreadPoolWorker`;
the shadowed `rqworker` command in this app adds `--pool-size` and
`--task-execution-time-threshold` flags.

## The SLO threshold — `--task-execution-time-threshold`

Python threads cannot be stopped. There is no `Thread.kill()`, and a
thread blocked in C-level socket IO cannot be interrupted from outside.
So `--task-execution-time-threshold` (default 60s, available on
`ThreadPoolWorker.__init__` as `task_execution_time_threshold`) is **not
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

## Effective concurrency is `pool_size - 1`

The worker's own heartbeat (`heartbeat()` in `_heartbeat_loop`) runs as
a `ThreadPoolExecutor` future, occupying one slot in the pool. With
`--pool-size 4` you have 3 concurrent job slots.
`_is_threadpool_full` (`len(_active_futures) >= pool_size`) counts the
heartbeat future correctly, so dequeue back-pressure kicks in at
`pool_size - 1` jobs — submitting more would otherwise queue inside the
executor's internal `_work_queue`, hidden from Redis and lost on crash.

When sizing the pool: budget `pool_size = N_job_slots + 1`.

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
  (`task_execution_time_threshold + slack`) IS the abandonment
  threshold.

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
`Worker` is welded to `os.fork()`. We split along the line *should this
even have been on Worker upstream?*:

```
worker/
├── mixins.py            RqWorkerPortMixin   ← belongs on BaseWorker upstream;
│                                              we paste it here verbatim.
├── utils.py             NoOpDeathPenalty
└── multithreading/
    └── worker.py        ThreadPoolWorker(RqWorkerPortMixin, BaseWorker)
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
- **`get_heartbeat_ttl(job)`** — uses
  `task_execution_time_threshold + slack` instead of upstream's
  `current_job_working_time`-aware formula (we don't track single-slot
  working time in a pool).
- **`prepare_job_execution`** — skips upstream's `_current_job_id` /
  `current_job_working_time` updates, `procline`, and the extra
  post-pipeline `self.heartbeat` (covered by `_heartbeat_loop`).
- **`_perform_job`** — adapted from upstream `perform_job`. Both
  callback sites pass `NoOpDeathPenalty`. The failure-callback
  invocation is wrapped in a nested try/except so a raising callback
  overwrites `exc_info` / `exc_string` before `handle_job_failure` runs.
- **`handle_job_success`** — split out of upstream `perform_job` so it
  is reusable; delegates to `job._handle_success(result_ttl, pipeline)`
  for Redis Streams handling.

## INSTALLED_APPS ordering

`cvat.apps.django_rq_ext` MUST come **before** `django_rq` in
`INSTALLED_APPS`. Django's `get_commands()` uses
`reversed(get_app_configs())`, so first-in-INSTALLED_APPS wins. If this
app moves after `django_rq`, the shadowed `rqworker` silently resolves
back to `django_rq`'s implementation — no error, no log, just vanilla
behavior. After any settings change in that region, verify with
`python manage.py help rqworker` (look for `--pool-size` and
`--task-execution-time-threshold` in the output).
