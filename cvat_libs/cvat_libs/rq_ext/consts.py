POOL_FULL_POLL_INTERVAL: float = 0.1
"""
Seconds the main worker loop sleeps before re-checking `_is_threadpool_full`
when the threadpool has no free slot to accept a new job.
"""

JOB_HEARTBEAT_REFRESH_BUFFER_SEC: int = 15
"""
Buffer (seconds) added on top of `job_monitoring_interval` to compute the
per-job heartbeat TTL written to StartedJobRegistry. Sized to outlive one
missed refresh from `_heartbeat_loop` — covers clock skew, brief Redis I/O
hiccups, and scheduling jitter on the heartbeat thread. Not the worker's own
heartbeat.
"""
