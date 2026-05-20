# ThreadPoolWorker — TODO

## Phase 3 (LANDED): observability / monitoring

Resolved in this phase:

- **Counters.** `increment_successful_job_count`, `increment_failed_job_count`,
  `increment_total_working_time` ported verbatim from `rq.worker.Worker` into
  `RqWorkerPortMixin` (HINCRBY / HINCRBYFLOAT — atomic across N threads). Wired
  into the existing finished-job pipeline in `handle_job_success` and into
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
  constant that documents what it covers. The formula lives in our
  `get_heartbeat_ttl(job)` override (same name as upstream, ignores `job`).
- **`_perform_job` aligned with upstream `perform_job` shape.** Bookkeeping
  split out into:
  - `prepare_job_execution(job, remove_from_intermediate_queue=False)` — pipeline
    that calls `job.prepare_for_execution`, `job.heartbeat(...)`, and (when
    `len(self.queues) == 1`) clears the intermediate queue entry. Deliberately
    omits upstream's `self.set_current_job_id`, `self.set_current_job_working_time`,
    extra `self.heartbeat(...)` (covered by `_heartbeat_loop`), and `self.procline(...)`.
  - `handle_job_success(job, queue, started_job_registry)` — separate method,
    success pipeline + counter increments + finished-job log.
  - Post-completion `job.heartbeat(utcnow(), job.{success,failure}_callback_timeout)`
    in both branches (rq/worker.py:1444, 1455) so cleanup has TTL room.
- **`handle_exception(job, *exc_info)` ported into `RqWorkerPortMixin`** verbatim
  from `rq.worker.Worker:1485-1522`. Called from `_perform_job`'s except branch
  after `handle_job_failure`, matching upstream `perform_job:1461-1464`. Walks
  the `_exc_handlers` chain registered via `push_exc_handler` / `pop_exc_handler`
  (also on the mixin).
- **`handle_job_success` delegates to `job._handle_success(result_ttl, pipeline)`**
  (rq/job.py:1446). Mirrors the existing `job._handle_failure(...)` call on the
  failure side and picks up upstream's Redis Streams handling
  (`Result.create(..., Type.SUCCESSFUL, ...)`) that the previous inlined version
  silently lacked — so on Redis ≥5.0 success results are now retrievable via the
  modern Results API. Still no `queue.enqueue_dependents(job)` here; see "Other
  Phase 3+ items".
- **`on_success` / `on_failure` callbacks wired.** `_perform_job` now calls
  `job.execute_success_callback(NoOpDeathPenalty, rv)` after the success
  heartbeat (matches rq/worker.py:1445) and `job.execute_failure_callback(
  NoOpDeathPenalty, *exc_info)` after the failure heartbeat (matches
  rq/worker.py:1456). The failure-callback call is wrapped in the same nested
  try/except as upstream (rq/worker.py:1454-1459) so a raising failure
  callback overwrites `exc_info`/`exc_string` before `handle_job_failure`
  runs. `NoOpDeathPenalty` (`cvat/apps/django_rq_ext/utils.py`) is the
  thread-safe stand-in we pass to satisfy `Job.execute_*_callback(
  death_penalty_class, ...)` — we don't enforce callback timeouts for the
  same reason we don't enforce job timeouts (see AGENT_CONTEXT.md decision #4).
- **Success-path `enqueue_dependents` ported from upstream.**
  `handle_job_success` now wraps its pipeline in `while True: try: … except
  redis.exceptions.WatchError: continue` and opens each iteration with
  `pipeline.watch(job.dependents_key)` + `queue.enqueue_dependents(job,
  pipeline=pipeline)` + the defensive `if not pipeline.explicit_transaction:
  pipeline.multi()` fallback — mirrors upstream `Worker.handle_job_success`
  (rq/worker.py:1380-1410) verbatim except `set_current_job_id(None)` (decision
  #7). The `pipeline.multi()` fallback handles the empty-dependents case where
  `enqueue_dependents` short-circuits at `rq/queue.py:1200-1201` without ever
  calling `pipe.multi()`. The caller-side WATCH satisfies `enqueue_dependents`'s
  pipeline contract (`rq/queue.py:1192-1195`) and protects against external
  producers calling `register_dependency` between our SMEMBERS and EXEC. See
  AGENT_CONTEXT.md "How job recovery and failure handling work" for the
  asymmetry vs `handle_job_failure`'s no-pipeline call.

Intentionally NOT added:

- `set_current_job_id` — upstream uses it only for `kill-horse` /
  `get_current_job()` semantics that don't apply to threads. Pure observability
  use, so skipped.
- Per-job heartbeat refresh from the worker loop. One-shot TTL of
  `threshold + slack` is sufficient under the SLO. Even if a job exceeded
  the threshold we couldn't preempt it anyway — webhook jobs block on
  C-level socket IO, which `PyThreadState_SetAsyncExc` (the only thread-safe
  mechanism upstream offers) can't interrupt. So there's no scenario where
  refresh helps.

## Other Phase 3+ items

No outstanding worker correctness items. Deploy swap (`cvat_worker_webhooks`
→ ThreadPoolWorker in `docker-compose.yml`) is a separate decision tracked
outside this file.
