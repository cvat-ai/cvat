# Class-Wise Image Count Analytics

This document covers the analytics feature added on `dev-test01`: a page that
shows, per task, how many images have at least one annotation of each label,
updating live as annotations change.

## 1. Architecture, briefly

CVAT's backend is a set of Django apps under `cvat/apps/`. The one that
matters most here is `engine`, which owns the core data model: `Task` → `Job`
(via `Segment`) → annotations. Two annotation tables are relevant to "how many
images have label X": `LabeledShape` (a box/polygon/mask on a frame) and
`LabeledImage` (a whole-frame tag, no geometry). Both carry a `label` and a
`frame` number.

Everything new lives in its own app, `cvat/apps/test/` (name aside, it's just
the analytics feature's home — models weren't needed, so it's mostly
`analytics.py`, `views.py`, `permissions.py`, `consumers.py`, `signals.py`).
It follows the same shape every other CVAT app does: a `views.py` behind a
DRF router, a `permissions.py` that plugs into the existing OPA-based
authorization, and now — new for this feature — a WebSocket consumer wired
into Django's ASGI app.

The one genuinely new piece of infrastructure is **Django Channels**. It
wasn't there before, but the deployment turned out to already be most of the
way ready for it: the server runs on `uvicorn` (ASGI, not WSGI), and
`nginx.conf` already forwarded `Upgrade`/`Connection` headers to it. Channels
uses the Redis container that was already running for RQ job queues
(`cvat_redis_inmem`), just on its own DB index, so no new infrastructure had
to be introduced in docker-compose beyond a routing rule.

## 2. Data flow

```
annotation PATCH/PUT/DELETE (via /api/jobs/{id}/annotations)
        │
        ▼
cvat/apps/dataset_manager/task.py (JobAnnotation.create/update/delete)
        │  bulk_create / bulk deletes — no per-row Django model signals fire
        ▼
cvat/apps/events/handlers.py: handle_annotations_change(job, annotations, action)
        │  (already existed, for audit-logging into Clickhouse)
        │  added: fires `annotations_changed` signal via transaction.on_commit()
        ▼
cvat/apps/test/signals.py: broadcast_class_counts_on_annotations_change
        │  recomputes get_class_wise_image_counts(task_id)
        ▼
channel_layer.group_send("class_counts_task_<id>", {...})
        │  (channels_redis, backed by the existing Redis container)
        ▼
cvat/apps/test/consumers.py: ClassCountsConsumer.class_counts_update
        │  every browser currently viewing that task's analytics page
        ▼
cvat-ui: use-class-counts-socket.ts → chart re-renders, no page refresh
```

The first hop was the one worth getting right: annotations are written with
`bulk_create`, which Django's `post_save`/`post_delete` signals don't fire
for. So a model-signal approach was a dead end from the start. The one place
every write path (create, update, delete, import) reliably passes through is
`handle_annotations_change` — that's where the new `annotations_changed`
signal gets dispatched, wrapped in `transaction.on_commit(..., robust=True)`
so a broadcast never fires for a write that ends up rolling back.

## 3. API design

`GET /api/test/class-counts?task_id=<id>` → `{"cat": 3, "dog": 2, "bird": 0}`.

A few decisions behind that shape:

- **`task_id` as a query param, not a path segment.** This isn't a
  sub-resource of `/tasks/{id}/...` in the REST sense — it's a derived,
  computed view over a task's annotations, so it gets its own top-level route
  and takes the task as a filter, the same way a search endpoint would.
- **Plain `{label: count}`, not a list of objects.** There's no per-label
  metadata to carry, and a flat map is exactly what a bar chart wants without
  reshaping.
- **Zero-count labels are included.** If a task has a label nobody's used
  yet, it still shows up with `0` — otherwise the chart would quietly drop
  labels and look like a bug.
- **An image counts once per label**, even if it has both a shape and a tag
  of that label — done with a SQL `UNION` across the two annotation tables so
  the dedup happens in Postgres, not in a Python loop.
- **Ground truth and consensus-replica jobs are excluded.** Those job types
  can cover the same frames as the main annotation jobs; including them would
  double-count the same image.
- **Authorization is entirely delegated**, not reinvented. The permission
  class doesn't define new OPA rules — it just resolves the `task_id` and
  calls `TaskPermission.create_scope_view(...)` from the `engine` app, so a
  user gets exactly the same task-visibility rules as every other endpoint.

