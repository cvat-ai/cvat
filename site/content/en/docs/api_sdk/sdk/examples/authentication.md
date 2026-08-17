---
title: 'Authenticate a client'
linkTitle: 'Authentication'
weight: 1
description: 'Copy-and-run auth recipes: PAT (recommended), saved profiles, and the deprecated password fallback'
---

Two recipes: `auth_connect.py` is the recommended PAT path; `auth_profiles.py` shows
saved profiles plus the deprecated password fallback.

## Connect with a Personal Access Token

Opens an authenticated client with a PAT, prints the server version, and prints
who you are — a quick sanity check any script can copy.

| Variable | Required | Meaning |
| --- | --- | --- |
| `CVAT_HOST` | yes | Server URL, e.g. `https://app.cvat.ai` |
| `CVAT_ACCESS_TOKEN` | yes | Token created in the CVAT UI (Profile -> Security) |

```bash
export CVAT_HOST=https://app.cvat.ai
export CVAT_ACCESS_TOKEN=...
python auth_connect.py
```

### The script

```python
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
```

## Sign in from a saved profile (or the deprecated password fallback)

Uses a saved CLI profile so no secret lives in the code. Falls back to
username/password sign-in only if `CVAT_USERNAME` and `CVAT_PASSWORD` are set —
that path is deprecated and will be removed in a future release.

Create a profile once:

```bash
cvat-cli --server-host https://app.cvat.ai profile create --name app --set-default
```

| Variable | Required | Meaning |
| --- | --- | --- |
| `CVAT_PROFILE` | no | Profile to use; falls back to the default profile if unset |
| `CVAT_HOST` | fallback only | Server URL, required for the password fallback |
| `CVAT_USERNAME` | fallback only | Username, deprecated fallback only |
| `CVAT_PASSWORD` | fallback only | Password, deprecated fallback only |

```bash
export CVAT_PROFILE=app
python auth_profiles.py
```

### The script

```python
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
```

_Notes:_

- Create a profile once on the CLI, then reuse it with no secret in your code:
  `cvat-cli --server-host https://app.cvat.ai profile create --name app --set-default`.
- Username/password sign-in is a **deprecated** fallback for local/dev servers only
  and will be removed in a future release.
- Full recipes:
  [`auth_connect.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/auth_connect.py),
  [`auth_profiles.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/auth_profiles.py).
