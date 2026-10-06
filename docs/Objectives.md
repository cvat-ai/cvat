# Objectives

Measurable targets for this assessment. At least one objective required (assessment §6).

**Machine context** (fill when measuring):

| Field | Value |
|-------|--------|
| CPU | _TBD_ |
| RAM | _TBD_ |
| OS | Windows 10 |
| CVAT commit | `98ee84d0fb5f677d31acf71ec5f797f560f00f5f` |
| Sample data | COCO val2017; _N_ images in task _TBD_ |

---

## MO-1 — API endpoint latency (planned)

| Field | Entry |
|-------|--------|
| **What is measured** | Time from authenticated HTTP request received until JSON response with per-class counts is complete (server-side or end-to-end via `curl`/browser — method chosen before first run). |
| **How** | Five repeated calls to the `test` analytics endpoint for a fixed `task_id` with warm DB; raw timings pasted below. |
| **Target** | Median ≤ _TBD_ ms (justified against local Docker + sample task size). |
| **Conditions** | Local Docker stack, same task, no other heavy jobs; method documented here before runs. |
| **Not included** | Cold start after `docker compose down`, WebSocket path, first-time COCO import. |

### Raw runs (paste output)

```
Run 1:
Run 2:
Run 3:
Run 4:
Run 5:

Median:
Spread (min–max or stdev):
Target met? (yes/no + reason):
```

### Target justification

_TBD after endpoint exists — explain why the number is meaningful for this stack, not trivially easy._
