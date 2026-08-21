# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Build a CLI-compatible script that reuses ``cvat-cli``'s auth argument set:
``--server-host`` / ``--server-port`` / ``--auth`` / ``--profile`` / ``--insecure`` / ``--organization``.

This is the go-to pattern when your script should feel like an extension of
``cvat-cli`` — it accepts the same flags, honors the ``CVAT_ACCESS_TOKEN`` and
``PASS`` env variables, and resolves profiles the same way (explicit
``--profile``, else the default profile if no host/auth is passed).

Steps:
  1. Register the shared auth flags with ``configure_client_auth_arguments()``.
  2. Add your own script-specific arguments on top.
  3. Hand the parsed namespace to ``make_client_from_cli()`` to create a server API client object.

Usage (run ``python auth_cli.py --help`` for the full list of options):
  python auth_cli.py --profile app

  # export CVAT_ACCESS_TOKEN='<token>'  # for macOS/Linux
  # $env:CVAT_ACCESS_TOKEN = "<token>"  # for PowerShell
  python auth_cli.py --server-host 'https://app.cvat.ai'

  python auth_cli.py --server-host 'https://app.cvat.ai' --auth me:secret
"""

import argparse

from cvat_sdk import make_client_from_cli
from cvat_sdk.core.auth import configure_client_auth_arguments


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=" ".join(__doc__.splitlines()[:2]))
    configure_client_auth_arguments(parser)
    # Add your script's own arguments here, e.g.
    # parser.add_argument("--task-id", type=int, required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    with make_client_from_cli(args) as client:
        me = client.users.retrieve_current_user()
        print(f"Authenticated as {me.username} (id={me.id})")


if __name__ == "__main__":
    main()
