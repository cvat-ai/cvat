# Agent context — ThreadPoolWorker for CVAT webhooks

This file is a handoff. Read it first if you are picking up work on the
ThreadPoolWorker without the prior conversation.

For technical limitations and rationale, read `documentation.md` in this same
directory (`rq_ext/`). For the **actual code, it has moved** — the worker now
lives at `cvat/apps/django_rq_ext/`, not in `rq_ext/`. See the "Files" table
below. This file covers **why we got here, what Aleksei has decided, what's
done, what's still pending, and how to collaborate with him.**

---

## The task we're solving

**Goal:** Increase throughput of `cvat/apps/webhooks/tasks.py:send_webhook`.

**Why throughput is a problem.** The webhook task is a blocking
`requests.post(target_url, ..., timeout=10)` call. Each `cvat_worker_webhooks`
container runs **one** RQ worker process via `rq worker webhooks
--with-scheduler` (`docker-compose.yml:186-194`). That single process can
deliver at most `1 / mean(request_latency)` webhooks per second; with a slow
10 s target it caps at 0.1 req/s per pod. When a customer queues thousands
of webhooks to a slow endpoint, the queue backs up.

**Options Aleksei evaluated and rejected:**

| Option | Rejected because |
|---|---|
| KEDA / horizontal pod autoscaling | "Too expensive" for the workload — each pod is a full CVAT image. |
| `rq worker-pool -n N` (multi-process) | Each subprocess boots Django (~250 MB) — N=8 ≈ 2 GB just for webhooks. |
| Gevent worker | Researched, "feels difficult" — psycopg2 needs psycogreen, monkey-patch surface, signal handling. |
| Cron + outbox + threading inside | "Reinventing a bike" — invents a retry mechanism in parallel with RQ's. |
| Batched jobs (1 RQ job = N webhooks) | Rejected — wants to keep "1 RQ job = 1 delivery" contract so retry/observability semantics stay 1:1. |

**Option chosen: thread-pool RQ worker in a single process.** One Python
process, N threads, each running webhook deliveries concurrently. Memory
stays single-process; concurrency = N. For 10 s timeouts and `pool_size=8`,
0.1 req/s → 0.8 req/s per pod.

---

## Decisions Aleksei has locked in

1. **1 RQ job = 1 webhook delivery.** Don't batch at enqueue time.
   Per-delivery retry/registry semantics are preserved.
2. **Inherit from `rq.worker.BaseWorker`, not `rq.worker.Worker`.** Reason:
   `Worker` is welded to `os.fork()` (six fork-only methods:
   `fork_work_horse`, `monitor_work_horse`, `kill_horse`, `wait_for_horse`,
   `main_work_horse`, `setup_work_horse_signals`) which are dead weight in a
   thread model. The trade-off: BaseWorker is not actually a usable base —
   its `__init__` and lifecycle methods reference attributes only defined on
   `Worker`. We ported them verbatim into `RqWorkerPortMixin` in
   `cvat/apps/django_rq_ext/mixins.py`. The mixin must be re-synced on rq
   version bumps; nothing in the mixin diverges from upstream.
3. **No off-the-shelf thread-pool RQ worker.** There isn't one. `rq/rq#1803`
   was abandoned in May 2025 after 2 years of unresolved bookkeeping bugs.
   The `ccrvlh/rq feature/multithread` branch exists but its author flagged
   it "not for production." We wrote our own, deliberately minimal.
4. **No death penalty wrapper.** Both built-in classes are unusable in a
   thread model (`UnixSignalDeathPenalty` → SIGALRM in non-main thread fails;
   `TimerDeathPenalty` uses `PyThreadState_SetAsyncExc` which only fires at
   Python bytecode boundaries — useless against blocked C-level socket IO,
   which is what webhook jobs do). Job timeout becomes the job function's
   responsibility. For webhooks, `requests.post(timeout=10)` is the real
   watchdog. Same reasoning extends to `on_success`/`on_failure` callbacks:
   `Job.execute_*_callback(death_penalty_class, ...)` (rq/job.py:1420, 1430)
   wraps the user callback in a death-penalty context, and we satisfy that
   contract with `NoOpDeathPenalty` in `cvat/apps/django_rq_ext/utils.py` —
   passed directly at the call site (not as a class attribute) so the "no
   callback timeout" decision is visible where it's made, not hidden behind
   an override.
