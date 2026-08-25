# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Register a webhook for task events on a project or an organization, send a
test ping, and summarize the webhook's recorded deliveries.

The server signs every delivery with the webhook secret (HMAC-SHA256 in the
'X-Signature-256' header), so the receiver can verify the payload really came
from CVAT — see webhook_monitor.py for the receiving side.

Steps:
  1. Create the webhook: scoped to a project (--project-id) or to a whole
     organization (--org). Low-level API: there is no high-level proxy for
     webhooks yet.
  2. Send a ping — the server POSTs a test payload to --target-url and records
     the delivery.
  3. List all recorded deliveries with get_paginated_collection() and print
     how many there are per HTTP status.
  4. Optionally delete the webhook (--cleanup).

Usage (run ``python webhook_register.py --help`` for the full list of options):
  python webhook_register.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --project-id 7 --target-url 'https://ci.example.com/cvat-events' --secret 'w3bh00k'
  python webhook_register.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --org 'annotators' --target-url 'https://ci.example.com/cvat-events' --secret 'w3bh00k'
"""

import argparse
import contextlib
from collections import Counter

from cvat_sdk import make_client, models
from cvat_sdk.core.helpers import get_paginated_collection


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'")
    parser.add_argument(
        "--token",
        required=True,
        help="Personal Access Token (CVAT UI: Profile -> Security)",
    )
    scope = parser.add_mutually_exclusive_group(required=True)
    scope.add_argument("--project-id", type=int, help="id of an existing project, e.g. 7")
    scope.add_argument("--org", metavar="SLUG", help="organization slug to watch as a whole")
    parser.add_argument(
        "--target-url",
        required=True,
        help="where the server delivers the events, e.g. 'https://ci.example.com/cvat-events'",
    )
    parser.add_argument(
        "--secret", required=True, help="secret the server signs the deliveries with"
    )
    parser.add_argument(
        "--events",
        nargs="+",
        default=["create:task", "update:task", "delete:task"],
        help="events to subscribe to (default: %(default)s)",
    )
    parser.add_argument(
        "--cleanup", action="store_true", help="delete the created webhook at the end"
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    with make_client(args.host, access_token=args.token) as client:
        webhooks_api = client.api_client.webhooks_api

        if args.org is not None:
            scope_context = client.organization_context(args.org)
            spec = models.WebhookWriteRequest(
                target_url=args.target_url,
                type=models.WebhookType("organization"),
                events=[models.EventsEnum(event) for event in args.events],
                content_type=models.WebhookContentType("application/json"),
                secret=args.secret,
            )
            scope_label = f"organization {args.org!r}"
        else:
            scope_context = contextlib.nullcontext()
            spec = models.WebhookWriteRequest(
                target_url=args.target_url,
                type=models.WebhookType("project"),
                events=[models.EventsEnum(event) for event in args.events],
                content_type=models.WebhookContentType("application/json"),
                secret=args.secret,
                project_id=args.project_id,
            )
            scope_label = f"project {args.project_id}"

        with scope_context:
            webhook, _ = webhooks_api.create(spec)
            print(f"Created webhook {webhook.id} for {scope_label} -> {webhook.target_url}")
            print(f"  events: {[str(event) for event in webhook.events]}")

            delivery, _ = webhooks_api.create_ping(webhook.id)
            print(f"Ping delivery: HTTP {delivery.status_code or 'failed'}")

            # A busy webhook accumulates pages of deliveries; the list endpoint
            # is paginated like every list in the API, and
            # get_paginated_collection() walks all the pages for you.
            deliveries = get_paginated_collection(
                webhooks_api.list_deliveries_endpoint, id=webhook.id
            )
            by_status = Counter(delivery.status_code for delivery in deliveries)
            summary = ", ".join(f"{status} x{count}" for status, count in sorted(by_status.items()))
            print(f"Webhook {webhook.id}: {len(deliveries)} deliveries, by status: {summary}")

            if args.cleanup:
                webhooks_api.destroy(webhook.id)
                print(f"Deleted webhook {webhook.id}")
            else:
                print("Keeping the webhook; pass --cleanup to delete it")


if __name__ == "__main__":
    main()
