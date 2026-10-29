# Objectives

ID | Field | Entry
--- | --- | ---
MO-1 | What is measured | Time from the annotation-count request starting in the browser to the chart canvas being inserted.
MO-2 | How | Capture browser performance timestamps at count-request start and chart-canvas insertion, then report 5 warm runs and their median.
MO-3 | Target | Median of 5 runs at or below 350 ms on a local Docker stack with the sample dataset loaded and a warm cache.
MO-4 | Conditions | Chrome, local Docker stack, sample data, no other significant work running.
MO-5 | Not included | First-load cold-start measurements and video tasks.
