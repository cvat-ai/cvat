---
title: 'Webhook Retry Configuration'
linkTitle: 'Webhook Retries'
weight: 50
description: 'Configure automatic retries for webhook deliveries with exponential backoff'
---

## Overview

CVAT supports configurable automatic retries for webhook deliveries that fail due to temporary issues such as network problems, service outages, or rate limiting. This feature helps make webhook-based integrations more reliable without requiring manual intervention or external retry mechanisms.

## Retry Configuration

When creating or updating a webhook, you can configure the following retry parameters:

### `max_retries`
- **Type:** Integer (0 or greater)
- **Default:** 3
- **Description:** Maximum number of retry attempts for failed deliveries. Set to 0 to disable automatic retries.

### `retry_delay`
- **Type:** Integer (seconds)
- **Default:** 60
- **Description:** Initial delay in seconds before the first retry attempt.

### `retry_backoff_factor`
- **Type:** Float
- **Default:** 2.0
- **Description:** Multiplier for exponential backoff between retries.
  - `1.0` = Fixed delay (each retry waits the same amount of time)
  - `2.0` = Exponential backoff (delay doubles after each retry)
  - Higher values = More aggressive backoff

## Retry Behavior

### When Retries are Triggered

Automatic retries are triggered for the following conditions:

- **Network errors:** Connection failures, timeouts
- **HTTP 408:** Request Timeout
- **HTTP 429:** Too Many Requests (rate limiting)
- **HTTP 5xx:** Server errors (500, 502, 503, 504)

### When Retries are NOT Triggered

Retries are not attempted for:

- **Successful responses:** HTTP 2xx status codes
- **Client errors:** HTTP 4xx status codes (except 408 and 429)
- **Manual redeliveries:** Manually triggered redeliveries through the API
- **Disabled webhooks:** Webhooks with `max_retries` set to 0

### Retry Delay Calculation

The delay before each retry is calculated using exponential backoff with jitter:

```
delay = retry_delay × (retry_backoff_factor ^ (attempt_number - 1)) + jitter
```

- **Jitter:** Random value up to 10% of the delay to prevent thundering herd
- **Maximum delay:** Capped at 1 hour (3600 seconds)

#### Example Delays

With default settings (`retry_delay=60`, `retry_backoff_factor=2.0`):

- Attempt 1 (initial): Immediate
- Attempt 2 (retry 1): ~60 seconds
- Attempt 3 (retry 2): ~120 seconds
- Attempt 4 (retry 3): ~240 seconds

## API Examples

### Creating a Webhook with Custom Retry Configuration

```bash
curl -X POST 'https://app.cvat.ai/api/webhooks' \
  -H 'Authorization: Token <your_token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "target_url": "https://example.com/webhook",
    "description": "My webhook with custom retries",
    "type": "project",
    "project_id": 1,
    "events": ["create:task", "update:task"],
    "max_retries": 5,
    "retry_delay": 120,
    "retry_backoff_factor": 1.5
  }'
```

### Creating a Webhook with Retries Disabled

```bash
curl -X POST 'https://app.cvat.ai/api/webhooks' \
  -H 'Authorization: Token <your_token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "target_url": "https://example.com/webhook",
    "description": "Webhook without retries",
    "type": "project",
    "project_id": 1,
    "events": ["create:task"],
    "max_retries": 0
  }'
```

### Updating Retry Configuration

```bash
curl -X PATCH 'https://app.cvat.ai/api/webhooks/<webhook_id>' \
  -H 'Authorization: Token <your_token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "max_retries": 10,
    "retry_delay": 300,
    "retry_backoff_factor": 3.0
  }'
```

## Delivery History

Each delivery attempt is recorded separately in the delivery history. You can view:

- **attempt_number:** Which attempt this was (1 for initial delivery, 2+ for retries)
- **next_retry_date:** When the next retry is scheduled (if applicable)
- **status_code:** HTTP status code returned by the receiver
- **response:** Response body from the receiver

### Example: Viewing Delivery History

```bash
curl 'https://app.cvat.ai/api/webhooks/<webhook_id>/deliveries' \
  -H 'Authorization: Token <your_token>'
```

Response:
```json
{
  "count": 3,
  "results": [
    {
      "id": 123,
      "webhook_id": 1,
      "event": "create:task",
      "status_code": 200,
      "attempt_number": 3,
      "next_retry_date": null,
      "created_date": "2026-02-17T10:05:00Z"
    },
    {
      "id": 122,
      "webhook_id": 1,
      "event": "create:task",
      "status_code": 503,
      "attempt_number": 2,
      "next_retry_date": "2026-02-17T10:05:00Z",
      "created_date": "2026-02-17T10:03:00Z"
    },
    {
      "id": 121,
      "webhook_id": 1,
      "event": "create:task",
      "status_code": 503,
      "attempt_number": 1,
      "next_retry_date": "2026-02-17T10:03:00Z",
      "created_date": "2026-02-17T10:01:00Z"
    }
  ]
}
```

## Best Practices

### Recommended Settings

**For Most Use Cases:**
- `max_retries`: 3-5
- `retry_delay`: 60-120 seconds
- `retry_backoff_factor`: 2.0

**For Rate-Limited APIs:**
- `max_retries`: 5-10
- `retry_delay`: 120-300 seconds
- `retry_backoff_factor`: 2.0-3.0

**For Critical Webhooks:**
- `max_retries`: 10
- `retry_delay`: 60 seconds
- `retry_backoff_factor`: 1.5 (less aggressive)

### Receiver Best Practices

On the receiver side:

1. **Implement idempotency:** Handle duplicate deliveries gracefully (retries send the same payload)
2. **Return appropriate status codes:** Use 2xx for success, 5xx for temporary failures
3. **Respond quickly:** Don't block on long operations; acknowledge receipt and process asynchronously
4. **Use rate limit headers:** Return HTTP 429 with `Retry-After` header when rate limited

## Troubleshooting

### All Retries Exhausted

If all retry attempts fail, the last delivery will show:
- `status_code`: The final HTTP status code
- `attempt_number`: Equal to `max_retries + 1`
- `next_retry_date`: `null` (no more retries scheduled)

You can manually redeliver using the redelivery endpoint if needed.

### Retries Not Happening

Check that:
1. `max_retries` is greater than 0
2. The status code is retryable (408, 429, 5xx, or network error)
3. The webhook is still active (`is_active: true`)
4. The webhook worker is running

### Too Many Retries

If you're seeing too many retry attempts:
1. Reduce `max_retries`
2. Increase `retry_delay` or `retry_backoff_factor`
3. Fix the root cause in your receiver service

## See Also

- [Webhooks Guide](/docs/manual/advanced/webhooks)
- [REST API Reference](/docs/api_sdk/api/)
