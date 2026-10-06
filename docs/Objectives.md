# Objectives & Benchmark Report

## 1. System Environment
* **Operating System**: Microsoft Windows 10 Pro (Version 10.0.19045, 64-bit)
* **CPU**: Intel(R) Core(TM) i5-6300U CPU @ 2.40GHz (2 Cores, 4 Logical Processors)
* **RAM**: 16.0 GB
* **Cloned CVAT Base SHA**: `d8193c584be9ce6cf9882dad06c0dd920cc0b9c5`

---

## 2. Measurable Objective Specification

| ID | Field | Entry |
| :--- | :--- | :--- |
| **MO-1** | **What is measured** | Response time of the annotation analytics endpoint (`/api/test/tasks/{id}/annotation-counts`) from HTTP request reception through authentication, task authorization, database ORM aggregation, and JSON serialization. |
| | **How** | Python high-resolution monotonic timer (`time.perf_counter`), timed between request dispatch into the DRF handler and serialized response generation across 5 sequential runs. |
| | **Target** | Median of 5 runs at or below 50.0 ms. |
| | **Conditions** | Windows 10 Pro, Intel Core i5-6300U @ 2.40 GHz, 16 GB RAM, local test environment, background workloads minimized. |
| | **Not included** | Framework cold start and external network transport transit latency. |

---

## 3. Benchmark Execution Results

### Raw Output (Pasted from Machine)
```text
============================================================
BENCHMARK EXECUTION (5 RUNS)
============================================================
Run 1: 1.47 ms
Run 2: 1.35 ms
Run 3: 1.40 ms
Run 4: 1.36 ms
Run 5: 1.30 ms
------------------------------------------------------------
Raw Timing Vector (ms): [1.47, 1.35, 1.40, 1.36, 1.30]
Median: 1.36 ms
Spread: 0.17 ms (Min: 1.30 ms, Max: 1.47 ms)
============================================================
```

### Analysis & Target Verification
* **Target**: Median response time $\le$ 50.00 ms.
* **Measured Median**: **1.36 ms** (Target cleared by 48.64 ms).
* **Measured Spread**: **0.17 ms** across 5 runs, demonstrating stable and low query jitter.
* **Justification**: The query relies entirely on database-level aggregation (`values('label_id', 'label__name').annotate(count=Count('id'))`) backed by indexed foreign keys on `job__segment__task_id`. This executes in single-digit milliseconds without allocating or serializing in-memory annotation instances.
