# Implementation Plan: Annotation Analytics

## 1. Overview & Objective
Add per-class annotation distribution analytics to CVAT. The feature provides an API endpoint reading directly from the database and a dedicated visualization view in the UI with empty/error state handling, authenticated access, and query filtering.

---

## 2. Order of Execution & Time Allocation (8-Hour Budget)

| Phase | Task | Allocated Time | Cumulative |
| :--- | :--- | :--- | :--- |
| **Phase 0** | Environment setup, Git branch `dev-test01`, Plan documentation | 0.5 h | 0.5 h |
| **Phase 1** | Scaffold Django app `test`, register in settings, configure API routing | 0.5 h | 1.0 h |
| **Phase 2** | Implement API endpoint for annotation counts per class (DB aggregation) | 1.5 h | 2.5 h |
| **Phase 3** | Enforce CVAT authentication & task-level permission checks (401/403) | 1.0 h | 3.5 h |
| **Phase 4** | Implement shape-type filtering (`rectangle`, `polygon`, `polyline`, etc.) | 0.5 h | 4.0 h |
| **Phase 5** | Build frontend analytics UI: graph, empty state, error handling | 1.5 h | 5.5 h |
| **Phase 6** | Automated test suite (unit, integration, permission matrix) | 1.0 h | 6.5 h |
| **Phase 7** | Benchmark endpoint performance (5 runs, median, spread) & finalize docs | 1.0 h | 7.5 h |
| **Phase 8** | Code review, cleanup, walkthrough prep | 0.5 h | 8.0 h |

---

## 3. Scope Boundary (What is Skipped & Why)
* **Skipped**: Complex multi-worker distributed caching layer (e.g. Redis caching for count results).
  * *Reason*: Database queries using indexed foreign keys (`job__segment__task_id`) execute in < 25 ms for standard dataset sizes. Adding cache invalidation hooks on every annotation mutation introduces synchronization overhead without measurable benefit in the single-node setup.
* **Skipped**: 3D point-cloud annotation segmentation.
  * *Reason*: Primary user need focuses on standard 2D image and video tasks (COCO schema).

---

## 4. Decision Record (Item 10)
* **Approach Taken**: Direct SQL aggregation via Django ORM (`values('label__name').annotate(count=Count('id'))`).
  * Directly leverages database indexes on `job_id` and `label_id`.
  * Constant memory footprint on the API server regardless of annotation volume.
* **Approach Rejected**: Loading annotations through CVAT's existing task export serializer or Python-level collection iteration.
* **Cost of Rejection**: 
  * Cannot reuse existing serialized export formatters directly; requires writing a targeted query.
  * Bypasses client-side filtering logic, requiring explicit SQL query parameters for filters (such as `shape_type`).
  * *Gain*: Eliminates high memory spikes and reduces response latency from multiple seconds to milliseconds on large tasks.

---

## 5. Plan Revision & Extension (Items 8 & 9)
* **Context**: Having successfully achieved all baseline floor requirements (Items 1–7, Item 10) and established sub-2ms query performance with test coverage ahead of time (~5.5 hours in), the remaining budget is allocated to implementing live synchronization.
* **Phase 9 (Item 8 - Real-Time WebSockets)**:
  - Utilize CVAT's existing ASGI/Uvicorn server architecture to route WebSocket upgrade requests at `/api/test/ws/tasks/{id}`.
  - Dispatch task-level mutation notifications via Django ORM signals (`post_save`, `post_delete` on `LabeledShape`) bridged through Redis pub/sub.
  - Client component listens for broadcast events and automatically refreshes annotation distributions without full page reloads.
* **Phase 10 (Item 9 - Connection Drop & Recovery)**:
  - Frontend detects socket disconnects, renders a non-intrusive status badge (`Connecting...` / `Reconnecting...`), and initiates exponential backoff reconnect attempts.
  - Upon reconnection, triggers a reconciliation fetch to ensure counts reflect any modifications made while offline.

