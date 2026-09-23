---
title: 'Webhook recipes'
linkTitle: 'Webhooks'
weight: 9
description: 'Register a webhook for task events and watch new tasks appear live with a local receiver'
---

Two recipes: `register_webhook.py` creates a webhook for task events on a
project or an organization, pings it, and summarizes its recorded deliveries;
`webhook_resource_monitoring.py` is the receiving side — it runs a local HTTP
server, registers a webhook pointing at it, verifies each delivery's signature,
and tallies the tasks created in the project as they arrive.

CVAT signs every delivery with the webhook secret: the `X-Signature-256`
header carries `sha256=<HMAC-SHA256 of the request body>`. A receiver that
recomputes and compares the signature (as `webhook_resource_monitoring.py`
does) can be sure the payload came from the server and not from someone who
merely knows the URL.

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
python register_webhook.py --host 'https://app.cvat.ai' --token '<your token>' \
    --project-id 7 --target-url 'https://ci.example.com/cvat-events' --secret 'w3bh00k'
python register_webhook.py --host 'https://app.cvat.ai' --token '<your token>' \
    --org 'annotators' --target-url 'https://ci.example.com/cvat-events' --secret 'w3bh00k'
```

### The script

{{< include-code "assets/sdk-examples/register_webhook.py" >}}

## Watch new tasks appear live

Starts a local HTTP server on `--port`, registers a `create:task` webhook for
the project targeting `--public-url` (how the CVAT server reaches this machine
— a public IP, a DNS name, or a tunnel), and then, for every delivery: verifies
the signature, tallies the event, and prints the new task's id and name. On
Ctrl-C — or after `--max-events` verified events — it prints the tallies and
how many deliveries were rejected for a bad signature.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--project-id` | yes | Project whose new tasks to watch |
| `--public-url` | yes | URL under which the CVAT server can reach this machine |
| `--port` | no | Local port to listen on (default `8000`) |
| `--secret` | yes | Secret the server signs the deliveries with |
| `--max-events` | no | Stop after this many verified events (default: run until Ctrl-C) |
| `--cleanup` | no | Delete the created webhook at the end |

```bash
python webhook_resource_monitoring.py --host 'https://app.cvat.ai' --token '<your token>' \
    --project-id 7 --public-url 'https://my-tunnel.example.com/payload' \
    --port 8000 --secret 'w3bh00k'
```

### The script

{{< include-code "assets/sdk-examples/webhook_resource_monitoring.py" >}}

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
  resource, and the `sender`.
- An organization webhook lives in the organization's scope, so every call
  about it must be made in that organization's context
  (`client.organization_context(slug)`).
- A third webhook scope, `type="server"`, exists for server-wide events
  (user and organization lifecycle events) and is restricted to admin
  accounts; it isn't covered by these two project/organization recipes. See
  {{< ilink "/docs/administration/community/advanced/webhooks#for-server-admin-only" "the Webhooks guide" >}}
  for details.
- The delivery list is paginated like every list endpoint;
  `get_paginated_collection()` walks all the pages.
- Full recipes:
  [`register_webhook.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/register_webhook.py),
  [`webhook_resource_monitoring.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/webhook_resource_monitoring.py).
