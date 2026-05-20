# ThreadPoolWorker — TODO

## Phase 3 (LANDED): observability / monitoring

Resolved in this phase:

- **Counters.** `increment_successful_job_count`, `increment_failed_job_count`,
  `increment_total_working_time` ported verbatim from `rq.worker.Worker` into
  `RqWorkerPortMixin` (HINCRBY / HINCRBYFLOAT — atomic across N threads). Wired
  into the existing finished-job pipeline in `_perform_job` and into
  `handle_job_failure`, matching upstream placement (failures count for retries
  too). `total_working_time` is the **sum of per-job durations**, not the
  wall-clock concurrent interval — 10s + 10s concurrent = 20s. Acceptable
  trade-off for not tracking interval overlaps.
- **Per-job StartedJobRegistry TTL.** Changed from `job_monitoring_interval + 60`
  to `task_execution_time_threshold + THREAD_POOL_WORKER_JOB_HEARTBEAT_TTL_SLACK_SEC`
  (default slack = 60s, in `default_settings.py`). One-shot — we do not refresh.
  The TTL now adapts to the SLO knob, so raising `--task-execution-time-threshold`
  no longer creates a silent double-execution risk via another worker's
  `clean_registries`. The `+60` jitter buffer that upstream uses (because they
  refresh every `job_monitoring_interval`) is replaced by an explicit named
  constant that documents what it covers.

Intentionally NOT added:

- `set_current_job_id` — upstream uses it only for `kill-horse` /
  `get_current_job()` semantics that don't apply to threads. Pure observability
  use, so skipped.
- Per-job heartbeat refresh from the worker loop. Not needed while
  `heartbeat_ttl = threshold + slack` is set once and >= the job's actual
  runtime. Revisit only if we ever want jobs that legitimately run longer
  than the SLO.

## RQ consistency: what happens to a job we SIGKILL'd mid-flight?

Scenario: worker dequeues job, starts running it, the job exceeds the soft
SLO, K8s SIGKILL hits before it returns, no cleanup runs.

Tentative answer (to verify against rq 1.16.0 source — `rq/registry.py`,
`rq/worker.py::run_maintenance_tasks`, `rq/queue.py::Queue.cleanup`):

1. **On dequeue**, RQ atomically:
   - removes the job id from the queue list,
   - adds it to `StartedJobRegistry` with a ZSET score of `now + heartbeat_ttl`
     (≈ 90s for us — `job_monitoring_interval + 60`),
   - sets the job hash `status = started`, `worker_name = <us>`.
2. **SIGKILL hits.** None of our cleanup runs. The job entry sits in
   `StartedJobRegistry` with a stale score; the job hash still says `started`.
3. **Next worker's maintenance pass** (`run_maintenance_tasks` →
   `clean_registries(queue)`) iterates `StartedJobRegistry` entries with
   `score < now` (i.e. TTL expired ~90s after the original dequeue). For each:
   - if `job.retries_left > 0` → `job.retry(queue, pipeline)` puts it back on
     the queue;
   - else → moves it to `FailedJobRegistry` with `exc_info` = "Moved to
     FailedJobRegistry at <ts>" and runs the failure callback / exception
     handlers.
4. Maintenance runs at most every `DEFAULT_MAINTENANCE_TASK_INTERVAL` (10 min
   by default) per worker, gated by `should_run_maintenance_tasks`. So in the
   worst case the job is in limbo for up to **TTL (90s) + maintenance gap
   (10min)** before it surfaces as failed / retried.

Implications to confirm later:

- **No job loss**, but recovery is on the order of minutes, not seconds.
- During the limbo window, `/api/requests/{rq_id}` would report `started` —
  the polling client sees a job that looks alive but isn't.
- Maintenance only runs if *another* worker exists on the same queue (or a
  replacement pod comes up). If the queue has a single worker that dies and
  no replacement, the stale entry persists indefinitely.
- `clean_registries` requires a Redis lock per queue (`cleaning:<queue>`), so
  N workers don't double-clean.

## Other Phase 3+ items

- Per-job heartbeat refresh from inside the executor thread. Not needed
  today: the one-shot TTL is `task_execution_time_threshold + slack`, so any
  job that honors the SLO is safe. Required only if we want jobs that
  legitimately exceed the SLO.
- `depends_on` / `enqueue_dependents` on the success path.
  `handle_job_success` does NOT call `queue.enqueue_dependents(job)` after a
  successful `job.perform()` — so dependents of a successful job never run.
  (Dependents of a failed-and-not-retrying job DO get enqueued, via
  `handle_job_failure`, matching upstream BaseWorker.) Verify against
  rq.worker.Worker.handle_job_success / perform_job to see what we'd need to port.
- `job.execute_success_callback(self.death_penalty_class, rv)` /
  `job.execute_failure_callback(self.death_penalty_class, *exc_info)` —
  upstream perform_job (rq/worker.py:1445, 1456) invokes these between
  `job.heartbeat(...)` and `handle_job_success` / `handle_job_failure`. They
  run user-provided `on_success` / `on_failure` hooks under a death-penalty
  timer. We already do the heartbeat refresh; the callback invocations are
  not wired. Two open design questions when we add them: (1) the
  death_penalty_class needs a thread-safe substitute (UnixSignalDeathPenalty
  doesn't work off the main thread; TimerDeathPenalty can't interrupt blocked
  C I/O — same trade-offs we had for job timeouts), and (2) callback
  exceptions should be caught and converted into an exc_string fed to
  `handle_job_failure`, mirroring upstream's nested try/except at
  rq/worker.py:1454-1459.
