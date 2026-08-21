### Fixed

- Prevent duplicate annotations when a create request succeeds on the server but
  the client loses the response (e.g. proxy timeout): annotation objects now
  carry a client-generated `uuid` used as an idempotency key on create
  (<https://github.com/cvat-ai/cvat/issues/10503>)
