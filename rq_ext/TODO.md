# ThreadPoolWorker — TODO

## Phase 3: observability / monitoring

Understand how RQ's worker monitoring works before adding back any of:

- `set_current_job_id` — single-slot key on the worker hash that tracks "the
  job I'm currently running". Pointless with N concurrent jobs unless rewritten
  as a set; needs to be reasoned through.
- `increment_failed_job_count` / `increment_total_working_time` — per-worker
  counters in Redis. With N concurrent threads writing, need to confirm whether
  they're atomic (HINCRBY is, plain HSET isn't) and whether anything in the RQ
  dashboard / `rq info` reads them.
- `clean_registries` / `StartedJobRegistry` interaction with our per-job
  heartbeat TTL (`job_monitoring_interval + 60` ≈ 90s). If a job legitimately
  runs longer than that, another worker's maintenance pass will consider it
  abandoned and re-enqueue it → double execution.

The three bullets above were intentionally stripped from `handle_job_failure`
and `_perform_job` for Phase 2 (see git history). Re-add only with a clear
model of what each piece is for in a multi-job worker.

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
  the polling client sees a job that looks alive but isn't. For CVAT exports
  / imports this may be confusing; for playground/webhook jobs probably fine.
- Maintenance only runs if *another* worker exists on the same queue (or a
  replacement pod comes up). If the queue has a single worker that dies and
  no replacement, the stale entry persists indefinitely.
- `clean_registries` requires a Redis lock per queue (`cleaning:<queue>`), so
  N workers don't double-clean.

## Other Phase 3+ items

- Per-job heartbeat refresh from inside the executor thread (today: only the
  initial `job.heartbeat(ttl=~90s)` set at start; safe while
  `_TASK_EXECUTION_TIME_THRESHOLD_SEC` ≤ 90).
- `depends_on` / `on_success` / `on_failure` callbacks (today: dependents
  enqueued only on failure path via `handle_job_failure`).
