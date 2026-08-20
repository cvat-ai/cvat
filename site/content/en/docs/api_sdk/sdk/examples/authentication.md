---
title: 'Authenticate a client'
linkTitle: 'Authentication'
weight: 1
description: 'Copy-and-run auth recipes: PAT (recommended), saved profiles, and the CLI-compatible argument set'
---

Three recipes: `auth_connect.py` is the recommended PAT path, `auth_profiles.py`
signs in from a saved profile with no secret in your code, and `auth_cli.py`
wires up the shared `cvat-cli` argument set (`--server-host`, `--auth`,
`--profile`, ...) so your scripts feel like an extension of the CLI.

## Connect with a Personal Access Token

Opens an authenticated client with a PAT, prints the server version, and prints
who you are — a quick sanity check any script can copy.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL, e.g. `'https://app.cvat.ai'` |
| `--token` | yes | Token created in the CVAT UI (Profile -> Security) |

```bash
python auth_connect.py --host 'https://app.cvat.ai' --token '<your token>'
```

### The script

```python
"""Connect to CVAT with a Personal Access Token (PAT) — the recommended way.

Steps:
  1. Open an authenticated client.
  2. Print the server version.
  3. Print who you are authenticated as (a quick sanity check for scripts).

Usage (run ``python auth_connect.py --help`` for the full list of options):
  python auth_connect.py --host 'https://app.cvat.ai' --token '<your token>'

Create a token in the CVAT UI under Profile -> Security.
"""

import argparse

from cvat_sdk import make_client


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'"
    )
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
```

## Sign in from a saved profile

Uses a saved CLI profile so no secret lives in the code. Create a profile once
with `cvat-cli`; then any script can pick it by name or fall back to the
default profile.

Create a profile once:

```bash
cvat-cli --server-host 'https://app.cvat.ai' profile create --name app --set-default
```

| Flag | Required | Meaning |
| --- | --- | --- |
| `--profile` | no | Name of a saved profile; omit to use the default profile |

```bash
python auth_profiles.py --profile app
python auth_profiles.py               # uses the default profile
```

### The script

```python
"""Authenticate without putting a token in your code: use a saved profile.

Create a profile once on the command line, then any script can use it:

  cvat-cli --server-host 'https://app.cvat.ai' profile create --name app --set-default

Steps:
  1. If --profile is passed, use that profile; otherwise use the default profile.
  2. Print who you are authenticated as.

Usage (run ``python auth_profiles.py --help`` for the full list of options):
  python auth_profiles.py --profile app
  python auth_profiles.py               # uses the default profile
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
```

## Build a CLI-compatible script

Reuses `cvat-cli`'s shared auth arguments (`--server-host`, `--server-port`,
`--auth`, `--profile`, `--insecure`, `--organization`) with
`configure_client_auth_arguments`, then hands the parsed namespace to
`make_client_from_cli`, which picks the right factory (profile / PAT / password)
from the arguments. This is the go-to pattern when your script should feel like
an extension of `cvat-cli`.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--server-host` | fallback | Server URL when not using a profile |
| `--auth` | fallback | `USER:PASS` (deprecated password sign-in) or `USER` — see `cvat-cli` |
| `--profile` | fallback | Named saved profile; falls back to the default profile if no host/auth |
| `--insecure`, `--organization`, `--server-port` | no | Reused from `cvat-cli`'s shared arg set |

Also honors `CVAT_ACCESS_TOKEN` / `CVAT_PASSWORD` environment variables the same
way `cvat-cli` does.

```bash
python auth_cli.py --profile app
python auth_cli.py --server-host 'https://app.cvat.ai'          # uses CVAT_ACCESS_TOKEN env
python auth_cli.py --server-host 'https://app.cvat.ai' --auth me:secret
```

### The script

```python
"""Build a CLI-compatible script that reuses cvat-cli's auth argument set:
--server-host / --server-port / --auth / --profile / --insecure / --organization.

This is the go-to pattern when your script should feel like an extension of
cvat-cli — it accepts the same flags, honors CVAT_ACCESS_TOKEN / PASS env
variables, and resolves profiles the same way (explicit --profile, else the
default profile if no host/auth is passed).

Steps:
  1. Register the shared auth flags with configure_client_auth_arguments.
  2. Add your own script-specific arguments on top.
  3. Hand the parsed namespace to make_client_from_cli — it picks the right
     Client factory (profile / PAT / password) from the arguments.

Usage (run ``python auth_cli.py --help`` for the full list of options):
  python auth_cli.py --profile app
  python auth_cli.py --server-host 'https://app.cvat.ai'   # uses CVAT_ACCESS_TOKEN env
  python auth_cli.py --server-host 'https://app.cvat.ai' --auth me:secret
"""

import argparse

from cvat_sdk import make_client_from_cli
from cvat_sdk.core.auth import configure_client_auth_arguments


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
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
```

_Notes:_

- Personal Access Tokens are the recommended path. Password sign-in (via `--auth
  USER:PASS`) is a deprecated fallback that will be removed in a future release.
- Full recipes:
  [`auth_connect.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/auth_connect.py),
  [`auth_profiles.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/auth_profiles.py),
  [`auth_cli.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/auth_cli.py).
