# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Connect to CVAT with a Personal Access Token (PAT) — the recommended way.

Steps:
  1. Open an authenticated client.
  2. Print the server version.
  3. Print who you are authenticated as (a quick sanity check for scripts).

Usage:
  export CVAT_HOST=https://app.cvat.ai
  export CVAT_ACCESS_TOKEN=...   # create one in the CVAT UI: Profile -> Security
  python auth_connect.py
"""

import os
import sys

from cvat_sdk import make_client


def require_env(name: str, hint: str) -> str:
    value = os.environ.get(name)
    if not value:
        sys.exit(f"Set the {name} environment variable: {hint}")
    return value


HOST = require_env("CVAT_HOST", "your CVAT server URL, e.g. https://app.cvat.ai")
TOKEN = require_env("CVAT_ACCESS_TOKEN", "create one in the CVAT UI: Profile -> Security")


def main() -> None:
    with make_client(HOST, access_token=TOKEN) as client:
        print("Server version:", client.get_server_version())
        me = client.users.retrieve_current_user()
        print(f"Authenticated as {me.username} (id={me.id})")


if __name__ == "__main__":
    main()
