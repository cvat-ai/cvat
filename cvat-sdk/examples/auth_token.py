# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Authenticate without putting a token in your code: use a saved profile.

Create a profile once on the command line, then any script can use it:

  cvat-cli --server-host 'https://app.cvat.ai' profile create --name app --set-default

Steps:
  1. If --profile is passed, use that profile; otherwise use the default profile.
  2. Print who you are authenticated as.

Usage (run ``python auth_token.py --help`` for the full list of options):
  python auth_token.py --profile app
  python auth_token.py               # uses the default profile
"""

import argparse
import sys

from cvat_sdk import make_client_from_profile
from cvat_sdk.core.auth import AuthStore


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--profile", help="name of a saved profile; omit to use the default profile"
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    store = AuthStore()
    if args.profile:
        profile = store.get_profile(args.profile)
        if profile is None:
            sys.exit(f"Profile {args.profile!r} not found. Create it with cvat-cli.")
        print(f"Using profile {args.profile!r}")
    else:
        default = store.get_default_profile()
        if default is None:
            sys.exit(
                "No default profile configured. Create one with:\n"
                "    cvat-cli --server-host 'https://app.cvat.ai' profile create"
                " --name app --set-default"
            )
        name, profile = default
        print(f"Using default profile {name!r}")

    with make_client_from_profile(profile) as client:
        me = client.users.retrieve_current_user()
        print(f"Authenticated as {me.username} (id={me.id})")


if __name__ == "__main__":
    main()