5. **Soft per-job SLO + drain cap, single knob.** `task_execution_time_threshold`
   (default 60s, constructor arg, CLI-overridable via
   `--task-execution-time-threshold`). Drives both: (a) post-completion
   warning when a job exceeds it, (b) the `wait(in_flight, timeout=…)` cap in
   `teardown()`. **K8s `terminationGracePeriodSeconds` MUST be strictly
   greater** (currently planned at 70 in `sosov_deploy/worker.yaml`) so
   `register_death` + final log flush can run before SIGKILL.
6. **No remote-stop, no horse commands.** `subscribe()` overridden as a
   no-op — BaseWorker's pubsub channel exists only for `stop-job` /
   `kill-horse` / `shutdown`, all horse-bound and inapplicable to threads.
   The `_stopped_job_id` branch was stripped from our `handle_job_failure`.
7. **Observability landed in Phase 3 with counters + structural alignment.**
   Ported `increment_successful_job_count`, `increment_failed_job_count`,
   `increment_total_working_time`, and `handle_exception` from `rq.worker.Worker`
   into `RqWorkerPortMixin`. Counters wired into the new `handle_job_success`
   and existing `handle_job_failure`; `handle_exception(job, *exc_info)` is
   called from `_perform_job`'s except branch after `handle_job_failure`
   (matches upstream `perform_job:1461-1464`), so registered `_exc_handlers`
   fire. `set_current_job_id` was deliberately skipped — upstream uses it for
   `kill-horse` semantics that don't apply to threads. `total_working_time` is
   the sum of per-job durations (concurrent 10s + 10s = 20s), not wall-clock.

   `_perform_job` was reshaped to match upstream `perform_job`: bookkeeping
   moved into `prepare_job_execution(job, remove_from_intermediate_queue)`
   (skips upstream's single-slot fields, `procline`, and the extra
   `self.heartbeat` because `_heartbeat_loop` covers it); the success block
   moved into `handle_job_success(job, queue, started_job_registry)`, which
   delegates to `job._handle_success(result_ttl, pipeline)` — mirrors the
   failure path's existing `job._handle_failure(...)` call and picks up
   upstream's Redis Streams handling (`Result.create(..., Type.SUCCESSFUL,
   ...)`) that the previous inlined version silently dropped. The per-job
   StartedJobRegistry TTL is computed in `get_heartbeat_ttl(job)` — an
   override of upstream's method name that returns
   `task_execution_time_threshold + THREAD_POOL_WORKER_JOB_HEARTBEAT_TTL_SLACK_SEC`
   (default slack = 60s) instead of upstream's job-timeout-aware formula,
   because we don't maintain `current_job_working_time`. Both branches now
   also refresh the heartbeat post-completion
   (`job.heartbeat(utcnow(), job.{success,failure}_callback_timeout)`) and
   invoke `job.execute_{success,failure}_callback(NoOpDeathPenalty, ...)`
   (rq/worker.py:1445, 1456) so user `on_success`/`on_failure` hooks fire.
   The failure-callback invocation is wrapped in upstream's nested
   try/except (rq/worker.py:1454-1459) so a raising failure callback
   overwrites `exc_info`/`exc_string` before `handle_job_failure` runs.
8. **Heartbeat runs as an executor future, not a separate `threading.Thread`.**
   So `_is_pool_full` (`len(_active_futures) >= threadpool_size`) accounts for
   it naturally — with `pool_size=4` we get 3 slots for jobs and 1 for
   heartbeat. The alternative (separate Python thread) would silently exceed
   `pool_size` and confuse capacity planning.

---

## How job recovery and failure handling work

Three non-obvious mechanics that several decisions above rest on. Pinning
them down here so the code can stay terse.

### Entry into `rq:wip:<queue>`

Jobs land in `StartedJobRegistry` (`rq:wip:<queue>`, a Redis sorted set) **as
a side effect of `job.heartbeat()`**, not via an explicit
`started_job_registry.add(...)` call. `Job.heartbeat()` at `rq/job.py:709-723`
ends with `self.started_job_registry.add(self, ttl, pipeline=pipeline, xx=xx)`
(line 723). Our `prepare_job_execution` calls
`job.heartbeat(utcnow(), self.get_heartbeat_ttl(job), pipeline=pipeline)` —
that's the insertion. Score = `current_timestamp() + ttl` (`rq/registry.py:104`).
For us, `ttl = task_execution_time_threshold + slack`.

### Recovery after SIGKILL / segfault / hard crash

After the pod dies mid-job:

1. The job ID sits in `rq:wip:<queue>` with score `start_at + heartbeat_ttl`
   (≈ `threshold + slack` seconds after dequeue). The job hash still says
   `status=started`, so `/api/requests/{rq_id}` reports a job that looks
   alive but isn't, until step 3 runs.
2. Once `now > score`, the entry is "expired" — `StartedJobRegistry.
   get_expired_job_ids` (`rq/registry.py:131-140`) returns it.
3. The **next worker** for that queue to run `run_maintenance_tasks` calls
   `clean_registries(queue)` (`rq/registry.py:442-459`), which calls
   `StartedJobRegistry.cleanup()` (`rq/registry.py:215-263`). For each
   expired entry:
   - `job.retries_left > 0` → `job.retry(queue, pipeline)` (line 246) puts
     it back on the queue.
   - else → moves to `FailedJobRegistry` with `AbandonedJobError` (lines
     248-258), `JobStatus.FAILED`, and the registered failure callback /
     exception handlers fire.
4. `run_maintenance_tasks` is gated by `should_run_maintenance_tasks` and
   runs at most every `DEFAULT_MAINTENANCE_TASK_INTERVAL` (10 min by
   default) per worker. Worst-case limbo window: TTL (`threshold + slack`)
   + maintenance gap (10 min). `clean_registries` takes a per-queue Redis
   lock (`cleaning:<queue>`) so N workers don't double-clean.

Consequences:

- **No job loss, but multi-worker recovery.** A single-pod queue with no
  replacement leaves the entry orphaned until *some* worker for that queue
  comes up; the first maintenance tick on the new pod reaps it.
- **`heartbeat_ttl` IS the abandonment threshold** — no separate config.
  Our `threshold + slack` choice is what tells `cleanup()` "this job is
  abandoned." This is also why we deliberately don't refresh the heartbeat
  from the executor thread (TODO.md "Intentionally NOT added"): refresh
  would only help jobs legitimately exceeding the SLO, and we can't
  preempt those anyway (`requests.post` blocks in C-level socket IO).

### `job.retry(queue, pipeline)` and `enqueue_dependents` in `handle_job_failure`

The trailing block of our `handle_job_failure` was copy-pasted verbatim
from upstream `Worker.handle_job_failure` (rq/worker.py:507-520). What it
actually does:

- `job.retry(queue, pipeline)` at `rq/job.py:1498-1515` — decrements
  `retries_left`, then either `queue.schedule_job(...)` (if `retry_interval`
  is set) or `queue._enqueue_job(...)`. **Verified working in prod**: CVAT
  webhooks enqueue with `retry=Retry(max=N, interval=settings.
  SEND_WEBHOOK_TASK_RETRIES)` (`cvat/apps/webhooks/dispatch.py:add_to_queue`)
  and rely on exactly this path when `WebhookDeliveryError` fires from
  `cvat/apps/webhooks/tasks.py:23-29`.
- `queue.enqueue_dependents(job)` at `rq/queue.py:1171-1250` — walks
  `job.dependents_key` (populated via `Job.register_dependency` at
  `rq/job.py:1517+` when an enqueuer passes `depends_on=`) and re-enqueues
  each dependent whose dependencies are now met. CVAT webhooks never pass
  `depends_on=`, so it's a no-op for our workload, but we keep the call to
  preserve upstream semantics for any other queue this worker might service.
- The `retry` / `enqueue_dependents` flags are mutually exclusive: when
  retrying, dependents stay deferred (they'll be reconsidered after the
  retry resolves). When the failure is final, dependents fire.

The success path uses a **different** shape — see next subsection.

### `enqueue_dependents` in `handle_job_success` — the asymmetric WATCH

Our `handle_job_success` calls `queue.enqueue_dependents(job,
pipeline=pipeline)` **with** a pipeline (rq/worker.py:1386, ours mirrors
verbatim). When a pipeline is passed, `enqueue_dependents`'s internal WATCH
branch is skipped (rq/queue.py:1192-1195: "if a pipeline is passed, the
caller is responsible for calling WATCH"), so the WATCH responsibility
falls on us. That's why our success path opens with
`pipeline.watch(job.dependents_key)` and is wrapped in a `while True: try:
… except redis.exceptions.WatchError: continue` retry loop, while the
failure path has neither.

Why upstream chose this asymmetry (and we mirror it):

- Success path wants **atomicity**: `_handle_success` (`set_status(FINISHED)`
  + Result.create + finished_job_registry.add) + dependents bookkeeping +
  counters + `started_job_registry.remove` all in one MULTI/EXEC. Passing
  the pipeline keeps everything together. Trade-off: caller owns WATCH +
  retry loop.
- Failure path doesn't need that atomicity. The pipeline commits the
  failure first (`_handle_failure` + counters + `started_job_registry.
  remove`), then `queue.enqueue_dependents(job)` runs as a separate call
  with its own internal WATCH/MULTI/EXEC loop. If the second call hiccups
  on Redis, the catch-all swallow keeps the worker alive without losing
  the failure record.

The race protected against is the same in both paths: an external producer
(Django web request, another worker pod, management command) calling
`queue.enqueue_call(..., depends_on=<our job>)` between our `SMEMBERS
dependents_key` and our `DEL/SREM`. The WATCH lives in different places
but both paths are protected.

One non-obvious detail in the success path: the `if not
pipeline.explicit_transaction: pipeline.multi()` line after
`enqueue_dependents` is a defensive fallback. `enqueue_dependents` calls
`pipe.multi()` itself only when there are dependents to enqueue
(`rq/queue.py:1217`). If `SMEMBERS dependents_key` returns empty (the
common case for jobs without `depends_on=`), it `break`s out at
`rq/queue.py:1200-1201` *without* switching the pipeline to transaction
mode, so the bookkeeping that follows wouldn't be atomic without the
explicit fallback.

---

## Status

### Done

- **Phase 1 (basic thread-pool execution).** Worker runs jobs in
  `ThreadPoolExecutor`; success → `finished_job_registry`; failure →
  `failed_job_registry` via adapted `handle_job_failure` (preserves
  `Retry()` semantics via `job.retry(queue, pipeline)`).
- **Phase 2 (work loop + pool-full gate + soft shutdown).** `work()`
  overridden with a pool-full gate before `dequeue_job_and_maintain_ttl`
  (without it, ThreadPoolExecutor parks overflow in its internal
  `_work_queue`, hiding jobs from Redis). `teardown()` does
  `shutdown(wait=False)` then `wait(in_flight, timeout=threshold)`; logs
  "drain timed out, N jobs still running" if K8s SIGKILL is about to fire.
- **Phase 3 (observability counters + structural alignment with upstream
  `perform_job`).** See decision #7. Counters and `handle_exception` in
  `RqWorkerPortMixin`; `_perform_job` reshaped around new `prepare_job_execution`
  / `handle_job_success` / `get_heartbeat_ttl` methods on `ThreadPoolWorker`;
  `THREAD_POOL_WORKER_JOB_HEARTBEAT_TTL_SLACK_SEC` lives in
  `cvat/apps/django_rq_ext/default_settings.py` and is installed by
  `DjangoRqExtConfig.ready()` (same pattern as `cvat/apps/webhooks/apps.py`).
- **`rqworker` django management command extension.** Shadows
  django_rq's via `cvat/apps/django_rq_ext/management/commands/rqworker.py`
  (picked up first because the app sits before `django_rq` in
  `INSTALLED_APPS` — Django's `get_commands()` uses
  `reversed(get_app_configs())` so first-in-INSTALLED_APPS wins). Adds
  `--pool-size` and `--task-execution-time-threshold`; both only injected
  into worker kwargs when explicitly set, so stock `rq.Worker` invocations
  (`just runworker`) keep working unchanged.
- **Sandbox / playground.** New `playground` queue in `CVAT_QUEUES`,
  `send_webhook_task` in `cvat/apps/django_rq_ext/sandbox/tasks.py`,
  `enqueue_playground` management command, justfile recipes
  (`runworker-playground`, `enqueue-playground`), VS Code launch config.

### Outstanding

No outstanding correctness items in the worker itself. The thread-pool
worker is **not yet wired into deploy** — `cvat_worker_webhooks` in
`docker-compose.yml:186-194` still runs vanilla `rq worker webhooks
--with-scheduler`. Swapping that to `ThreadPoolWorker` is a separate
decision (deploy gate, not a code gap). See `cvat/apps/django_rq_ext/
TODO.md` for Phase 3 history and intentionally-NOT-added items.

---

## Files

| Path | Status | Purpose |
|---|---|---|
| `cvat/apps/django_rq_ext/worker.py` | **Active code** | `ThreadPoolWorker(RqWorkerPortMixin, BaseWorker)`. Work loop, worker heartbeat loop, teardown, signal handlers, `prepare_job_execution`, `get_heartbeat_ttl` (override), `_perform_job`, `handle_job_success`, modified `handle_job_failure`. |
| `cvat/apps/django_rq_ext/mixins.py` | **Active code** | `RqWorkerPortMixin` — methods copy-pasted verbatim from `rq.worker.Worker` (set_state/get_state, register_birth/death, reorder_queues, procline, push/pop_exc_handler, increment_{successful,failed}_job_count, increment_total_working_time, handle_exception, stop_scheduler). Nothing here diverges from upstream; re-sync on rq bumps. |
| `cvat/apps/django_rq_ext/utils.py` | **Active code** | `NoOpDeathPenalty` — no-op context manager passed to `Job.execute_*_callback(death_penalty_class, ...)`. We don't enforce callback timeouts; see decision #4. |
| `cvat/apps/django_rq_ext/management/commands/rqworker.py` | **Active code** | Shadows django_rq's `rqworker`; adds `--pool-size` and `--task-execution-time-threshold` via monkey-patching `_upstream.get_worker` for one super().handle() call. |
| `cvat/apps/django_rq_ext/management/commands/enqueue_playground.py` | **Active code** | `python manage.py enqueue_playground --count N` — enqueues `send_webhook_task` jobs onto the `playground` queue. |
| `cvat/apps/django_rq_ext/sandbox/tasks.py` | **Active code** | `send_webhook_task` — zero Django deps, importable from a bare Python process. Aleksei has at times replaced its body with `time.sleep(...)` to simulate slow tasks; treat the content as scratch. |
| `cvat/apps/django_rq_ext/TODO.md` | **Living doc** | Phase 3 history — LANDED items and intentionally-NOT-added decisions. |
| `cvat/apps/django_rq_ext/apps.py` | Trivial | `DjangoRqExtConfig`. `ready()` copies uppercase names from `default_settings` onto `django.conf.settings` (verbatim webhooks pattern). |
| `cvat/apps/django_rq_ext/default_settings.py` | **Active code** | `THREAD_POOL_WORKER_JOB_HEARTBEAT_TTL_SLACK_SEC` (default 60s) — slack added to per-job StartedJobRegistry TTL. |
| `rq_ext/documentation.md` | Living doc | Technical limitations + rationale, sectioned per deferred feature. Older than this file; treat as background, not source of truth. |
| `rq_ext/thread_pool_worker_example.py` | Reference | Verbatim port of `ccrvlh/rq feature/multithread`'s `ThreadPoolWorker` for comparison. Don't `import` it from production code. |
| `rq_ext/AGENT_CONTEXT.md` | **This file** | Conversation handoff. Update when behavior changes meaningfully. |

`rq_ext/` is otherwise empty of code now; the `__init__.py` there is leftover and not needed.

---

## How to run / debug locally

The shadow command means there is **no separate worker command** for the thread pool:

```bash
just runworker-playground      # pool_size=4, queue=playground
just enqueue-playground        # enqueues 5 send_webhook_task jobs by default
```

Both recipes wrap `python manage.py rqworker --worker-class
cvat.apps.django_rq_ext.worker.ThreadPoolWorker --pool-size 4 playground`
and the equivalent enqueue command, with the standard CVAT env-file +
DYLD_FALLBACK_LIBRARY_PATH wrappers.

VS Code: "ThreadPoolWorker (playground queue)" launch config in
`.vscode/launch.json`.

INSTALLED_APPS ordering matters: `cvat.apps.django_rq_ext` must come
**before** `django_rq` (currently positioned right after the contrib apps
in `cvat/settings/base.py`). Moving it elsewhere will silently break the
shadow command and `rqworker` will resolve back to django_rq.

---

## How Aleksei collaborates (observed preferences)

- **Pushes back when the explanation is hand-wavy.** Don't write "this has
  races" — write "line 1006 reads `WorkerStatus.BUSY` and decides between
  graceful and immediate shutdown; with N threads sharing the field, the
  decision is wrong." He'll spot vague claims and ask for the source line.
- **Reads upstream RQ source.** Cite file paths and line numbers from
  `.env/lib/python3.10/site-packages/rq/worker.py` so he can verify.
- **Prefers minimal, phased implementation over one big change.** Will
  reject scope you didn't ask permission for. When in doubt, stub it and
  TODO for a later phase.
- **Prefers copy-paste over inherit when ownership matters.** The reasoning:
  "the rq source is shit" (his words, supported by `rq/rq#1804` discussion).
  Inheriting `handle_job_failure` means future rq bumps could silently
  change our behaviour. Copy-paste is a known cost.
