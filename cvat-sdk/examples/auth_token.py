# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Connect to CVAT with a Personal Access Token (PAT) — the recommended way.

Steps:
  1. Open an authenticated client.
  2. Print the server version.
  3. Print who you are authenticated as (a quick sanity check for scripts).

Usage (run ``python auth_token.py --help`` for the full list of options):
  python auth_token.py --host 'https://app.cvat.ai' --token '<your token>'

Create a token in the CVAT UI under Profile -> Security.
"""

import argparse

from cvat_sdk import make_client


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'")
    parser.add_argument(
        "--token",
        required=True,
        help="Personal Access Token (create one in the CVAT UI: Profile -> Security)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    with make_client(args.host, access_token=args.token) as client:
        print("Server version:", client.get_server_version())
        me = client.users.retrieve_current_user()
        print(f"Authenticated as {me.username} (id={me.id})")


if __name__ == "__main__":
    main()
