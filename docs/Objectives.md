
## OBJ-1 API Endpoint

| Field | Entry |
|---|---|---|---|:---|:---|:---|:---|:---|
| What is measured | Time for the API endpoint to return the per-class annotation counts for a given task | Browser Network tab, measuring the duration of the fetch request from the UI to the backend endpoint | Median of 5 runs at or below 200 ms | Chrome, cache disabled, local Docker stack, COCO val2017 annotations loaded, superuser session. Specs: [Insert RAM, CPU, OS here], Base CVAT SHA: [Insert SHA from `git rev-parse HEAD`] | First request immediately following a cold Docker container start |

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