- **Strips dead code aggressively.** When a code path can't fire (e.g.
  `_stopped_job_id` in a thread worker), he wants it removed, not commented
  out "for future".
- **Removes inline comments aggressively.** Has trimmed almost every
  multi-line comment I've written. The mental model: behavior should be
  obvious from code; deep rationale belongs in TODO.md / this file. Keep
  inline notes to one-liners and only for *non-obvious* invariants (e.g.
  "pool-full gate before dequeue so executor doesn't park overflow").
- **Asks clarifying questions back at you.** If you write something he
  thinks is wrong, he'll ask "is that really true?" — verify with code,
  not assertion. He has caught me being wrong about both `BaseWorker`
  contents and `death_penalty_class` location.
- **Uses `NOTE @sosov: …` and `TODO @sosov [Phase N]: …` comment style.**
  Match it.
- **Does not want Claude attribution in git commits or PRs.** (His global
  CLAUDE.md.) When asked to commit, omit any `Co-Authored-By: Claude …`
  trailer and any "Generated with Claude Code" line.

---

## Repository context that matters for this task

- **Branch:** `as/support-multithreading-worker` (off `develop`).
- **CVAT's RQ pin:** `rq==1.16.0`, `django-rq==2.10.3`
  (`cvat/requirements/base.txt:94,299`). All "copy-pasted from upstream" /
  "re-sync on bumps" notes in `mixins.py` and `worker.py` refer to these.
