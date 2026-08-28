# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Watch a project for newly created tasks via a webhook: register the webhook
pointing at this machine, receive the deliveries with a local HTTP server, and
tally each 'create:task' event.

The server signs every delivery with the webhook secret (HMAC-SHA256 of the
request body in the 'X-Signature-256' header). The receiver recomputes the
signature and rejects deliveries that don't match, so nobody who merely knows
the URL can inject fake events. --public-url is how the CVAT server reaches
this machine (a public IP, a DNS name, or a tunnel), while --port is where the
receiver listens locally.

Steps:
  1. Start an HTTP server on --port.
  2. Register a webhook for the project's 'create:task' events, targeting
     --public-url.
  3. For every delivery: verify the signature, then tally the event.
  4. On Ctrl-C (or after --max-events deliveries), print the tallies.
  5. Optionally delete the webhook (--cleanup).

Usage (run ``python webhook_resource_monitoring.py --help`` for the full list of options):
  python webhook_resource_monitoring.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --project-id 7 --public-url 'https://my-tunnel.example.com/payload' \\
      --port 8000 --secret 'w3bh00k'
"""

import argparse
import hashlib
import hmac
import json
from collections import Counter
from http.server import BaseHTTPRequestHandler, HTTPServer

from cvat_sdk import make_client, models

MONITORING_EVENTS = ["create:task"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'")
    parser.add_argument(
        "--token",
        required=True,
        help="Personal Access Token (CVAT UI: Profile -> Security)",
    )
    parser.add_argument(
        "--project-id", type=int, required=True, help="id of an existing project, e.g. 7"
    )
    parser.add_argument(
        "--public-url",
        required=True,
        help="URL under which the CVAT server can reach this machine, "
        "e.g. 'https://my-tunnel.example.com/payload'",
    )
    parser.add_argument(
        "--port", type=int, default=8000, help="local port to listen on (default: %(default)s)"
    )
    parser.add_argument(
        "--secret", required=True, help="secret the server signs the deliveries with"
    )
    parser.add_argument(
        "--max-events",
        type=int,
        help="stop after this many verified events (default: run until Ctrl-C)",
    )
    parser.add_argument(
        "--cleanup", action="store_true", help="delete the created webhook at the end"
    )
    return parser.parse_args()


class DeliveryHandler(BaseHTTPRequestHandler):
    """One CVAT delivery per request: verify the signature, tally the event."""

    # Set on the subclass by make_handler()
    secret: bytes
    event_counter: Counter
    rejected: int = 0

    def log_message(self, format: str, *args) -> None:  # pylint: disable=redefined-builtin
        pass  # the tallies below replace the default per-request log line

    def do_POST(self) -> None:
        body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        expected = "sha256=" + hmac.new(type(self).secret, body, hashlib.sha256).hexdigest()
        provided = self.headers.get("X-Signature-256", "")
        if not hmac.compare_digest(expected, provided):
            type(self).rejected += 1
            self.send_response(403)
            self.end_headers()
            return

        self.send_response(200)
        self.end_headers()

        payload = json.loads(body)
        event_type = payload["event"]
        if event_type == "ping":
            print("Ping from the server", flush=True)
            return

        type(self).event_counter[event_type] += 1
        if event_type == "create:task":
            task = payload["task"]
            print(f"  new task {task['id']}: {task.get('name')!r}", flush=True)


def make_handler(secret: str) -> type:
    return type(
        "Handler",
        (DeliveryHandler,),
        {"secret": secret.encode(), "event_counter": Counter()},
    )


def summarize(counter: Counter) -> str:
    return ", ".join(f"{key} x{count}" for key, count in sorted(counter.items())) or "-"


def main() -> None:
    args = parse_args()
    handler = make_handler(args.secret)
    with make_client(args.host, access_token=args.token) as client:
        webhooks_api = client.api_client.webhooks_api
        with HTTPServer(("", args.port), handler) as receiver:
            webhook, _ = webhooks_api.create(
                models.WebhookWriteRequest(
                    target_url=args.public_url,
                    type=models.WebhookType("project"),
                    events=[models.EventsEnum(event) for event in MONITORING_EVENTS],
                    content_type=models.WebhookContentType("application/json"),
                    secret=args.secret,
                    project_id=args.project_id,
                )
            )
            print(f"Created webhook {webhook.id} -> {webhook.target_url}", flush=True)
            print(f"Listening on port {args.port}; press Ctrl-C to stop", flush=True)

            try:
                while (
                    args.max_events is None
                    or sum(handler.event_counter.values()) < args.max_events
                ):
                    receiver.handle_request()
            except KeyboardInterrupt:
                pass

        print(
            f"Received {sum(handler.event_counter.values())} events: "
            f"{summarize(handler.event_counter)}"
        )
        print(f"Rejected {handler.rejected} deliveries with a bad signature")

        if args.cleanup:
            webhooks_api.destroy(webhook.id)
            print(f"Deleted webhook {webhook.id}")
        else:
            print("Keeping the webhook; pass --cleanup to delete it")


if __name__ == "__main__":
    main()