## 4. WebSocket implementation

`cvat/asgi.py` went from a plain `get_asgi_application()` call to a
`ProtocolTypeRouter` splitting `http` (unchanged) and `websocket` (new),
routed through `AuthMiddlewareStack` so the same session cookie the REST API
already uses is also what authenticates the socket — no separate login flow.

The route is `ws/test/class-counts/<task_id>/`, one Channels **group** per
task (`class_counts_task_<id>`). `ClassCountsConsumer.connect()`:

1. Resolves the task and checks the connecting user can view it — reusing
   `TaskPermission` again, via a small adapter that lets Channels' connection
   `scope` stand in for the HTTP request object CVAT's IAM helpers expect.
   Rejecting here means the handshake itself fails (a 403), before the socket
   ever opens.
2. Joins the task's group and sends the current counts immediately, so the
   chart has data without waiting on the first future change.
3. Starts a 25-second heartbeat loop, sending `{"type": "ping"}` — purely to
   keep the connection from ever going idle (more on why below).

On the frontend, `use-class-counts-socket.ts` is a small state machine:
`idle → connecting → live`, with `reconnecting`/`error` as the failure
branches. Reconnects use exponential backoff (1s up to a 30s cap), but only
retry indefinitely if the socket was *previously* live — if it never
completes a single connection (bad task ID, no access), it gives up after
three tries with a visible error instead of retrying forever. The browser
`WebSocket` API doesn't expose the handshake's HTTP status, so there's no
clean way to tell "access denied" from "network blip" apart otherwise — this
was the closest reasonable approximation. While reconnecting, the last known
chart stays on screen with a banner over it, rather than blanking out.

## 5. Challenges actually hit while building this

**"Could not satisfy the request Accept header."** The first version of the
frontend's `fetch()` call sent `Accept: application/json`. CVAT's DRF
renderer only serves `application/vnd.cvat+json` — a deliberate choice
(`CVATAPIRenderer`), and every other part of the app gets this for free
because `cvat-core`'s Axios client never sets an explicit `Accept` header at
all. Fixed by matching that media type explicitly.

**traefik was silently swallowing the WebSocket path.** The backend's own
traefik router only matched `/api/`, `/static/`, `/admin`, `/django-rq` — not
`/ws/`. Testing directly against the `cvat_server` container worked fine and
gave false confidence; testing through the actual public entrypoint (as a
browser does) revealed the request was landing on the `cvat_ui` container's
catch-all route instead, since it never matched the more specific backend
rule. Added `PathPrefix('/ws/')` to fix it.

**`channels_redis` host config format.** The first `CHANNEL_LAYERS` config
passed `hosts: [{"address": (host, port), ...}]` — a tuple, which is what an
older aioredis version wanted. This version parses `address` as a real
`redis://` URL string and fails with an obscure `AttributeError` deep in
`urllib.parse` if you don't. Easy to fix once the actual `create_pool()`
source was checked instead of assumed.

**A connection that crashed every ~7 seconds, without an obvious cause.**
This is the one that took the longest to run down, and the actual bug behind
the "why does it keep reconnecting?" question. `channels_redis` waits for
group messages with a Redis `BZPOPMIN` that blocks server-side for 5 seconds.
The Redis client's own socket read timeout was shorter than that, so it gave
up and raised before Redis had a chance to say "nothing yet" — which crashed
the whole consumer task and closed the socket, every cycle, forever. CVAT's
own codebase already had the fix for this exact class of bug written down as
a comment on the RQ Redis config (`socket_timeout: None`, for the same reason
— blocking commands like `BLPOP` need it) — I'd just missed applying the same
thing to the new channel layer's config. Once added, a connection held open
for 100 seconds with zero annotation activity survived cleanly on nothing but
the heartbeat, instead of dying roughly every 7.

**Testing a live, session-authenticated, multi-container WebSocket flow
without a browser.** Most of the verification for this feature happened via
scripted `websockets` clients, real `PATCH` requests, and log correlation
across containers, rather than trusting that "the code looks right." A few
of the bugs above (the traefik gap especially) would have looked identical
to "the connection just isn't reliable" without actually tracing a request
through the real path end to end.
