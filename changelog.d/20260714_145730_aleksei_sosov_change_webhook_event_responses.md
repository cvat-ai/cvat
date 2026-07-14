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