- **Webhook worker today:** `docker-compose.yml:186-194` —
  `cvat_worker_webhooks` runs `rq worker webhooks --with-scheduler`. One
  container, one process, one thread. **Not yet switched to ThreadPoolWorker
  in deploy** — Aleksei has not greenlit that yet; that's a separate decision
  after observability lands.
- **Webhook enqueue:** `cvat/apps/webhooks/dispatch.py:add_to_queue` calls
  `queue.enqueue_call(func=send_webhook, args=(...), retry=Retry(max=...,
  interval=settings.SEND_WEBHOOK_TASK_RETRIES))`. **Retries are part of the
  contract** — `tasks.py:23-29` raises `WebhookDeliveryError` on 5xx /
  timeout / 429, which trips RQ's retry. Our `handle_job_failure` MUST
  preserve `job.retry(queue, pipeline)`.
- **Webhook job function:** `cvat/apps/webhooks/tasks.py:12-31` —
  `send_webhook(webhook_id, payload, redelivery)`. Mostly IO-bound:
  `Webhook.objects.filter().first()` (Postgres query), then
  `services.send_webhook` → `requests.post(...)` with a hardcoded
  `_WEBHOOK_TIMEOUT = 10` (`cvat/apps/webhooks/utils.py:18`).

---

## Useful skills the agent should invoke

