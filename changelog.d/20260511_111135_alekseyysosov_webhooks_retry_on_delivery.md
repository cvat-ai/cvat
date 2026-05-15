### Added

- Webhook deliveries are now retried automatically on 5xx, connection errors,
  and timeouts, with backoff 5s → 5min → 30min → 3h → 24h × 4
  (<https://github.com/cvat-ai/cvat/pull/10578>)
