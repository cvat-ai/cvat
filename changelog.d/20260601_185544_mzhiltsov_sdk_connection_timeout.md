### Added

- \[SDK\] A new `Config.request_timeout` option to set a per-request HTTP timeout,
  and a `timeout` argument for `Client.wait_for_completion()` that bounds how long it
  polls a background request before raising `TimeoutError`
  (<https://github.com/cvat-ai/cvat/pull/10701>)

### Fixed

- \[SDK\] A client request could hang indefinitely on a silently-dropped
  keep-alive connection (e.g. closed by a load balancer or NAT). The client now
  enables TCP keepalive and applies a finite default request timeout, so such
  requests fail (and idempotent ones are retried) instead of blocking forever
  (<https://github.com/cvat-ai/cvat/pull/10701>)