- **`django-rq`** — CVAT's RQ conventions (queue selection, RequestId,
  RQMeta, AbstractRequestManager). Most of it doesn't apply here (we're
  writing a worker, not a job enqueuer), but the "Picking a queue" section
  is worth re-reading.
- **`dev-setup`** — Host-based dev stack. Needed if you plan to smoke-test
  the worker against the `webhooks` queue.
- **`redis-migrations`** — If we ever change the `send_webhook` signature
  or queue name we'll need to migrate enqueued jobs. Not needed yet.

---

## What NOT to do

- **Don't expand observability beyond what's in TODO.md.** Phase 3 has
  landed (counters + `handle_exception` + structural alignment). Items
  Aleksei deliberately skipped — `set_current_job_id`, per-job heartbeat
  refresh, `procline`, `set_current_job_working_time` — should NOT be
  reintroduced without a fresh design conversation.
- **Don't change `cvat/apps/webhooks/`.** That code stays untouched. The
  thread-pool worker is invoked at deploy time by changing the
  `cvat_worker_webhooks` command — not yet done.
- **Don't expand `django_rq_ext/` into a generic threading library.** It
  exists for one use case (CVAT webhooks). Generalization is a separate
  decision.
- **Don't move `cvat.apps.django_rq_ext` out of its slot before `django_rq`
  in `INSTALLED_APPS`.** The shadowed `rqworker` command silently stops
  shadowing if the order is wrong.
- **Don't push Co-Authored-By: Claude trailers into commits or PRs.** Per
  his global CLAUDE.md.
