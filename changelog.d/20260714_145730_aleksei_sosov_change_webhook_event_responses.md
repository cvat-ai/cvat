### Added

- \[Server API\] Added webhook events for asynchronous requests:
  `completed:export:annotations`, `completed:export:dataset`,
  `completed:export:backup`, `completed:create:task`, `completed:merge:task`,
  `completed:merge:job`, and `completed:calculate:quality`. Their payloads include
  the completed request in the same format as the `/api/requests/{rq_id}` response
  (<https://github.com/cvat-ai/cvat/pull/10897>)

### Changed

- \[Server API\] Webhook event entries returned by `GET /api/webhooks/events`
  now include the action, resource, group display name, and event key. Webhook
  retrieve and list responses continue to return subscribed event keys.

  Before:

  ```json
  {
    "events": ["create:task"]
  }
  ```

  After:

  ```json
  {
    "events": [
      {
        "action": "create",
        "resource": "task",
        "key": "create:task",
        "group": {
          "display_name": "Task"
        }
      }
    ]
  }
  ```

  (<https://github.com/cvat-ai/cvat/pull/10897>)

### Removed

- \[Server API\] Removed the `create:export` and `create:backup`
  webhook events. Use `completed:export:annotations` or
  `completed:export:dataset` instead of `create:export`, and
  `completed:export:backup` instead of `create:backup`
  (<https://github.com/cvat-ai/cvat/pull/10897>)
