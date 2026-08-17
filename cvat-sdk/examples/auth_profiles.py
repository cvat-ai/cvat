# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Authenticate without putting a token in your code: saved profiles (recommended),
with the deprecated username/password sign-in as a fallback.

Create a profile once on the command line, then any script can use it:

  cvat-cli --server-host https://app.cvat.ai profile create --name app --set-default

Steps:
  1. If CVAT_PROFILE is set, use that profile; otherwise try the default profile.
  2. If no profile exists and CVAT_USERNAME/CVAT_PASSWORD are set, fall back to
     the DEPRECATED password sign-in (kept for local/dev servers only).
  3. Print who you are authenticated as.

Usage:
  export CVAT_PROFILE=app                 # or rely on the default profile
  python auth_profiles.py

  # deprecated fallback:
  export CVAT_HOST=https://app.cvat.ai
  export CVAT_USERNAME=me
  export CVAT_PASSWORD=secret
  python auth_profiles.py
"""

import os
import sys

from cvat_sdk import Client, make_client
from cvat_sdk.core.auth import AuthStore, make_client_from_profile


def require_env(name: str, hint: str) -> str:
    value = os.environ.get(name)
    if not value:
        sys.exit(f"Set the {name} environment variable: {hint}")
    return value


PROFILE_NAME = os.environ.get("CVAT_PROFILE")
USERNAME = os.environ.get("CVAT_USERNAME")
PASSWORD = os.environ.get("CVAT_PASSWORD")


def open_client() -> Client:
    if PROFILE_NAME:
        profile = AuthStore().get_profile(PROFILE_NAME)
        if profile is None:
            sys.exit(f"Profile {PROFILE_NAME!r} not found. Create it with cvat-cli.")
        print(f"Using profile {PROFILE_NAME!r}")
        return make_client_from_profile(profile)

    if USERNAME and PASSWORD:
        host = require_env("CVAT_HOST", "your CVAT server URL, e.g. https://app.cvat.ai")
        return make_client(host, credentials=(USERNAME, PASSWORD))

    default = AuthStore().get_default_profile()
    if default is None:
        sys.exit(
            "No credentials configured. Either create a profile:\n"
            "    cvat-cli --server-host https://app.cvat.ai profile create --name app --set-default\n"
            "or set CVAT_USERNAME and CVAT_PASSWORD (deprecated fallback)."
        )
    name, profile = default
    print(f"Using default profile {name!r}")
    return make_client_from_profile(profile)


def main() -> None:
    with open_client() as client:
        me = client.users.retrieve_current_user()
        print(f"Authenticated as {me.username} (id={me.id})")


if __name__ == "__main__":
    main()
