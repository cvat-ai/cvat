### Deprecated

- \[Server API\] The `changed_fields` field of webhook delivery responses is
  deprecated. It is kept for historical deliveries and is always empty for
  new ones
  (<https://github.com/cvat-ai/cvat/pull/11104>)

### Removed

- \[Server API\] Webhook payloads for `update:<resource>` events no longer
  contain the `before_update` and `changes` keys.
  (<https://github.com/cvat-ai/cvat/pull/11104>)
