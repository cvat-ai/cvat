THREAD_POOL_WORKER_JOB_HEARTBEAT_TTL_SLACK_SEC: int = 60
"""
Slack (seconds) added on top of `task_execution_time_threshold` to compute the
per-job heartbeat TTL written to StartedJobRegistry. Grace window for our
success/failure pipeline to remove the job entry after the SLO boundary, before
another worker's `clean_registries` pass considers it abandoned and retries it.
This is the job's heartbeat TTL, not the worker's own heartbeat.
"""
