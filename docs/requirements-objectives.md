# Objectives

ID | Field | Entry
--- | --- | ---
MO-1 | What is measured | Time from opening the task details page to the first row of per-class counts appearing in the graph.
MO-2 | How | Measure via the browser performance panel between the route request and the chart render in the page component.
MO-3 | Target | Median of 5 runs at or below 350 ms on a local Docker stack with the sample dataset loaded and a warm cache.
MO-4 | Conditions | Chrome, local Docker stack, sample data, no other significant work running.
MO-5 | Not included | First-load cold-start measurements and video tasks.
