---
title: 'Webhook recipes'
linkTitle: 'Webhooks'
weight: 9
description: 'Register a webhook for task events and monitor task status changes live with a local receiver'
---

Two recipes: `webhook_register.py` creates a webhook for task events on a
project or an organization, pings it, and summarizes its recorded deliveries;
`webhook_monitor.py` is the receiving side — it runs a local HTTP server,
registers a webhook pointing at it, verifies each delivery's signature, and
aggregates task status changes live.

CVAT signs every delivery with the webhook secret: the `X-Signature-256`
header carries `sha256=<HMAC-SHA256 of the request body>`. A receiver that
recomputes and compares the signature (as `webhook_monitor.py` does) can be
sure the payload came from the server and not from someone who merely knows
the URL.

## Register a webhook and inspect its deliveries

Creates a webhook scoped to a project (`--project-id`) or a whole organization
(`--org`), sends a test ping, then lists all recorded deliveries with
`get_paginated_collection()` and prints how many there are per HTTP status.
There is no high-level proxy for webhooks yet, so the recipe shows the
low-level `client.api_client.webhooks_api`.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--project-id` | one of `--project-id` / `--org` | Watch one project |
| `--org SLUG` | one of `--project-id` / `--org` | Watch a whole organization |
| `--target-url` | yes | Where the server delivers the events |
| `--secret` | yes | Secret the server signs the deliveries with |
| `--events` | no | Events to subscribe to (default: `create:task update:task delete:task`) |
| `--cleanup` | no | Delete the created webhook at the end |

```bash
python webhook_register.py --host 'https://app.cvat.ai' --token '<your token>' \
    --project-id 7 --target-url 'https://ci.example.com/cvat-events' --secret 'w3bh00k'
python webhook_register.py --host 'https://app.cvat.ai' --token '<your token>' \
    --org 'annotators' --target-url 'https://ci.example.com/cvat-events' --secret 'w3bh00k'
```

### The script

{{< include-code "assets/sdk-examples/webhook_register.py" >}}

## Monitor task status changes live

Starts a local HTTP server on `--port`, registers a project webhook targeting
`--public-url` (how the CVAT server reaches this machine — a public IP, a DNS
name, or a tunnel), and then, for every delivery: verifies the signature,
tallies the event, and for task updates prints and tallies the status change.
On Ctrl-C — or after `--max-events` verified events — it prints the tallies.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--project-id` | yes | Project whose task events to monitor |
| `--public-url` | yes | URL under which the CVAT server can reach this machine |
| `--port` | no | Local port to listen on (default `8000`) |
| `--secret` | yes | Secret the server signs the deliveries with |
| `--max-events` | no | Stop after this many verified events (default: run until Ctrl-C) |
| `--cleanup` | no | Delete the created webhook at the end |

```bash
python webhook_monitor.py --host 'https://app.cvat.ai' --token '<your token>' \
    --project-id 7 --public-url 'https://my-tunnel.example.com/payload' \
    --port 8000 --secret 'w3bh00k'
```

### The script

{{< include-code "assets/sdk-examples/webhook_monitor.py" >}}

_Other SDK options:_

| SDK method / parameter | What it adds |
| --- | --- |
| `webhooks_api.list(project_id=, target_url=, type=, ...)` | Filter the webhook list server-side. |
| `webhooks_api.retrieve_events()` | The full list of event names a webhook can subscribe to. |
| `webhooks_api.create_deliveries_redelivery(id, delivery_id)` | Re-send a failed delivery. |
| `webhooks_api.partial_update(id, patched_webhook_write_request=...)` | Change a webhook's target, events, or active state in place. |
| `WebhookWriteRequest(..., is_active=False)` | Create a webhook disabled, to be enabled later. |
| `WebhookWriteRequest(..., enable_ssl=False)` | Skip TLS certificate verification for self-signed receivers. |

_Notes:_

- Webhook payloads carry the event name (e.g. `update:task`), the serialized
  resource, the `sender`, and — for updates — `before_update`/`changes` with
  the old field values.
- An organization webhook lives in the organization's scope, so every call
  about it must be made in that organization's context
  (`client.organization_context(slug)`).
- The delivery list is paginated like every list endpoint;
  `get_paginated_collection()` walks all the pages.
- Full recipes:
  [`webhook_register.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/webhook_register.py),
  [`webhook_monitor.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/webhook_monitor.py).
