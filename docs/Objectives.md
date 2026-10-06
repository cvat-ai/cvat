
## OBJ-1 API Endpoint

| Field | Entry |
|---|---|
| **ID** | OBJ-1 |
| **What is measured** | Time for the API endpoint to return the per-class annotation counts for a given task |
| **How it is measured** | Using a direct Python request (or Browser Network tab) measuring the duration of the fetch request from the UI to the backend endpoint |
| **Target** | Median of 5 runs at or below 200 ms |
| **Conditions** | Local Docker stack (`localhost:8080`), COCO val2017 annotations loaded, superuser session. Specs: macOS 25.6.0 (ARM64), 12-core CPU, 24GB RAM, Base CVAT SHA: `d8193c584be9ce6cf9882dad06c0dd920cc0b9c5` |
| **What is not included** | First request immediately following a cold Docker container start (cache warm-up) |

## Raw Benchmark Results

| Run # | Response Time (ms) |
|---|---|:---|:---|
| Run 1 | 32.40 |
| Run 2 | 13.26 |
| Run 3 | 12.02 |
| Run 4 | 9.43 |
| Run 5 | 8.58 |

- **Median:** 12.02 ms
- **Spread (Min - Max):** 8.58 ms - 32.40 ms
- **Status:** [x] Target Met / [ ] Target Missed (Provide brief explanation if missed)
