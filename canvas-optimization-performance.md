# Canvas optimization performance measurements

Measured on the 2,158-object job: [hosted job](https://app.cvat.ai/tasks/2610857/jobs/4497672) and [local job](http://localhost:3000/tasks/239/jobs/244).

| Measurement | Hosted baseline | Local baseline | After fixes 1–2 | After fixes 1–2–3–5 |
|---|---:|---:|---:|---:|
| Workspace ready | ≈23 s | ≈94 s | 25.61 s | **6.54 s** |
| Browser load event | 1.72 s | 5.05 s | 10.97 s | **1.00 s** |
| Object hover latency, median | 422 ms | 495.2 ms | 56.5 ms | **12.2 ms** |
| Object hover latency, highest sample | 963.9 ms | 1,676.5 ms | 191.3 ms | **68.8 ms** |
| Objects → Labels | 2,001 ms | 4,424.7 ms | 62.3 ms to next task; rows retained | **182 ms median to full unmount** |
| DOM nodes with Objects active | 119,414 | 119,390 | 3,194 | **3,139** |
| Mounted object rows with Objects active | 2,158 | 2,158 | 6 | **5** |
| Mounted object rows after selecting Labels | 2,158 | 2,158 | 6 | **0** |
| DOM nodes with Labels active | ≈119,000 | ≈119,000 | 3,225 | **2,828** |
| Mounted object rows after collapsing sidebar | 2,158 | 2,158 | 6 | **0** |
| DOM nodes with sidebar collapsed | — | — | — | **2,768** |
| SVG descendants with Objects active | 17,404 | 17,404 | 2,340 | **2,333** |
| Canvas shapes | 2,158 | 2,158 | 2,158 | **2,158** |

Final hover-to-next-task samples: `68.8, 10.8, 11.4, 12.6, 12.2 ms`.

Fixes 1–2 stabilize the empty hidden-layer set and virtualize the Objects list. Fix 3 caches object lookup by client ID. Fix 5 unmounts the Objects list when another tab is selected or the sidebar is collapsed.

The final Objects → Labels figure measures completion of DOM unmounting. Earlier tab-switch figures measured delay to the next event-loop task, so they are not directly comparable. The final load run used a warm cache; the fixes 1–2 run followed a rebuilt, uncached development bundle. Load times need controlled repeated runs before drawing a precise speedup conclusion.

## Local job: before optimizations vs current changes

Same 2,158-object [local job](http://localhost:3000/tasks/239/jobs/244). The baseline is copied from the **Local baseline** column of the first table. The current column is a fresh Chrome measurement on 2026-09-23 with the current working tree and DevTools open (416 px-tall Objects viewport).

| Measurement | Local before changes | Current changes, newly measured | Notes |
|---|---:|---:|---|
| Workspace ready | ≈94 s | **12.06 s median** | Three warm Chrome reloads: 14.41, 12.06, 9.79 s. Baseline cache/build conditions differed; no valid speedup ratio. |
| Browser load event | 5.05 s | **1.15 s median** | Three warm reloads: 1.72, 1.15, 1.12 s, read from Chrome's navigation performance entry. |
| Object hover latency, median | 495.2 ms | **12.0 ms** | 20 real canvas-entry samples, browser event timestamp → next event-loop task. |
| Object hover latency, highest sample | 1,676.5 ms | **253.8 ms** | Highest of those 20 samples; all timers completed before the subsequent pointer-down. |
| Objects → Labels | 4,424.7 ms | **12.2 ms median** | Five in-page click event → next-task samples: 31.1, 13.5, 10.0, 12.2, 9.8 ms. Object rows were already at zero in each next task. |
| DOM nodes with Objects active | 119,390 | **3,139** | ≈38× fewer nodes. |
| Mounted object rows with Objects active | 2,158 | **5** | Only visible rows plus overscan are mounted. |
| DOM nodes with Labels active | ≈119,000 | **2,828** | ≈42× fewer nodes. |
| Mounted object rows with Labels active | 2,158 | **0** | Objects list unmounted. |
| SVG descendants with Objects active | 17,404 | **2,333** | ≈7.5× fewer descendants. |
| Canvas shapes | 2,158 | **2,158** | Canvas shape count is unchanged. |

Workspace-ready timing is wall-clock time from triggering a warm reload until the Objects sidebar shows `Items: 2158`; browser automation and polling overhead are included. Load-event timing is `PerformanceNavigationTiming.loadEventEnd`. Hover timing used a temporary capture listener on actual canvas `mouseover` events and a zero-delay timer; the timer completed before the following click for all 20 samples. Tab-switch timing used the same event-to-next-task method as the original local baseline. Chrome DevTools remained open for the current run. Load-time comparisons remain directional because the baseline cache/build conditions were different.
